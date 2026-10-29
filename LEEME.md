# Mi Negocio v2

App personal (PWA) para llevar clientes, cobros, prospectos y metas desde el iPhone. HTML, CSS y JavaScript sin compilar ni librerías. Los datos viven solo en el teléfono (IndexedDB, base `mi-negocio-v2`). Este repo es público y **no tiene ningún dato**.

## Instalar en el iPhone
1. Abre el enlace en **Safari**.
2. Compartir, luego **Agregar a inicio**.
3. Abre la app **desde el ícono**, toca tu nombre arriba y conéctala con Claude (token fino de GitHub con acceso solo a `mi-negocio-datos`, permiso Contents: Read and write).

## Cómo está hecha
- `js/logica/`: funciones puras (prospectos, cobros, metas, cambios desde el chat, estado para Claude, migración desde la v1).
- `js/ui/`: una pantalla por pestaña (Inicio, Clientes, Prospectos, Metas) y la hoja de ajustes.
- `js/sync.js`: buzón con el repo privado `mi-negocio-datos` (formatos en su `LEEME.md`).
- `scripts/migrar-v3.mjs`: arma `inicial/arranque-v2.json` desde los datos viejos.

## Cómo actualizar la app
1. Cambia lo que haga falta y corre `npm test`.
2. En `sw.js` sube `VERSION` y agrega los archivos nuevos a `ARCHIVOS`.
3. `git push`. Pages publica en uno o dos minutos.
4. En el teléfono aparece «Hay una versión nueva, toca para actualizar».
