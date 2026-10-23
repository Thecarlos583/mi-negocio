// Qué se muestra en la pantalla Hoy. Funciones puras: reciben el estado y la fecha de hoy.
import { difDias, mesDe } from './util.js';
import { fechaSeguimiento } from './acciones.js';
import { estadoCobro } from './cobros.js';
import { ETAPAS_ACTIVAS } from './ajustes-base.js';

export const esReserva = p => p.reserva === true || /^Reserva de/.test(p.nota || '');
const numTanda = p => Math.max(0, ...(p.origenes || []).map(o => Number((/Tanda (\d+)/.exec(o) || [])[1]) || 0));
const vencida = (p, hoy) => !p.proximaFecha || p.proximaFecha <= hoy;

export function cobradoDelMes(clientes, hoy) {
  const mes = mesDe(hoy);
  return clientes.reduce((s, c) => s + (c.pagos || []).filter(p => mesDe(p.fecha) === mes).reduce((a, p) => a + (p.monto || 0), 0), 0);
}
export const ingresoRecurrente = clientes => clientes.filter(c => c.estado === 'Activo').reduce((s, c) => s + (c.mensual || 0), 0);

export function calcularHoy(estado, hoy) {
  const { prospectos, clientes, ajustes } = estado;
  const dias = ajustes.diasSeguimiento;

  // Urgente
  const urgente = [];
  for (const c of clientes) {
    const e = estadoCobro(c, hoy);
    if (e.clave === 'hoy' || e.clave === 'vencido') urgente.push({ tipo: 'cobro', cliente: c, estado: e });
    if ((c.pendienteConfirmar || []).length) urgente.push({ tipo: 'datos', cliente: c });
  }
  const llamadas = prospectos.filter(p => p.etapa === 'Llamada agendada' && p.proximaFecha && p.proximaFecha <= hoy)
    .sort((a, b) => (a.proximaFecha + (a.proximaHora || '')).localeCompare(b.proximaFecha + (b.proximaHora || '')));
  llamadas.forEach(p => urgente.push({ tipo: 'llamada', p }));
  prospectos.filter(p => p.etapa === 'Por pagar').forEach(p => urgente.push({ tipo: 'pago', p }));
  const orden = { llamada: 0, cobro: 1, pago: 2, datos: 3 };
  urgente.sort((a, b) => orden[a.tipo] - orden[b.tipo]);

  // Interesados (la llamada y el pago de hoy ya salen arriba)
  const activos = prospectos.filter(p => ETAPAS_ACTIVAS.includes(p.etapa) && p.etapa !== 'Por pagar'
    && !(p.etapa === 'Llamada agendada' && p.proximaFecha && p.proximaFecha <= hoy));
  const interesados = activos.filter(p => vencida(p, hoy)).sort((a, b) => (a.proximaFecha || '').localeCompare(b.proximaFecha || ''));
  const proximos = activos.filter(p => !vencida(p, hoy) && difDias(p.proximaFecha, hoy) <= 7)
    .sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha));

  // Seguimientos y reactivar
  const seguimientos = [], reactivar = [];
  for (const p of prospectos) {
    if (p.etapa !== 'Contactado' || !p.primerContacto) continue;
    if (difDias(hoy, p.primerContacto) > ajustes.diasReactivar) { reactivar.push(p); continue; }
    if (!(p.toques >= 1) || p.toques > dias.length) continue;
    const due = p.proximaFecha || fechaSeguimiento(p, dias);
    if (due && due <= hoy) seguimientos.push({ p, due, atraso: difDias(hoy, due) });
  }
  seguimientos.sort((a, b) => a.due.localeCompare(b.due));
  reactivar.sort((a, b) => a.primerContacto.localeCompare(b.primerContacto));

  // Primeros mensajes
  const enviadosHoy = prospectos.filter(p => p.primerContacto === hoy && p.etapa !== 'Por contactar');
  const porLinea = {};
  for (const l of Object.keys(ajustes.cupoDiario)) porLinea[l] = { enviados: enviadosHoy.filter(p => p.linea === l).length, cupo: ajustes.cupoDiario[l] };
  const porContactar = prospectos.filter(p => p.etapa === 'Por contactar').sort((a, b) =>
    (vencida(b, hoy) && !!b.proximaFecha) - (vencida(a, hoy) && !!a.proximaFecha)
    || esReserva(a) - esReserva(b) || numTanda(b) - numTanda(a));

  return {
    urgente, interesados, proximos, seguimientos, reactivar,
    primeros: { enviados: enviadosHoy.length, limite: ajustes.limiteFrioDiario, porLinea, lista: porContactar, llegoAlLimite: enviadosHoy.length >= ajustes.limiteFrioDiario },
    meta: { cobrado: cobradoDelMes(clientes, hoy), recurrente: ingresoRecurrente(clientes), objetivo: ajustes.metaMensualUSD },
  };
}
