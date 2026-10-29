// Metas: escalones de ingreso fijo al mes, constancia y la cuenta regresiva. Funciones puras.
import { sumarDias, difDias, aFecha } from '../util.js';
import { ingresoFijo } from './cobros.js';

export const ESCALONES = [100, 300, 1000, 3000];
export const MENSUAL_REFERENCIA = 20;          // «Te faltan 4 clientes de $20 al mes»
export const SUENO = { nombre: 'Kia Tasman', cuando: 'antes de los 21', fecha: '2028-10-10' };

export function metaActiva(clientes) {
  const ingreso = ingresoFijo(clientes);
  const i = ESCALONES.findIndex(e => ingreso < e);
  const indice = i === -1 ? ESCALONES.length - 1 : i;
  const objetivo = ESCALONES[indice], falta = Math.max(0, objetivo - ingreso);
  return {
    ingreso, objetivo, indice, falta, completa: i === -1,
    pct: Math.min(100, Math.round((ingreso / objetivo) * 100)),
    clientesFaltan: Math.ceil(falta / MENSUAL_REFERENCIA),
    alcanzados: ESCALONES.filter(e => ingreso >= e),
  };
}

// Escalón nuevo que todavía no se celebró (o null).
export function escalonPorCelebrar(clientes, celebrado = 0) {
  const nuevo = metaActiva(clientes).alcanzados.pop() || 0;
  return nuevo > celebrado ? nuevo : null;
}

// Días seguidos con la tanda completa, contando hasta hoy (si hoy todavía no está completo, desde ayer).
export function racha(constancia, hoy) {
  const s = new Set(constancia || []);
  let d = s.has(hoy) ? hoy : sumarDias(hoy, -1), n = 0;
  while (s.has(d)) { n++; d = sumarDias(d, -1); }
  return n;
}

export function calendarioMes(constancia, hoy) {
  const d = aFecha(hoy), anio = d.getFullYear(), mes = d.getMonth();
  const dias = new Date(anio, mes + 1, 0).getDate(), hueco = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const s = new Set(constancia || []), pre = hoy.slice(0, 8);
  return { hueco, dias: Array.from({ length: dias }, (_, i) => {
    const f = pre + String(i + 1).padStart(2, '0');
    return { dia: i + 1, fecha: f, lleno: s.has(f), hoy: f === hoy, futuro: f > hoy };
  }) };
}

export function suenio(clientes, hoy) {
  return { ...SUENO, dias: Math.max(0, difDias(SUENO.fecha, hoy)), pct: Math.min(100, (ingresoFijo(clientes) / ESCALONES.at(-1)) * 100) };
}
