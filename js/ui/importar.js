// Importar tanda / cambios / respaldo: pegar el texto o elegir un archivo .json.
import { estado, guardarProspectos, guardarTanda } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc, hoyISO, horaAhora, fechaDMA } from '../util.js';
import { leerJSON } from '../datos.js';
import { validarTanda, prepararTanda, aplicarTanda, validarCambios, prepararCambios, aplicarCambios, rotulo } from '../tandas.js';
import { cargarRespaldoDesdeTexto } from './respaldo.js';

export function abrirImportar() {
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Importar</p><h3 class="hoja-titulo">Tanda, cambios o respaldo</h3>
    <p class="hoja-texto">Pega el bloque que te dio Claude o elige el archivo .json. Si trae algo más alrededor, no importa.</p>
    <label class="campo"><textarea id="i-texto" rows="6" placeholder='{"tipo":"tanda", ...}'></textarea></label>
    <button class="btn grande primario" id="i-leer">Leer lo pegado</button>
    <label class="btn grande suave archivo">Elegir archivo .json<input id="i-archivo" type="file" accept=".json,application/json,text/plain" hidden></label>`);
  $('#i-leer', cuerpo).addEventListener('click', () => procesar($('#i-texto', cuerpo).value));
  $('#i-archivo', cuerpo).addEventListener('change', async e => { const a = e.target.files[0]; if (a) procesar(await a.text()); });
}

async function procesar(texto) {
  let obj;
  try { obj = leerJSON(texto); } catch (e) { return aviso(e.message); }
  if (obj.tipo === 'respaldo') { cerrarHoja(true); return cargarRespaldoDesdeTexto(texto); }
  if (obj.tipo === 'tanda') {
    const err = validarTanda(obj); if (err) return aviso(err);
    return vistaPreviaTanda(prepararTanda(estado.prospectos, obj));
  }
  if (obj.tipo === 'cambios') {
    const err = validarCambios(obj); if (err) return aviso(err);
    return vistaPreviaCambios(prepararCambios(estado.prospectos, obj));
  }
  aviso(`No reconozco el tipo «${obj.tipo ?? 'sin tipo'}». Tiene que ser tanda, cambios o respaldo.`);
}

// Aplica una tanda ya preparada (también la usa la sincronización con la nube).
export async function importarTanda(prep) {
  const { creados, tanda } = aplicarTanda(estado, prep, hoyISO(), new Date().toISOString());
  await guardarProspectos(creados); await guardarTanda(tanda);
  return creados;
}
export async function importarCambios(prep) {
  const tocados = aplicarCambios(prep, hoyISO(), horaAhora());
  await guardarProspectos(tocados);
  return tocados;
}

function vistaPreviaTanda(prep) {
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Vista previa</p><h3 class="hoja-titulo">${esc(prep.nombre)}</h3>
    <p class="hoja-texto">${prep.fecha ? esc(fechaDMA(prep.fecha)) : 'Sin fecha'}</p>
    <div class="resumen-numeros">
      <div><b>${prep.nuevos.length}</b><span>nuevos</span></div>
      <div><b>${prep.ya.length}</b><span>ya existían</span></div>
      <div><b>${prep.reservas}</b><span>reserva</span></div>
    </div>
    ${prep.ya.length ? `<h4 class="sub">Ya existían (no se importan)</h4><ul class="lista-simple">${prep.ya.map(y => `<li><b>${esc(y.item.negocio)}</b>: ${esc(y.texto)}</li>`).join('')}</ul>` : ''}
    ${prep.duplicadosEnTanda ? `<p class="mini">${prep.duplicadosEnTanda} repetido${prep.duplicadosEnTanda > 1 ? 's' : ''} dentro de la misma tanda: se importa una sola vez.</p>` : ''}
    ${prep.invalidos.length ? `<p class="mini">${prep.invalidos.length} sin nombre: se saltaron.</p>` : ''}
    <button class="btn grande primario" id="i-ok" ${prep.nuevos.length ? '' : 'disabled'}>Importar ${prep.nuevos.length} nuevo${prep.nuevos.length === 1 ? '' : 's'}</button>`);
  $('#i-ok', cuerpo).addEventListener('click', async () => {
    const creados = await importarTanda(prep);
    cerrarHoja(true); aviso(`Listo: ${creados.length} nuevos en ${prep.nombre}`); location.hash = 'hoy';
  });
}

function vistaPreviaCambios(prep) {
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Vista previa</p><h3 class="hoja-titulo">${prep.lista.length} negocio${prep.lista.length === 1 ? '' : 's'} con cambios</h3>
    <ul class="lista-simple">${prep.lista.map(({ p, cambios }) => `<li><b>${esc(p.negocio)}</b><br>${cambios.map(c => `${esc(rotulo(c.campo))}: ${c.campo === 'nota' ? esc(c.despues) : `${esc(c.antes || 'vacío')} → <b>${esc(c.despues || 'vacío')}</b>`}`).join('<br>')}</li>`).join('') || '<li>Nada cambia.</li>'}</ul>
    ${prep.noEncontrados.length ? `<p class="mini">No encontré ${prep.noEncontrados.length}: ${prep.noEncontrados.map(n => esc(n.negocio || n.telefono || '?')).join(', ')}.</p>` : ''}
    ${prep.errores.length ? `<p class="mini">${prep.errores.map(esc).join('. ')}.</p>` : ''}
    <button class="btn grande primario" id="i-ok" ${prep.lista.length ? '' : 'disabled'}>Aplicar cambios</button>`);
  $('#i-ok', cuerpo).addEventListener('click', async () => {
    await importarCambios(prep); cerrarHoja(true); aviso(`${prep.lista.length} actualizados`);
  });
}
