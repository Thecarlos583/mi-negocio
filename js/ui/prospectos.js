// Prospectos: tu recorrido, la tanda de hoy, los seguimientos de hoy y los que respondieron.
import { s, guardar } from '../datos.js';
import { hoyISO, fechaCorta, difDias } from '../util.js';
import * as P from '../logica/prospectos.js';
import { aplicarTexto } from '../sync.js';
import { formCliente } from './clientes.js';
import { $, $$, esc, abrirHoja, cerrarHoja, aviso, abrirWhatsApp, iconoProspecto, ordinal, plural } from './comun.js';

const CHIP_ETAPA = { 'Respondió': 'amb', 'Interesado': '', 'Llamada agendada': '', 'Por pagar': 'amb', 'No por ahora': 'gray' };
const buscar = id => s.prospectos.find(p => p.id === id);

function cuandoPaso(f, hoy) {
  if (!f) return '';
  const d = difDias(f, hoy);
  return d === 0 ? 'hoy' : d === 1 ? 'mañana' : d > 0 ? fechaCorta(f) : `atrasado desde el ${fechaCorta(f)}`;
}

export function pintarProspectos(el) {
  const hoy = hoyISO(), r = P.recorrido(s, hoy);
  const tanda = P.tandaDeHoy(s, hoy), reservas = P.reservasDeHoy(s, hoy);
  const segs = P.seguimientosDeHoy(s, hoy), resp = P.respondieron(s);
  const max = Math.max(1, ...r.semanas.map(x => x.total)), min = Math.min(...r.semanas.map(x => x.total));
  const alto = t => 18 + ((t - min) / Math.max(1, max - min)) * 82;

  el.innerHTML = `
    <h1>Prospectos</h1>
    <p class="sub">A quién escribirle hoy y cómo vas</p>

    <div class="card glass hero">
      <div class="lbl">Tu recorrido</div>
      <div class="big" data-n="${r.total}">${r.total}</div>
      <div class="small">personas escritas desde que empezaste</div>
      <div class="semanas" aria-label="Total por semana">${r.semanas.map(x => `<div><i data-h="${alto(x.total)}"></i><small>${fechaCorta(x.desde).split(' ')[0]}</small></div>`).join('')}</div>
      <div class="row" style="margin-top:12px">
        <div><div class="lbl">Esta semana</div><div class="amt" style="text-align:left">+${r.semana}</div></div>
        <div><div class="lbl">Hoy</div><div class="amt" style="text-align:left">${r.hoy.escritos} de ${r.hoy.total}</div></div>
        <div><div class="lbl">Clientes</div><div class="amt" style="text-align:left">${r.clientes}</div></div>
      </div>
      <div class="small" style="margin-top:10px">Cada vez que alguien no responde, se suma aquí solo.</div>
    </div>

    <div class="card glass">
      <div class="sec"><h3>Tanda de hoy</h3><span class="chip gray">${r.hoy.total ? `${r.hoy.escritos} de ${r.hoy.total} escritos` : 'Sin tanda'}</span></div>
      ${tanda.map(p => `<div class="item" data-p="${p.id}">
        <div class="ic">${iconoProspecto(p)}</div>
        <div class="grow" data-estado="${p.id}"><div class="name">${esc(p.negocio)}</div><div class="small">${esc([p.linea, p.zona].filter(Boolean).join(' · '))}</div></div>
        <button class="btn wa" data-escribir="${p.id}">Escribir</button></div>`).join('')}
      ${!tanda.length ? `<p class="vacio">${r.hoy.total ? '¡Listo! Escribiste toda la tanda de hoy.' : 'Todavía no llega la tanda de hoy. La arma Claude en el chat y aparece aquí sola.'}</p>` : ''}
      ${reservas.length ? `<details class="reservas"><summary>Reservas (${reservas.length})</summary>${reservas.map(p => `<div class="item">
        <div class="ic">${iconoProspecto(p)}</div><div class="grow" data-estado="${p.id}"><div class="name">${esc(p.negocio)}</div><div class="small">${esc(p.linea)} · reserva</div></div>
        <button class="btn wa" data-escribir="${p.id}">Escribir</button></div>`).join('')}</details>` : ''}
      ${tanda.length ? '<p class="note">Al tocar Escribir se abre WhatsApp con el mensaje listo</p>' : ''}
    </div>

    <div class="card glass">
      <div class="sec"><h3>Seguimientos de hoy</h3><span class="chip ${segs.length ? 'red' : 'gray'}">${segs.length}</span></div>
      ${segs.length > 1 ? `<button class="btn light full chico" data-muertos-todos style="margin:-2px 0 6px">✖ Dar por muertos a los ${segs.length}</button>` : ''}
      ${segs.map(x => `<div class="item">
        <div class="ic">${iconoProspecto(x.p)}</div>
        <div class="grow" data-estado="${x.p.id}"><div class="name">${esc(x.p.negocio)}</div>
          <div class="small">${esc(x.p.tanda || 'Sin tanda')} · ${ordinal(x.numero)} seguimiento${x.atraso ? ` · <b style="color:#a8322e">atrasado ${plural(x.atraso, 'día', 'días')}</b>` : ''}</div></div>
        <button class="btn light chico" data-seguir="${x.p.id}">Seguimiento</button>
        <button class="btn-x" data-muerto="${x.p.id}" aria-label="Dar por muerto">✖</button></div>`).join('') || '<p class="vacio">Hoy no toca ningún seguimiento.</p>'}
      <p class="note">Vienen de tandas anteriores. Toca ✖ si ya no vale la pena: pasa al historial y suma a tu recorrido.</p>
    </div>

    <div class="card glass">
      <div class="sec"><h3>Te respondieron</h3><span class="chip ${resp.length ? '' : 'gray'}">${resp.length}</span></div>
      ${resp.map(p => `<div class="item" data-estado="${p.id}">
        <div class="ic">${iconoProspecto(p)}</div>
        <div class="grow"><div class="name">${esc(p.negocio)}</div>
          <div class="small">${esc(p.proximoPaso || 'Sin próximo paso')}${p.proximaFecha ? ` · <span ${p.proximaFecha < hoy ? 'style="color:#a8322e;font-weight:700"' : ''}>${cuandoPaso(p.proximaFecha, hoy)}</span>` : ''}</div></div>
        <span class="chip ${CHIP_ETAPA[p.etapa] ?? ''}">${esc(p.etapa)}</span>
        <button class="btn-x" data-muerto="${p.id}" aria-label="Dar por muerto">✖</button></div>`).join('') || '<p class="vacio">Cuando alguien te responda, tócalo en la tanda o en los seguimientos.</p>'}
    </div>
    <p class="note"><button class="link" data-pegar>Pegar tanda</button></p>`;
}

// ---------- Acciones ----------
async function escribir(id) {
  const p = buscar(id), hoy = hoyISO();
  if (!p) return;
  abrirWhatsApp(P.linkWhatsApp(p.telefono, p.mensaje || 'Hola, buenas. Me llamo Carlos.'));
  P.marcarEscrito(s, p, hoy);
  if (P.tandaDeHoy(s, hoy).length === 0 && P.avanceDeHoy(s, hoy).total) aviso('¡Tanda de hoy completa! Se pintó tu día en Metas.');
  await guardar();
}

async function seguir(id) {
  const p = buscar(id), hoy = hoyISO();
  if (!p) return;
  const n = (p.seguimientos || []).length + 1;
  abrirWhatsApp(P.linkWhatsApp(p.telefono, P.mensajeSeguimiento(p, n)));
  P.marcarSeguimiento(p, hoy);
  await guardar();
}

// ✖: pasa al historial sin preguntar (suma al recorrido y no vuelve a aparecer).
async function darPorMuerto(id) {
  const p = buscar(id);
  if (!p) return;
  P.cambiarEtapa(s, p, 'No respondió', {}, hoyISO());
  aviso(`${p.negocio} pasó al historial`);
  await guardar();
}

function hojaMuertosTodos() {
  const hoy = hoyISO(), lista = P.seguimientosDeHoy(s, hoy).map(x => x.p);
  if (!lista.length) return;
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>Dar por muertos</h3><button class="link" data-cerrar>Cerrar</button></div>
    <p class="small">Los ${lista.length} seguimientos de hoy pasan al historial y no vuelven a aparecer. Suman a tu recorrido.</p>
    <button class="btn dark full" id="m-ok" style="margin-top:10px">Sí, darlos por muertos</button>`);
  $('#m-ok', cuerpo).addEventListener('click', async () => {
    lista.forEach(p => P.cambiarEtapa(s, p, 'No respondió', {}, hoy));
    cerrarHoja(true);
    aviso(`${plural(lista.length, 'prospecto pasó', 'prospectos pasaron')} al historial`);
    await guardar();
  });
}

function hojaEstado(id) {
  const p = buscar(id);
  if (!p) return;
  let elegido = P.RESPONDIERON.includes(p.etapa) ? p.etapa : '';
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>${esc(p.negocio)}</h3><button class="link" data-cerrar>Cerrar</button></div>
    <div class="small" style="margin:-4px 0 10px">${esc([p.tanda, p.zona, p.escrito ? `escrito el ${fechaCorta(p.escrito)}` : 'sin escribir'].filter(Boolean).join(' · '))}. ¿En qué quedó?</div>
    <div class="opts">${P.ETAPAS_HOJA.map(([e, t]) => `<button type="button" data-etapa="${e}" class="${e === elegido ? 'on' : ''}">${t}</button>`).join('')}</div>
    <label class="f">Próximo paso<input id="h-paso" value="${esc(p.proximoPaso || '')}" placeholder="Mandarle la demostración"></label>
    <label class="f">Fecha<input id="h-fecha" type="date" value="${p.proximaFecha || ''}"></label>
    <button class="btn dark full" id="h-guardar" style="margin-top:6px">Guardar</button>
    ${p.telefono ? `<button class="btn light full" id="h-wa" style="margin-top:8px">Abrir WhatsApp</button>` : ''}`);
  cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-etapa]');
    if (b) { elegido = b.dataset.etapa; $$('[data-etapa]', cuerpo).forEach(x => x.classList.toggle('on', x === b)); return; }
    if (e.target.closest('#h-wa')) { abrirWhatsApp(`https://wa.me/${p.telefono}`); return; }
    if (!e.target.closest('#h-guardar')) return;
    const paso = $('#h-paso', cuerpo).value.trim(), fecha = $('#h-fecha', cuerpo).value, hoy = hoyISO();
    if (!elegido) {
      if (P.RESPONDIERON.includes(p.etapa)) { p.proximoPaso = paso; p.proximaFecha = fecha; cerrarHoja(true); await guardar(); }
      else aviso('Elige en qué quedó');
      return;
    }
    cerrarHoja(true);
    if (elegido === 'Cliente') {
      formCliente(null, { datos: { negocio: p.negocio, telefono: p.telefono, contacto: p.contacto || '', zona: p.zona, linea: p.linea, servicio: P.SERVICIO_DE_LINEA[p.linea] || 'Página web' },
        alGuardar: () => P.cambiarEtapa(s, p, 'Cliente', {}, hoy) });
      return;
    }
    const salio = P.cambiarEtapa(s, p, elegido, { paso, fecha }, hoy);
    aviso(salio ? `${p.negocio} pasó al historial` : `${p.negocio}: ${elegido}`);
    await guardar();
  });
}

function hojaPegar() {
  const cuerpo = abrirHoja(`
    <div class="sec"><h3>Pegar tanda</h3><button class="link" data-cerrar>Cerrar</button></div>
    <p class="small">Solo por si un día la tanda no llega sola. Pega aquí el texto que te pase Claude.</p>
    <label class="f"><textarea id="t-pegar" placeholder='{"tipo":"tanda", ...}'></textarea></label>
    <button class="btn dark full" id="t-ok">Agregar tanda</button>`);
  $('#t-ok', cuerpo).addEventListener('click', async () => {
    const txt = $('#t-pegar', cuerpo).value.trim();
    try {
      const msg = aplicarTexto('tandas', txt);
      cerrarHoja(true);
      aviso(msg || 'Esa tanda ya estaba');
      await guardar();
    } catch (e) { aviso(e instanceof SyntaxError ? 'El texto no está completo. Cópialo de nuevo.' : e.message); }
  });
}

document.addEventListener('click', e => {
  const t = e.target;
  const w = t.closest('[data-escribir]'); if (w) { escribir(w.dataset.escribir); return; }
  const sg = t.closest('[data-seguir]'); if (sg) { seguir(sg.dataset.seguir); return; }
  const mu = t.closest('[data-muerto]'); if (mu) { darPorMuerto(mu.dataset.muerto); return; }
  if (t.closest('[data-muertos-todos]')) { hojaMuertosTodos(); return; }
  if (t.closest('[data-pegar]')) { hojaPegar(); return; }
  const est = t.closest('[data-estado]'); if (est) hojaEstado(est.dataset.estado);
});
