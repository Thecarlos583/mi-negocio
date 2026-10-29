// Metas: escalones de ingreso fijo, anillo, cobrado, constancia, ingreso por mes y para qué trabajas.
import { s, guardar } from '../datos.js';
import { hoyISO, MESES_LARGOS } from '../util.js';
import { ESCALONES, MENSUAL_REFERENCIA, metaActiva, escalonPorCelebrar, racha, calendarioMes, suenio } from '../logica/metas.js';
import { cobradoEnMes, ganadoTotal, ingresoFijoEnMes, usdTxt } from '../logica/cobros.js';
import { aviso, plural } from './comun.js';

const LARGO = 314.16;     // 2·π·50
const corto = n => (n >= 1000 ? `$${n / 1000}.000` : `$${n}`);
const mesAnt = (mes, k) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 - k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function pintarMetas(el) {
  const hoy = hoyISO(), mes = hoy.slice(0, 7), m = metaActiva(s.clientes);
  const cal = calendarioMes(s.meta.constancia, hoy), dias = racha(s.meta.constancia, hoy), sue = suenio(s.clientes, hoy);
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
      <div class="lbl" style="color:rgba(255,255,255,.75)">Para qué trabajas</div>
      <div class="big" style="color:#fff;font-size:26px">${sue.nombre} · ${sue.cuando}</div>
      ${escenaCamioneta()}
      <div class="bar" style="background:rgba(255,255,255,.15)"><b data-w="${Math.max(1, sue.pct)}" style="background:#F2C14E"></b></div>
      <div class="small" style="color:rgba(255,255,255,.8)">Vas el <b style="color:#F2C14E">${sue.pct < 10 ? sue.pct.toFixed(1).replace('.', ',') : Math.round(sue.pct)}%</b> del camino. El escalón de $3.000 al mes es el que la hace posible.</div>
    </div>`;
}

// Camioneta genérica dibujada a mano (sin marcas): rueda por un camino de montaña, en bucle suave.
function escenaCamioneta() {
  return `<div class="escena" aria-hidden="true">
    <svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d3128"/><stop offset="1" stop-color="#6b5240"/></linearGradient>
        <linearGradient id="carro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7D27A"/><stop offset="1" stop-color="#D9A83C"/></linearGradient>
      </defs>
      <rect width="320" height="120" fill="url(#cielo)"/>
      <circle cx="262" cy="30" r="13" fill="#F2C14E" opacity=".85"/>
      <g class="capa lejos"><path d="M0 80 L40 52 L70 70 L110 40 L150 72 L190 48 L230 74 L270 46 L320 80 L360 52 L390 70 L430 40 L470 72 L510 48 L550 74 L590 46 L640 80 L640 120 L0 120 Z" fill="#4a3b2f"/></g>
      <g class="capa cerca"><path d="M0 90 L50 70 L95 86 L140 64 L190 88 L240 68 L290 90 L320 90 L370 70 L415 86 L460 64 L510 88 L560 68 L610 90 L640 90 L640 120 L0 120 Z" fill="#5a4636"/></g>
      <rect y="92" width="320" height="28" fill="#2a221c"/>
      <g class="rayas"><path d="M0 106 H24 M48 106 H72 M96 106 H120 M144 106 H168 M192 106 H216 M240 106 H264 M288 106 H312 M336 106 H360 M384 106 H408 M432 106 H456 M480 106 H504 M528 106 H552 M576 106 H600 M624 106 H648" stroke="#F2C14E" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>
      <g class="camioneta">
        <ellipse cx="161" cy="101" rx="62" ry="3" fill="#000" opacity=".35"/>
        <path d="M100 89 L100 72 L147 72 L147 69 L156 54 Q158 51 162 51 L189 51 Q193 51 195 55 L202 68 L217 70 Q223 71 223 77 L223 89 Q223 92 220 92 L103 92 Q100 92 100 89 Z" fill="url(#carro)"/>
        <rect x="103" y="72" width="42" height="4" rx="1" fill="#2a221c" opacity=".55"/>
        <path d="M100 80 H147" stroke="#B88A2E" stroke-width="1.2" opacity=".8"/>
        <path d="M159 55 L174 55 L174 68 L152 68 Z" fill="#2a221c" opacity=".88"/>
        <path d="M177 55 L189 55 Q191 55 192 57 L197 68 L177 68 Z" fill="#2a221c" opacity=".88"/>
        <rect x="176" y="72" width="7" height="1.6" rx=".8" fill="#2a221c" opacity=".5"/>
        <rect x="217" y="74" width="6" height="5" rx="1" fill="#fff" opacity=".95"/>
        <rect x="99" y="76" width="3" height="5" rx="1" fill="#d9534f"/>
        <path d="M100 86 H223" stroke="#2a221c" stroke-width="3" opacity=".35"/>
        <g transform="translate(123 92)"><g class="rueda"><circle r="11" fill="#1b1712"/><circle r="6" fill="#8a7f72"/><path d="M0 -6 V6 M-6 0 H6" stroke="#1b1712" stroke-width="1.8"/></g></g>
        <g transform="translate(201 92)"><g class="rueda"><circle r="11" fill="#1b1712"/><circle r="6" fill="#8a7f72"/><path d="M0 -6 V6 M-6 0 H6" stroke="#1b1712" stroke-width="1.8"/></g></g>
      </g>
    </svg>
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
