// Enviar por WhatsApp: abre wa.me con el mensaje listo y, al volver, pregunta si se envió.
import { estado, buscarProspecto, guardarProspecto } from '../estado.js';
import { abrirHoja, cerrarHoja, confirmar, aviso, $ } from './comun.js';
import { esc, hoyISO, horaAhora } from '../util.js';
import { mensajePara, urlWhatsApp, tipoSiguiente } from '../mensajes.js';
import { registrarEnvio, evento } from '../acciones.js';

const CLAVE = 'mn-pendiente';
const TITULOS = { primer: 'Primer mensaje', seg2: 'Seguimiento 2', seg3: 'Seguimiento 3', libre: 'Mensaje' };

export function tipoPara(p) {
  if (p.etapa === 'Por contactar') return 'primer';
  if (p.etapa === 'Contactado') return tipoSiguiente(p);
  return 'libre';
}

export function abrirEnvio(p, tipo = tipoPara(p)) {
  if (!p.telefono) return marcarInstagram(p, tipo);
  const texto = tipo === 'libre' ? '' : mensajePara(estado.ajustes.plantillas, p, tipo);
  const cuerpo = abrirHoja(`
    <p class="eyebrow">${TITULOS[tipo]}</p>
    <h3 class="hoja-titulo">${esc(p.negocio)}</h3>
    <label class="campo"><span>Puedes editarlo antes de enviarlo</span>
      <textarea id="env-texto" rows="9">${esc(texto)}</textarea></label>
    <button class="btn grande wa" id="env-abrir">Abrir WhatsApp</button>`);
  $('#env-abrir', cuerpo).addEventListener('click', () => {
    const t = $('#env-texto', cuerpo).value.trim();
    localStorage.setItem(CLAVE, JSON.stringify({ id: p.id, tipo, ts: Date.now() }));
    cerrarHoja(true);
    window.open(urlWhatsApp(p.telefono, t), '_blank', 'noopener');
  });
}

async function marcarInstagram(p, tipo) {
  const ok = await confirmar({ titulo: `¿Ya le escribiste a ${p.negocio} por Instagram?`, si: 'Sí, ya le escribí', no: 'Todavía no' });
  if (ok) await registrar(p, tipo);
}

async function registrar(p, tipo) {
  if (tipo === 'libre') evento(p, hoyISO(), horaAhora(), 'nota', 'Mensaje enviado');
  else registrarEnvio(p, tipo, hoyISO(), horaAhora(), estado.ajustes.diasSeguimiento);
  await guardarProspecto(p);
  aviso(tipo === 'primer' ? 'Anotado como Contactado' : 'Anotado');
}

// Al volver a la app: ¿lo enviaste?
let preguntando = false;
export async function revisarPendiente() {
  const crudo = localStorage.getItem(CLAVE);
  if (!crudo || preguntando) return;
  let pend; try { pend = JSON.parse(crudo); } catch { localStorage.removeItem(CLAVE); return; }
  if (Date.now() - pend.ts < 1500) return;
  const p = buscarProspecto(pend.id);
  if (!p || Date.now() - pend.ts > 6 * 3600e3) { localStorage.removeItem(CLAVE); return; }
  preguntando = true;
  const ok = await confirmar({ titulo: `¿Lo enviaste a ${p.negocio}?`, texto: TITULOS[pend.tipo], si: 'Sí, lo envié', no: 'No' });
  localStorage.removeItem(CLAVE);
  preguntando = false;
  if (ok) await registrar(p, pend.tipo);
}
