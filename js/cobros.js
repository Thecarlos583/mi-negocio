// Estado de cobro de un cliente (el módulo 5 lo amplía con pagos y avisos de suspensión).
import { difDias, sumarDias } from './util.js';

export const proximoCobro = c => c.proximoCobro || (c.fechaPublicacion ? sumarDias(c.fechaPublicacion, 30) : '');

export function estadoCobro(c, hoy) {
  const f = proximoCobro(c);
  if (!f || c.estado === 'Cancelado') return { clave: 'sin-fecha', texto: 'Sin fecha de cobro', dias: null };
  const d = difDias(f, hoy);
  if (d > 0) return { clave: 'aldia', texto: d <= 7 ? `Vence en ${d} días` : 'Al día', dias: d, fecha: f };
  if (d === 0) return { clave: 'hoy', texto: 'Vence hoy', dias: 0, fecha: f };
  return { clave: 'vencido', texto: `Vencido ${-d} días`, dias: d, fecha: f };
}

export const pagadoTotal = c => (c.pagos || []).reduce((s, p) => s + (p.monto || 0), 0);
