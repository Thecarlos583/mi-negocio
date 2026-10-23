// Agregar un prospecto a mano, revisando antes que no esté repetido.
import { estado, guardarProspecto } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc } from '../util.js';
import { LINEAS } from '../ajustes-base.js';
import { normalizarTelefono, normalizarNombre, buscarRepetido, describirRepetido } from '../telefono.js';
import { abrirFicha } from './ficha.js';

export function abrirNuevo(inicial = {}) {
  const nichos = [...new Set(estado.prospectos.map(p => p.nicho).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Nuevo prospecto</p><h3 class="hoja-titulo">Agregar negocio</h3>
    <label class="campo"><span>Negocio</span><input id="n-neg" value="${esc(inicial.negocio || '')}" autocomplete="off"></label>
    <label class="campo"><span>Teléfono (déjalo vacío si lo encontraste en Instagram)</span><input id="n-tel" type="tel" inputmode="tel" value="${esc(inicial.telefono || '')}" placeholder="0412 123 4567"></label>
    <div class="dos">
      <label class="campo"><span>Línea</span><select id="n-lin">${LINEAS.map(l => `<option>${l}</option>`).join('')}</select></label>
      <label class="campo"><span>Canal</span><select id="n-can"><option>WhatsApp</option><option>Instagram</option></select></label>
    </div>
    <label class="campo"><span>Nicho</span><input id="n-nic" list="n-nichos" placeholder="Ej: Fisioterapia"></label><datalist id="n-nichos">${nichos.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="dos">
      <label class="campo"><span>Zona</span><input id="n-zon"></label>
      <label class="campo"><span>País</span><input id="n-pai" value="Venezuela"></label>
    </div>
    <label class="campo"><span>Nota</span><textarea id="n-not" rows="2"></textarea></label>
    <div id="n-aviso"></div>
    <button class="btn grande primario" id="n-guardar">Guardar</button>`);

  $('#n-guardar', cuerpo).addEventListener('click', async () => {
    const negocio = $('#n-neg', cuerpo).value.trim(), telefono = normalizarTelefono($('#n-tel', cuerpo).value);
    if (!negocio) return aviso('Falta el nombre del negocio');
    const rep = buscarRepetido(estado.prospectos, { telefono, negocio });
    if (rep) {
      $('#n-aviso', cuerpo).innerHTML = `<article class="resultado ya"><b>Ya está en tu lista</b><p>${esc(rep.negocio)}: ${esc(describirRepetido(rep))}.</p><button class="btn suave" data-id="${esc(rep.id)}">Abrir su ficha</button></article>`;
      $('#n-aviso', cuerpo).querySelector('[data-id]').addEventListener('click', e => { cerrarHoja(true); abrirFicha(e.target.dataset.id); });
      return;
    }
    let id = telefono ? 'p' + telefono : 'n-' + normalizarNombre(negocio).replace(/ /g, '-');
    while (estado.prospectos.some(p => p.id === id)) id += '-2';
    const p = { id, negocio, telefono, linea: $('#n-lin', cuerpo).value, nicho: $('#n-nic', cuerpo).value.trim(), zona: $('#n-zon', cuerpo).value.trim(), pais: $('#n-pai', cuerpo).value.trim() || 'Venezuela',
      google: '', origenes: ['A mano'], primerContacto: '', etapa: 'Por contactar', nota: $('#n-not', cuerpo).value.trim(), proximoPaso: '', proximaFecha: '', toques: 0,
      canal: telefono ? $('#n-can', cuerpo).value : 'Instagram', historial: [], reserva: false };
    await guardarProspecto(p); cerrarHoja(true); aviso('Prospecto agregado'); abrirFicha(p.id);
  });
}
