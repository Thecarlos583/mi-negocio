// Guarda la app completa para que abra sin internet.
// Al cambiar cualquier archivo, sube VERSION y agrega los archivos nuevos a ARCHIVOS.
const VERSION = 'mi-negocio-v2-4';
const ARCHIVOS = [
  './', './index.html', './manifest.json', './css/app.css', './fonts/manrope.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/inicio-828x1792.png',
  './js/app.js',
  './js/datos.js',
  './js/logica/cambios.js',
  './js/logica/cobros.js',
  './js/logica/metas.js',
  './js/logica/migracion.js',
  './js/logica/nube.js',
  './js/logica/prospectos.js',
  './js/sync.js',
  './js/tasa.js',
  './js/telefono.js',
  './js/ui/ajustes.js',
  './js/ui/clientes.js',
  './js/ui/comun.js',
  './js/ui/inicio.js',
  './js/ui/metas.js',
  './js/ui/prospectos.js',
  './js/util.js',
];

self.addEventListener('install', e => {
  // cache: 'reload' baja cada archivo del servidor y no de la memoria del navegador
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))));
});

// La primera vez se activa de una; las versiones nuevas esperan a que toques el aviso.
self.addEventListener('message', e => { if (e.data === 'saltar') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'mi-negocio-foto').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Primero lo guardado (rápido y sin internet). Lo de otros sitios (tasa BCV, GitHub, WhatsApp) no se toca.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const guardado = await cache.match(e.request, { ignoreSearch: true });
    if (guardado) return guardado;
    try { return await fetch(e.request); }
    catch { return e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error(); }
  }));
});
