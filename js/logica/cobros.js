// Clientes y cobros. Funciones puras. Las fechas van como AAAA-MM-DD.
import { sumarDias, difDias, aFecha, iso, MESES_LARGOS } from '../util.js';

export const SERVICIOS = ['Página web', 'Sistema de control', 'Panel del dueño', 'Asistente de WhatsApp'];
export const FORMAS_PAGO = ['Pago móvil', 'Zelle', 'Efectivo $', 'Efectivo Bs'];
export const DIAS_PRIMER_COBRO = 30;    // la mensualidad empieza 30 días después de publicada o entregada
export const esPagina = c => c.servicio === 'Página web';
export const palabraEntrega = c => (esPagina(c) ? 'Publicada' : 'Entregado');
const QUE = { 'Página web': 'su página', 'Sistema de control': 'su sistema', 'Panel del dueño': 'su panel', 'Asistente de WhatsApp': 'su asistente' };

const r2 = n => Math.round(n * 100) / 100;
const suma = l => r2(l.reduce((t, x) => t + (+x.monto || 0), 0));
export const pagosDe = (c, concepto) => (c.pagos || []).filter(p => p.concepto === concepto);
export const pagadoInstalacion = c => suma(pagosDe(c, 'Instalación'));
export const saldoInstalacion = c => r2(Math.max(0, (+c.instalacion || 0) - pagadoInstalacion(c)));

// Día del mes con tope en el último día (el 31 en febrero es el 28).
export function fechaConDia(anio, mes, dia) {
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return iso(new Date(anio, mes, Math.min(dia, ultimo)));
}
export function sumarMeses(f, n, dia) {
  const d = aFecha(f);
  return fechaConDia(d.getFullYear(), d.getMonth() + n, dia || d.getDate());
}

// Al publicar: el primer cobro es la primera fecha con su día de cobro, a partir de 28 días después.
export function primerCobro(publicada, diaCobro) {
  if (!diaCobro) return sumarDias(publicada, DIAS_PRIMER_COBRO);
  const desde = sumarDias(publicada, 28), d = aFecha(desde);
  let f = fechaConDia(d.getFullYear(), d.getMonth(), diaCobro);
  if (f < desde) f = fechaConDia(d.getFullYear(), d.getMonth() + 1, diaCobro);
  return f;
}

export function marcarPublicada(c, fecha) {
  c.publicada = fecha;
  c.inicioCobro = primerCobro(fecha, c.diaCobro);
  if (!c.diaCobro) c.diaCobro = aFecha(c.inicioCobro).getDate();
  c.baseMensualidades = pagosDe(c, 'Mensualidad').length;
}

// Fija el próximo cobro a mano (desde el chat): esa fecha pasa a ser la siguiente mensualidad.
export function fijarProximoCobro(c, fecha) {
  c.inicioCobro = fecha; c.diaCobro = aFecha(fecha).getDate();
  c.baseMensualidades = pagosDe(c, 'Mensualidad').length;
}

export function vencimiento(c, k) { return c.inicioCobro ? sumarMeses(c.inicioCobro, k, c.diaCobro) : null; }
const pagadas = c => pagosDe(c, 'Mensualidad').length - (c.baseMensualidades || 0);
export const proximaMensualidad = c => (c.mensual > 0 && c.inicioCobro ? vencimiento(c, Math.max(0, pagadas(c))) : null);

export function mensualidadesVencidas(c, hoy) {
  if (!(c.mensual > 0) || !c.inicioCobro) return [];
  const l = [];
  for (let k = Math.max(0, pagadas(c)); l.length < 24; k++) { const f = vencimiento(c, k); if (f > hoy) break; l.push(f); }
  return l;
}

export const debe = (c, hoy) => r2(saldoInstalacion(c) + mensualidadesVencidas(c, hoy).length * (+c.mensual || 0));

// «en 16 días», «hoy», «vencido hace 3 días».
export function cuando(fecha, hoy) {
  const d = difDias(fecha, hoy);
  if (d === 0) return { texto: 'hoy', clase: 'amb' };
  if (d === 1) return { texto: 'mañana', clase: 'gray' };
  if (d > 0) return { texto: `en ${d} días`, clase: 'gray' };
  return { texto: `vencido hace ${-d} ${d === -1 ? 'día' : 'días'}`, clase: 'red' };
}

// Lo que hay que cobrar, de todos los clientes: vencidos, luego los que esperan aprobación, luego por fecha.
export function proximosCobros(clientes, hoy) {
  const l = [];
  for (const c of clientes) {
    if (c.estado === 'Retirado') continue;
    const saldo = saldoInstalacion(c);
    if (saldo > 0) l.push({ c, tipo: 'instalacion', monto: saldo, fecha: null,
      concepto: pagadoInstalacion(c) > 0 ? '2.ª parte de la instalación' : 'Instalación',
      detalle: c.publicada ? 'pendiente' : `al aprobar ${esPagina(c) ? 'la página' : 'el trabajo'}` });
    const f = proximaMensualidad(c);
    if (f) l.push({ c, tipo: 'mensualidad', monto: +c.mensual, fecha: f, concepto: 'Mensualidad', detalle: `se cobra cada ${c.diaCobro}` });
  }
  const orden = x => (x.fecha && x.fecha <= hoy ? '0' + x.fecha : x.fecha ? '2' + x.fecha : '1');
  return l.sort((a, b) => orden(a).localeCompare(orden(b)));
}

export const porCobrar = (clientes, hoy) => r2(clientes.filter(c => c.estado !== 'Retirado').reduce((t, c) => t + debe(c, hoy), 0));
export const ingresoFijo = clientes => r2(clientes.filter(c => c.estado !== 'Retirado').reduce((t, c) => t + (+c.mensual || 0), 0));
export const todosLosPagos = clientes => clientes.flatMap(c => c.pagos || []);
export const cobradoEnMes = (clientes, mes) => suma(todosLosPagos(clientes).filter(p => (p.fecha || '').startsWith(mes)));
export const ganadoTotal = clientes => suma(todosLosPagos(clientes));
export const altaDe = c => c.alta || (c.pagos || []).map(p => p.fecha).filter(Boolean).sort()[0] || '';
export function ingresoFijoEnMes(clientes, mes) {
  const fin = sumarDias(sumarMeses(mes + '-01', 1, 1), -1);
  return r2(clientes.filter(c => altaDe(c) && altaDe(c) <= fin && (!c.retirado || c.retirado > fin)).reduce((t, c) => t + (+c.mensual || 0), 0));
}

export function chipCliente(c, hoy) {
  const d = debe(c, hoy);
  if (d > 0) return { texto: `Debe ${usdTxt(d)}`, clase: mensualidadesVencidas(c, hoy).length ? 'red' : 'amb' };
  if (!c.inicioCobro && c.mensual > 0) return { texto: esPagina(c) ? 'Sin publicar' : 'Sin entregar', clase: 'gray' };
  return { texto: 'Al día', clase: '' };
}

// ---------- Mensaje de cobro ----------
export const saludo = (hora = new Date().getHours()) => (hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches');
export const usdTxt = n => '$' + (+n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(n * 100) % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const bsTxt = n => 'Bs ' + (+n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function mensajeCobro(cobro, tasa, hoy, hora) {
  const { c } = cobro, que = QUE[c.servicio] || 'su servicio';
  const monto = cobro.tipo === 'mensualidad' && cobro.fecha && cobro.fecha <= hoy ? debe(c, hoy) - saldoInstalacion(c) : cobro.monto;
  const motivo = cobro.tipo === 'mensualidad'
    ? `la mensualidad de ${MESES_LARGOS[aFecha(cobro.fecha).getMonth()]} de ${que}`
    : `la ${cobro.concepto.toLowerCase()} de ${que}`;
  const enBs = tasa?.usd ? ` (${bsTxt(monto * tasa.usd)} a la tasa ${tasa.fecha === hoy ? 'de hoy' : 'del ' + tasa.fecha.split('-').reverse().slice(0, 2).join('/')})` : '';
  return `${saludo(hora)}, ${c.contacto || c.negocio}. Le escribo por ${motivo}, ${usdTxt(monto)}${enBs}. ¿Le parece si lo coordinamos?`;
}

// Precios de la escalera (CLAUDE.md), para rellenar el formulario de un cliente nuevo.
const ESCALERA = {
  'Página web': [[3, 25, 15], [6, 60, 20], [Infinity, 120, 25]],
  'Sistema de control': [[3, 50, 15], [6, 80, 20], [Infinity, 120, 25]],
  'Panel del dueño': [[3, 85, 30], [6, 135, 35], [Infinity, 205, 45]],
};
export function precioSugerido(servicio, linea, clientes) {
  if (linea === 'Afuera') return { instalacion: 199, mensual: 30 };
  const n = clientes.filter(c => c.servicio === servicio).length + 1;
  const t = (ESCALERA[servicio] || []).find(([hasta]) => n <= hasta);
  return t ? { instalacion: t[1], mensual: t[2] } : { instalacion: '', mensual: '' };
}
