// Guarda la app completa para que funcione sin internet.
// Al cambiar cualquier archivo, sube VERSION: el teléfono baja todo lo nuevo y avisa «Hay una versión nueva».
const VERSION = 'mi-negocio-v1';
const ARCHIVOS = [
  './', './index.html', './manifest.json', './css/styles.css',
  './fonts/bricolage.woff2', './fonts/publicsans.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './js/app.js', './js/util.js', './js/telefono.js', './js/ajustes-base.js', './js/datos.js', './js/db.js', './js/estado.js',
  './js/acciones.js', './js/cobros.js', './js/mensajes.js', './js/hoy-logic.js', './js/tasa.js',
  './js/ui/comun.js', './js/ui/enviar.js', './js/ui/ficha.js', './js/ui/filas.js', './js/ui/hoy.js', './js/ui/mas.js',
  './js/ui/bienvenida.js', './js/ui/respaldo.js', './js/ui/cliente-datos.js',
];

self.addEventListener('install', e => {
  // cache: 'reload' baja cada archivo del servidor y no de la memoria del navegador
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))));
});

// La versión nueva espera hasta que toques el aviso; así nunca cambia a mitad de lo que estás haciendo.
self.addEventListener('message', e => { if (e.data === 'saltar') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Primero lo guardado (rápido y sin internet). Las llamadas a otros sitios (tasa BCV, WhatsApp) no se tocan.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const guardado = await cache.match(e.request, { ignoreSearch: true });
      if (guardado) return guardado;
      try { return await fetch(e.request); }
      catch { return e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error(); }
    })
  );
});
