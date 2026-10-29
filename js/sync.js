// Sincronización con Claude: el repo privado mi-negocio-datos es el buzón (API de contenidos, token fino).
//   inicial/arranque-v2.json (una sola vez), tandas/*.json, cambios/*.json y aprendizajes/*.json -> los escribe Claude
//   estado/estado.json y estado/respaldo.json -> los escribe la app
// Cada archivo se aplica una sola vez por versión (sha).
import { s, guardar, alCambiar } from './datos.js';
import { hoyISO } from './util.js';
import { validarTanda, prepararTanda, aplicarTanda, mantener } from './logica/prospectos.js';
import { validarCambios, aplicarCambios } from './logica/cambios.js';
import { validarArranque, aplicarArranque, construirEstado, construirRespaldo, huella, sinHora, aBase64 } from './logica/nube.js';

export const REPO = 'mi-negocio-datos';
const API = 'https://api.github.com';
const ESPERA_MS = 20000;

export const config = () => s.meta.sync || null;
export const conectado = () => !!config()?.token;
const guardarConfig = async c => { s.meta.sync = c; await guardar({ avisar: false }); };

class ErrorSync extends Error {}
const explicar = st => ({
  401: 'El token no sirve o ya venció. Crea uno nuevo en GitHub.',
  403: 'El token no tiene permiso. Tiene que poder leer y escribir Contenidos del repo.',
  404: `No encuentro el repo ${REPO}. Revisa el usuario y que el token tenga acceso a ese repo.`,
}[st] || `GitHub respondió con el error ${st}.`);

async function api(ruta, { metodo = 'GET', cuerpo, raw = false, c = config() } = {}) {
  if (!c?.token) throw new ErrorSync('Falta conectar con Claude.');
  try {
    return await fetch(`${API}/repos/${c.usuario}/${REPO}${ruta}`, {
      method: metodo, cache: 'no-store',
      headers: { Authorization: `Bearer ${c.token}`, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch { throw new ErrorSync('No hay internet.'); }
}

export async function conectar(usuario, token) {
  const c = { usuario: usuario.trim(), token: token.trim(), aplicados: config()?.aplicados || {}, huellas: {} };
  try {
    const res = await api('', { c });
    if (!res.ok) return { ok: false, mensaje: explicar(res.status) };
    const repo = await res.json();
    if (repo.permissions && repo.permissions.push === false) return { ok: false, mensaje: 'Puede leer pero no escribir. Falta el permiso de Contenidos: lectura y escritura.' };
  } catch (e) { return { ok: false, mensaje: e.message }; }
  await guardarConfig(c);
  return { ok: true, mensaje: 'Conectado. La app ya habla con Claude.' };
}
export async function desconectar() { s.meta.sync = null; await guardar({ avisar: false }); }

// ---------- Recibir ----------
async function listar(carpeta) {
  const res = await api(`/contents/${carpeta}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new ErrorSync(explicar(res.status));
  return (await res.json()).filter(f => f.type === 'file' && f.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name));
}
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Aplica un archivo ya leído. También lo usa «Pegar tanda». Devuelve el aviso para mostrar.
export function aplicarTexto(carpeta, texto, archivo = '') {
  const obj = JSON.parse(texto), hoy = hoyISO();
  if (carpeta === 'inicial') {
    const err = validarArranque(obj); if (err) throw new Error(err);
    if (s.meta.arranque || s.clientes.length || s.historial.length) { s.meta.arranque ||= hoy; return ''; }
    aplicarArranque(s, obj); s.meta.arranque = hoy;
    return `Datos de arranque: ${plural(s.clientes.length, 'cliente', 'clientes')} y ${s.historial.length + s.prospectos.length} personas en tu recorrido`;
  }
  if (carpeta === 'tandas') {
    const err = validarTanda(obj); if (err) throw new Error(err);
    const prep = prepararTanda(s, obj, { archivo });
    const n = aplicarTanda(s, prep);
    if (!prep.tanda) return '';
    return `Llegaron ${plural(n, 'negocio nuevo', 'negocios nuevos')} (${prep.tanda.nombre})${prep.repetidos.length ? `, ${prep.repetidos.length} ya los tenías` : ''}`;
  }
  if (carpeta === 'cambios') {
    const err = validarCambios(obj); if (err) throw new Error(err);
    const r = aplicarCambios(s, obj, hoy, s.meta.tasa);
    return r.avisos.length ? `Claude actualizó: ${r.avisos.slice(0, 3).join(' · ')}${r.avisos.length > 3 ? ' y más' : ''}` : (r.errores[0] || '');
  }
  if (Array.isArray(obj.aprendizajes)) s.meta.aprendizajes = obj.aprendizajes;   // se guardan, no se muestran
  return '';
}

async function recibir() {
  const c = config(), mensajes = [];
  c.aplicados ||= {};
  for (const carpeta of ['inicial', 'tandas', 'cambios', 'aprendizajes']) {
    for (const f of await listar(carpeta)) {
      if (carpeta === 'inicial' && f.name !== 'arranque-v2.json') continue;      // datos-v3.json es de la v1
      if (c.aplicados[f.path] === f.sha) continue;
      const res = await api(`/contents/${f.path}`, { raw: true });
      if (!res.ok) throw new ErrorSync(explicar(res.status));
      let msg = '';
      try { msg = aplicarTexto(carpeta, await res.text(), f.path); }
      catch (e) { msg = `No pude leer ${f.path}: ${e.message}`; }
      c.aplicados[f.path] = f.sha;
      mantener(s, hoyISO());
      await guardarConfig(c);
      if (msg) mensajes.push(msg);
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
async function enviar() {
  if (!conectado() || enviando) return false;
  enviando = true;
  const c = config(), hoy = hoyISO();
  try {
    for (const [ruta, obj, msg] of [
      ['estado/estado.json', construirEstado(s, hoy, new Date().toISOString()), 'Estado de Mi Negocio'],
      ['estado/respaldo.json', construirRespaldo(s, hoy), 'Respaldo de Mi Negocio'],
    ]) {
      const h = huella(sinHora(obj));
      if (c.huellas?.[ruta] === h) continue;
      await subir(ruta, JSON.stringify(obj, null, 1), msg);
      (c.huellas ||= {})[ruta] = h;
    }
    c.ultimaOk = Date.now(); c.error = '';
    await guardarConfig(c);
    return true;
  } catch (e) { c.error = e.message; await guardarConfig(c); return false; }
  finally { enviando = false; }
}

// Una sola sincronización a la vez.
let enCurso = null;
export function sincronizar() {
  if (!enCurso) enCurso = (async () => {
    if (!conectado()) return { ok: false, mensajes: [] };
    const c = config();
    try {
      const mensajes = await recibir();
      const ok = await enviar();
      c.ultimaRevision = Date.now(); await guardarConfig(c);
      return { ok, mensajes };
    } catch (e) { c.error = e.message; c.ultimaRevision = Date.now(); await guardarConfig(c); return { ok: false, mensajes: [], error: e.message }; }
  })().finally(() => { enCurso = null; });
  return enCurso;
}

export function haceCuanto(ms) {
  if (!ms) return 'nunca';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

// Revisa al abrir y al volver a la app; sube los cambios unos segundos después de hacerlos.
export function iniciarSync(alTerminar) {
  let t;
  alCambiar(() => { if (!conectado()) return; clearTimeout(t); t = setTimeout(() => enviar(), ESPERA_MS); });
  const revisar = () => sincronizar().then(r => alTerminar?.(r));
  document.addEventListener('visibilitychange', () => {
    if (!conectado()) return;
    if (document.hidden) { clearTimeout(t); enviar(); } else revisar();
  });
  revisar();
}
