// Piezas de interfaz compartidas: hojas que suben desde abajo, avisos, confirmaciones y chips.
import { esc } from '../util.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const COLOR_LINEA = { 'Páginas': 'var(--paginas)', 'Sistemas': 'var(--sistemas)', 'Afuera': 'var(--afuera)', 'Asistentes': 'var(--asistentes)' };
export const CLASE_ETAPA = {
  'Por contactar': 'e-por', 'Contactado': 'e-con', 'Respondió': 'e-resp', 'Interesado': 'e-int', 'Llamada agendada': 'e-lla',
  'Por pagar': 'e-pag', 'Cliente': 'e-cli', 'Se enfrió': 'e-fri', 'No respondió': 'e-nor', 'No por ahora': 'e-nop', 'Perdido': 'e-per',
};
export const chipEtapa = e => `<span class="chip ${CLASE_ETAPA[e] || ''}">${esc(e)}</span>`;
export const chipLinea = l => `<span class="chip-linea" style="--c:${COLOR_LINEA[l] || 'var(--suave)'}">${esc(l)}</span>`;

// ---------- Hojas ----------
let hojaAbierta = null;
export function abrirHoja(html, { alCerrar, clase = '' } = {}) {
  cerrarHoja(true);
  const raiz = $('#hojas');
  const el = document.createElement('div');
  el.className = 'hoja-fondo';
  el.innerHTML = `<section class="hoja ${clase}" role="dialog" aria-modal="true"><div class="hoja-asa"></div><div class="hoja-cuerpo">${html}</div></section>`;
  raiz.append(el);
  document.body.classList.add('hoja-abierta');
  requestAnimationFrame(() => el.classList.add('visible'));
  el.addEventListener('click', e => { if (e.target === el) cerrarHoja(); });
  hojaAbierta = { el, alCerrar };
  return $('.hoja-cuerpo', el);
}
export function repintarHoja(html) { if (hojaAbierta) $('.hoja-cuerpo', hojaAbierta.el).innerHTML = html; }
export function cerrarHoja(sinAviso) {
  if (!hojaAbierta) return;
  const { el, alCerrar } = hojaAbierta;
  hojaAbierta = null;
  el.classList.remove('visible');
  setTimeout(() => el.remove(), 220);
  if (!$('#hojas').children.length || true) document.body.classList.remove('hoja-abierta');
  if (!sinAviso && alCerrar) alCerrar();
}
export const hayHoja = () => !!hojaAbierta;

// ---------- Aviso breve ----------
let tAviso;
export function aviso(texto) {
  const el = $('#aviso');
  el.textContent = texto; el.classList.add('visible');
  clearTimeout(tAviso); tAviso = setTimeout(() => el.classList.remove('visible'), 2600);
}

// ---------- Confirmar (promesa) ----------
export function confirmar({ titulo, texto = '', si = 'Sí', no = 'Cancelar', peligro = false }) {
  return new Promise(res => {
    const cuerpo = abrirHoja(`
      <h3 class="hoja-titulo">${esc(titulo)}</h3>
      ${texto ? `<p class="hoja-texto">${esc(texto)}</p>` : ''}
      <div class="botones-fila">
        <button class="btn grande ${peligro ? 'peligro' : 'primario'}" data-r="1">${esc(si)}</button>
        <button class="btn grande suave" data-r="0">${esc(no)}</button>
      </div>`, { alCerrar: () => res(false), clase: 'chica' });
    cuerpo.addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const r = b.dataset.r === '1'; cerrarHoja(true); res(r);
    });
  });
}

export function copiar(texto) {
  const listo = () => aviso('Copiado');
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(texto).then(listo, () => copiarViejo(texto, listo));
  copiarViejo(texto, listo);
}
function copiarViejo(texto, listo) {
  const t = document.createElement('textarea'); t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.append(t); t.select(); try { document.execCommand('copy'); listo(); } catch { aviso('No se pudo copiar'); } t.remove();
}
