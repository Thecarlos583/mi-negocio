// Pantalla Hoy.
import { estado, buscarProspecto, respaldoVencido } from '../estado.js';
import { calcularHoy, esReserva } from '../hoy-logic.js';
import { hoyISO, esc, usd, fechaLarga, fechaCorta, difDias } from '../util.js';
import { fila, enlazarFilas } from './filas.js';
import { abrirFicha } from './ficha.js';
import { abrirDatosCliente } from './cliente-datos.js';
import { hacerRespaldo } from './respaldo.js';
import { aviso, $ } from './comun.js';
import { actualizarTasa } from '../tasa.js';
import { estadoCobro } from '../cobros.js';

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
  const t = estado.ajustes.tasaBCV;
  const m = h.meta;
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

function urgente(h, hoy) {
  const items = [...h.urgente];
  if (respaldoVencido(hoy)) items.push({ tipo: 'respaldo' });
  return bloque('urgente', 'Urgente', items, u => {
    if (u.tipo === 'llamada') return fila(u.p, { acciones: ['wa'], sub: `<b class="aviso-txt">${u.p.proximaFecha === hoy ? 'Hoy' : fechaCorta(u.p.proximaFecha)}${u.p.proximaHora ? ' a las ' + esc(u.p.proximaHora) : ''}</b> · ${esc(u.p.proximoPaso || 'Llamada')}` });
    if (u.tipo === 'pago') return fila(u.p, { acciones: ['wa'], sub: `<b class="aviso-txt">Por cobrar</b> · ${esc(u.p.proximoPaso || u.p.nota || '')}` });
    if (u.tipo === 'cobro') return `<article class="fila tarjeta-alerta" data-c="${esc(u.cliente.id)}"><div class="fila-txt"><h4>${esc(u.cliente.negocio)}</h4><p class="fila-sub"><b class="aviso-txt">${esc(u.estado.texto)}</b> · mensualidad ${usd(u.cliente.mensual || 0)}</p></div></article>`;
    if (u.tipo === 'datos') return `<article class="fila tarjeta-alerta" data-datos="${esc(u.cliente.id)}"><div class="fila-txt"><h4>Completa los datos de ${esc(u.cliente.negocio)}</h4><p class="fila-sub">Falta: ${u.cliente.pendienteConfirmar.map(x => esc(x === 'fechaPublicacion' ? 'fecha de publicación' : x)).join(', ')}</p></div><div class="fila-acc"><button class="mini-btn" data-datos-btn="${esc(u.cliente.id)}">Completar</button></div></article>`;
    return `<article class="fila tarjeta-alerta"><div class="fila-txt"><h4>Hace tiempo sin respaldo</h4><p class="fila-sub">Guarda una copia de tus datos para no perderlos.</p></div><div class="fila-acc"><button class="mini-btn" data-hoy="respaldo">Hacer respaldo</button></div></article>`;
  });
}

export function pintarHoy(vista) {
  const hoy = hoyISO();
  const h = calcularHoy(estado, hoy);
  const { primeros: pr } = h;
  const enc = encabezado(h, hoy);

  const interesados = bloque('interesados', 'Interesados', h.interesados, p =>
    fila(p, { acciones: ['wa'], sub: esc(p.proximoPaso || p.nota || 'Sin próximo paso') + (p.proximaFecha ? ` · <i>${p.proximaFecha === hoy ? 'hoy' : 'desde ' + fechaCorta(p.proximaFecha)}</i>` : '') }),
    { vacio: h.proximos.length ? '' : 'Nadie por atender hoy.' });
  const proximos = h.proximos.length ? bloque('proximos', 'Próximos días', h.proximos, p =>
    fila(p, { acciones: ['wa'], sub: `${esc(p.proximoPaso || '')} · <i>${esc(fechaCorta(p.proximaFecha))}</i>` })) : '';

  const seguimientos = bloque('seg', 'Seguimientos de hoy', h.seguimientos, ({ p, due, atraso }) =>
    fila(p, { acciones: ['wa', 'resp', 'pos'], sub: `Toque ${p.toques + 1} · ${atraso > 0 ? `atrasado ${atraso} día${atraso > 1 ? 's' : ''}` : 'toca hoy'}` }),
    { vacio: 'No hay seguimientos pendientes.', nota: h.seguimientos.length > 10 ? 'Hay muchos atrasados: haz estos antes de mandar una tanda nueva.' : '' });

  const hecho = pr.enviados;
  const primeros = `<section class="bloque"><h2>Primeros mensajes de hoy</h2>
    <div class="contador"><b class="${pr.llegoAlLimite ? 'lleno' : ''}">${hecho}</b><span>de ${pr.limite}</span></div>
    <div class="cupos">${Object.entries(pr.porLinea).map(([l, c]) => `<span class="cupo ${c.enviados >= c.cupo ? 'ok' : ''}" style="--c:var(--${l === 'Páginas' ? 'paginas' : l === 'Sistemas' ? 'sistemas' : 'afuera'})"><i></i>${esc(l)} <b>${c.enviados}/${c.cupo}</b></span>`).join('')}</div>
    ${pr.llegoAlLimite ? `<p class="alerta-suave">Ya mandaste ${pr.limite} en frío hoy. Para cuidar el número, sigue mañana.</p>` : ''}
    ${pr.lista.length ? pr.lista.slice(0, abiertos.has('prim') ? 999 : VISIBLES).map(p => fila(p, { acciones: ['wa'], sub: esc(p.proximoPaso || p.origenes.slice(-1)[0] || ''), extra: esReserva(p) ? '<span class="chip-reserva">reserva</span>' : '' })).join('') : '<p class="vacio">No hay prospectos por contactar. Pídele la tanda del día a Claude.</p>'}
    ${pr.lista.length > VISIBLES ? `<button class="ver-mas" data-vermas="prim">${abiertos.has('prim') ? 'Ver menos' : `Ver los ${pr.lista.length}`}</button>` : ''}</section>`;

  const reactivar = h.reactivar.length ? bloque('reac', 'Para reactivar', h.reactivar, p =>
    fila(p, { acciones: ['wa'], sub: `Sin respuesta desde el ${esc(fechaCorta(p.primerContacto))} · ${difDias(hoy, p.primerContacto)} días` }),
    { nota: 'Más de 90 días sin respuesta. Aquí no estorban en Hoy.' }) : '';

  vista.innerHTML = `${enc}${urgente(h, hoy)}${interesados}${proximos}${seguimientos}${primeros}${reactivar}<div class="aire"></div>`;

  if (!enlazado) { enlazar(vista); enlazado = true; }
}

function enlazar(vista) {
  enlazarFilas(vista, buscarProspecto);
  vista.addEventListener('click', async e => {
    const vm = e.target.closest('[data-vermas]');
    if (vm) { const k = vm.dataset.vermas; abiertos.has(k) ? abiertos.delete(k) : abiertos.add(k); return pintarHoy(vista); }
    const dat = e.target.closest('[data-datos]');
    if (dat) { const c = estado.clientes.find(c => c.id === dat.dataset.datos); if (c) abrirDatosCliente(c); return; }
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
