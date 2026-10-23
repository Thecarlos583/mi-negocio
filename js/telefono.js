// Regla de oro: el teléfono es único. Se guarda solo con dígitos y código de país.
export function normalizarTelefono(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return '';
  d = d.replace(/^00/, '');
  if (d.length === 11 && d.startsWith('0')) return '58' + d.slice(1);          // 0412… -> 58412…
  if (d.length === 10 && /^4(12|14|16|24|26)/.test(d)) return '58' + d;       // 412… sin código
  return d;
}
export const normalizarNombre = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Busca un prospecto repetido por teléfono; si no hay teléfono, por nombre.
export function buscarRepetido(prospectos, { telefono, negocio }) {
  const t = normalizarTelefono(telefono);
  if (t) return prospectos.find(p => normalizarTelefono(p.telefono) === t) || null;
  const n = normalizarNombre(negocio);
  return n ? prospectos.find(p => !normalizarTelefono(p.telefono) && normalizarNombre(p.negocio) === n) || null : null;
}

// Texto para decir «ya le escribiste el 05/10 en Tanda 4».
export function describirRepetido(p) {
  const f = p.primerContacto ? p.primerContacto.split('-').reverse().slice(0, 2).join('/') : null;
  const tanda = (p.origenes || [])[0];
  if (!f) return `ya está en tu lista (${p.etapa})${tanda ? ' desde ' + tanda : ''}`;
  return `ya le escribiste el ${f}${tanda ? ' en ' + tanda : ''} (${p.etapa})`;
}
