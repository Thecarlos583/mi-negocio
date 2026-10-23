// Pantalla Hoy.
import { estado, buscarProspecto, respaldoVencido } from '../estado.js';
import { calcularHoy } from '../hoy-logic.js';
import { hoyISO, esc, usd, fechaLarga, fechaCorta, fechaDMA } from '../util.js';
import { fila, enlazarFilas } from './filas.js';
import { abrirDatosCliente } from './cliente-datos.js';
import { abrirCliente } from './clientes.js';
import { hacerRespaldo } from './respaldo.js';
import { aviso } from './comun.js';
import { actualizarTasa } from '../tasa.js';

const VISIBLES = 8;
const abiertos = new Set();   // bloques con «ver todos» abierto
let enlazado = false;

const bloque = (clave, titulo, items, pintar, { vacio = '', nota = '' } = {}) => {
  if (!items.length && !vacio) return '';
  const todos = abiertos.has(clave);
  const lista = todos ? items : items.slice(0, VISIBLES);
  return `<section class="bloque"><h2>${titulo} <span class="cuenta">${items.length}</span></h2>${nota ? `<p class="mini">${nota}</p>` : ''}
    ${items.length ? lista.map(pintar).join('') : `<p class="vacio">${vacio}</p>`}
    ${items.length > VISIBLES ? `<button class="ver-mas" data-vermas="${clave}">${todos ? 'Ver menos' : `Ver los ${items.length}`}</button>` : ''}</section>`;
};

const barra = (valor, meta) => `<div class="barra"><i style="width:${Math.min(100, meta ? (valor / meta) * 100 : 0)}%"></i></div>`;

function encabezado(h, hoy) {
  const t = estado.ajustes.tasaBCV, m = h.meta;
  return `<header class="hoy-cab">
    <div><p class="eyebrow">${esc(fechaLarga(hoy))}</p><h1>Hoy</h1></div>
    <button class="tasa" data-hoy="tasa" aria-label="Actualizar tasa BCV">
      <small>Tasa BCV${t && t.fecha !== hoy ? ' · ' + esc(fechaCorta(t.fecha)) : ''}</small>
      <b>${t ? 'Bs ' + t.usd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Sin tasa'}</b>
    </button>
  </header>
  <section class="meta-tarjeta">
    <div class="meta-fila"><span>Cobrado este mes</span><b>${usd(m.cobrado)} <small>de ${usd(m.objetivo)}</small></b></div>${barra(m.cobrado, m.objetivo)}
    <div class="meta-fila"><span>Ingreso recurrente</span><b>${usd(m.recurrente)} <small>de ${usd(m.objetivo)}</small></b></div>${barra(m.recurrente, m.objetivo)}
  </section>`;
}

const FALTA = { fechaPublicacion: 'fecha de publicación' };

function urgente(h, hoy) {
  const items = [...h.urgente];
  if (respaldoVencido(hoy)) items.push({ tipo: 'respaldo' });
  const resumen = estado.resumenes.filter(r => !r.visto).sort((a, b) => b.desde.localeCompare(a.desde))[0];
  const tarjetaResumen = resumen ? `<article class="fila tarjeta-alerta" data-ir="semana"><div class="fila-txt"><h4>Tu resumen de la semana está listo</h4><p class="fila-sub">Del ${esc(fechaCorta(resumen.desde))} al ${esc(fechaCorta(resumen.hasta))}. Tócalo para verlo.</p></div></article>` : '';
  return tarjetaResumen + bloque('urgente', 'Urgente', items, u => {
    if (u.tipo === 'llamada') return fila(u.p, { acciones: ['wa'], sub: `<b class="aviso-txt">${u.p.proximaFecha === hoy ? 'Hoy' : fechaCorta(u.p.proximaFecha)}${u.p.proximaHora ? ' a las ' + esc(u.p.proximaHora) : ''}</b> · ${esc(u.p.proximoPaso || 'Llamada')}` });
    if (u.tipo === 'pago') return fila(u.p, { acciones: ['wa'], sub: `<b class="aviso-txt">Por cobrar</b> · ${esc(u.p.proximoPaso || u.p.nota || '')}` });
    if (u.tipo === 'cobro') return `<article class="fila tarjeta-alerta" data-cliente="${esc(u.cliente.id)}"><div class="fila-txt"><h4>${esc(u.cliente.negocio)}</h4><p class="fila-sub"><b class="aviso-txt">${esc(u.estado.texto)}</b> · mensualidad ${usd(u.cliente.mensual || 0)}${u.estado.aviso ? ` · ${esc(u.estado.aviso)}` : ''}</p></div><div class="fila-acc"><button class="mini-btn">Cobrar</button></div></article>`;
    if (u.tipo === 'datos') return `<article class="fila tarjeta-alerta" data-datos="${esc(u.cliente.id)}"><div class="fila-txt"><h4>Completa los datos de ${esc(u.cliente.negocio)}</h4><p class="fila-sub">Falta: ${u.cliente.pendienteConfirmar.map(x => esc(FALTA[x] || x)).join(', ')}</p></div><div class="fila-acc"><button class="mini-btn" data-datos-btn="${esc(u.cliente.id)}">Completar</button></div></article>`;
    return `<article class="fila tarjeta-alerta"><div class="fila-txt"><h4>Hace tiempo sin respaldo</h4><p class="fila-sub">Guarda una copia de tus datos para no perderlos.</p></div><div class="fila-acc"><button class="mini-btn" data-hoy="respaldo">Hacer respaldo</button></div></article>`;
  });
}

const msgPrevia = p => (p.mensaje ? `<span class="msg-previa">${esc(p.mensaje)}</span>` : esc(p.proximoPaso || ''));

function primeros(h, hoy) {
  const pr = h.primeros, todos = abiertos.has('prim');
  const lista = todos ? pr.lista : pr.lista.slice(0, VISIBLES);
  const cab = pr.tanda ? `<div class="tanda-cab"><span class="eyebrow">Tanda del día</span><b>${esc(pr.tanda.nombre)}</b><small>${esc(fechaDMA(pr.tanda.fecha))}</small></div>` : '';
  return `<section class="bloque"><h2>Primeros mensajes de hoy</h2>
    <div class="contador"><b class="${pr.llegoAlLimite ? 'lleno' : ''}">${pr.enviados}</b><span>de ${pr.limite}</span></div>
    <div class="cupos">${Object.entries(pr.porLinea).map(([l, c]) => `<span class="cupo ${c.enviados >= c.cupo ? 'ok' : ''}" style="--c:var(--${l === 'Páginas' ? 'paginas' : l === 'Sistemas' ? 'sistemas' : 'afuera'})"><i></i>${esc(l)} <b>${c.enviados}/${c.cupo}</b></span>`).join('')}</div>
    ${pr.llegoAlLimite ? `<p class="alerta-suave">Ya mandaste ${pr.limite} en frío hoy. Para cuidar el número, sigue mañana.</p>` : ''}
    ${cab}
    ${pr.lista.length ? lista.map(p => fila(p, { acciones: ['wa'], sub: msgPrevia(p) })).join('') : '<p class="vacio">No hay tanda para hoy. Pídele a Claude la tanda del día e impórtala con el botón +.</p>'}
    ${pr.lista.length > VISIBLES ? `<button class="ver-mas" data-vermas="prim">${todos ? 'Ver menos' : `Ver los ${pr.lista.length}`}</button>` : ''}
    ${pr.reservas.length ? `<details class="reservas"><summary>Reservas <span class="cuenta">${pr.reservas.length}</span><small>Ábrelas solo si te faltan negocios para completar el cupo</small></summary>${pr.reservas.map(p => fila(p, { acciones: ['wa'], sub: esc(p.origenes.slice(-1)[0] || ''), extra: '<span class="chip-reserva">reserva</span>' })).join('')}</details>` : ''}
  </section>`;
}

export function pintarHoy(vista) {
  const hoy = hoyISO();
  const h = calcularHoy(estado, hoy);

  const interesados = bloque('interesados', 'Interesados', h.interesados, p =>
    fila(p, { acciones: ['wa', 'seguir', 'muerto'], sub: esc(p.proximoPaso || p.nota || 'Sin próximo paso') + (p.proximaFecha ? ` · <i>${p.proximaFecha === hoy ? 'hoy' : 'desde ' + fechaCorta(p.proximaFecha)}</i>` : '') }),
    { vacio: h.proximos.length ? '' : 'Nadie por atender hoy.' });
  const proximos = bloque('proximos', 'Próximos días', h.proximos, p =>
    fila(p, { acciones: ['wa'], sub: `${esc(p.proximoPaso || '')} · <i>${esc(fechaCorta(p.proximaFecha))}</i>` }));
  const seguimientos = bloque('seg', 'Seguimientos de hoy', h.seguimientos, ({ p, atraso }) =>
    fila(p, { acciones: ['wa', 'resp', 'seguir', 'muerto'], sub: `Toque ${p.toques + 1} · ${atraso > 0 ? `atrasado ${atraso} día${atraso > 1 ? 's' : ''}` : 'toca hoy'}` }),
    { vacio: 'No hay seguimientos pendientes.', nota: h.seguimientos.length > 10 ? 'Hay muchos atrasados: haz estos antes de mandar una tanda nueva.' : '' });
  const cerrar = bloque('cerrar', 'Por decidir', h.paraCerrar, p =>
    fila(p, { acciones: ['seguir', 'muerto', 'resp'], sub: `Ya recibió los ${p.toques} mensajes desde el ${esc(fechaCorta(p.primerContacto))} y no respondió` }),
    { nota: 'Ya les escribiste todos los seguimientos. ¿Sigues o los das por muertos?' });

  vista.innerHTML = `${encabezado(h, hoy)}${urgente(h, hoy)}${interesados}${proximos}${seguimientos}${cerrar}${primeros(h, hoy)}<div class="aire"></div>`;
  if (!enlazado) { enlazar(vista); enlazado = true; }
}

function enlazar(vista) {
  enlazarFilas(vista, buscarProspecto);
  vista.addEventListener('click', async e => {
    const vm = e.target.closest('[data-vermas]');
    if (vm) { const k = vm.dataset.vermas; abiertos.has(k) ? abiertos.delete(k) : abiertos.add(k); return pintarHoy(vista); }
    const dat = e.target.closest('[data-datos]');
    if (dat) { const c = estado.clientes.find(c => c.id === dat.dataset.datos); if (c) abrirDatosCliente(c); return; }
    const cli = e.target.closest('[data-cliente]');
    if (cli) { const c = estado.clientes.find(c => c.id === cli.dataset.cliente); if (c) abrirCliente(c.id); return; }
    const ir = e.target.closest('[data-ir]');
    if (ir) { location.hash = ir.dataset.ir; return; }
    const h = e.target.closest('[data-hoy]');
    if (!h) return;
    if (h.dataset.hoy === 'respaldo') return hacerRespaldo();
    if (h.dataset.hoy === 'tasa') {
      aviso('Buscando la tasa…');
      try { const v = await actualizarTasa(); aviso(`Tasa BCV: Bs ${v.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`); }
      catch { aviso('No pude buscarla. Escríbela a mano en Más.'); }
    }
  });
}
