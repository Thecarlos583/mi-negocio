// Ajustes (tocando tu nombre arriba): conexión con Claude y la versión de la app.
import { s } from '../datos.js';
import { conectar, desconectar, conectado, config, sincronizar, haceCuanto, REPO } from '../sync.js';
import { $, esc, abrirHoja, cerrarHoja, aviso } from './comun.js';

export const VERSION_APP = 'v2.0';

export function hojaAjustes(alSincronizar) {
  const c = config();
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>Conectar con Claude</h3><button class="link" data-cerrar>Cerrar</button></div>
    ${conectado() ? `
      <p class="small">Conectada al repo privado <b>${REPO}</b> de ${esc(c.usuario)}. Última revisión: ${haceCuanto(c.ultimaRevision)}.${c.error ? `<br><b style="color:#a8322e">${esc(c.error)}</b>` : ''}</p>
      <div class="row" style="margin-top:12px;gap:8px"><button class="btn dark" id="a-revisar">Revisar ahora</button><button class="btn light" id="a-salir">Desconectar</button></div>`
    : `
      <p class="small">Con esto llegan solas tus tandas y lo que Claude anota desde el chat. Se hace una sola vez.</p>
      <ol class="pasos small">
        <li>En GitHub entra a Settings › Developer settings › Fine-grained tokens › Generate new token.</li>
        <li>En «Repository access» elige solo <b>${REPO}</b>.</li>
        <li>En «Permissions», «Contents»: <b>Read and write</b>. Genera y copia el token.</li>
      </ol>
      <form id="a-form">
        <label class="f">Usuario de GitHub<input name="usuario" value="${esc(c?.usuario || 'Thecarlos583')}" autocapitalize="off" autocomplete="off"></label>
        <label class="f">Token<input name="token" type="password" autocomplete="off" placeholder="github_pat_..." required></label>
        <button class="btn dark full" type="submit" style="margin-top:6px">Conectar</button>
      </form>`}
    <p class="note">Mi Negocio ${VERSION_APP} · tus datos viven solo en este teléfono</p>`);
  $('#a-form', cuerpo)?.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    aviso('Probando la conexión…');
    const r = await conectar(d.usuario, d.token);
    aviso(r.mensaje);
    if (r.ok) { cerrarHoja(true); alSincronizar(await sincronizar()); }
  });
  $('#a-revisar', cuerpo)?.addEventListener('click', async () => { aviso('Revisando…'); const r = await sincronizar(); cerrarHoja(true); alSincronizar(r, true); });
  $('#a-salir', cuerpo)?.addEventListener('click', async () => { await desconectar(); cerrarHoja(true); aviso('Desconectada'); });
  return s;
}
