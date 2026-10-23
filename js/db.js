// IndexedDB con un envoltorio pequeño. Subir VERSION_ESQUEMA y agregar un paso en MIGRACIONES para cambiar la forma de los datos.
const NOMBRE = 'mi-negocio';
const VERSION_ESQUEMA = 1;
export const ALMACENES = ['prospectos', 'clientes', 'resumenes', 'tandas'];

const MIGRACIONES = {
  1(db) {
    const p = db.createObjectStore('prospectos', { keyPath: 'id' });
    p.createIndex('telefono', 'telefono');
    p.createIndex('etapa', 'etapa');
    db.createObjectStore('clientes', { keyPath: 'id' });
    db.createObjectStore('resumenes', { keyPath: 'id' });
    db.createObjectStore('tandas', { keyPath: 'id' });
    db.createObjectStore('ajustes');   // clave fija: 'ajustes'
    db.createObjectStore('meta');      // ultimoRespaldo, creado, etc.
  },
};

let _db;
export function abrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE, VERSION_ESQUEMA);
    r.onupgradeneeded = e => { for (let v = e.oldVersion + 1; v <= e.newVersion; v++) MIGRACIONES[v](r.result, e.target.transaction); };
    r.onsuccess = () => { _db = r.result; ok(_db); };
    r.onerror = () => mal(r.error);
  });
}

const pedir = req => new Promise((ok, mal) => { req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error); });
const fin = tx => new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); tx.onabort = () => mal(tx.error); });

export async function todos(almacen) { const db = await abrir(); return pedir(db.transaction(almacen).objectStore(almacen).getAll()); }
export async function leer(almacen, clave) { const db = await abrir(); return pedir(db.transaction(almacen).objectStore(almacen).get(clave)); }
export async function guardar(almacen, valor, clave) {
  const db = await abrir(); const tx = db.transaction(almacen, 'readwrite');
  tx.objectStore(almacen).put(valor, clave); return fin(tx);
}
export async function guardarVarios(almacen, valores) {
  const db = await abrir(); const tx = db.transaction(almacen, 'readwrite');
  valores.forEach(v => tx.objectStore(almacen).put(v)); return fin(tx);
}
export async function borrar(almacen, clave) { const db = await abrir(); const tx = db.transaction(almacen, 'readwrite'); tx.objectStore(almacen).delete(clave); return fin(tx); }

// Reemplaza todo en una sola transacción: o queda todo o no cambia nada.
export async function reemplazarTodo({ ajustes, prospectos, clientes, resumenes, tandas }) {
  const db = await abrir();
  const tx = db.transaction([...ALMACENES, 'ajustes'], 'readwrite');
  for (const [n, lista] of Object.entries({ prospectos, clientes, resumenes, tandas })) {
    const s = tx.objectStore(n); s.clear(); lista.forEach(v => s.put(v));
  }
  tx.objectStore('ajustes').put(ajustes, 'ajustes');
  return fin(tx);
}

export async function borrarTodo() {
  const db = await abrir();
  const tx = db.transaction([...ALMACENES, 'ajustes', 'meta'], 'readwrite');
  [...ALMACENES, 'ajustes', 'meta'].forEach(n => tx.objectStore(n).clear());
  return fin(tx);
}

export async function pedirPersistencia() {
  try { return (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false; } catch { return false; }
}
