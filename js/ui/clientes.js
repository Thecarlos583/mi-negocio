// Clientes y cobros: lista, cobrar por WhatsApp, anotar pago, agregar y editar.
import { s, guardar } from '../datos.js';
import { hoyISO, uid, fechaCorta, aFecha } from '../util.js';
import { normalizarTelefono } from '../telefono.js';
import * as C from '../logica/cobros.js';
import { nuevoCliente } from '../logica/cambios.js';
import { linkWhatsApp } from '../logica/prospectos.js';
import { tasa } from '../tasa.js';
import { $, esc, abrirHoja, cerrarHoja, aviso, abrirWhatsApp, iconoCliente, plural } from './comun.js';

// Una fila de «Próximos cobros» (también se usa en Inicio).
export function filaCobro(x, hoy) {
  const q = x.fecha ? C.cuando(x.fecha, hoy) : null;
  const toca = !x.fecha || x.fecha <= hoy;
  const detalle = x.fecha ? `${x.concepto} · ${x.detalle}` : `${x.concepto} · ${x.detalle}`;
  return `<div class="item">
    <div class="ic">${iconoCliente(x.c)}</div>
    <div class="grow"><div class="name">${esc(x.c.negocio)}</div><div class="small">${esc(detalle)}</div></div>
    <div style="text-align:right"><div class="amt">${C.usdTxt(x.tipo === 'mensualidad' && toca ? C.debe(x.c, hoy) - C.saldoInstalacion(x.c) : x.monto)}</div>
      ${toca ? `<button class="btn wa" data-cobrar="${x.c.id}" data-tipo="${x.tipo}">Cobrar</button>${q && q.clase === 'red' ? `<div class="chip red" style="margin-top:4px">${q.texto}</div>` : ''}`
        : `<span class="chip ${q.clase}">${fechaCorta(x.fecha)} · ${q.texto}</span>`}</div>
  </div>`;
}

// El cobro que toca para un cliente: mensualidad vencida, luego instalación, luego la próxima mensualidad.
function cobroDe(c, tipo, hoy) {
  const l = C.proximosCobros([c], hoy);
  return (tipo && l.find(x => x.tipo === tipo)) || l.find(x => x.tipo === 'mensualidad' && x.fecha <= hoy) || l.find(x => x.tipo === 'instalacion') || l[0];
}

export function cobrar(id, tipo) {
  const c = s.clientes.find(x => x.id === id), hoy = hoyISO();
  if (!c) return;
  if (!c.telefono) { aviso('Falta el WhatsApp del cliente. Tócalo para agregarlo.'); return; }
  const x = cobroDe(c, tipo, hoy);
  if (!x) { aviso('Este cliente no tiene nada por cobrar.'); return; }
  abrirWhatsApp(linkWhatsApp(c.telefono, C.mensajeCobro(x, tasa(), hoy)));
}

export function pintarClientes(el) {
  const hoy = hoyISO(), activos = s.clientes.filter(c => c.estado !== 'Retirado');
  const deben = C.porCobrar(s.clientes, hoy);
  el.innerHTML = `
    <h1>Clientes</h1>
    <p class="sub">Quién te paga, cuánto y cuándo toca</p>
    <button class="btn dark full" style="margin-bottom:12px" data-nuevo-cliente>＋ Agregar cliente</button>
    <div class="card glass"><div class="row">
      <div><div class="lbl">Activos</div><div class="big" data-n="${activos.length}">${activos.length}</div></div>
      <div><div class="lbl">Fijo al mes</div><div class="big" data-n="${C.ingresoFijo(s.clientes)}" data-fmt="usd">${C.usdTxt(C.ingresoFijo(s.clientes))}</div></div>
      <div><div class="lbl">Deben</div><div class="big" ${deben ? 'style="color:#a8322e"' : ''} data-n="${deben}" data-fmt="usd">${C.usdTxt(deben)}</div></div>
    </div></div>
    ${s.clientes.length ? s.clientes.map(c => tarjeta(c, hoy)).join('') : '<div class="card glass"><p class="vacio">Todavía no tienes clientes. El primero está cerca.</p></div>'}`;
}

function tarjeta(c, hoy) {
  const chip = C.chipCliente(c, hoy), prox = C.proximaMensualidad(c), q = prox ? C.cuando(prox, hoy) : null;
  const saldo = C.saldoInstalacion(c), pagadoI = C.pagadoInstalacion(c);
  const pagos = (c.pagos || []).slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const proxTxt = prox ? fechaCorta(prox) : saldo > 0 ? (C.esPagina(c) ? 'Al aprobar' : 'Al entregar') : (C.esPagina(c) ? 'Al publicar' : 'Al entregar');
  const partes = [
    c.publicada ? `${C.palabraEntrega(c)} el ${fechaCorta(c.publicada)}` : (C.esPagina(c) ? 'Sin publicar' : 'Sin entregar'),
    c.diaCobro && c.inicioCobro ? `cobra cada ${c.diaCobro}` : '',
    pagos.length ? `pagos: ${pagos.map(p => `${C.usdTxt(p.monto)}${p.fecha ? ' · ' + fechaCorta(p.fecha) : ''}${p.metodo ? ' · ' + p.metodo.toLowerCase() : ''}`).join(', ')}` : 'sin pagos',
  ].filter(Boolean);
  const hayCobro = saldo > 0 || prox;
  return `<div class="card glass" data-cliente="${c.id}">
    <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
      <div style="min-width:0"><div class="tag">${esc(c.servicio)}</div><div class="name" style="font-size:16px">${esc(c.negocio)}</div>
        <div class="small">${esc([c.contacto, c.zona].filter(Boolean).join(' · '))}</div></div>
      <span class="chip ${chip.clase}">${chip.texto}</span>
    </div>
    <div class="row" style="margin-top:12px">
      <div><div class="lbl">Instalación</div><div class="amt" style="text-align:left">${C.usdTxt(pagadoI)} de ${C.usdTxt(c.instalacion)}</div></div>
      <div><div class="lbl">Mensualidad</div><div class="amt" style="text-align:left">${C.usdTxt(c.mensual)}</div></div>
      <div><div class="lbl">Próximo cobro</div><div class="amt" style="text-align:left">${proxTxt}</div>${q ? `<div class="small" ${q.clase === 'red' ? 'style="color:#a8322e;font-weight:700"' : ''}>${q.texto}</div>` : ''}</div>
    </div>
    <div class="bar"><b data-w="${c.instalacion ? (pagadoI / c.instalacion) * 100 : 100}"></b></div>
    <div class="small">${esc(partes.join(' · '))}</div>
    <div class="row" style="margin-top:12px;gap:8px">
      ${hayCobro ? `<button class="btn wa" style="padding:11px" data-cobrar="${c.id}">Cobrar por WhatsApp</button>` : ''}
      <button class="btn light" data-pago="${c.id}">Anotar pago</button>
    </div>
    ${!c.publicada ? `<button class="btn light full" style="margin-top:8px" data-publicar="${c.id}">Marcar como ${C.esPagina(c) ? 'publicada' : 'entregado'}</button>` : ''}
  </div>`;
}

// ---------- Formularios ----------
const opciones = (lista, actual) => lista.map(o => `<option${o === actual ? ' selected' : ''}>${esc(o)}</option>`).join('');
const num = v => (v === '' || v == null ? '' : String(v).replace('.', ','));
const leerNum = v => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const leerNumSuelto = v => { const t = String(v).trim(); if (!t) return 0; return /,/.test(t) ? leerNum(t) : parseFloat(t) || 0; };

// datos: cliente existente o datos iniciales (desde «Es cliente»). alGuardar(c) se llama al crear.
export function formCliente(c = null, { datos = {}, alGuardar } = {}) {
  const nuevo = !c, v = c || { servicio: 'Página web', ...datos };
  const sug = nuevo ? C.precioSugerido(v.servicio, v.linea, s.clientes) : {};
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>${nuevo ? 'Nuevo cliente' : esc(c.negocio)}</h3><button class="link" data-cerrar>Cerrar</button></div>
    <form id="f-cliente">
      <label class="f">Negocio<input name="negocio" required value="${esc(v.negocio || '')}" placeholder="Posada Los Pinos"></label>
      <div class="row"><label class="f">Contacto<input name="contacto" value="${esc(v.contacto || '')}" placeholder="Sr. Pedro"></label>
        <label class="f">Zona<input name="zona" value="${esc(v.zona || '')}" placeholder="Mérida"></label></div>
      <label class="f">WhatsApp<input name="telefono" inputmode="tel" value="${esc(v.telefono ? '+' + v.telefono : '')}" placeholder="0414 000 0000"></label>
      <label class="f">Servicio<select name="servicio">${opciones(C.SERVICIOS, v.servicio)}</select></label>
      <div class="row"><label class="f">Instalación $<input name="instalacion" inputmode="decimal" value="${num(v.instalacion ?? sug.instalacion)}" placeholder="60"></label>
        ${nuevo ? `<label class="f">Ya pagó $<input name="pagado" inputmode="decimal" placeholder="30"></label>` : `<label class="f">Mensualidad $<input name="mensual" inputmode="decimal" value="${num(v.mensual)}"></label>`}</div>
      ${nuevo ? `<div class="row"><label class="f">Fecha del pago<input name="fechaPago" type="date" value="${hoyISO()}"></label>
        <label class="f">Cómo pagó<select name="metodo">${opciones(C.FORMAS_PAGO)}</select></label></div>
        <div class="row"><label class="f">Mensualidad $<input name="mensual" inputmode="decimal" value="${num(v.mensual ?? sug.mensual)}" placeholder="20"></label>
        <label class="f">Cobra el día<input name="diaCobro" inputmode="numeric" placeholder="14"></label></div>`
      : `<div class="row"><label class="f">Cobra el día<input name="diaCobro" inputmode="numeric" value="${v.diaCobro || ''}" placeholder="Al publicar"></label>
        <label class="f">${C.palabraEntrega(v)} el<input name="publicada" type="date" value="${v.publicada || ''}"></label></div>`}
      <button class="btn dark full" style="margin-top:8px" type="submit">Guardar cliente</button>
      ${!nuevo ? listaPagos(c) : ''}
    </form>`);
  const f = $('#f-cliente', cuerpo);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const dia = Math.min(31, Math.max(0, parseInt(d.diaCobro, 10) || 0)) || null;
    const base = { negocio: d.negocio.trim(), contacto: d.contacto.trim(), zona: d.zona.trim(), telefono: normalizarTelefono(d.telefono), servicio: d.servicio,
      instalacion: leerNumSuelto(d.instalacion), mensual: leerNumSuelto(d.mensual) };
    if (nuevo) {
      const x = nuevoCliente({ ...base, linea: v.linea, alta: d.fechaPago || hoyISO() });
      x.diaCobro = dia;
      const pagado = leerNumSuelto(d.pagado);
      if (pagado > 0) x.pagos.push({ id: uid(), fecha: d.fechaPago || hoyISO(), monto: pagado, concepto: 'Instalación', metodo: d.metodo, tasa: tasa()?.usd || null });
      s.clientes.push(x);
      alGuardar?.(x);
      aviso(`${x.negocio} quedó en tus clientes`);
    } else {
      const diaCambio = dia !== c.diaCobro, pubCambio = (d.publicada || null) !== c.publicada;
      Object.assign(c, base);
      if (pubCambio && d.publicada && !C.pagosDe(c, 'Mensualidad').length) { c.diaCobro = dia; C.marcarPublicada(c, d.publicada); }
      else if (pubCambio && !d.publicada) { c.publicada = null; c.inicioCobro = null; c.diaCobro = dia; }
      else if (diaCambio) {
        c.diaCobro = dia;
        const prox = C.proximaMensualidad(c);
        if (prox && dia) { const p = aFecha(prox); C.fijarProximoCobro(c, C.fechaConDia(p.getFullYear(), p.getMonth(), dia)); }
      }
      aviso('Cliente guardado');
    }
    cerrarHoja(true);
    await guardar();
  });
  cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-borrar-pago]'); if (!b) return;
    e.preventDefault();
    c.pagos = c.pagos.filter(p => p.id !== b.dataset.borrarPago);
    b.closest('.item').remove();
    aviso('Pago borrado'); await guardar();
  });
}

function listaPagos(c) {
  const pagos = (c.pagos || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  if (!pagos.length) return '';
  return `<div class="sec" style="margin-top:18px"><h3>Pagos</h3></div>${pagos.map(p => `<div class="item">
    <div class="grow"><div class="name">${C.usdTxt(p.monto)} · ${esc(p.concepto)}</div><div class="small">${esc([p.fecha ? fechaCorta(p.fecha) : 'sin fecha', p.metodo].filter(Boolean).join(' · '))}</div></div>
    <button class="link" type="button" data-borrar-pago="${p.id}">Borrar</button></div>`).join('')}`;
}

export function formPago(id) {
  const c = s.clientes.find(x => x.id === id), hoy = hoyISO();
  if (!c) return;
  const saldo = C.saldoInstalacion(c), vencidas = C.mensualidadesVencidas(c, hoy).length;
  const concepto = saldo > 0 && !vencidas ? 'Instalación' : 'Mensualidad';
  const monto = concepto === 'Instalación' ? saldo : c.mensual;
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>Anotar pago · ${esc(c.negocio)}</h3><button class="link" data-cerrar>Cerrar</button></div>
    <form id="f-pago">
      <div class="row"><label class="f">Monto $<input name="monto" inputmode="decimal" required value="${num(monto)}"></label>
        <label class="f">Fecha<input name="fecha" type="date" value="${hoy}"></label></div>
      <div class="row"><label class="f">Concepto<select name="concepto">${opciones(['Mensualidad', 'Instalación'], concepto)}</select></label>
        <label class="f">Cómo pagó<select name="metodo">${opciones(C.FORMAS_PAGO)}</select></label></div>
      <button class="btn dark full" style="margin-top:8px" type="submit">Guardar pago</button>
    </form>`);
  const f = $('#f-pago', cuerpo);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), m = leerNumSuelto(d.monto);
    if (!(m > 0)) { aviso('Escribe el monto'); return; }
    c.pagos.push({ id: uid(), fecha: d.fecha || hoy, monto: m, concepto: d.concepto, metodo: d.metodo, tasa: tasa()?.usd || null });
    cerrarHoja(true);
    aviso(`Pago de ${C.usdTxt(m)} anotado`);
    await guardar();
  });
}

export function formPublicar(id) {
  const c = s.clientes.find(x => x.id === id);
  if (!c) return;
  const palabra = C.esPagina(c) ? 'publicada' : 'entregado';
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>${esc(c.negocio)}</h3><button class="link" data-cerrar>Cerrar</button></div>
    <p class="small" style="margin-bottom:6px">La mensualidad empieza 30 días después. La app fija sola el día de cobro.</p>
    <form id="f-pub"><label class="f">${palabra[0].toUpperCase() + palabra.slice(1)} el<input name="fecha" type="date" value="${hoyISO()}"></label>
      <button class="btn dark full" style="margin-top:8px" type="submit">Marcar como ${palabra}</button></form>`);
  $('#f-pub', cuerpo).addEventListener('submit', async e => {
    e.preventDefault();
    C.marcarPublicada(c, new FormData(e.target).get('fecha') || hoyISO());
    cerrarHoja(true);
    aviso(`Listo. Primer cobro: ${fechaCorta(c.inicioCobro)}, y después cada ${c.diaCobro}`);
    await guardar();
  });
}

// Toques en cualquier parte de la app.
document.addEventListener('click', e => {
  const t = e.target;
  const cob = t.closest('[data-cobrar]'); if (cob) { cobrar(cob.dataset.cobrar, cob.dataset.tipo); return; }
  const pag = t.closest('[data-pago]'); if (pag) { formPago(pag.dataset.pago); return; }
  const pub = t.closest('[data-publicar]'); if (pub) { formPublicar(pub.dataset.publicar); return; }
  if (t.closest('[data-nuevo-cliente]')) { formCliente(); return; }
  const tar = t.closest('[data-cliente]'); if (tar && !t.closest('button')) formCliente(s.clientes.find(c => c.id === tar.dataset.cliente));
});
