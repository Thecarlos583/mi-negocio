// Arranque, pestañas de abajo, botón «+» y aviso de versión nueva.
import { estado, cargar, alCambiar, guardarResumen } from './estado.js';
import { pedirPersistencia } from './db.js';
import { pintarHoy } from './ui/hoy.js';
import { pintarProspectos, abrirRevision } from './ui/prospectos.js';
import { pintarClientes } from './ui/clientes.js';
import { pintarSemana } from './ui/semana.js';
import { pintarMas } from './ui/mas.js';
import { pintarBienvenida } from './ui/bienvenida.js';
import { revisarPendiente } from './ui/enviar.js';
import { abrirImportar } from './ui/importar.js';
import { abrirNuevo } from './ui/nuevo.js';
import { abrirPago } from './ui/pago.js';
import { hayHoja, abrirHoja, cerrarHoja, $, $$ } from './ui/comun.js';
import { actualizarTasa } from './tasa.js';
import { resumenPendiente } from './resumen.js';
import { iniciarSync } from './sync.js';
import { hoyISO } from './util.js';

const VISTAS = { hoy: pintarHoy, prospectos: pintarProspectos, clientes: pintarClientes, semana: pintarSemana, mas: pintarMas };
const ICONOS = {
  hoy: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  prospectos: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18.5 14.7c1.6.8 2.5 2.4 2.5 5.3"/>',
  clientes: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15h4"/>',
  semana: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const NOMBRES = { hoy: 'Hoy', prospectos: 'Prospectos', clientes: 'Clientes', semana: 'Semana', mas: 'Más' };

let actual = 'hoy';
const vista = () => $('#vista');
const ruta = () => { const r = location.hash.slice(1); return VISTAS[r] ? r : 'hoy'; };

function pintar() {
  const v = vista();
  if (!estado.hayDatos) { document.body.classList.add('sin-datos'); delete v.dataset.enlazado; return pintarBienvenida(v); }
  document.body.classList.remove('sin-datos');
  const scroll = scrollY;
  VISTAS[actual](v);
  $$('.tab').forEach(t => { const on = t.dataset.v === actual; t.classList.toggle('activa', on); t.setAttribute('aria-current', on ? 'page' : 'false'); });
  scrollTo(0, scroll);
}

function armarPestanas() {
  $('#tabs').innerHTML = Object.keys(VISTAS).map(k => `<a class="tab" href="#${k}" data-v="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[k]}</svg><span>${NOMBRES[k]}</span></a>`).join('');
}

// ---------- Botón «+» ----------
function abrirMas() {
  const cuerpo = abrirHoja(`
    <h3 class="hoja-titulo">¿Qué quieres hacer?</h3>
    <div class="botones-col">
      <button class="btn grande primario" data-x="importar">Importar tanda o cambios</button>
      <button class="btn grande suave" data-x="nuevo">Agregar prospecto</button>
      <button class="btn grande suave" data-x="pago">Registrar pago</button>
      <button class="btn grande suave" data-x="revisar">¿Ya le escribí?</button>
    </div>`, { clase: 'chica' });
  cuerpo.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    cerrarHoja(true);
    ({ importar: abrirImportar, nuevo: () => abrirNuevo(), pago: () => abrirPago(), revisar: abrirRevision })[b.dataset.x]();
  });
}

// ---------- Resumen de la semana: se arma solo la primera vez que se abre la app en la semana nueva ----------
async function armarResumenSemanal() {
  const r = resumenPendiente(estado, hoyISO());
  if (r) await guardarResumen(r);
}

// ---------- Versión nueva ----------
function vigilarVersion() {
  if (!('serviceWorker' in navigator)) return;
  const teniaControlador = !!navigator.serviceWorker.controller;   // en la primera visita no hay nada que recargar
  navigator.serviceWorker.register('sw.js').then(reg => {
    const avisar = nuevo => { const b = $('#version-nueva'); b.hidden = false; b.onclick = () => nuevo.postMessage('saltar'); };
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener('statechange', () => { if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar(nuevo); });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargado || !teniaControlador) return; recargado = true; location.reload(); });
}

async function arrancar() {
  armarPestanas();
  $('#fab').addEventListener('click', abrirMas);
  await cargar();
  pedirPersistencia();
  if (estado.hayDatos) await armarResumenSemanal();
  actual = ruta();
  pintar();
  alCambiar(() => { if (!document.hidden) pintar(); });
  addEventListener('hashchange', () => { if (hayHoja()) return; actual = ruta(); scrollTo(0, 0); pintar(); });
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) return;
    revisarPendiente();
    if (estado.hayDatos) await armarResumenSemanal();
    pintar();
  });
  vigilarVersion();
  revisarPendiente();
  iniciarSync();   // siempre enganchada: solo actúa cuando hay token
  // La tasa se busca sola una vez al día, si hay internet y ya hay datos.
  const t = estado.ajustes.tasaBCV;
  if (estado.hayDatos && navigator.onLine && (!t || t.fecha !== hoyISO())) actualizarTasa().catch(() => {});
}

arrancar();
