// Estado en memoria (son pocos cientos de registros) con guardado en IndexedDB.
import * as db from './db.js';
import { prepararRespaldo, construirRespaldo } from './datos.js';
import { completarAjustes } from './ajustes-base.js';
import { hoyISO, difDias } from './util.js';

export const estado = { listo: false, hayDatos: false, ajustes: completarAjustes(), prospectos: [], clientes: [], resumenes: [], tandas: [], meta: {} };

const oyentes = new Set();
export const alCambiar = f => { oyentes.add(f); return () => oyentes.delete(f); };
export const avisar = () => oyentes.forEach(f => f());

export async function cargar() {
  const [ajustes, prospectos, clientes, resumenes, tandas, creado, ultimoRespaldo] = await Promise.all([
    db.leer('ajustes', 'ajustes'), db.todos('prospectos'), db.todos('clientes'), db.todos('resumenes'), db.todos('tandas'),
    db.leer('meta', 'creado'), db.leer('meta', 'ultimoRespaldo'),
  ]);
  Object.assign(estado, { ajustes: completarAjustes(ajustes), prospectos, clientes, resumenes, tandas, meta: { creado, ultimoRespaldo }, hayDatos: !!ajustes, listo: true });
}

export const buscarProspecto = id => estado.prospectos.find(p => p.id === id);
export const buscarCliente = id => estado.clientes.find(c => c.id === id);

export async function guardarProspecto(p) {
  if (!estado.prospectos.includes(p)) estado.prospectos.push(p);
  await db.guardarVarios('prospectos', [p]); avisar();
}
export async function guardarProspectos(lista) { await db.guardarVarios('prospectos', lista); avisar(); }
export async function guardarCliente(c) {
  if (!estado.clientes.includes(c)) estado.clientes.push(c);
  await db.guardarVarios('clientes', [c]); avisar();
}
export async function guardarResumen(r) {
  const i = estado.resumenes.findIndex(x => x.id === r.id);
  if (i >= 0) estado.resumenes[i] = r; else estado.resumenes.push(r);
  await db.guardarVarios('resumenes', [r]); avisar();
}
export async function guardarTanda(t) { await db.guardarVarios('tandas', [t]); }
export async function guardarAjustes() { await db.guardar('ajustes', JSON.parse(JSON.stringify(estado.ajustes)), 'ajustes'); estado.hayDatos = true; avisar(); }
export async function guardarMeta(clave, valor) { estado.meta[clave] = valor; await db.guardar('meta', valor, clave); }

export async function importarRespaldo(obj) {
  const { estado: nuevo } = prepararRespaldo(obj);
  await db.reemplazarTodo(nuevo);
  Object.assign(estado, nuevo, { hayDatos: true });
  await guardarMeta('ultimoRespaldo', hoyISO());
  if (!estado.meta.creado) await guardarMeta('creado', hoyISO());
  avisar();
}

export async function empezarVacio() {
  await db.reemplazarTodo({ ajustes: completarAjustes(), prospectos: [], clientes: [], resumenes: [], tandas: [] });
  estado.hayDatos = true;
  if (!estado.meta.creado) await guardarMeta('creado', hoyISO());
  avisar();
}

export async function borrarTodo() {
  await db.borrarTodo();
  Object.assign(estado, { ajustes: completarAjustes(), prospectos: [], clientes: [], resumenes: [], tandas: [], meta: {}, hayDatos: false });
  avisar();
}

export const armarRespaldo = () => construirRespaldo(estado, hoyISO());

// Aviso de respaldo. Con la nube conectada, el respaldo es automático y solo avisa si la subida lleva 7 días fallando.
export function respaldoVencido(hoy) {
  const sync = estado.meta.sync;
  if (sync?.token) return !!sync.falloDesde && difDias(hoy, sync.falloDesde) >= 7;
  const ref = estado.meta.ultimoRespaldo || estado.meta.creado;
  return !!ref && difDias(hoy, ref) >= 7;
}
