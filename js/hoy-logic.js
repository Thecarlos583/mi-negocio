// Qué se muestra en la pantalla Hoy. Funciones puras: reciben el estado y la fecha de hoy.
import { difDias } from './util.js';
import { fechaSeguimiento } from './acciones.js';
import { estadoCobro } from './cobros.js';
import { ETAPAS_ACTIVAS } from './ajustes-base.js';
import { cobradoDelMes, ingresoRecurrente } from './metas.js';

export const esReserva = p => p.reserva === true;
const vencida = (p, hoy) => !p.proximaFecha || p.proximaFecha <= hoy;

export function ultimaTanda(tandas) {
  return [...tandas].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.creada || '').localeCompare(b.creada || '')).pop() || null;
}

export function calcularHoy(estado, hoy) {
  const { prospectos, clientes, ajustes, tandas } = estado;
  const dias = ajustes.diasSeguimiento;

  // Urgente
  const urgente = [];
  for (const c of clientes) {
    const e = estadoCobro(c, hoy);
    if (e.clave === 'hoy' || e.clave === 'vencido') urgente.push({ tipo: 'cobro', cliente: c, estado: e });
    if ((c.pendienteConfirmar || []).length) urgente.push({ tipo: 'datos', cliente: c });
  }
  prospectos.filter(p => p.etapa === 'Llamada agendada' && p.proximaFecha && p.proximaFecha <= hoy)
    .sort((a, b) => (a.proximaFecha + (a.proximaHora || '')).localeCompare(b.proximaFecha + (b.proximaHora || '')))
    .forEach(p => urgente.push({ tipo: 'llamada', p }));
  prospectos.filter(p => p.etapa === 'Por pagar').forEach(p => urgente.push({ tipo: 'pago', p }));
  const orden = { llamada: 0, cobro: 1, pago: 2, datos: 3 };
  urgente.sort((a, b) => orden[a.tipo] - orden[b.tipo]);

  // Interesados (la llamada de hoy y el pago ya salen arriba)
  const activos = prospectos.filter(p => ETAPAS_ACTIVAS.includes(p.etapa) && p.etapa !== 'Por pagar'
    && !(p.etapa === 'Llamada agendada' && p.proximaFecha && p.proximaFecha <= hoy));
  const interesados = activos.filter(p => vencida(p, hoy)).sort((a, b) => (a.proximaFecha || '').localeCompare(b.proximaFecha || ''));
  const proximos = activos.filter(p => !vencida(p, hoy) && difDias(p.proximaFecha, hoy) <= 7)
    .sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha));

  // Seguimientos y cierres: solo Contactado. «No respondió» y las demás etapas cerradas nunca entran.
  const seguimientos = [], paraCerrar = [];
  for (const p of prospectos) {
    if (p.etapa !== 'Contactado' || !p.primerContacto) continue;
    if (p.toques > dias.length) { paraCerrar.push(p); continue; }
    if (!(p.toques >= 1)) continue;
    const due = p.proximaFecha || fechaSeguimiento(p, dias);
    if (due && due <= hoy) seguimientos.push({ p, due, atraso: difDias(hoy, due) });
  }
  seguimientos.sort((a, b) => a.due.localeCompare(b.due));
  paraCerrar.sort((a, b) => a.primerContacto.localeCompare(b.primerContacto));

  // Primeros mensajes: la tanda del día (la última importada) y, aparte, las reservas
  const enviadosHoy = prospectos.filter(p => p.primerContacto === hoy && p.etapa !== 'Por contactar');
  const porLinea = {};
  for (const l of Object.keys(ajustes.cupoDiario)) porLinea[l] = { enviados: enviadosHoy.filter(p => p.linea === l).length, cupo: ajustes.cupoDiario[l] };
  const pend = prospectos.filter(p => p.etapa === 'Por contactar');
  const tanda = ultimaTanda(tandas);
  const delDia = pend.filter(p => !esReserva(p) && (!tanda || (p.origenes || []).includes(tanda.nombre) || (p.proximaFecha && p.proximaFecha <= hoy)))
    .sort((a, b) => (!!b.proximaFecha && b.proximaFecha <= hoy) - (!!a.proximaFecha && a.proximaFecha <= hoy));
  const reservas = pend.filter(esReserva);

  return {
    urgente, interesados, proximos, seguimientos, paraCerrar,
    primeros: { enviados: enviadosHoy.length, limite: ajustes.limiteFrioDiario, porLinea, tanda, lista: delDia, reservas, llegoAlLimite: enviadosHoy.length >= ajustes.limiteFrioDiario },
    meta: { cobrado: cobradoDelMes(clientes, hoy), recurrente: ingresoRecurrente(clientes), objetivo: ajustes.metaMensualUSD },
  };
}
