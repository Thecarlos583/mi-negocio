// Prospectos: todo se calcula por fechas, nunca por listas guardadas. Funciones puras sobre el estado
// { prospectos, historial, clientes, tandas, meta }. Un teléfono existe una sola vez en toda la app.
import { sumarDias, difDias } from '../util.js';
import { normalizarTelefono } from '../telefono.js';

export const DIAS_SEGUIMIENTO = [3, 7];
export const DIAS_CIERRE = 10;          // con los 2 seguimientos hechos y sin respuesta
export const DIAS_CIERRE_MAXIMO = 21;   // red de seguridad: aunque falten seguimientos, no se acumulan
export const RESPONDIERON = ['Respondió', 'Interesado', 'Llamada agendada', 'Por pagar', 'No por ahora'];
export const CERRADAS = ['Perdido', 'No respondió', 'Se enfrió'];
export const ETAPAS_HOJA = [
  ['Respondió', '💬 Respondió'], ['Interesado', '✨ Interesado'], ['Por pagar', '💵 Por pagar'],
  ['Cliente', '🎉 Es cliente'], ['No por ahora', '⏸️ No por ahora'], ['Perdido', '✖️ Perdido'],
];

const telefonosDe = lista => lista.map(x => x.telefono).filter(Boolean);
export const todosLosTelefonos = s => new Set([...telefonosDe(s.prospectos), ...telefonosDe(s.historial), ...telefonosDe(s.clientes)]);

// ---------- Tandas ----------
export function validarTanda(obj) {
  if (!obj || typeof obj !== 'object') return 'No es una tanda.';
  if (obj.tipo && obj.tipo !== 'tanda') return 'El archivo no es una tanda.';
  if (!Array.isArray(obj.prospectos) || !obj.prospectos.length) return 'La tanda no trae prospectos.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(obj.fecha || '')) return 'La tanda no trae la fecha (AAAA-MM-DD).';
  return '';
}

// Devuelve lo que entra (sin repetidos, ni con lo que ya existe ni dentro de la misma tanda) y lo que se salta.
export function prepararTanda(s, obj, { archivo = '' } = {}) {
  const id = archivo || `pegada-${obj.fecha}-${obj.nombre || ''}`;
  if (s.tandas.some(t => t.id === id)) return { tanda: null, nuevos: [], repetidos: obj.prospectos.map(p => p.negocio) };
  const ya = todosLosTelefonos(s), nuevos = [], repetidos = [];
  let nombre = obj.nombre || `Tanda del ${obj.fecha}`;
  const mismos = s.tandas.filter(t => t.fecha === obj.fecha && (t.nombreBase || t.nombre) === nombre).length;
  const nombreBase = nombre;
  if (mismos) nombre = `${nombre} (${mismos + 1})`;
  for (const x of obj.prospectos) {
    const telefono = normalizarTelefono(x.telefono);
    if (!telefono || ya.has(telefono)) { repetidos.push(x.negocio || x.telefono); continue; }
    ya.add(telefono);
    nuevos.push({
      id: 'p' + telefono, telefono, negocio: String(x.negocio || '').trim() || telefono,
      linea: x.linea || '', nicho: x.nicho || '', zona: x.zona || '', pais: x.pais || '', google: x.google || '', nota: x.nota || '',
      mensaje: x.mensaje || '', canal: x.canal || 'WhatsApp', reserva: x.reserva === true,
      tanda: nombre, tandaId: id, tandaFecha: obj.fecha, orden: nuevos.length, etapa: 'Por escribir', escrito: '', seguimientos: [],
      proximoPaso: '', proximaFecha: '',
    });
  }
  return { tanda: { id, nombre, nombreBase, fecha: obj.fecha, total: nuevos.length }, nuevos, repetidos };
}

export function aplicarTanda(s, prep) {
  if (!prep.tanda) return 0;
  s.tandas.push(prep.tanda);
  s.prospectos.push(...prep.nuevos);
  return prep.nuevos.length;
}

// ---------- Lo que se ve hoy ----------
const deHoy = (s, hoy) => s.prospectos.filter(p => p.tandaFecha === hoy && p.tandaId)
  .sort((a, b) => a.tandaId.localeCompare(b.tandaId) || (a.orden ?? 0) - (b.orden ?? 0));
export const tandaDeHoy = (s, hoy) => deHoy(s, hoy).filter(p => p.etapa === 'Por escribir' && !p.reserva);
export const reservasDeHoy = (s, hoy) => deHoy(s, hoy).filter(p => p.etapa === 'Por escribir' && p.reserva);

// Cuántos llevo de la tanda de hoy, en total y por línea.
export function avanceDeHoy(s, hoy) {
  const lista = deHoy(s, hoy).filter(p => !p.reserva);
  const porLinea = {};
  for (const p of lista) {
    const l = porLinea[p.linea || 'Otra'] ||= { total: 0, escritos: 0 };
    l.total++; if (p.escrito) l.escritos++;
  }
  return { total: lista.length, escritos: lista.filter(p => p.escrito).length, porLinea };
}

export function proximoSeguimiento(p) {
  if (p.etapa !== 'Escrito' || !p.escrito) return null;
  const n = (p.seguimientos || []).length;
  if (n >= DIAS_SEGUIMIENTO.length) return null;
  let f = sumarDias(p.escrito, DIAS_SEGUIMIENTO[n]);
  const ultimo = p.seguimientos[n - 1];
  if (ultimo && f < sumarDias(ultimo, 2)) f = sumarDias(ultimo, 2);   // nunca dos seguimientos seguidos
  return f;
}

export function seguimientosDeHoy(s, hoy) {
  return s.prospectos
    .map(p => ({ p, fecha: proximoSeguimiento(p) }))
    .filter(x => x.fecha && x.fecha <= hoy)
    .map(x => ({ ...x, numero: x.p.seguimientos.length + 1, atraso: difDias(hoy, x.fecha) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.p.negocio.localeCompare(b.p.negocio));
}

export const respondieron = s => s.prospectos.filter(p => RESPONDIERON.includes(p.etapa))
  .sort((a, b) => (a.proximaFecha || '9999').localeCompare(b.proximaFecha || '9999'));

// ---------- Acciones ----------
export function marcarEscrito(s, p, hoy) {
  if (p.escrito) return false;
  p.escrito = hoy; p.etapa = 'Escrito'; p.seguimientos = [];
  const lista = deHoy(s, hoy).filter(x => !x.reserva);
  if (p.tandaFecha === hoy && lista.length && lista.every(x => x.escrito)) {
    s.meta.constancia = [...new Set([...(s.meta.constancia || []), hoy])].sort();
  }
  return true;
}

export function marcarSeguimiento(p, hoy) {
  if (!proximoSeguimiento(p) || p.seguimientos.includes(hoy)) return false;
  p.seguimientos.push(hoy);
  return true;
}

// Pasa al historial: solo queda el teléfono y la fecha del primer mensaje.
export function aHistorial(s, p, hoy) {
  s.prospectos = s.prospectos.filter(x => x !== p);
  if (p.telefono && !s.historial.some(h => h.telefono === p.telefono)) s.historial.push({ telefono: p.telefono, fecha: p.escrito || hoy });
}

// Devuelve true si el prospecto salió de la lista (historial o cliente).
export function cambiarEtapa(s, p, etapa, { paso = '', fecha = '' } = {}, hoy) {
  if (!p.escrito) marcarEscrito(s, p, hoy);
  if (CERRADAS.includes(etapa) || (etapa === 'No por ahora' && !fecha) || etapa === 'Cliente') { aHistorial(s, p, hoy); return true; }
  p.etapa = etapa === 'Contactado' ? 'Escrito' : etapa;
  if (paso || fecha || RESPONDIERON.includes(etapa)) { p.proximoPaso = paso; p.proximaFecha = fecha; }
  p.respondio ||= hoy;
  return false;
}

// Cierre automático y silencioso. Devuelve cuántos pasaron al historial.
export function mantener(s, hoy) {
  const cerrar = s.prospectos.filter(p => p.etapa === 'Escrito' && p.escrito && (
    (p.seguimientos.length >= DIAS_SEGUIMIENTO.length && difDias(hoy, p.escrito) >= DIAS_CIERRE) || difDias(hoy, p.escrito) >= DIAS_CIERRE_MAXIMO));
  cerrar.forEach(p => aHistorial(s, p, hoy));
  return cerrar.length;
}

// ---------- Tu recorrido ----------
const fechasEscritas = s => [...s.historial.map(h => h.fecha), ...s.prospectos.filter(p => p.escrito).map(p => p.escrito)].filter(Boolean);
export const lunesDe = f => { const d = new Date(f + 'T12:00:00'); return sumarDias(f, -((d.getDay() + 6) % 7)); };

export function recorrido(s, hoy) {
  const fechas = fechasEscritas(s), lunes = lunesDe(hoy);
  const semanas = [];
  for (let i = 5; i >= 0; i--) {
    const fin = sumarDias(lunes, 6 - i * 7);
    semanas.push({ desde: sumarDias(fin, -6), total: fechas.filter(f => f <= fin).length });
  }
  return {
    total: s.historial.length + s.prospectos.filter(p => p.escrito).length,
    semana: fechas.filter(f => f >= lunes && f <= sumarDias(lunes, 6)).length,
    hoy: avanceDeHoy(s, hoy), clientes: s.clientes.length, semanas,
  };
}

// ---------- Mensajes ----------
export const linkWhatsApp = (telefono, texto) => `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;

export function mensajeSeguimiento(p, numero) {
  const que = p.linea === 'Sistemas' ? 'el sistema' : 'la vista previa';
  return numero === 1
    ? `¿Sigue interesado en que le prepare ${que}? No tiene costo.`
    : `¿Todavía le interesa? Si ahora no es buen momento, no hay problema.`;
}

// Línea de la tanda -> servicio del cliente.
export const SERVICIO_DE_LINEA = { 'Páginas': 'Página web', 'Afuera': 'Página web', 'Sistemas': 'Sistema de control', 'Asistentes': 'Asistente de WhatsApp' };
