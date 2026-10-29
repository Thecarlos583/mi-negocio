// Metas: escalones de ingreso fijo, anillo, cobrado, constancia, ingreso por mes y para qué trabajas.
import { s, guardar } from '../datos.js';
import { hoyISO, MESES_LARGOS } from '../util.js';
import { ESCALONES, MENSUAL_REFERENCIA, metaActiva, escalonPorCelebrar, racha, calendarioMes, planCamioneta } from '../logica/metas.js';
import { cobradoEnMes, ganadoTotal, ingresoFijoEnMes, usdTxt } from '../logica/cobros.js';
import { aviso, plural } from './comun.js';

const LARGO = 314.16;     // 2·π·50
const corto = n => (n >= 1000 ? `$${n / 1000}.000` : `$${n}`);
const mesAnt = (mes, k) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 - k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function pintarMetas(el) {
  const hoy = hoyISO(), mes = hoy.slice(0, 7), m = metaActiva(s.clientes);
  const cal = calendarioMes(s.meta.constancia, hoy), dias = racha(s.meta.constancia, hoy), cam = planCamioneta(s.clientes, hoy);
  const meses = [2, 1, 0].map(k => mesAnt(mes, k)).map(x => ({ mes: x, v: ingresoFijoEnMes(s.clientes, x) }));
  const subida = meses[2].v - meses[1].v;
  const nombreMes = MESES_LARGOS[+mes.slice(5) - 1];

  el.innerHTML = `
    <h1>Metas</h1>
    <p class="sub">El camino, un escalón a la vez</p>

    <div class="steps">${ESCALONES.map((e, i) => `<div class="goal ${i === m.indice ? 'on' : ''} ${m.ingreso >= e ? 'hecho' : ''}">
      <small>${m.ingreso >= e ? 'Logrado ✓' : i === m.indice ? 'Ahora' : ['Ahora', 'Luego', 'Después', 'Grande'][i]}</small><b>${corto(e)}</b><small>al mes</small></div>`).join('')}</div>

    <div class="card glass" style="margin-top:12px">
      <div style="display:flex;align-items:center;gap:16px">
        <svg class="ring" viewBox="0 0 120 120" width="112" height="112" aria-hidden="true">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="12"/>
          <circle class="ring-fill" data-p="${m.pct}" data-largo="${LARGO}" cx="60" cy="60" r="50" fill="none" stroke="url(#g-anillo)" stroke-width="12" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="${LARGO}" stroke-dashoffset="${LARGO}"/>
          <defs><linearGradient id="g-anillo" x1="0" x2="1"><stop offset="0" stop-color="#1f9e89"/><stop offset="1" stop-color="#2bc4a8"/></linearGradient></defs>
          <text x="60" y="67" text-anchor="middle" font-family="Manrope,system-ui" font-weight="800" font-size="22" fill="#1b1712">${m.pct}%</text>
        </svg>
        <div style="min-width:0">
          <div class="lbl">Meta de ${usdTxt(m.objetivo)} al mes</div>
          <div class="big" data-n="${m.ingreso}" data-fmt="usd">${usdTxt(m.ingreso)}</div>
          <div class="small">${m.completa ? 'Llegaste a la cima. ¡Qué orgullo!' : `Te faltan <b>${plural(m.clientesFaltan, 'cliente', 'clientes')}</b> de ${usdTxt(MENSUAL_REFERENCIA)} al mes para llegar`}</div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="card glass"><div class="lbl">Cobrado este mes</div><div class="big" data-n="${cobradoEnMes(s.clientes, mes)}" data-fmt="usd">${usdTxt(cobradoEnMes(s.clientes, mes))}</div><span class="chip">${nombreMes}</span></div>
      <div class="card glass"><div class="lbl">Ganado desde el inicio</div><div class="big" data-n="${ganadoTotal(s.clientes)}" data-fmt="usd">${usdTxt(ganadoTotal(s.clientes))}</div><span class="chip gray">${plural(s.clientes.length, 'cliente', 'clientes')}</span></div>
    </div>

    <div class="card glass">
      <div class="sec"><h3>Constancia de ${nombreMes}</h3><span class="chip amb">🔥 racha de ${plural(dias, 'día', 'días')}</span></div>
      <div class="heat">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<div class="dia">${d}</div>`).join('')}
        ${'<div></div>'.repeat(cal.hueco)}${cal.dias.map((d, i) => `<span class="${d.lleno ? 'on' : ''} ${d.hoy ? 'today' : ''} ${d.futuro ? 'fut' : ''}" style="animation-delay:${Math.min(i * 14, 420)}ms" title="${d.dia}"></span>`).join('')}</div>
      <div class="small" style="margin-top:8px">Cada día que escribes tu tanda completa se pinta de verde.</div>
    </div>

    <div class="card glass">
      <div class="sec"><h3>Ingreso fijo por mes</h3>${subida > 0 ? `<span class="chip">+ ${usdTxt(subida)} en ${MESES_LARGOS[+mes.slice(5) - 1].slice(0, 3)}</span>` : ''}</div>
      <div class="chart">
        ${meses.map((x, i) => `<div><i class="${x.v ? (i === 2 ? 't' : '') : 'e'}" data-h="${x.v ? Math.max(6, (x.v / m.objetivo) * 100) : 8}"></i><small>${MESES_LARGOS[+x.mes.slice(5) - 1].slice(0, 3).replace(/^./, c => c.toUpperCase())}</small></div>`).join('')}
        <div><i class="e" data-h="100"></i><small>Meta</small></div>
      </div>
    </div>

    <div class="card glass dream">
      <div class="lbl" style="color:rgba(255,255,255,.75)">Meta para tu camioneta</div>
      <div class="big" style="color:#F2C14E" data-n="${cam.mensual}" data-fmt="usd">${usdTxt(cam.mensual)}</div>
      <div class="small" style="color:rgba(255,255,255,.85);margin-top:-2px">al mes, para pagar las cuotas y mantenerla</div>
      <div class="desglose">
        <div><span>Cuota (${cam.meses} meses)</span><b>${usdTxt(cam.cuota)}</b></div>
        <div><span>Seguro</span><b>${usdTxt(cam.seguro)}</b></div>
        <div><span>Mantenimiento y gasolina</span><b>${usdTxt(cam.mantener)}</b></div>
      </div>
      <div class="bar" style="background:rgba(255,255,255,.15)"><b data-w="${Math.max(1, cam.pct)}" style="background:#F2C14E"></b></div>
      <div class="small" style="color:rgba(255,255,255,.8)">Hoy ganas ${usdTxt(cam.ingreso)} al mes: vas el <b style="color:#F2C14E">${cam.pct < 10 ? cam.pct.toFixed(1).replace('.', ',') : Math.round(cam.pct)}%</b>.</div>
      <div class="inicial">
        <div><div class="lbl" style="color:rgba(255,255,255,.7)">Inicial para sacarla</div><b>${usdTxt(cam.inicial)}</b></div>
        <div style="text-align:right"><div class="lbl" style="color:rgba(255,255,255,.7)">Ahorrando al mes</div><b>${usdTxt(cam.ahorroMensual)}</b><small>la tienes en oct. 2028</small></div>
      </div>
      <p class="small" style="color:rgba(255,255,255,.55);margin-top:10px">Estimado con un precio de referencia de ${usdTxt(cam.precio)}, 50 % de inicial y ${cam.meses} meses, como financian hoy los concesionarios. Confírmalo cuando vayas.</p>
    </div>`;
}

// ---------- Celebración al llegar a un escalón ----------
export async function revisarEscalon() {
  const nuevo = escalonPorCelebrar(s.clientes, s.meta.escalonCelebrado || 0);
  if (!nuevo) return;
  s.meta.escalonCelebrado = nuevo;
  await guardar({ avisar: false });
  aviso(`¡Llegaste a ${usdTxt(nuevo)} al mes! Ya se activó el siguiente escalón.`);
  confeti();
}

function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'), dpr = devicePixelRatio || 1;
  c.className = 'confeti'; c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.append(c);
  const x = c.getContext('2d'), colores = ['#1f9e89', '#2bc4a8', '#F2C14E', '#e9cfae', '#1b1712'];
  const piezas = Array.from({ length: 90 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height * 0.4, v: (1.5 + Math.random() * 2.5) * dpr,
    g: Math.random() * Math.PI, w: (5 + Math.random() * 5) * dpr, h: (8 + Math.random() * 6) * dpr, col: colores[Math.floor(Math.random() * colores.length)] }));
  const t0 = performance.now();
  (function paso(t) {
    const k = (t - t0) / 2600;
    x.clearRect(0, 0, c.width, c.height);
    x.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.7) / 0.3);
    for (const p of piezas) {
      p.y += p.v; p.g += 0.05; p.x += Math.sin(p.g) * dpr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.g); x.fillStyle = p.col; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.g))); x.restore();
    }
    if (k < 1) requestAnimationFrame(paso); else c.remove();
  })(t0);
}
