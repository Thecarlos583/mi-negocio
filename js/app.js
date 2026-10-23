// Arranque, pestañas de abajo y aviso de versión nueva.
import { estado, cargar, alCambiar } from './estado.js';
import { pedirPersistencia } from './db.js';
import { pintarHoy } from './ui/hoy.js';
import { pintarMas } from './ui/mas.js';
import { pintarBienvenida } from './ui/bienvenida.js';
import { revisarPendiente } from './ui/enviar.js';
import { hayHoja, $, $$ } from './ui/comun.js';
import { actualizarTasa } from './tasa.js';
import { hoyISO } from './util.js';

const VISTAS = {
  hoy: pintarHoy,
  prospectos: v => pintarProximamente(v, 'Prospectos', 'Aquí vas a buscar, filtrar y abrir cada negocio.'),
  clientes: v => pintarProximamente(v, 'Clientes', 'Aquí vas a ver cobros, pagos y vencimientos.'),
  semana: v => pintarProximamente(v, 'Semana', 'Aquí va tu resumen de la semana y la meta.'),
  mas: pintarMas,
};
const ICONOS = {
  hoy: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  prospectos: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18.5 14.7c1.6.8 2.5 2.4 2.5 5.3"/>',
  clientes: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15h4"/>',
  semana: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const NOMBRES = { hoy: 'Hoy', prospectos: 'Prospectos', clientes: 'Clientes', semana: 'Semana', mas: 'Más' };

function pintarProximamente(vista, titulo, texto) {
  vista.innerHTML = `<header class="hoy-cab"><div><p class="eyebrow">Próximamente</p><h1>${titulo}</h1></div></header><p class="vacio grande-vacio">${texto}<br>Llega en el próximo módulo.</p>`;
}

let actual = 'hoy';
const vista = () => $('#vista');

function ruta() { const r = location.hash.slice(1); return VISTAS[r] ? r : 'hoy'; }

function pintar() {
  const v = vista();
  if (!estado.hayDatos) { document.body.classList.add('sin-datos'); delete v.dataset.enlazado; return pintarBienvenida(v); }
  document.body.classList.remove('sin-datos');
  const scroll = scrollY;
  VISTAS[actual](v);
  $$('.tab').forEach(t => { const on = t.dataset.v === actual; t.classList.toggle('activa', on); t.setAttribute('aria-current', on ? 'page' : 'false'); });
  scrollTo(0, scroll);
}

function irA(r) { actual = r; scrollTo(0, 0); pintar(); }

function armarPestanas() {
  $('#tabs').innerHTML = Object.keys(VISTAS).map(k => `<a class="tab" href="#${k}" data-v="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[k]}</svg><span>${NOMBRES[k]}</span></a>`).join('');
}

// ---------- Versión nueva ----------
function vigilarVersion() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const avisar = nuevo => {
      const b = $('#version-nueva'); b.hidden = false;
      b.onclick = () => nuevo.postMessage('saltar');
    };
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener('statechange', () => { if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar(nuevo); });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargado) return; recargado = true; location.reload(); });
}

async function arrancar() {
  armarPestanas();
  await cargar();
  pedirPersistencia();
  actual = ruta();
  pintar();
  alCambiar(() => { if (!document.hidden) pintar(); });
  addEventListener('hashchange', () => { if (hayHoja()) return; actual = ruta(); scrollTo(0, 0); pintar(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { revisarPendiente(); pintar(); } });
  vigilarVersion();
  revisarPendiente();
  // La tasa se busca sola una vez al día, si hay internet y ya hay datos.
  const t = estado.ajustes.tasaBCV;
  if (estado.hayDatos && navigator.onLine && (!t || t.fecha !== hoyISO())) actualizarTasa().catch(() => {});
}

arrancar();
