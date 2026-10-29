// Piezas de interfaz compartidas: hojas que suben desde abajo, avisos y animaciones de entrada.
import { esc, fechaCorta } from '../util.js';
export { esc };
export const $ = (s, r = document) => r.querySelector(s);

// WhatsApp se abre en el mismo toque (si se espera algo antes, el iPhone lo bloquea).
export const abrirWhatsApp = url => window.open(url, '_blank', 'noopener');

const ICONO_NICHO = [[/posada|chalet|caba|hotel/i, '🏡'], [/tour|guía|sender/i, '🥾'], [/evento|quinta|granja/i, '🎉'], [/uña|nail/i, '💅'],
  [/belleza|salon|estil|spa/i, '💇'], [/pressure|lavado/i, '🧽'], [/detail|carro|auto/i, '🚗'], [/fiesta|party|alquiler/i, '🎪'], [/fisio/i, '🩺'],
  [/agro|distrib/i, '🌾'], [/comida|bakery|restaur|charcut/i, '🥐']];
const ICONO_LINEA = { 'Páginas': '🌐', 'Sistemas': '📊', 'Afuera': '✈️', 'Asistentes': '💬' };
export const iconoProspecto = p => (ICONO_NICHO.find(([r]) => r.test(`${p.nicho} ${p.negocio}`)) || [, ICONO_LINEA[p.linea] || '📍'])[1];
const ICONO_SERVICIO = { 'Página web': '🏡', 'Sistema de control': '📊', 'Panel del dueño': '🧭', 'Asistente de WhatsApp': '💬' };
export const iconoCliente = c => (/chalet|rancho|monta/i.test(c.negocio) ? '⛰️' : ICONO_SERVICIO[c.servicio] || '🤝');

export const saludoDelDia = (h = new Date().getHours()) => (h < 12 ? 'Buen día' : h < 19 ? 'Buenas tardes' : 'Buenas noches');
export const fechaTxt = f => (f ? fechaCorta(f) : '');
export const ordinal = n => (n === 1 ? '1.er' : n === 2 ? '2.º' : `${n}.º`);
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Hojas ----------
let hoja = null;
export function abrirHoja(html, { alCerrar } = {}) {
  cerrarHoja(true);
  const el = document.createElement('div');
  el.className = 'hoja-fondo';
  el.innerHTML = `<section class="hoja glass" role="dialog" aria-modal="true"><div class="hoja-asa"></div><div class="hoja-cuerpo">${html}</div></section>`;
  $('#hojas').append(el);
  document.body.classList.add('hoja-abierta');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-cerrar]')) cerrarHoja(); });
  hoja = { el, alCerrar };
  return $('.hoja-cuerpo', el);
}
export function cerrarHoja(sinAviso) {
  if (!hoja) return;
  const { el, alCerrar } = hoja;
  hoja = null;
  el.classList.remove('visible');
  setTimeout(() => el.remove(), 350);
  document.body.classList.remove('hoja-abierta');
  if (!sinAviso && alCerrar) alCerrar();
}

// ---------- Aviso breve ----------
let tAviso;
export function aviso(texto) {
  const el = $('#aviso');
  el.textContent = texto; el.classList.add('visible');
  clearTimeout(tAviso); tAviso = setTimeout(() => el.classList.remove('visible'), 2800);
}

// ---------- Entrada de cada pestaña ----------
// Las tarjetas suben una tras otra; barras, anillos y gráficas se llenan desde cero; los números cuentan desde 0.
export function animarEntrada(vista) {
  const piezas = $$('h1, .sub, .card, .steps, :scope > .btn', vista);
  piezas.forEach((c, i) => { c.style.animation = 'none'; c.offsetWidth; c.style.animation = ''; c.style.animationDelay = Math.min(i * 70, 420) + 'ms'; });
  $$('.bar > b', vista).forEach(b => { b.style.transition = 'none'; b.style.width = '0'; });
  $$('[data-h]', vista).forEach(i => { i.style.transition = 'none'; i.style.height = '0'; });
  $$('.ring-fill', vista).forEach(r => { r.style.transition = 'none'; r.style.strokeDashoffset = r.dataset.largo; });
  vista.offsetWidth;
  const llenar = () => {
    $$('.bar > b', vista).forEach(b => { b.style.transition = ''; b.style.width = Math.max(0, Math.min(100, +b.dataset.w || 0)) + '%'; });
    $$('[data-h]', vista).forEach(i => { i.style.transition = ''; i.style.height = Math.max(0, Math.min(100, +i.dataset.h || 0)) + '%'; });
    $$('.ring-fill', vista).forEach(r => { r.style.transition = ''; r.style.strokeDashoffset = r.dataset.largo * (1 - Math.min(1, (+r.dataset.p || 0) / 100)); });
  };
  quieto() ? llenar() : setTimeout(llenar, 150);
  $$('[data-n]', vista).forEach(contar);
}

// Cuenta un número desde 0. data-n es el valor; data-fmt dice cómo se escribe (usd o entero).
function contar(el) {
  const meta = +el.dataset.n || 0, fmt = el.dataset.fmt === 'usd' ? usdTxt : n => Math.round(n).toLocaleString('es-VE');
  if (quieto() || !meta) { el.textContent = fmt(meta); return; }
  const t0 = performance.now(), dur = 900;
  const paso = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(k < 1 ? meta * (1 - Math.pow(1 - k, 3)) : meta); if (k < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
const usdTxt = n => '$' + n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(n * 100) % 100 ? 2 : 0, maximumFractionDigits: 2 });
