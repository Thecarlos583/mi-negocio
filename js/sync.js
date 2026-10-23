// Sincronización con Claude: un repo privado de GitHub como buzón (API de contenidos, token fino).
//   tandas/*.json y cambios/*.json  -> los escribe Claude, la app los lee y los aplica una sola vez
//   estado/estado.json, estado/respaldo.json -> los escribe la app
import { estado, alCambiar, guardarMeta } from './estado.js';
import { hoyISO, fechaDMA, difDias } from './util.js';
import { leerJSON } from './datos.js';
import { validarTanda, prepararTanda, validarCambios, prepararCambios } from './tandas.js';
import { importarTanda, importarCambios } from './ui/importar.js';
import { aviso } from './ui/comun.js';
import { construirEstadoNube, construirRespaldoNube, aBase64, deBase64, huella, sinHora } from './sync-datos.js';

export const REPO = 'mi-negocio-datos';
const ESPERA_MS = 30000;
const API = 'https://api.github.com';

export const config = () => estado.meta.sync || null;
export const conectado = () => !!config()?.token;
const guardarConfig = c => guardarMeta('sync', c);

// ---------- Conexión con la API ----------
class ErrorSync extends Error {}
const explicar = status => ({
  401: 'El token no sirve o ya venció. Crea uno nuevo en GitHub.',
  403: 'El token no tiene permiso. Tiene que poder leer y escribir Contenidos del repo.',
  404: `No encuentro el repo ${REPO}. Revisa el usuario y que el token tenga acceso a ese repo.`,
}[status] || `GitHub respondió con el error ${status}.`);

async function api(ruta, { metodo = 'GET', cuerpo, raw = false } = {}) {
  const c = config();
  if (!c?.token) throw new ErrorSync('Falta conectar con Claude en Más.');
  let res;
  try {
    res = await fetch(`${API}/repos/${c.usuario}/${REPO}${ruta}`, {
      method: metodo, cache: 'no-store',
      headers: { Authorization: `Bearer ${c.token}`, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch { throw new ErrorSync('No hay internet.'); }
  return res;
}

export async function probarConexion(usuario, token) {
  const previo = config();
  estado.meta.sync = { ...(previo || {}), usuario, token };      // solo en memoria hasta que funcione
  try {
    const res = await api('');
    if (!res.ok) return { ok: false, mensaje: explicar(res.status) };
    const repo = await res.json();
    if (repo.permissions && repo.permissions.push === false) return { ok: false, mensaje: 'Puede leer pero no escribir. Falta el permiso de Contenidos: lectura y escritura.' };
    return { ok: true, mensaje: 'Conectado. La app ya puede hablar con Claude.' };
  } catch (e) { return { ok: false, mensaje: e.message }; }
  finally { estado.meta.sync = previo; }
}

export async function conectar(usuario, token) {
  const r = await probarConexion(usuario, token);
  if (r.ok) { await guardarConfig({ usuario, token, aplicados: config()?.aplicados || {}, huellas: {}, conectadoEl: hoyISO() }); sincronizar(); }
  return r;
}
export async function desconectar() { estado.meta.sync = null; await guardarMeta('sync', null); }

// ---------- Recibir ----------
async function listar(carpeta) {
  const res = await api(`/contents/${carpeta}`);
  if (res.status === 404) return [];     // todavía no existe la carpeta
  if (!res.ok) throw new ErrorSync(explicar(res.status));
  return (await res.json()).filter(f => f.type === 'file' && f.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name));
}

const dm = f => (f ? fechaDMA(f).slice(0, 5) : '');

export async function recibir() {
  const c = config(), mensajes = [];
  for (const carpeta of ['tandas', 'cambios']) {
    for (const f of await listar(carpeta)) {
      if (c.aplicados[f.path] === f.sha) continue;
      const res = await api(`/contents/${f.path}`, { raw: true });
      if (!res.ok) throw new ErrorSync(explicar(res.status));
      let msg = '';
      try {
        const obj = leerJSON(await res.text());
        if (carpeta === 'tandas') {
          const err = validarTanda(obj); if (err) throw new Error(err);
          const prep = prepararTanda(estado.prospectos, obj);
          const creados = await importarTanda(prep);
          msg = `Llegó la tanda${obj.fecha ? ' del ' + dm(obj.fecha) : ''}: ${creados.length} negocio${creados.length === 1 ? '' : 's'} nuevo${creados.length === 1 ? '' : 's'}${prep.ya.length ? ` (${prep.ya.length} ya ${prep.ya.length === 1 ? 'lo tenías y no se agregó' : 'los tenías y no se agregaron'})` : ''}`;
        } else {
          const err = validarCambios(obj); if (err) throw new Error(err);
          const prep = prepararCambios(estado.prospectos, obj);
          await importarCambios(prep);
          msg = `Llegaron cambios de Claude: ${prep.lista.length} negocio${prep.lista.length === 1 ? '' : 's'} actualizado${prep.lista.length === 1 ? '' : 's'}`;
        }
      } catch (e) { msg = `No pude leer ${f.path}: ${e.message}`; }
      c.aplicados[f.path] = f.sha;                  // se anota siempre: un archivo corregido trae otro sha y se vuelve a leer
      await guardarConfig(c);
      mensajes.push(msg);
    }
  }
  return mensajes;
}

// ---------- Enviar ----------
async function subir(ruta, texto, mensaje) {
  const cuerpo = { message: mensaje, content: aBase64(texto) };
  for (let intento = 0; intento < 2; intento++) {
    const actual = await api(`/contents/${ruta}`);
    if (actual.ok) cuerpo.sha = (await actual.json()).sha; else if (actual.status !== 404) throw new ErrorSync(explicar(actual.status));
    const res = await api(`/contents/${ruta}`, { metodo: 'PUT', cuerpo });
    if (res.ok) return;
    if (![409, 422].includes(res.status) || intento) throw new ErrorSync(explicar(res.status));
  }
}

let enviando = false;
export async function enviar({ forzar = false } = {}) {
  if (!conectado() || enviando) return false;
  enviando = true;
  const c = config(), hoy = hoyISO(), ahora = new Date().toISOString();
  try {
    const archivos = [
      ['estado/estado.json', construirEstadoNube(estado, hoy, ahora), 'Estado de Mi Negocio'],
      ['estado/respaldo.json', construirRespaldoNube(estado, hoy), 'Respaldo de Mi Negocio'],
    ];
    for (const [ruta, obj, msg] of archivos) {
      const h = huella(sinHora(obj));
      if (!forzar && c.huellas?.[ruta] === h) continue;
      await subir(ruta, JSON.stringify(obj, null, 1), msg);
      (c.huellas ||= {})[ruta] = h;
    }
    c.ultimaOk = Date.now(); c.falloDesde = null; c.sucio = false; c.error = '';
    await guardarConfig(c);
    return true;
  } catch (e) {
    c.error = e.message; if (!c.falloDesde) c.falloDesde = hoy;
    await guardarConfig(c);
    return false;
  } finally { enviando = false; }
}

export async function sincronizar({ silencioso = true, forzar = false } = {}) {
  if (!conectado()) return { ok: false, mensajes: [] };
  const c = config();
  try {
    const mensajes = await recibir();
    mensajes.forEach(m => aviso(m));
    const ok = await enviar({ forzar: forzar || c.sucio });
    c.ultimaRevision = Date.now(); await guardarConfig(c);
    return { ok, mensajes };
  } catch (e) {
    c.error = e.message; c.ultimaRevision = Date.now(); await guardarConfig(c);
    if (!silencioso) aviso(e.message);
    return { ok: false, mensajes: [], error: e.message };
  }
}

// Tiempo en lenguaje de todos los días.
export function haceCuanto(ms) {
  if (!ms) return 'nunca';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

// Hace que «haz respaldo» solo salga si la subida lleva 7 días fallando.
export const subidaFallando = hoy => !!config()?.falloDesde && difDias(hoy, config().falloDesde) >= 7;

// ---------- Arranque ----------
let temporizador;
let iniciada = false;
export function iniciarSync() {
  if (iniciada) return;
  iniciada = true;
  const marcarSucio = () => {
    if (!conectado()) return;
    const c = config();
    if (!c.sucio) { c.sucio = true; guardarConfig(c); }
    clearTimeout(temporizador);
    temporizador = setTimeout(() => enviar(), ESPERA_MS);
  };
  alCambiar(marcarSucio);
  document.addEventListener('visibilitychange', () => {
    if (!conectado()) return;
    if (document.hidden) { clearTimeout(temporizador); if (config().sucio) enviar(); }
    else sincronizar();
  });
  sincronizar();
}
