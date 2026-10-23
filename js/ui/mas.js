// Más: ajustes completos (tasa, meta, precios, plantillas, apariencia), conexión con Claude y respaldo.
import { estado, guardarAjustes, borrarTodo } from '../estado.js';
import { esc, fechaDMA } from '../util.js';
import { LINEAS, PLANTILLAS_BASE } from '../ajustes-base.js';
import { aviso, confirmar, $, $$ } from './comun.js';
import { actualizarTasa, fijarTasa } from '../tasa.js';
import { hacerRespaldo, cargarRespaldoDesdeArchivo, cargarRespaldoDesdeTexto } from './respaldo.js';
import { config, conectado, conectar, desconectar, probarConexion, sincronizar, haceCuanto, REPO } from '../sync.js';

export const VERSION_APP = 'v3';
let plantillaSel = null, enlazado = false;

const clavesPlantilla = a => Object.keys(a.plantillas).sort((x, y) => x.localeCompare(y, 'es'));
const rotuloClave = k => k.replace('|', ' · ');

function seccionPrecios(a) {
  return LINEAS.map(l => {
    const tramos = a.precios?.[l] || [];
    return `<div class="precio-linea" data-linea="${l}"><h4>${l}</h4>
      ${tramos.map(t => filaTramo(t)).join('')}
      <button class="btn suave" data-m="tramo+" data-l="${l}">Agregar tramo</button></div>`;
  }).join('');
}
const filaTramo = (t = {}) => `<div class="tramo">
  <label class="campo"><span>Desde</span><input data-c="desde" type="number" inputmode="numeric" value="${t.desde ?? ''}"></label>
  <label class="campo"><span>Hasta</span><input data-c="hasta" type="number" inputmode="numeric" value="${t.hasta ?? ''}" placeholder="∞"></label>
  <label class="campo"><span>Instalación $</span><input data-c="instalacion" type="number" inputmode="decimal" value="${t.instalacion ?? ''}"></label>
  <label class="campo"><span>Mensual $</span><input data-c="mensual" type="number" inputmode="decimal" value="${t.mensual ?? ''}"></label>
  <button class="quitar" data-m="tramo-" aria-label="Quitar tramo">×</button></div>`;

function seccionPlantillas(a) {
  const claves = clavesPlantilla(a);
  if (!plantillaSel || !a.plantillas[plantillaSel]) plantillaSel = claves[0];
  const t = a.plantillas[plantillaSel] || {};
  return `<label class="campo"><span>Línea y nicho</span><select id="m-pl">${claves.map(k => `<option value="${esc(k)}" ${k === plantillaSel ? 'selected' : ''}>${esc(rotuloClave(k))}</option>`).join('')}</select></label>
    <p class="mini">Variables: {negocio}, {nombre} y {zona}. Cada seguimiento tiene que aportar algo de valor.</p>
    <label class="campo"><span>Primer mensaje</span><textarea id="m-pl-primer" rows="5">${esc(t.primer || '')}</textarea></label>
    <label class="campo"><span>Seguimiento 2 (a los ${a.diasSeguimiento[0]} días)</span><textarea id="m-pl-seg2" rows="4">${esc(t.seg2 || '')}</textarea></label>
    <label class="campo"><span>Seguimiento 3 (a los ${a.diasSeguimiento[1] ?? '—'} días)</span><textarea id="m-pl-seg3" rows="4">${esc(t.seg3 || '')}</textarea></label>
    <div class="botones-fila"><button class="btn primario" data-m="pl-guardar">Guardar plantilla</button>${plantillaSel.includes('|') ? '<button class="btn suave" data-m="pl-quitar">Quitar esta</button>' : ''}</div>
    <details class="reservas"><summary>Nueva plantilla por línea y nicho</summary>
      <div class="dos"><label class="campo"><span>Línea</span><select id="m-pl-lin">${LINEAS.map(l => `<option>${l}</option>`).join('')}</select></label>
      <label class="campo"><span>Nicho</span><input id="m-pl-nic" placeholder="Ej: Carnicerías"></label></div>
      <button class="btn suave" data-m="pl-nueva">Crear</button></details>
    <button class="enlace" data-m="pl-restaurar">Volver a las plantillas de partida</button>`;
}

function seccionNube() {
  const c = config();
  if (!conectado()) return `<p class="hoja-texto">Conecta la app con el repo privado <b>${REPO}</b> y las tandas de Claude llegan solas, y tu respaldo se sube automático.</p>
    <label class="campo"><span>Usuario de GitHub</span><input id="n-usuario" value="${esc(c?.usuario || 'Thecarlos583')}" autocapitalize="off" autocorrect="off"></label>
    <label class="campo"><span>Token (empieza por github_pat_)</span><input id="n-token" type="password" autocomplete="off" placeholder="Pégalo aquí una sola vez"></label>
    <p class="mini" id="n-msg"></p>
    <button class="btn grande primario" data-m="nube-conectar">Probar y conectar</button>`;
  return `<p class="estado-nube ${c.error ? 'mal' : 'bien'}">${c.error ? 'Con problemas: ' + esc(c.error) : 'Conectado con Claude'}</p>
    <div class="linea-dato"><span>Última sincronización</span><b>${esc(haceCuanto(c.ultimaOk))}</b></div>
    ${c.sucio ? '<p class="mini">Hay cambios por subir.</p>' : ''}
    <p class="mini" id="n-msg"></p>
    <div class="botones-fila"><button class="btn primario" data-m="nube-ahora">Sincronizar ahora</button><button class="btn suave" data-m="nube-probar">Probar conexión</button></div>
    <button class="enlace" data-m="nube-quitar">Desconectar</button>`;
}

export function pintarMas(vista) {
  const a = estado.ajustes, t = a.tasaBCV;
  const hist = [...a.tasasHistorial].reverse().slice(0, 6);
  vista.innerHTML = `
    <header class="hoy-cab"><div><p class="eyebrow">Ajustes</p><h1>Más</h1></div></header>

    <section class="bloque"><h2>Conectar con Claude</h2>${seccionNube()}</section>

    <section class="bloque"><h2>Tasa BCV</h2>
      <p class="hoja-texto">${t ? `Bs ${t.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} por dólar, del ${esc(fechaDMA(t.fecha))}` : 'Todavía no hay tasa guardada.'}</p>
      <button class="btn grande primario" data-m="tasa">Actualizar tasa</button>
      <div class="dos"><label class="campo"><span>O escríbela a mano</span><input id="m-tasa" type="text" inputmode="decimal" placeholder="Ej: 884,75"></label>
      <button class="btn suave alinear" data-m="tasa-manual">Guardar</button></div>
      ${hist.length ? `<details class="reservas"><summary>Historial de tasas</summary>${hist.map(h => `<div class="linea-dato"><span>${esc(fechaDMA(h.fecha))}</span><b>Bs ${h.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</b></div>`).join('')}</details>` : ''}
    </section>

    <section class="bloque"><h2>Meta y límites</h2>
      <div class="dos"><label class="campo"><span>Meta mensual ($)</span><input id="m-meta" type="number" inputmode="numeric" value="${a.metaMensualUSD}"></label>
      <label class="campo"><span>Mensajes en frío al día</span><input id="m-limite" type="number" inputmode="numeric" value="${a.limiteFrioDiario}"></label></div>
      <div class="tres">${['Afuera', 'Sistemas', 'Páginas'].map(l => `<label class="campo"><span>Cupo ${l}</span><input data-cupo="${l}" type="number" inputmode="numeric" value="${a.cupoDiario[l] ?? 5}"></label>`).join('')}</div>
      <label class="campo"><span>Días de seguimiento (toque 2 y toque 3)</span><input id="m-dias" type="text" inputmode="numeric" value="${a.diasSeguimiento.join(', ')}"></label>
      <button class="btn suave" data-m="guardar-meta">Guardar</button>
    </section>

    <section class="bloque"><h2>Precios</h2><p class="mini">Escalera por línea: según cuántos clientes ya tienes en ella.</p>
      <div id="m-precios">${seccionPrecios(a)}</div><button class="btn suave" data-m="guardar-precios">Guardar precios</button></section>

    <section class="bloque"><h2>Plantillas de mensajes</h2><div id="m-plantillas">${seccionPlantillas(a)}</div></section>

    <section class="bloque"><h2>Apariencia</h2>
      <div class="segmento">${[['oscuro', 'Oscuro'], ['claro', 'Claro']].map(([k, tx]) => `<button class="${(document.documentElement.dataset.tema || 'oscuro') === k ? 'activa' : ''}" data-m="tema" data-v="${k}">${tx}</button>`).join('')}</div></section>

    <section class="bloque"><h2>Respaldo</h2>
      <p class="hoja-texto">${conectado() ? 'El respaldo se sube solo a tu repo privado.' : 'Tus datos viven solo en este teléfono.'} Último respaldo manual: ${estado.meta.ultimoRespaldo ? esc(fechaDMA(estado.meta.ultimoRespaldo)) : 'ninguno todavía'}.</p>
      <button class="btn grande primario" data-m="respaldo">Hacer respaldo</button>
      <label class="btn grande suave archivo">Cargar respaldo desde archivo<input id="m-archivo" type="file" accept=".json,application/json,text/plain" hidden></label>
      <label class="campo"><span>O pega aquí el texto del respaldo</span><textarea id="m-pegar" rows="3"></textarea></label>
      <button class="btn suave" data-m="pegar">Cargar lo pegado</button>
    </section>

    <section class="bloque"><h2>Zona de cuidado</h2><button class="btn grande peligro" data-m="borrar">Borrar todo</button></section>
    <p class="mini centro">Mi Negocio ${VERSION_APP} · <button class="enlace" data-m="actualizar">Buscar versión nueva</button></p>
    <div class="aire"></div>`;
  if (!enlazado) { enlazar(vista); enlazado = true; }
}

const leerTramos = linea => $$(`.precio-linea[data-linea="${linea}"] .tramo`).map(f => {
  const v = c => f.querySelector(`[data-c="${c}"]`).value;
  return { desde: Number(v('desde')) || 1, hasta: v('hasta') === '' ? null : Number(v('hasta')), instalacion: Number(v('instalacion')) || 0, mensual: Number(v('mensual')) || 0 };
}).filter(t => t.instalacion || t.mensual);

function enlazar(vista) {
  vista.addEventListener('change', async e => {
    if (e.target.id === 'm-archivo') { await cargarRespaldoDesdeArchivo(e.target.files[0]); e.target.value = ''; }
    if (e.target.id === 'm-pl') { plantillaSel = e.target.value; $('#m-plantillas', vista).innerHTML = seccionPlantillas(estado.ajustes); }
  });
  vista.addEventListener('click', async e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = estado.ajustes, msg = t => { const el = $('#n-msg', vista); if (el) el.textContent = t; };
    switch (b.dataset.m) {
      case 'nube-conectar': {
        const usuario = $('#n-usuario', vista).value.trim(), token = $('#n-token', vista).value.trim();
        if (!usuario || !token) return msg('Falta el usuario o el token.');
        msg('Probando…');
        const r = await conectar(usuario, token); msg(r.mensaje);
        if (r.ok) { aviso('Conectado con Claude'); pintarMas(vista); }
        break;
      }
      case 'nube-probar': { msg('Probando…'); const c = config(); const r = await probarConexion(c.usuario, c.token); msg(r.mensaje); break; }
      case 'nube-ahora': {
        msg('Sincronizando…');
        const r = await sincronizar({ silencioso: false, forzar: true });
        aviso(r.mensajes?.length ? r.mensajes.join(' · ') : r.ok ? 'Sincronizado' : (r.error || 'No se pudo subir')); pintarMas(vista); break;
      }
      case 'nube-quitar':
        if (await confirmar({ titulo: '¿Desconectar de Claude?', texto: 'Se borra el token de este teléfono. Tus datos no se tocan.', si: 'Desconectar' })) { await desconectar(); pintarMas(vista); }
        break;
      case 'tasa':
        aviso('Buscando…');
        try { await actualizarTasa(); aviso('Tasa actualizada'); } catch { aviso('No pude buscarla. Escríbela a mano.'); }
        break;
      case 'tasa-manual': {
        const crudo = $('#m-tasa', vista).value.trim();
        const v = parseFloat(crudo.includes(',') ? crudo.replace(/\./g, '').replace(',', '.') : crudo);
        if (!(v > 0)) return aviso('Escribe un número, por ejemplo 884,75');
        await fijarTasa(v); aviso('Tasa guardada'); break;
      }
      case 'guardar-meta': {
        const dias = $('#m-dias', vista).value.split(/[,\s]+/).map(Number).filter(n => n > 0);
        if (!dias.length) return aviso('Escribe los días, por ejemplo 3, 7');
        a.metaMensualUSD = Number($('#m-meta', vista).value) || 300;
        a.limiteFrioDiario = Number($('#m-limite', vista).value) || 15;
        a.diasSeguimiento = dias;
        $$('[data-cupo]', vista).forEach(i => { a.cupoDiario[i.dataset.cupo] = Number(i.value) || 0; });
        await guardarAjustes(); aviso('Guardado'); break;
      }
      case 'tramo+': {
        const cont = b.closest('.precio-linea'); b.insertAdjacentHTML('beforebegin', filaTramo({ desde: cont.querySelectorAll('.tramo').length + 1 })); break;
      }
      case 'tramo-': b.closest('.tramo').remove(); break;
      case 'guardar-precios':
        a.precios = Object.fromEntries(LINEAS.map(l => [l, leerTramos(l).map((t, i) => ({ ...t, ...(a.precios?.[l]?.[i]?.nota ? { nota: a.precios[l][i].nota } : {}) }))]).filter(([, t]) => t.length));
        await guardarAjustes(); aviso('Precios guardados'); break;
      case 'pl-guardar':
        a.plantillas[plantillaSel] = { primer: $('#m-pl-primer', vista).value.trim(), seg2: $('#m-pl-seg2', vista).value.trim(), seg3: $('#m-pl-seg3', vista).value.trim() };
        await guardarAjustes(); aviso('Plantilla guardada'); break;
      case 'pl-nueva': {
        const k = `${$('#m-pl-lin', vista).value}|${$('#m-pl-nic', vista).value.trim()}`;
        if (k.endsWith('|')) return aviso('Escribe el nicho');
        a.plantillas[k] = a.plantillas[k] || structuredClone(a.plantillas[k.split('|')[0]] || {});
        plantillaSel = k; await guardarAjustes(); $('#m-plantillas', vista).innerHTML = seccionPlantillas(a); aviso('Plantilla creada'); break;
      }
      case 'pl-quitar':
        if (await confirmar({ titulo: '¿Quitar esta plantilla?', texto: 'Los prospectos de ese nicho usarán la plantilla general de su línea.', si: 'Quitar', peligro: true })) { delete a.plantillas[plantillaSel]; plantillaSel = null; await guardarAjustes(); }
        break;
      case 'pl-restaurar':
        if (await confirmar({ titulo: '¿Volver a las de partida?', texto: 'Se pierden los cambios que hayas hecho a las plantillas.', si: 'Volver', peligro: true })) { a.plantillas = structuredClone(PLANTILLAS_BASE); plantillaSel = null; await guardarAjustes(); }
        break;
      case 'tema': {
        const v = b.dataset.v;
        try { localStorage.setItem('mn-tema', v === 'claro' ? 'claro' : ''); } catch {}
        if (v === 'claro') document.documentElement.dataset.tema = 'claro'; else delete document.documentElement.dataset.tema;
        pintarMas(vista); break;
      }
      case 'respaldo': await hacerRespaldo(); pintarMas(vista); break;
      case 'pegar': {
        const ok = await cargarRespaldoDesdeTexto($('#m-pegar', vista).value);
        if (ok) $('#m-pegar', vista).value = '';
        break;
      }
      case 'borrar':
        if (!(await confirmar({ titulo: '¿Borrar todo?', texto: 'Se borran prospectos, clientes y ajustes de este teléfono.', si: 'Sí, seguir', peligro: true }))) return;
        if (!(await confirmar({ titulo: '¿Seguro seguro?', texto: 'No hay vuelta atrás si no tienes un respaldo.', si: 'Borrar todo', peligro: true }))) return;
        await borrarTodo(); break;
      case 'actualizar': {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (!reg) return aviso('Esta versión no usa actualizaciones');
        await reg.update(); aviso('Revisando… si hay versión nueva te aviso'); break;
      }
    }
  });
}
