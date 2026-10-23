// Gráficos simples hechos a mano en SVG (sin librerías).
import { esc, fechaCorta } from '../util.js';

// Respuestas por nicho: barra clara = contactos, barra de color = respuestas.
export function barrasPorNicho(porNicho) {
  const filas = Object.entries(porNicho).sort((a, b) => b[1].contactos - a[1].contactos).slice(0, 7);
  if (!filas.length) return '<p class="vacio">Sin contactos esta semana.</p>';
  const max = Math.max(...filas.map(([, v]) => v.contactos), 1);
  const H = 30, W = 320, X = 118;
  return `<svg class="graf" viewBox="0 0 ${W} ${filas.length * H + 4}" role="img" aria-label="Respuestas por nicho">
    ${filas.map(([n, v], i) => {
      const y = i * H + 4, w = c => Math.max(c ? 3 : 0, (c / max) * (W - X - 46));
      return `<text x="0" y="${y + 14}" class="g-txt">${esc(n.length > 17 ? n.slice(0, 16) + '…' : n)}</text>
        <rect x="${X}" y="${y + 3}" width="${w(v.contactos)}" height="14" rx="4" class="g-fondo"/>
        <rect x="${X}" y="${y + 3}" width="${w(v.respuestas)}" height="14" rx="4" class="g-barra"/>
        <text x="${X + w(v.contactos) + 6}" y="${y + 15}" class="g-num">${v.respuestas}/${v.contactos}</text>`;
    }).join('')}</svg>`;
}

// Contactos y respuestas de las últimas semanas, en dos líneas.
export function lineasSemanas(serie) {
  const W = 320, H = 150, L = 26, B = 22, T = 10, R = 8;
  const max = Math.max(...serie.map(s => s.contactos), 1);
  const x = i => L + (i * (W - L - R)) / Math.max(1, serie.length - 1);
  const y = v => T + (H - T - B) * (1 - v / max);
  const linea = k => serie.map((s, i) => `${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ');
  const guias = [0, 0.5, 1].map(f => max * f);
  return `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contactos y respuestas por semana">
    ${guias.map(g => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="g-guia"/><text x="0" y="${y(g) + 4}" class="g-num">${Math.round(g)}</text>`).join('')}
    <polyline points="${linea('contactos')}" class="g-linea g-linea-a"/>
    <polyline points="${linea('respuestas')}" class="g-linea g-linea-b"/>
    ${serie.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.contactos)}" r="3" class="g-punto-a"/><circle cx="${x(i)}" cy="${y(s.respuestas)}" r="3" class="g-punto-b"/>`).join('')}
    ${[0, serie.length - 1].map(i => `<text x="${x(i)}" y="${H - 4}" text-anchor="${i ? 'end' : 'start'}" class="g-num">${esc(fechaCorta(serie[i].desde))}</text>`).join('')}
  </svg>
  <p class="leyenda"><span class="ley-a">Contactos</span><span class="ley-b">Respuestas</span></p>`;
}
