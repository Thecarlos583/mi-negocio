// Inicio: meta activa, cobrado, por cobrar, próximos cobros y la tanda de hoy.
import { s } from '../datos.js';
import { fechaCompleta, hoyISO, MESES_LARGOS } from '../util.js';
import { metaActiva, MENSUAL_REFERENCIA } from '../logica/metas.js';
import { proximosCobros, cobradoEnMes, porCobrar, todosLosPagos, usdTxt } from '../logica/cobros.js';
import { avanceDeHoy } from '../logica/prospectos.js';
import { saludoDelDia, plural } from './comun.js';
import { filaCobro } from './clientes.js';

const n = (v, usd = true) => `<span data-n="${v}"${usd ? ' data-fmt="usd"' : ''}>${usd ? usdTxt(v) : v}</span>`;
export const LINEAS = ['Páginas', 'Sistemas', 'Afuera'];

export function pintarInicio(el) {
  const hoy = hoyISO(), mes = hoy.slice(0, 7), f = fechaCompleta(hoy);
  const vacio = !s.clientes.length && !s.historial.length && !s.prospectos.length;
  const m = metaActiva(s.clientes);
  const pagosMes = todosLosPagos(s.clientes).filter(p => (p.fecha || '').startsWith(mes)).length;
  const cobros = proximosCobros(s.clientes, hoy), debe = porCobrar(s.clientes, hoy);
  const pendientes = cobros.filter(x => !x.fecha || x.fecha <= hoy).length;
  const a = avanceDeHoy(s, hoy);

  el.innerHTML = `
    <h1>${saludoDelDia()}, Carlos</h1>
    <p class="sub">${f[0].toUpperCase() + f.slice(1)} · lo que importa hoy</p>
    ${vacio ? `<div class="card glass"><div class="sec"><h3>Trae tus datos</h3></div>
      <p class="small">Conecta la app con Claude y llegan solos tus clientes, tu recorrido y la tanda de hoy.</p>
      <button class="btn dark full" style="margin-top:12px" data-ajustes>Conectar con Claude</button></div>` : ''}
    <div class="card glass hero">
      <div class="lbl">Meta activa · ingreso fijo al mes</div>
      <div class="big">${n(m.ingreso)} <small>/ ${usdTxt(m.objetivo)}</small></div>
      <div class="bar"><b data-w="${m.pct}"></b></div>
      <div class="small">${m.completa ? '¡Llegaste a la meta más grande!' : `Te faltan ${usdTxt(m.falta)} al mes · unos ${plural(m.clientesFaltan, 'cliente', 'clientes')} de ${usdTxt(MENSUAL_REFERENCIA)}`}</div>
    </div>
    <div class="row">
      <div class="card glass"><div class="lbl">Cobrado en ${MESES_LARGOS[+mes.slice(5) - 1]}</div><div class="big">${n(cobradoEnMes(s.clientes, mes))}</div>
        <span class="chip ${pagosMes ? '' : 'gray'}">${plural(pagosMes, 'pago', 'pagos')}</span></div>
      <div class="card glass"><div class="lbl">Por cobrar</div><div class="big">${n(debe)}</div>
        <span class="chip ${pendientes ? 'amb' : ''}">${pendientes ? plural(pendientes, 'pendiente', 'pendientes') : 'Al día'}</span></div>
    </div>
    <div class="card glass">
      <div class="sec"><h3>Próximos cobros</h3><a href="#clientes" data-ir="clientes">Ver todos</a></div>
      ${cobros.length ? cobros.slice(0, 4).map(x => filaCobro(x, hoy)).join('') : '<p class="vacio">No hay cobros pendientes.</p>'}
    </div>
    <div class="card glass">
      <div class="sec"><h3>Tanda de hoy</h3><span class="chip gray">${a.total ? `${a.escritos} de ${a.total} escritos` : 'Sin tanda todavía'}</span></div>
      <div class="row" style="gap:8px">${LINEAS.map(l => { const x = a.porLinea[l] || { total: 0, escritos: 0 };
        return `<div style="text-align:center"><div class="big" style="font-size:22px">${x.total - x.escritos}</div><div class="small">${l}</div></div>`; }).join('')}</div>
      <div class="bar"><b data-w="${a.total ? (a.escritos / a.total) * 100 : 0}"></b></div>
      <button class="btn dark full" style="margin-top:6px" data-ir="prospectos">Ver la tanda de hoy</button>
      <p class="note">${a.total ? 'Por escribir en cada línea' : 'La tanda la arma Claude en el chat y aparece aquí sola'}</p>
    </div>`;
}
