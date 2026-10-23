// Prospectos: lista con búsqueda, filtros, orden, vivos o muertos, y la revisión rápida «¿Ya le escribí?».
import { estado, buscarProspecto } from '../estado.js';
import { esc, fechaCorta, fechaDMA } from '../util.js';
import { ETAPAS, LINEAS, ETAPAS_MUERTAS } from '../ajustes-base.js';
import { normalizarTelefono, normalizarNombre, buscarRepetido, describirRepetido } from '../telefono.js';
import { fila, enlazarFilas } from './filas.js';
import { abrirHoja, cerrarHoja, chipEtapa, $ } from './comun.js';
import { abrirFicha } from './ficha.js';
import { abrirNuevo } from './nuevo.js';

const PASO = 40;
const f = { q: '', estado: 'vivos', etapa: '', linea: '', nicho: '', pais: '', tanda: '', orden: 'accion', limite: PASO };
let enlazado = false;

const esMuerta = p => ETAPAS_MUERTAS.includes(p.etapa);
const numTanda = p => Math.max(0, ...(p.origenes || []).map(o => Number((/Tanda (\d+)/.exec(o) || [])[1]) || 0));

function filtrar() {
  const q = normalizarNombre(f.q), dig = f.q.replace(/\D/g, '');
  let l = estado.prospectos.filter(p => {
    if (f.estado === 'vivos' && esMuerta(p)) return false;
    if (f.estado === 'muertos' && !esMuerta(p)) return false;
    if (f.etapa && p.etapa !== f.etapa) return false;
    if (f.linea && p.linea !== f.linea) return false;
    if (f.nicho && p.nicho !== f.nicho) return false;
    if (f.pais && p.pais !== f.pais) return false;
    if (f.tanda && !(p.origenes || []).includes(f.tanda)) return false;
    if (q || dig.length >= 3) {
      const porNombre = q && normalizarNombre(p.negocio).includes(q);
      const porTel = dig.length >= 3 && (p.telefono || '').includes(normalizarTelefono(dig).length >= 10 ? normalizarTelefono(dig) : dig);
      if (!porNombre && !porTel) return false;
    }
    return true;
  });
  const fecha = p => p.primerContacto || '';
  if (f.orden === 'fecha') l.sort((a, b) => fecha(b).localeCompare(fecha(a)));
  else if (f.orden === 'nombre') l.sort((a, b) => a.negocio.localeCompare(b.negocio, 'es'));
  else l.sort((a, b) => (a.proximaFecha ? 0 : 1) - (b.proximaFecha ? 0 : 1) || (a.proximaFecha || '').localeCompare(b.proximaFecha || '') || fecha(b).localeCompare(fecha(a)));
  return l;
}

const opciones = (valores, actual, todas) => `<option value="">${todas}</option>${valores.map(v => `<option ${v === actual ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;

function subDe(p) {
  if (p.proximaFecha && !esMuerta(p)) return `<b class="aviso-txt">${esc(fechaCorta(p.proximaFecha))}</b> · ${esc(p.proximoPaso || 'Próximo paso')}`;
  if (p.primerContacto) return `Le escribiste el ${esc(fechaDMA(p.primerContacto))}${p.toques > 1 ? ` · ${p.toques} mensajes` : ''}${p.origenes?.length ? ' · ' + esc(p.origenes.at(-1)) : ''}`;
  return esc(p.nota || p.origenes?.at(-1) || 'Sin contactar');
}

function filas() {
  const l = filtrar(), ver = l.slice(0, f.limite);
  const acciones = p => (esMuerta(p) ? ['revivir'] : p.etapa === 'Cliente' ? [] : ['wa']);
  return `<p class="mini cuenta-lista">${l.length} resultado${l.length === 1 ? '' : 's'}</p>
    ${ver.map(p => fila(p, { sub: subDe(p), acciones: acciones(p) })).join('') || '<p class="vacio">No hay prospectos con esos filtros.</p>'}
    ${l.length > ver.length ? `<button class="ver-mas" data-mas="1">Ver ${Math.min(PASO, l.length - ver.length)} más</button>` : ''}`;
}

export function pintarProspectos(vista) {
  const nichos = [...new Set(estado.prospectos.map(p => p.nicho).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const paises = [...new Set(estado.prospectos.map(p => p.pais).filter(Boolean))].sort();
  const tandas = [...new Set(estado.prospectos.flatMap(p => p.origenes || []))].sort((a, b) => numTanda({ origenes: [b] }) - numTanda({ origenes: [a] }) || a.localeCompare(b));
  const activos = ['etapa', 'linea', 'nicho', 'pais', 'tanda'].filter(k => f[k]).length;
  vista.innerHTML = `
    <header class="hoy-cab"><div><p class="eyebrow">${estado.prospectos.length} negocios</p><h1>Prospectos</h1></div>
      <button class="tasa" data-p="revisar"><small>¿Ya le escribí?</small><b>Revisar</b></button></header>
    <div class="segmento" role="tablist">${[['vivos', 'Vivos'], ['muertos', 'Muertos'], ['todos', 'Todos']].map(([k, t]) => `<button class="${f.estado === k ? 'activa' : ''}" data-p="estado" data-v="${k}">${t}</button>`).join('')}</div>
    <label class="campo buscar"><input id="p-q" type="search" inputmode="search" placeholder="Buscar por nombre o número" value="${esc(f.q)}" autocomplete="off"></label>
    <details class="filtros" ${activos ? 'open' : ''}><summary>Filtros${activos ? ` <span class="cuenta">${activos}</span>` : ''}</summary>
      <div class="dos">
        <label class="campo"><span>Etapa</span><select data-filtro="etapa">${opciones(ETAPAS, f.etapa, 'Todas')}</select></label>
        <label class="campo"><span>Línea</span><select data-filtro="linea">${opciones(LINEAS, f.linea, 'Todas')}</select></label>
        <label class="campo"><span>Nicho</span><select data-filtro="nicho">${opciones(nichos, f.nicho, 'Todos')}</select></label>
        <label class="campo"><span>País</span><select data-filtro="pais">${opciones(paises, f.pais, 'Todos')}</select></label>
      </div>
      <label class="campo"><span>Tanda</span><select data-filtro="tanda">${opciones(tandas, f.tanda, 'Todas')}</select></label>
      <label class="campo"><span>Orden</span><select data-filtro="orden">${[['accion', 'Próxima acción'], ['fecha', 'Fecha del primer mensaje'], ['nombre', 'Nombre']].map(([k, t]) => `<option value="${k}" ${f.orden === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <button class="btn suave" data-p="limpiar">Quitar filtros</button>
    </details>
    <section class="bloque lista-prospectos" id="p-lista">${filas()}</section><div class="aire"></div>`;
  if (!enlazado) { enlazar(vista); enlazado = true; }
}

function enlazar(vista) {
  enlazarFilas(vista, buscarProspecto);
  const repintarLista = () => { const c = $('#p-lista', vista); if (c) c.innerHTML = filas(); };
  vista.addEventListener('input', e => { if (e.target.id === 'p-q') { f.q = e.target.value; f.limite = PASO; repintarLista(); } });
  vista.addEventListener('change', e => {
    const k = e.target.dataset?.filtro; if (!k) return;
    f[k] = e.target.value; f.limite = PASO; pintarProspectos(vista);
  });
  vista.addEventListener('click', e => {
    if (e.target.closest('[data-mas]')) { f.limite += PASO; return repintarLista(); }
    const b = e.target.closest('[data-p]'); if (!b) return;
    if (b.dataset.p === 'estado') { f.estado = b.dataset.v; f.limite = PASO; pintarProspectos(vista); }
    if (b.dataset.p === 'limpiar') { Object.assign(f, { etapa: '', linea: '', nicho: '', pais: '', tanda: '' }); pintarProspectos(vista); }
    if (b.dataset.p === 'revisar') abrirRevision();
  });
}

// «¿Ya le escribí?»: pego un número o un nombre y me dice si ya existe.
export function abrirRevision() {
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Revisión rápida</p><h3 class="hoja-titulo">¿Ya le escribí?</h3>
    <label class="campo"><span>Número o nombre del negocio</span><input id="rv-q" type="search" inputmode="search" placeholder="0412… o el nombre" autocomplete="off"></label>
    <div id="rv-res"></div>`);
  const res = $('#rv-res', cuerpo);
  $('#rv-q', cuerpo).addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q.length < 3) { res.innerHTML = ''; return; }
    const dig = q.replace(/\D/g, '');
    let hallados = [];
    if (dig.length >= 7) { const r = buscarRepetido(estado.prospectos, { telefono: q }); if (r) hallados = [r]; }
    else { const n = normalizarNombre(q); hallados = estado.prospectos.filter(p => normalizarNombre(p.negocio).includes(n)).slice(0, 6); }
    res.innerHTML = hallados.length
      ? hallados.map(p => `<article class="resultado ya" data-id="${esc(p.id)}"><b>${esc(p.negocio)}</b> ${chipEtapa(p.etapa)}<p>${esc(describirRepetido(p))}</p></article>`).join('')
      : `<article class="resultado nuevo"><b>No está en tu lista</b><p>Puedes escribirle: no le has mandado nada.</p><button class="btn primario" data-nuevo="${esc(q)}">Agregarlo</button></article>`;
  });
  res.addEventListener('click', e => {
    const a = e.target.closest('[data-id]'); if (a) { cerrarHoja(true); return abrirFicha(a.dataset.id); }
    const n = e.target.closest('[data-nuevo]'); if (n) { const v = n.dataset.nuevo, dig = v.replace(/\D/g, ''); cerrarHoja(true); abrirNuevo(dig.length >= 7 ? { telefono: v } : { negocio: v }); }
  });
}
