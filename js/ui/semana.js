// Semana: meta de $300, resumen semanal con comparación, conclusiones y gráficos.
import { estado, guardarResumen } from '../estado.js';
import { progresoMeta } from '../metas.js';
import { calcularResumen, semanaDe, serieSemanas, textoParaClaude } from '../resumen.js';
import { esc, hoyISO, sumarDias, usd, fechaCorta } from '../util.js';
import { barrasPorNicho, lineasSemanas } from './graficos.js';
import { copiar } from './comun.js';

let seleccion = 'actual', enlazado = false;
const pct = x => `${Math.round(x * 1000) / 10}%`;
const barra = (v, m) => `<div class="barra"><i style="width:${Math.min(100, m ? (v / m) * 100 : 0)}%"></i></div>`;

function cardMeta(m) {
  let falta = '';
  if (m.faltan > 0) {
    falta = `<p class="meta-texto">Te faltan <b>${usd(m.faltan)}</b> de recurrente: unos <b>${m.clientesFaltan} cliente${m.clientesFaltan === 1 ? '' : 's'}</b> más con tu mensualidad promedio de ${usd(m.promedio)}.</p>`;
    if (m.tasa > 0) falta += `<p class="meta-texto">Con tu tasa de cierre (${pct(m.tasa)}) serían unos <b>${m.contactosNecesarios} contactos</b> más.${m.pocosDatos ? ` <i>Todavía pocos datos: ${m.contactos} contactos y ${m.cierres} cierre${m.cierres === 1 ? '' : 's'}.</i>` : ''}</p>`;
    else falta += '<p class="meta-texto"><i>Todavía no hay cierres para calcular cuántos contactos hacen falta.</i></p>';
  } else falta = '<p class="meta-texto">¡Llegaste a la meta! Mira el siguiente escalón.</p>';
  return `<section class="meta-tarjeta">
    <div class="meta-fila"><span>Cobrado este mes</span><b>${usd(m.cobrado)} <small>de ${usd(m.objetivo)}</small></b></div>${barra(m.cobrado, m.objetivo)}
    <div class="meta-fila"><span>Ingreso recurrente</span><b>${usd(m.recurrente)} <small>de ${usd(m.objetivo)}</small></b></div>${barra(m.recurrente, m.objetivo)}
    ${falta}
    <div class="escalones">${m.escalones.map(e => `<span class="escalon ${e.alcanzado ? 'ok' : ''}">${e.alcanzado ? '✓ ' : ''}${usd(e.valor)}</span>`).join('')}</div>
  </section>`;
}

const delta = (a, b, fmt = x => x) => { const d = a - b; return `<small class="${d > 0 ? 'sube' : d < 0 ? 'baja' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${d === 0 ? 'igual' : fmt(Math.abs(d))}</small>`; };

function cuerpoResumen(r, previo, hoy) {
  const num = (valor, rot, d = '') => `<div><b>${valor}</b><span>${rot}</span>${d}</div>`;
  const c = r.conclusiones || [];
  return `
    <h2 class="sub-titulo">${esc(fechaCorta(r.desde))} al ${esc(fechaCorta(r.hasta))} ${r.parcial ? '<span class="chip e-int">En curso</span>' : ''}</h2>
    ${previo ? `<p class="mini">Comparado con la semana anterior (${esc(fechaCorta(previo.desde))} al ${esc(fechaCorta(previo.hasta))}).</p>` : ''}
    <div class="resumen-numeros grande">
      ${num(r.frios, 'mensajes en frío', previo ? delta(r.frios, previo.frios) : '')}
      ${num(r.seguimientos, 'seguimientos', previo ? delta(r.seguimientos, previo.seguimientos) : '')}
      ${num(r.respuestas, 'respuestas', previo ? delta(r.respuestas, previo.respuestas) : '')}
      ${num(pct(r.tasa), 'tasa de respuesta', previo ? delta(r.tasa, previo.tasa, x => pct(x)) : '')}
      ${num(r.diasCupo, 'días con cupo completo', previo ? delta(r.diasCupo, previo.diasCupo) : '')}
      ${num(r.interesadosNuevos, 'interesados nuevos', previo ? delta(r.interesadosNuevos, previo.interesadosNuevos) : '')}
      ${num(r.llamadas, 'llamadas agendadas', previo ? delta(r.llamadas, previo.llamadas) : '')}
      ${num(r.cierres, 'cierres', previo ? delta(r.cierres, previo.cierres) : '')}
      ${num(usd(r.cobrado), 'cobrado', previo ? delta(r.cobrado, previo.cobrado, x => usd(x)) : '')}
      ${num((r.cambioRecurrente >= 0 ? '+' : '') + usd(r.cambioRecurrente), 'cambio del recurrente')}
    </div>
    <p class="mini">Respuestas por línea: ${Object.entries(r.porLinea).map(([k, v]) => `${esc(k)} ${v.respuestas}/${v.contactos}`).join(' · ') || 'sin datos'}. Por país: ${Object.entries(r.porPais).map(([k, v]) => `${esc(k)} ${v.respuestas}/${v.contactos}`).join(' · ') || 'sin datos'}.</p>
    ${r.mejorNicho ? `<p class="meta-texto">Mejor nicho: <b>${esc(r.mejorNicho.nombre)}</b> (${r.mejorNicho.respuestas}/${r.mejorNicho.contactos}). ${r.peorNicho ? `Peor: <b>${esc(r.peorNicho.nombre)}</b> (${r.peorNicho.respuestas}/${r.peorNicho.contactos}).` : ''}</p>` : '<p class="meta-texto"><i>Mejor y peor nicho: todavía pocos datos (hacen falta al menos 3 contactos por nicho).</i></p>'}

    <h3 class="sub">Qué funcionó y qué no</h3>
    ${c.length ? c.map(x => `<article class="conclusion ${x.tipo}"><p>${esc(x.texto)}</p>${x.datos ? `<small>Calculado ${esc(x.datos)}</small>` : ''}</article>`).join('') : '<p class="vacio">Todavía no hay conclusiones: faltan datos de la semana.</p>'}
    ${r.seguimientosPasados ? `<details class="reservas"><summary>Seguimientos que se pasaron <span class="cuenta">${r.seguimientosPasados}</span></summary><ul class="lista-simple">${(r.nombresPasados || []).map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}

    <h3 class="sub">Respuestas por nicho</h3>${barrasPorNicho(r.porNicho)}
    <h3 class="sub">Últimas 8 semanas</h3>${lineasSemanas(serieSemanas(estado, hoy, 8))}
    <button class="btn grande primario" data-s="claude">Copiar para Claude</button>`;
}

export function pintarSemana(vista) {
  const hoy = hoyISO();
  const meta = progresoMeta(estado, hoy);
  const { desde, hasta } = semanaDe(hoy);
  const guardados = [...estado.resumenes].sort((a, b) => b.desde.localeCompare(a.desde));
  const actual = calcularResumen(estado, desde, hasta, hoy);
  let r = actual;
  if (seleccion !== 'actual') r = guardados.find(x => x.id === seleccion) || actual;
  const prevDesde = sumarDias(r.desde, -7);
  const previo = guardados.find(x => x.desde === prevDesde) || (estado.prospectos.length ? calcularResumen(estado, prevDesde, sumarDias(prevDesde, 6), hoy) : null);
  vista._resumen = r;

  vista.innerHTML = `
    <header class="hoy-cab"><div><p class="eyebrow">Meta y resumen</p><h1>Semana</h1></div></header>
    ${cardMeta(meta)}
    <div class="chips-scroll">
      <button class="chip-sel ${r === actual ? 'activa' : ''}" data-sel="actual">Esta semana</button>
      ${guardados.map(g => `<button class="chip-sel ${g === r ? 'activa' : ''}" data-sel="${esc(g.id)}">${esc(fechaCorta(g.desde))}${g.visto ? '' : ' •'}</button>`).join('')}
    </div>
    <section class="bloque">${cuerpoResumen(r, previo, hoy)}</section><div class="aire"></div>`;

  if (r !== actual && !r.visto) { r.visto = true; guardarResumen(r); }
  if (!enlazado) {
    vista.addEventListener('click', e => {
      const s = e.target.closest('[data-sel]');
      if (s) { seleccion = s.dataset.sel; return pintarSemana(vista); }
      if (e.target.closest('[data-s="claude"]')) copiar(textoParaClaude(vista._resumen, estado, hoyISO()));
    });
    enlazado = true;
  }
}
