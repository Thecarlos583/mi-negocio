// Los datos viven solo en el teléfono (IndexedDB). Base nueva de la v2: mi-negocio-v2.
// En memoria se trabaja con un solo objeto `s`; al cambiar algo se guarda todo en una transacción.
const NOMBRE = 'mi-negocio-v2';
const LISTAS = ['prospectos', 'historial', 'clientes', 'tandas'];

export const s = { prospectos: [], historial: [], clientes: [], tandas: [], meta: {} };

let _db;
function abrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('prospectos', { keyPath: 'id' });
      db.createObjectStore('historial', { keyPath: 'telefono' });
      db.createObjectStore('clientes', { keyPath: 'id' });
      db.createObjectStore('tandas', { keyPath: 'id' });
      db.createObjectStore('meta');
    };
    r.onsuccess = () => { _db = r.result; ok(_db); };
    r.onerror = () => mal(r.error);
  });
}
const pedir = q => new Promise((ok, mal) => { q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error); });

export async function cargar() {
  const db = await abrir(), tx = db.transaction([...LISTAS, 'meta']);
  for (const n of LISTAS) s[n] = await pedir(tx.objectStore(n).getAll());
  const claves = await pedir(tx.objectStore('meta').getAllKeys()), valores = await pedir(tx.objectStore('meta').getAll());
  s.meta = Object.fromEntries(claves.map((k, i) => [k, valores[i]]));
  try { await navigator.storage?.persist?.(); } catch {}
  return s;
}

const oyentes = new Set();
export const alCambiar = f => oyentes.add(f);

// Guarda todo (son pocos miles de filas: es rápido y nunca queda a medias).
export async function guardar({ avisar = true } = {}) {
  const db = await abrir(), tx = db.transaction([...LISTAS, 'meta'], 'readwrite');
  for (const n of LISTAS) { const st = tx.objectStore(n); st.clear(); s[n].forEach(v => st.put(v)); }
  const m = tx.objectStore('meta'); m.clear(); Object.entries(s.meta).forEach(([k, v]) => v !== undefined && m.put(v, k));
  await new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); tx.onabort = () => mal(tx.error); });
  if (avisar) oyentes.forEach(f => f());
}
