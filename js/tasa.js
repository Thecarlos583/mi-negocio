// Tasa BCV: ve.dolarapi.com (oficial). `usd` es cuántos bolívares vale un dólar.
import { estado, guardarAjustes } from './estado.js';
import { hoyISO } from './util.js';

export async function actualizarTasa() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('http');
    const j = await r.json();
    const valor = Number(j.promedio ?? j.venta ?? j.precio);
    if (!(valor > 0)) throw new Error('dato');
    await fijarTasa(valor);
    return valor;
  } finally { clearTimeout(t); }
}

export async function fijarTasa(valor) {
  const a = estado.ajustes, hoy = hoyISO();
  a.tasaBCV = { fecha: hoy, usd: Math.round(valor * 10000) / 10000 };
  a.tasasHistorial = [...a.tasasHistorial.filter(x => x.fecha !== hoy), a.tasaBCV].sort((x, y) => x.fecha.localeCompare(y.fecha)).slice(-120);
  await guardarAjustes();
}

export const tasaActual = () => estado.ajustes.tasaBCV?.usd || 0;
