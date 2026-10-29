// Arranque: datos del teléfono, pestañas, pantalla de carga, sincronización y copia sin internet.
import { s, cargar, guardar, alCambiar } from './datos.js';
import { hoyISO } from './util.js';
import { mantener } from './logica/prospectos.js';
import { iniciarSync } from './sync.js';
import { actualizarTasa } from './tasa.js';
import { $, $$, animarEntrada, aviso, cerrarHoja } from './ui/comun.js';
import { pintarInicio } from './ui/inicio.js';
import { pintarClientes } from './ui/clientes.js';
import { pintarProspectos } from './ui/prospectos.js';
import { pintarMetas, revisarEscalon } from './ui/metas.js';
import { hojaAjustes } from './ui/ajustes.js';

const VISTAS = { inicio: pintarInicio, clientes: pintarClientes, prospectos: pintarProspectos, metas: pintarMetas };
let actual = null;

export function ir(v, { animar = true } = {}) {
  if (!VISTAS[v]) v = 'inicio';
  const cambio = v !== actual;
  actual = v;
  $$('.view').forEach(e => e.classList.toggle('on', e.id === 'v-' + v));
  $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  const el = $('#v-' + v), y = scrollY;
  VISTAS[v](el);
  if (cambio) window.scrollTo({ top: 0 }); else window.scrollTo({ top: y });
  if (animar) animarEntrada(el);
  else { // repintar sin animar: barras y números ya llenos
    el.querySelectorAll('.bar > b').forEach(b => { b.style.transition = 'none'; b.style.width = (+b.dataset.w || 0) + '%'; });
    el.querySelectorAll('[data-h]').forEach(i => { i.style.transition = 'none'; i.style.height = (+i.dataset.h || 0) + '%'; });
    el.querySelectorAll('.ring-fill').forEach(r => { r.style.transition = 'none'; r.style.strokeDashoffset = r.dataset.largo * (1 - (+r.dataset.p || 0) / 100); });
    el.querySelectorAll('[data-n]').forEach(n => { if (n.dataset.fmt !== 'usd') n.textContent = (+n.dataset.n).toLocaleString('es-VE'); });
    el.querySelectorAll('.card, h1, .sub, .steps, :scope > .btn, .heat span').forEach(c => { c.style.animation = 'none'; });
  }
}
const repintar = () => actual && ir(actual, { animar: false });

$$('.nav button').forEach(b => b.addEventListener('click', () => { cerrarHoja(true); ir(b.dataset.v); }));
document.addEventListener('click', e => {
  const a = e.target.closest('[data-ir]'); if (a) { e.preventDefault(); ir(a.dataset.ir); return; }
  if (e.target.closest('#yo, [data-ajustes]')) hojaAjustes(alSincronizar);
});

function alSincronizar(r, manual) {
  if (r?.mensajes?.length) aviso(r.mensajes.slice(0, 2).join(' · '));
  else if (manual) aviso(r?.error || 'Todo al día');
  repintar();
  revisarEscalon();
}

// Cierre automático y cambio de día: se revisa al abrir y cada vez que vuelves a la app.
let dia = hoyISO();
async function alVolver() {
  const hoy = hoyISO();
  if (mantener(s, hoy) || hoy !== dia) { dia = hoy; await guardar({ avisar: false }); repintar(); }
}

// ---------- Copia sin internet ----------
function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const avisar = w => { const b = $('#version-nueva'); b.hidden = false; b.onclick = () => w.postMessage('saltar'); };
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) avisar(w); });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado) { recargado = true; location.reload(); } });
}

async function arrancar() {
  const t0 = performance.now();
  registrarSW();
  try { await cargar(); } catch { aviso('No pude abrir los datos del teléfono'); }
  if (mantener(s, hoyISO())) await guardar({ avisar: false });
  alCambiar(repintar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) alVolver(); });
  const espera = Math.max(0, 600 - (performance.now() - t0));   // que la pantalla de carga no parpadee
  setTimeout(() => {
    $('#splash').classList.add('out');
    ir(location.hash.slice(1) || 'inicio');
    setTimeout(() => $('#splash')?.remove(), 600);
    actualizarTasa();
    iniciarSync(alSincronizar);
  }, espera);
}
arrancar();
