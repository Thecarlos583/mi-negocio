// Primera vez: cargar los datos desde un archivo o pegando el texto.
import { empezarVacio } from '../estado.js';
import { cargarRespaldoDesdeArchivo, cargarRespaldoDesdeTexto } from './respaldo.js';
import { $ } from './comun.js';

export function pintarBienvenida(vista) {
  vista.innerHTML = `
    <div class="bienvenida">
      <div class="logo-grande" aria-hidden="true"><svg viewBox="0 0 64 64"><rect x="10" y="34" width="12" height="20" rx="3"/><rect x="26" y="22" width="12" height="32" rx="3"/><rect x="42" y="10" width="12" height="44" rx="3"/></svg></div>
      <h1>Mi Negocio</h1>
      <p class="hoja-texto">Tus prospectos, clientes y cobros en un solo lugar. Todo se guarda solo en este teléfono.</p>
      <label class="btn grande primario archivo">Cargar mis datos<input id="b-archivo" type="file" accept=".json,application/json,text/plain" hidden></label>
      <details class="pegar"><summary>O pegar el texto del respaldo</summary>
        <label class="campo"><textarea id="b-texto" rows="5" placeholder="Pega aquí el contenido del archivo .json"></textarea></label>
        <button class="btn suave" id="b-pegar">Cargar lo pegado</button></details>
      <button class="enlace" id="b-vacio">Empezar sin datos</button>
    </div>`;
  $('#b-archivo', vista).addEventListener('change', async e => { await cargarRespaldoDesdeArchivo(e.target.files[0]); e.target.value = ''; });
  $('#b-pegar', vista).addEventListener('click', () => cargarRespaldoDesdeTexto($('#b-texto', vista).value));
  $('#b-vacio', vista).addEventListener('click', () => empezarVacio());
}
