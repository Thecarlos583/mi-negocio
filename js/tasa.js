// Tasa BCV del día (ve.dolarapi.com). Sin internet se usa la última guardada.
import { s, guardar } from './datos.js';
import { hoyISO } from './util.js';

export async function actualizarTasa() {
  if (s.meta.tasa?.fecha === hoyISO()) return s.meta.tasa;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: ctl.signal, cache: 'no-store' });
    const j = await r.json();
    const usd = Number(j.promedio ?? j.venta ?? j.precio);
    if (usd > 0) { s.meta.tasa = { fecha: hoyISO(), usd: Math.round(usd * 10000) / 10000 }; await guardar({ avisar: false }); }
  } catch {} finally { clearTimeout(t); }
  return s.meta.tasa || null;
}
export const tasa = () => s.meta.tasa || null;
