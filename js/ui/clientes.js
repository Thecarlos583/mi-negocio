// Clientes y cobros: lista con estado de cobro, ficha del cliente, recordatorio por WhatsApp y edición.
import { estado, guardarCliente } from '../estado.js';
import { abrirHoja, repintarHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc, hoyISO, usd, bs, fechaDMA, fechaCorta } from '../util.js';
import { estadoCobro, saldoInstalacion, restanteCiclo, totalPorMes, mensajeCobro, proximoCobro } from '../cobros.js';
import { ingresoRecurrente, cobradoDelMes } from '../metas.js';
import { urlWhatsApp } from '../mensajes.js';
import { tasaActual } from '../tasa.js';
import { abrirPago } from './pago.js';
import { abrirDatosCliente } from './cliente-datos.js';
import { abrirFicha } from './ficha.js';

const ORDEN = { vencido: 0, hoy: 1, 'sin-fecha': 2, aldia: 3 };
let enlazado = false, actualId = null;

const chipCobro = e => `<span class="chip cobro-${e.clave}">${esc(e.texto)}</span>`;

export function pintarClientes(vista) {
  const hoy = hoyISO();
  const lista = estado.clientes.map(c => ({ c, e: estadoCobro(c, hoy) })).sort((a, b) => ORDEN[a.e.clave] - ORDEN[b.e.clave] || (a.e.dias ?? 999) - (b.e.dias ?? 999));
  const meses = totalPorMes(estado.clientes);
  vista.innerHTML = `
    <header class="hoy-cab"><div><p class="eyebrow">${estado.clientes.length} cliente${estado.clientes.length === 1 ? '' : 's'}</p><h1>Clientes</h1></div></header>
    <section class="meta-tarjeta">
      <div class="meta-fila"><span>Ingreso recurrente</span><b>${usd(ingresoRecurrente(estado.clientes))}<small>/mes</small></b></div>
      <div class="meta-fila"><span>Cobrado este mes</span><b>${usd(cobradoDelMes(estado.clientes, hoy))}</b></div>
    </section>
    <section class="bloque">
      ${lista.length ? lista.map(({ c, e }) => `
        <article class="fila tarjeta-cliente" data-cli="${esc(c.id)}">
          <div class="fila-txt"><h4>${esc(c.negocio)}</h4>
            <p class="fila-sub">${esc(c.servicio || c.linea)} · ${usd(c.mensual || 0)}/mes</p>
            <div class="fila-meta">${chipCobro(e)}${saldoInstalacion(c) > 0 ? `<span>Instalación: faltan ${usd(saldoInstalacion(c))}</span>` : ''}${(c.pendienteConfirmar || []).length ? '<span class="aviso-txt">Faltan datos</span>' : ''}</div>
          </div></article>`).join('') : '<p class="vacio">Todavía no tienes clientes. Cuando un prospecto pase a Cliente, aparece aquí con sus cobros.</p>'}
    </section>
    ${meses.length ? `<details class="reservas"><summary>Cobrado por mes</summary>${meses.map(m => `<div class="linea-dato"><span>${esc(m.mes)}</span><b>${usd(m.total)}</b></div>`).join('')}</details>` : ''}
    <div class="aire"></div>`;
  if (!enlazado) {
    vista.addEventListener('click', e => { const t = e.target.closest('[data-cli]'); if (t) abrirCliente(t.dataset.cli); });
    enlazado = true;
  }
}

const buscar = id => estado.clientes.find(c => c.id === id);

function htmlCliente(c) {
  const hoy = hoyISO(), e = estadoCobro(c, hoy), tasa = tasaActual();
  const pagos = [...(c.pagos || [])].sort((a, b) => (b.fecha || '9').localeCompare(a.fecha || '9'));
  return `
    <p class="eyebrow">${esc(c.linea)} · ${esc(c.estado)}</p>
    <h3 class="hoja-titulo">${esc(c.negocio)}</h3>
    <p class="hoja-texto">${esc(c.servicio || '')}${c.contactoNombre ? ' · ' + esc(c.contactoNombre) : ''}</p>
    ${c.url ? `<a class="enlace-url" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url.replace(/^https?:\/\//, ''))}</a>` : ''}
    <div class="cobro-caja ${e.clave}"><b>${esc(e.texto)}</b>${e.fecha ? `<span>Próximo cobro: ${esc(fechaDMA(e.fecha))}</span>` : ''}${e.aviso ? `<strong>${esc(e.aviso)}</strong>` : ''}</div>
    <div class="linea-dato"><span>Mensualidad</span><b>${usd(c.mensual || 0)}${tasa ? ` · ${bs((c.mensual || 0) * tasa)}` : ''}</b></div>
    ${restanteCiclo(c) && restanteCiclo(c) < c.mensual ? `<div class="linea-dato"><span>Del mes actual faltan</span><b>${usd(restanteCiclo(c))}</b></div>` : ''}
    <div class="linea-dato"><span>Instalación</span><b>${usd(c.instalacion || 0)}${saldoInstalacion(c) > 0 ? ` · faltan ${usd(saldoInstalacion(c))}` : ' · pagada'}</b></div>
    ${(c.pendienteConfirmar || []).length ? `<button class="btn suave ancho" data-k="datos">Completar datos pendientes</button>` : ''}
    <div class="botones-fila"><button class="btn primario" data-k="pago">Registrar pago</button><button class="btn wa" data-k="cobro">Recordar cobro</button></div>
    <div class="botones-fila"><button class="btn suave" data-k="editar">Editar</button>${c.prospectoId ? '<button class="btn suave" data-k="prospecto">Ver prospecto</button>' : ''}</div>
    ${c.nota ? `<p class="nota-caja">${esc(c.nota)}</p>` : ''}
    <h4 class="sub">Pagos <span class="mini">${pagos.length}</span></h4>
    <ol class="historial">${pagos.map(p => `<li><time>${p.fecha ? esc(fechaDMA(p.fecha)) : 'Sin fecha'} · ${esc(p.metodo || 'método sin anotar')}</time><span>${esc(p.concepto || 'Pago')}: <b>${usd(p.monto || 0)}</b>${p.bs ? ` (${bs(p.bs)} a ${p.tasa})` : ''}</span></li>`).join('') || '<li><span class="mini">Sin pagos registrados</span></li>'}</ol>`;
}

export function abrirCliente(id) {
  actualId = id;
  const cuerpo = abrirHoja(htmlCliente(buscar(id)), { alCerrar: () => { actualId = null; } });
  cuerpo.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const c = buscar(actualId); if (!c) return;
    switch (b.dataset.k) {
      case 'pago': return abrirPago(c);
      case 'cobro': return abrirRecordatorio(c);
      case 'editar': return abrirEditar(c);
      case 'datos': return abrirDatosCliente(c);
      case 'prospecto': { const p = estado.prospectos.find(x => x.id === c.prospectoId); if (p) { cerrarHoja(true); abrirFicha(p.id); } }
    }
  });
}

function abrirRecordatorio(c) {
  const tasa = tasaActual();
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Recordar cobro</p><h3 class="hoja-titulo">${esc(c.negocio)}</h3>
    ${tasa ? '' : '<p class="nota-caja">No hay tasa BCV guardada: el mensaje va solo en dólares. Actualízala en Hoy o en Más.</p>'}
    <label class="campo"><span>Puedes editarlo antes de enviarlo</span><textarea id="r-texto" rows="6">${esc(mensajeCobro(c, tasa, hoyISO()))}</textarea></label>
    <button class="btn grande wa" id="r-abrir">Abrir WhatsApp</button>`);
  $('#r-abrir', cuerpo).addEventListener('click', () => {
    if (!c.telefono) return aviso('Este cliente no tiene número guardado');
    window.open(urlWhatsApp(c.telefono, $('#r-texto', cuerpo).value.trim()), '_blank', 'noopener');
  });
}

function abrirEditar(c) {
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Editar cliente</p><h3 class="hoja-titulo">${esc(c.negocio)}</h3>
    <label class="campo"><span>Servicio</span><input id="e-serv" value="${esc(c.servicio || '')}"></label>
    <label class="campo"><span>Enlace</span><input id="e-url" type="url" value="${esc(c.url || '')}"></label>
    <div class="dos">
      <label class="campo"><span>Instalación ($)</span><input id="e-inst" type="number" inputmode="decimal" step="0.01" value="${c.instalacion ?? ''}"></label>
      <label class="campo"><span>Mensualidad ($)</span><input id="e-mens" type="number" inputmode="decimal" step="0.01" value="${c.mensual ?? ''}"></label>
    </div>
    <div class="dos">
      <label class="campo"><span>Fecha de publicación</span><input id="e-pub" type="date" value="${esc(c.fechaPublicacion || '')}"></label>
      <label class="campo"><span>Próximo cobro</span><input id="e-cobro" type="date" value="${esc(proximoCobro(c))}"></label>
    </div>
    <label class="campo"><span>Estado</span><select id="e-est">${['Activo', 'Pausado', 'Cancelado'].map(x => `<option ${x === c.estado ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="campo"><span>Contacto</span><input id="e-cont" value="${esc(c.contactoNombre || '')}"></label>
    <label class="campo"><span>Notas</span><textarea id="e-nota" rows="2">${esc(c.nota || '')}</textarea></label>
    <button class="btn grande primario" id="e-guardar">Guardar</button>`);
  $('#e-guardar', cuerpo).addEventListener('click', async () => {
    Object.assign(c, {
      servicio: $('#e-serv', cuerpo).value.trim(), url: $('#e-url', cuerpo).value.trim(),
      instalacion: Number($('#e-inst', cuerpo).value) || 0, mensual: Number($('#e-mens', cuerpo).value) || 0,
      fechaPublicacion: $('#e-pub', cuerpo).value || null, proximoCobro: $('#e-cobro', cuerpo).value || '',
      estado: $('#e-est', cuerpo).value, contactoNombre: $('#e-cont', cuerpo).value.trim(), nota: $('#e-nota', cuerpo).value.trim(),
    });
    if (c.fechaPublicacion) c.pendienteConfirmar = (c.pendienteConfirmar || []).filter(x => x !== 'fechaPublicacion');
    const cobro = proximoCobro(c); if (cobro) c.diaCobro = Number(cobro.slice(8));
    await guardarCliente(c); cerrarHoja(true); aviso('Guardado'); abrirCliente(c.id);
  });
}
