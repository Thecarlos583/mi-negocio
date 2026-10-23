// Fila de prospecto con acciones rápidas (la usan Hoy y Prospectos).
import { guardarProspecto } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, chipEtapa, COLOR_LINEA, $ } from './comun.js';
import { esc, hoyISO, horaAhora, sumarDias, fechaCorta } from '../util.js';
import { cambiarEtapa, posponer } from '../acciones.js';
import { abrirEnvio, tipoPara } from './enviar.js';
import { abrirFicha } from './ficha.js';

const ICO_WA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.2-.7-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z"/></svg>';

export function fila(p, { sub = '', acciones = ['wa', 'resp', 'pos'], extra = '' } = {}) {
  const btn = {
    wa: `<button class="mini-btn wa" data-a="wa" aria-label="Enviar por WhatsApp">${ICO_WA}<span>${p.telefono ? 'Enviar' : 'Marcar'}</span></button>`,
    resp: p.etapa === 'Contactado' ? '<button class="mini-btn" data-a="resp">Respondió</button>' : '',
    pos: '<button class="mini-btn suave" data-a="pos">Posponer</button>',
  };
  return `<article class="fila" data-id="${esc(p.id)}" data-a="ficha">
    <span class="punto" style="--c:${COLOR_LINEA[p.linea] || 'var(--suave)'}"></span>
    <div class="fila-txt">
      <h4>${esc(p.negocio)}</h4>
      ${sub ? `<p class="fila-sub">${sub}</p>` : ''}
      <div class="fila-meta">${chipEtapa(p.etapa)}<span>${esc([p.nicho, p.zona].filter(Boolean).join(' · '))}</span>${extra}</div>
    </div>
    <div class="fila-acc">${acciones.map(a => btn[a]).join('')}</div>
  </article>`;
}

// Un solo oyente por contenedor: sirve para cualquier lista que use `fila`.
export function enlazarFilas(contenedor, buscar) {
  contenedor.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const fila = b.closest('.fila'); if (!fila) return;
    const p = buscar(fila.dataset.id); if (!p) return;
    if (b.dataset.a === 'ficha') return abrirFicha(p.id);
    e.stopPropagation();
    if (b.dataset.a === 'wa') return abrirEnvio(p, tipoPara(p));
    if (b.dataset.a === 'resp') {
      cambiarEtapa(p, 'Respondió', hoyISO(), horaAhora());
      p.proximaFecha = hoyISO();
      await guardarProspecto(p); aviso(`${p.negocio} pasó a Respondió`);
      return abrirFicha(p.id);
    }
    if (b.dataset.a === 'pos') return abrirPosponer(p);
  });
}

function abrirPosponer(p) {
  const cuerpo = abrirHoja(`
    <h3 class="hoja-titulo">Posponer</h3><p class="hoja-texto">${esc(p.negocio)}</p>
    <div class="botones-col">
      <button class="btn grande suave" data-d="1">Mañana</button>
      <button class="btn grande suave" data-d="3">En 3 días</button>
      <button class="btn grande suave" data-d="7">En una semana</button>
    </div>
    <label class="campo"><span>O elige una fecha</span><input id="pos-fecha" type="date" min="${hoyISO()}"></label>
    <button class="btn primario" data-d="fecha">Usar esa fecha</button>`, { clase: 'chica' });
  cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const hoy = hoyISO();
    const f = b.dataset.d === 'fecha' ? $('#pos-fecha', cuerpo).value : sumarDias(hoy, Number(b.dataset.d));
    if (!f) return;
    posponer(p, f, hoy, horaAhora()); await guardarProspecto(p); cerrarHoja(true); aviso(`Pospuesto al ${fechaCorta(f)}`);
  });
}
