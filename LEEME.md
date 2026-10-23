# Mi Negocio

App personal (PWA) para llevar prospectos, clientes y cobros desde el iPhone. HTML, CSS y JavaScript sin compilar. Los datos viven solo en el teléfono (IndexedDB). Este repo es público y **no tiene ningún dato**.

## Instalar en el iPhone
1. Abre el enlace en **Safari**.
2. Compartir, luego **Agregar a inicio**.
3. Abre la app **desde el ícono** y carga tus datos desde ahí (en el iPhone cada una guarda sus datos aparte).

## Cómo actualizar la app
1. Cambia lo que haga falta.
2. En `sw.js` sube el número de `VERSION` (por ejemplo `mi-negocio-v4`) y agrega ahí los archivos nuevos.
3. Súbelo a GitHub (`git push`). Pages publica en uno o dos minutos.
4. En el teléfono sale **«Hay una versión nueva, toca para actualizar»**. También sirve Más, «Buscar versión nueva».

## Respaldo
- **Automático (recomendado):** Más, «Conectar con Claude». Cada cambio sube un respaldo completo a tu repo privado `mi-negocio-datos`.
- **A mano:** Más, «Hacer respaldo». Sale la hoja de compartir: guárdalo en Archivos o mándalo por WhatsApp.
- **Restaurar:** Más, «Cargar respaldo desde archivo» (o pega el texto). Reemplaza todo, y antes te muestra cuántos prospectos y clientes trae.
- Si algún día cambias de teléfono: instala la app, carga el respaldo y listo.

## Conectar con Claude (tandas automáticas)
La app lee y escribe en un repo **privado** de GitHub llamado `mi-negocio-datos`. Claude deja ahí las tandas y los cambios; la app los recibe sola y deja su estado para que Claude lo lea.

Token (se hace una sola vez, en github.com desde Safari):
1. Settings, Developer settings, Personal access tokens, **Fine-grained tokens**, Generate new token.
2. Nombre `mi-negocio-app`. Vencimiento: el más largo que dé.
3. Repository access: **Only select repositories** y elige `mi-negocio-datos`.
4. Permissions, Repository permissions, **Contents: Read and write**. Nada más.
5. Generate token y copia el texto (empieza por `github_pat_`; solo se ve una vez).
6. En la app: Más, Conectar con Claude, pega el token y toca «Probar y conectar».

El token queda solo en el teléfono. Si vence, la app avisa y creas otro igual.

## Pruebas
`npm test` (Node 20 o más nuevo). Hay una prueba con datos reales en `test/datos-reales/` que no se sube.
