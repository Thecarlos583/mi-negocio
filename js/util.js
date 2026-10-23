// Fechas en hora local (Venezuela). Todo se guarda como AAAA-MM-DD.
const p2 = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const hoyISO = () => iso(new Date());
export const horaAhora = () => { const d = new Date(); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const aFecha = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const sumarDias = (s, n) => { const d = aFecha(s); d.setDate(d.getDate() + n); return iso(d); };
export const difDias = (a, b) => Math.round((aFecha(a) - aFecha(b)) / 86400000); // a - b
export const mesDe = s => (s || '').slice(0, 7);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const fechaCorta = s => { if (!s) return ''; const d = aFecha(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
export const fechaLarga = s => { const d = aFecha(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const fechaDMA = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y.slice(2)}`; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const usd = n => '$' + (Math.round(n * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
export const bs = n => 'Bs ' + n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
