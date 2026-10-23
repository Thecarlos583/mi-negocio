// Más: ajustes básicos y respaldo (el módulo 8 lo completa con plantillas y precios).
import { estado, guardarAjustes, borrarTodo } from '../estado.js';
import { esc, fechaDMA } from '../util.js';
import { aviso, confirmar, $ } from './comun.js';
import { actualizarTasa, fijarTasa } from '../tasa.js';
import { hacerRespaldo, cargarRespaldoDesdeArchivo, cargarRespaldoDesdeTexto } from './respaldo.js';

export const VERSION_APP = 'v1';

export function pintarMas(vista) {
  const a = estado.ajustes, t = a.tasaBCV;
  vista.innerHTML = `
    <header class="hoy-cab"><div><p class="eyebrow">Ajustes</p><h1>Más</h1></div></header>

    <section class="bloque"><h2>Tasa BCV</h2>
      <p class="hoja-texto">${t ? `Bs ${t.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} por dólar, del ${esc(fechaDMA(t.fecha))}` : 'Todavía no hay tasa guardada.'}</p>
      <button class="btn grande primario" data-m="tasa">Actualizar tasa</button>
      <div class="dos"><label class="campo"><span>O escríbela a mano</span><input id="m-tasa" type="text" inputmode="decimal" placeholder="Ej: 884,75"></label>
      <button class="btn suave alinear" data-m="tasa-manual">Guardar</button></div>
    </section>

    <section class="bloque"><h2>Meta y límites</h2>
      <div class="dos"><label class="campo"><span>Meta mensual ($)</span><input id="m-meta" type="number" inputmode="numeric" value="${a.metaMensualUSD}"></label>
      <label class="campo"><span>Mensajes en frío al día</span><input id="m-limite" type="number" inputmode="numeric" value="${a.limiteFrioDiario}"></label></div>
      <div class="dos"><label class="campo"><span>Días para dar por frío (reactivar)</span><input id="m-reac" type="number" inputmode="numeric" value="${a.diasReactivar}"></label><span></span></div>
      <button class="btn suave" data-m="guardar-meta">Guardar</button>
    </section>

    <section class="bloque"><h2>Respaldo</h2>
      <p class="hoja-texto">Último respaldo: ${estado.meta.ultimoRespaldo ? esc(fechaDMA(estado.meta.ultimoRespaldo)) : 'ninguno todavía'}. Tus datos viven solo en este teléfono.</p>
      <button class="btn grande primario" data-m="respaldo">Hacer respaldo</button>
      <label class="btn grande suave archivo">Cargar respaldo desde archivo<input id="m-archivo" type="file" accept=".json,application/json,text/plain" hidden></label>
      <label class="campo"><span>O pega aquí el texto del respaldo</span><textarea id="m-pegar" rows="3"></textarea></label>
      <button class="btn suave" data-m="pegar">Cargar lo pegado</button>
    </section>

    <section class="bloque"><h2>Zona de cuidado</h2>
      <button class="btn grande peligro" data-m="borrar">Borrar todo</button>
    </section>
    <p class="mini centro">Mi Negocio ${VERSION_APP} · <button class="enlace" data-m="actualizar">Buscar versión nueva</button></p>
    <div class="aire"></div>`;
  if (!vista.dataset.enlazado) { enlazar(vista); vista.dataset.enlazado = '1'; }
}

function enlazar(vista) {
  vista.addEventListener('change', async e => {
    if (e.target.id === 'm-archivo') { await cargarRespaldoDesdeArchivo(e.target.files[0]); e.target.value = ''; }
  });
  vista.addEventListener('click', async e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = estado.ajustes;
    switch (b.dataset.m) {
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
      case 'guardar-meta':
        a.metaMensualUSD = Number($('#m-meta', vista).value) || 300;
        a.limiteFrioDiario = Number($('#m-limite', vista).value) || 15;
        a.diasReactivar = Number($('#m-reac', vista).value) || 90;
        await guardarAjustes(); aviso('Guardado'); break;
      case 'respaldo': await hacerRespaldo(); pintarMas(vista); break;
      case 'pegar': {
        const ok = await cargarRespaldoDesdeTexto($('#m-pegar', vista).value);
        if (ok) $('#m-pegar', vista).value = '';
        break;
      }
      case 'borrar': {
        if (!(await confirmar({ titulo: '¿Borrar todo?', texto: 'Se borran prospectos, clientes y ajustes de este teléfono.', si: 'Sí, seguir', peligro: true }))) return;
        if (!(await confirmar({ titulo: '¿Seguro seguro?', texto: 'No hay vuelta atrás si no tienes un respaldo.', si: 'Borrar todo', peligro: true }))) return;
        await borrarTodo(); break;
      }
      case 'actualizar': {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (!reg) return aviso('Esta versión no usa actualizaciones');
        await reg.update(); aviso('Revisando… si hay versión nueva te aviso');
        break;
      }
    }
  });
}
