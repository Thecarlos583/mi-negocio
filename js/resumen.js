// Resumen semanal (lunes a domingo). Todo sale del historial de eventos de cada prospecto y de los pagos.
import { sumarDias, difDias, aFecha, iso, fechaCorta } from './util.js';
import { fechaSeguimiento } from './acciones.js';
import { progresoMeta, ingresoRecurrente } from './metas.js';
import { estadoCobro } from './cobros.js';
import { calcularHoy } from './hoy-logic.js';
import { evaluarReglas, UMBRAL } from './reglas.js';
import { ETAPAS_ACTIVAS } from './ajustes-base.js';

export function lunesDe(fecha) { const d = aFecha(fecha); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); }
export function semanaDe(fecha) { const desde = lunesDe(fecha); return { desde, hasta: sumarDias(desde, 6) }; }
const enRango = (f, d, h) => !!f && f >= d && f <= h;

// «No respondió» no cuenta como respuesta.
const SIN_RESPUESTA = new Set(['Contactado', 'Por contactar', 'No respondió']);
const eventosEtapa = p => (p.historial || []).filter(h => h.tipo === 'etapa' && h.etapa);
export function fechaRespuesta(p) {
  if (p.respondioEl) return p.respondioEl;
  const e = eventosEtapa(p).find(h => !SIN_RESPUESTA.has(h.etapa));
  return e ? e.fecha : '';
}
export const respondio = p => !!fechaRespuesta(p);

function agrupar(lista, clave) {
  const o = {};
  for (const p of lista) { const k = clave(p) || 'Sin dato'; (o[k] ||= { contactos: 0, respuestas: 0 }); o[k].contactos++; if (respondio(p)) o[k].respuestas++; }
  return o;
}

const ultimoMovimiento = p => [p.primerContacto, ...(p.historial || []).map(h => h.fecha)].filter(Boolean).sort().pop() || '';

function recurrenteAl(clientes, fecha) {
  const alta = c => c.fechaAlta || (c.pagos || []).map(p => p.fecha).filter(Boolean).sort()[0] || c.fechaPublicacion || '';
  return clientes.filter(c => c.estado === 'Activo' && (!alta(c) || alta(c) <= fecha)).reduce((s, c) => s + (c.mensual || 0), 0);
}

export function calcularResumen(estado, desde, hasta, hoy) {
  const { prospectos, clientes, ajustes } = estado;
  const dias = ajustes.diasSeguimiento;
  const ref = hoy < hasta ? hoy : hasta;

  const frios = prospectos.filter(p => enRango(p.primerContacto, desde, hasta) && p.etapa !== 'Por contactar');
  const porDia = {};
  frios.forEach(p => { porDia[p.primerContacto] = (porDia[p.primerContacto] || 0) + 1; });
  const seguimientos = prospectos.reduce((s, p) => s + (p.historial || []).filter(h => h.tipo === 'seguimiento' && enRango(h.fecha, desde, hasta)).length, 0);
  const respuestas = prospectos.filter(p => enRango(fechaRespuesta(p), desde, hasta));
  const conEtapa = etapa => prospectos.filter(p => eventosEtapa(p).some(h => h.etapa === etapa && enRango(h.fecha, desde, hasta)));
  const pagos = clientes.flatMap(c => (c.pagos || []).filter(p => enRango(p.fecha, desde, hasta)));
  const cohorteRespondio = frios.filter(respondio);

  // Seguimientos que se me pasaron: tenían fecha dentro de la semana y siguen sin hacerse
  const pasados = prospectos.filter(p => {
    if (p.etapa !== 'Contactado' || !(p.toques >= 1) || p.toques > dias.length) return false;
    const due = p.proximaFecha || fechaSeguimiento(p, dias);
    return enRango(due, desde, hasta) && due < hoy;
  });

  const porNicho = agrupar(frios, p => p.nicho);
  const ranking = Object.entries(porNicho).filter(([, v]) => v.contactos >= 3).sort((a, b) => b[1].respuestas / b[1].contactos - a[1].respuestas / a[1].contactos);
  const meta = progresoMeta(estado, ref);
  const r = {
    id: 'sem-' + desde, desde, hasta, generado: hoy, parcial: hasta >= hoy, visto: false,
    frios: frios.length, seguimientos, diasCupo: Object.values(porDia).filter(n => n >= ajustes.limiteFrioDiario).length,
    respuestas: respuestas.length, tasa: frios.length ? cohorteRespondio.length / frios.length : 0,
    porLinea: agrupar(frios, p => p.linea), porNicho, porPais: agrupar(frios, p => p.pais),
    interesadosNuevos: conEtapa('Interesado').length, llamadas: conEtapa('Llamada agendada').length, cierres: conEtapa('Cliente').length,
    cobrado: pagos.reduce((s, p) => s + (p.monto || 0), 0),
    recurrente: ingresoRecurrente(clientes), cambioRecurrente: ingresoRecurrente(clientes) - recurrenteAl(clientes, sumarDias(desde, -1)),
    seguimientosPasados: pasados.length, nombresPasados: pasados.map(p => p.negocio),
    mejorNicho: ranking.length ? { nombre: ranking[0][0], ...ranking[0][1] } : null,
    peorNicho: ranking.length > 1 ? { nombre: ranking.at(-1)[0], ...ranking.at(-1)[1] } : null,
    meta, seguimientosPendientes: calcularHoy(estado, ref).seguimientos.length,
    cobrosVencidos: clientes.filter(c => estadoCobro(c, ref).clave === 'vencido').map(c => c.negocio),
    interesadosQuietos: prospectos.filter(p => ETAPAS_ACTIVAS.includes(p.etapa) && difDias(ref, ultimoMovimiento(p) || ref) >= UMBRAL.diasSinMovimiento).map(p => p.negocio),
  };
  r.conclusiones = evaluarReglas(r);
  return r;
}

export function semanaAnterior(estado, hoy) {
  const { desde, hasta } = semanaDe(sumarDias(lunesDe(hoy), -7));
  return { desde, hasta };
}

// Si todavía no existe el resumen de la semana pasada, lo arma (la primera vez que se abre la app en la semana nueva).
export function resumenPendiente(estado, hoy) {
  if (!estado.prospectos.length) return null;
  const { desde, hasta } = semanaAnterior(estado, hoy);
  if (estado.resumenes.some(r => r.id === 'sem-' + desde)) return null;
  return calcularResumen(estado, desde, hasta, hoy);
}

// Contactos y respuestas de las últimas n semanas, para los gráficos.
export function serieSemanas(estado, hoy, n = 8) {
  const out = [];
  let lunes = lunesDe(hoy);
  for (let i = n - 1; i >= 0; i--) {
    const desde = sumarDias(lunes, -7 * i), hasta = sumarDias(desde, 6);
    const frios = estado.prospectos.filter(p => enRango(p.primerContacto, desde, hasta) && p.etapa !== 'Por contactar');
    const resp = estado.prospectos.filter(p => enRango(fechaRespuesta(p), desde, hasta));
    out.push({ desde, contactos: frios.length, respuestas: resp.length });
  }
  return out;
}

const pct = x => `${Math.round(x * 1000) / 10}%`;
const tabla = o => Object.entries(o).sort((a, b) => b[1].contactos - a[1].contactos).map(([k, v]) => `${k}: ${v.respuestas}/${v.contactos}`).join('; ') || 'sin datos';

// Texto corto para pegarle a Claude: cifras de la semana y quién respondió o se cerró en las tandas recientes.
export function textoParaClaude(r, estado, hoy) {
  const reciente = p => p.primerContacto && difDias(hoy, p.primerContacto) <= 21;
  const resp = estado.prospectos.filter(p => reciente(p) && respondio(p)).map(p => `${p.negocio} (${p.nicho}, ${p.zona}) [${p.etapa}]`);
  const cerr = estado.prospectos.filter(p => reciente(p) && p.etapa === 'No respondió').map(p => `${p.negocio} (${p.nicho})`);
  return [
    `RESUMEN ${r.parcial ? 'PARCIAL ' : ''}${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`,
    `Fríos enviados: ${r.frios}. Seguimientos: ${r.seguimientos}. Días con cupo completo: ${r.diasCupo}.`,
    `Respuestas: ${r.respuestas}. Tasa de respuesta: ${pct(r.tasa)} (de los contactados esta semana).`,
    `Por línea (respondieron/contactos): ${tabla(r.porLinea)}.`,
    `Por nicho: ${tabla(r.porNicho)}.`,
    `Por país: ${tabla(r.porPais)}.`,
    `Interesados nuevos: ${r.interesadosNuevos}. Llamadas: ${r.llamadas}. Cierres: ${r.cierres}.`,
    `Cobrado: $${r.cobrado}. Recurrente: $${r.recurrente} (${r.cambioRecurrente >= 0 ? '+' : ''}${r.cambioRecurrente} en la semana). Meta: $${r.meta.objetivo}.`,
    `Seguimientos que se pasaron: ${r.seguimientosPasados}.`,
    r.mejorNicho ? `Mejor nicho: ${r.mejorNicho.nombre}. Peor: ${r.peorNicho ? r.peorNicho.nombre : 'n/d'}.` : 'Mejor y peor nicho: todavía pocos datos.',
    `Conclusiones: ${r.conclusiones.map(c => c.texto).join(' | ') || 'ninguna todavía'}`,
    `Respondieron en tandas recientes: ${resp.join('; ') || 'nadie'}.`,
    `Cerrados como No respondió en tandas recientes: ${cerr.join('; ') || 'ninguno'}.`,
  ].join('\n');
}
