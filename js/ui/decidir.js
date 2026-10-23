// Vivos o muertos: seguir (programar la fecha), dar por muerto (con motivo) y revivir.
import { guardarProspecto } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc, hoyISO, horaAhora, sumarDias, fechaCorta } from '../util.js';
import { posponer, darPorMuerto, revivir } from '../acciones.js';

const OPCIONES = [['Mañana', 1], ['En 3 días', 3], ['En una semana', 7]];

function selectorFecha(titulo, subtitulo, boton, alElegir) {
  const cuerpo = abrirHoja(`
    <h3 class="hoja-titulo">${esc(titulo)}</h3><p class="hoja-texto">${esc(subtitulo)}</p>
    <div class="botones-col">${OPCIONES.map(([t, d]) => `<button class="btn grande suave" data-d="${d}">${t}</button>`).join('')}</div>
    <label class="campo"><span>O elige una fecha</span><input id="sel-fecha" type="date" min="${hoyISO()}"></label>
    <button class="btn primario" data-d="fecha">${esc(boton)}</button>`, { clase: 'chica' });
  cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const f = b.dataset.d === 'fecha' ? $('#sel-fecha', cuerpo).value : sumarDias(hoyISO(), Number(b.dataset.d));
    if (!f) return;
    cerrarHoja(true); await alElegir(f);
  });
}

// «Seguir»: lo sigo persiguiendo y programo cuándo.
export function abrirSeguir(p) {
  selectorFecha('¿Cuándo sigo?', p.negocio, 'Usar esa fecha', async f => {
    posponer(p, f, hoyISO(), horaAhora()); await guardarProspecto(p); aviso(`Seguimiento el ${fechaCorta(f)}`);
  });
}

// «Dar por muerto»: pregunta el motivo y lo cierra.
export function abrirMuerte(p, alTerminar) {
  const cuerpo = abrirHoja(`
    <h3 class="hoja-titulo">Dar por muerto</h3><p class="hoja-texto">${esc(p.negocio)}. ¿Qué pasó?</p>
    <div class="botones-col">
      <button class="btn grande suave" data-m="No respondió">No respondió</button>
      <button class="btn grande peligro" data-m="Dijo que no">Dijo que no</button>
    </div>`, { clase: 'chica' });
  cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    darPorMuerto(p, b.dataset.m, hoyISO(), horaAhora()); await guardarProspecto(p); cerrarHoja(true);
    aviso(b.dataset.m === 'No respondió' ? 'Cerrado como No respondió' : 'Pasó a Perdido');
    alTerminar?.();
  });
}

// «Revivir»: vuelve a Contactado con una fecha.
export function abrirRevivir(p, alTerminar) {
  selectorFecha('Revivir', `${p.negocio} vuelve a Contactado. ¿Cuándo le escribes?`, 'Revivir con esa fecha', async f => {
    revivir(p, f, hoyISO(), horaAhora()); await guardarProspecto(p); aviso(`Revivido, seguimiento el ${fechaCorta(f)}`); alTerminar?.();
  });
}
