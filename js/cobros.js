// Cobros de clientes: estado, pagos, mensualidades y mensaje de recordatorio.
import { difDias, sumarDias, aFecha, iso, usd, bs } from './util.js';

export const CONCEPTOS = ['Primera mitad de instalación', 'Resto de instalación', 'Mensualidad'];
export const METODOS = ['Pago móvil', 'Transferencia Bs', 'Efectivo Bs', 'Efectivo $', 'Zelle', 'Binance'];
export const DIAS_SUSPENSION = 15;
export const DIAS_FIN = 60;

// Mismo día del mes siguiente (si el mes no tiene ese día, el último).
export function addMes(fecha, n = 1) {
  const d = aFecha(fecha), dia = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return iso(d);
}

export const proximoCobro = c => c.proximoCobro || (c.fechaPublicacion ? sumarDias(c.fechaPublicacion, 30) : '');

export function estadoCobro(c, hoy) {
  const f = proximoCobro(c);
  if (!f || c.estado === 'Cancelado') return { clave: 'sin-fecha', texto: 'Sin fecha de cobro', dias: null, aviso: '' };
  const d = difDias(f, hoy);
  if (d > 0) return { clave: 'aldia', texto: d <= 7 ? `Vence en ${d} días` : 'Al día', dias: d, fecha: f, aviso: '' };
  if (d === 0) return { clave: 'hoy', texto: 'Vence hoy', dias: 0, fecha: f, aviso: '' };
  const atraso = -d;
  const aviso = atraso >= DIAS_FIN ? 'Aviso de fin del servicio' : atraso >= DIAS_SUSPENSION ? 'Aviso de suspensión' : '';
  return { clave: 'vencido', texto: `Vencido ${atraso} días`, dias: d, fecha: f, aviso };
}

export const esInstalacion = p => /instalaci/i.test(p.concepto || '');
export const pagadoTotal = c => (c.pagos || []).reduce((s, p) => s + (p.monto || 0), 0);
export const pagadoInstalacion = c => (c.pagos || []).filter(esInstalacion).reduce((s, p) => s + (p.monto || 0), 0);
export const saldoInstalacion = c => Math.max(0, Math.round(((c.instalacion || 0) - pagadoInstalacion(c)) * 100) / 100);
export const restanteCiclo = c => Math.max(0, Math.round(((c.mensual || 0) - (c.abonoCiclo || 0)) * 100) / 100);

// Un pago de mensualidad completo mueve el próximo cobro un mes; los pagos parciales se acumulan.
export function registrarPago(c, { fecha, monto, concepto, metodo, tasa }) {
  const pago = { fecha, monto, concepto, metodo };
  if (tasa > 0) { pago.tasa = tasa; pago.bs = Math.round(monto * tasa * 100) / 100; }
  (c.pagos ||= []).push(pago);
  if (concepto === 'Mensualidad' && c.mensual > 0) {
    c.abonoCiclo = Math.round(((c.abonoCiclo || 0) + monto) * 100) / 100;
    while (c.abonoCiclo >= c.mensual - 0.005) {
      c.abonoCiclo = Math.round((c.abonoCiclo - c.mensual) * 100) / 100;
      c.proximoCobro = addMes(proximoCobro(c) || fecha, 1);
    }
  }
  return pago;
}

// Cobrado por mes, del más reciente al más viejo.
export function totalPorMes(clientes) {
  const m = {};
  for (const c of clientes) for (const p of c.pagos || []) if (p.fecha) m[p.fecha.slice(0, 7)] = (m[p.fecha.slice(0, 7)] || 0) + (p.monto || 0);
  return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([mes, total]) => ({ mes, total }));
}

const COSA = { 'Páginas': 'su página', 'Sistemas': 'su sistema', 'Afuera': 'su página', 'Asistentes': 'su asistente' };

export function mensajeCobro(c, tasa, hoy) {
  const nombre = (c.contactoNombre || '').trim();
  const saludo = nombre ? `Hola ${nombre}` : 'Hola';
  const monto = restanteCiclo(c) || c.mensual || 0;
  const bolos = tasa > 0 ? `, que hoy son ${bs(monto * tasa)} a tasa BCV` : '';
  const e = estadoCobro(c, hoy);
  const cuando = e.clave === 'hoy' ? 'que vence hoy' : e.clave === 'vencido' ? `que venció hace ${-e.dias} días` : e.dias != null ? `que vence en ${e.dias} días` : 'de este mes';
  return `${saludo}, le escribo por la mensualidad de ${COSA[c.linea] || 'el servicio'}, ${cuando}: ${usd(monto)}${bolos}. Cuando pueda me avisa. ¡Gracias!`;
}
