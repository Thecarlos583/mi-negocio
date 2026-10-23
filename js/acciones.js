// Cambios sobre un prospecto. Todo queda en su historial con fecha y hora.
import { sumarDias } from './util.js';
import { ETAPAS_VIVAS, ETAPAS_MUERTAS } from './ajustes-base.js';

export const esVivo = p => ETAPAS_VIVAS.includes(p.etapa);
export const esMuerto = p => ETAPAS_MUERTAS.includes(p.etapa);

export function evento(p, hoy, hora, tipo, texto, extra = {}) {
  (p.historial ||= []).push({ fecha: hoy, hora, tipo, texto, ...extra });
}

// Siguiente seguimiento: toque 2 a los 3 días del primer mensaje, toque 3 a los 7. Después ya no hay.
export function fechaSeguimiento(p, dias) {
  if (!p.primerContacto || !(p.toques >= 1) || p.toques > dias.length) return '';
  return sumarDias(p.baseSeguimiento || p.primerContacto, dias[p.toques - 1]);
}

export function cambiarEtapa(p, etapa, hoy, hora) {
  if (p.etapa === etapa) return p;
  // «No respondió» no es una respuesta: no marca respondioEl.
  if (p.etapa === 'Contactado' && !['Contactado', 'Por contactar', 'No respondió'].includes(etapa) && !p.respondioEl) p.respondioEl = hoy;
  p.etapa = etapa;
  evento(p, hoy, hora, 'etapa', `Etapa: ${etapa}`, { etapa });
  return p;
}

// Cierra un prospecto que no contestó: queda para no repetirlo y no vuelve a aparecer en seguimientos.
export function cerrarSinRespuesta(p, hoy, hora) {
  cambiarEtapa(p, 'No respondió', hoy, hora);
  p.proximaFecha = ''; p.proximoPaso = ''; delete p.proximaHora;
  return p;
}

// El usuario confirmó que lo envió. tipo: 'primer' | 'seg2' | 'seg3'
// Dar por muerto: «No respondió» (sin respuesta) o «Dijo que no» (rechazo, va a Perdido).
export function darPorMuerto(p, motivo, hoy, hora) {
  if (motivo === 'No respondió') cerrarSinRespuesta(p, hoy, hora);
  else { cambiarEtapa(p, 'Perdido', hoy, hora); p.proximaFecha = ''; p.proximoPaso = ''; delete p.proximaHora; }
  p.motivoMuerte = motivo;
  evento(p, hoy, hora, 'nota', `Dado por muerto: ${motivo}`);
  return p;
}

// Revivir: vuelve a Contactado con una fecha para el próximo seguimiento (cuenta como toque 2 desde hoy).
export function revivir(p, fecha, hoy, hora) {
  cambiarEtapa(p, 'Contactado', hoy, hora);
  p.toques = 1; p.baseSeguimiento = hoy; p.proximaFecha = fecha; p.proximoPaso = 'Seguimiento con valor';
  delete p.motivoMuerte;
  evento(p, hoy, hora, 'nota', `Revivido, seguimiento el ${fecha.split('-').reverse().join('/')}`);
  return p;
}

export function registrarEnvio(p, tipo, hoy, hora, dias, texto = '') {
  if (texto) p.ultimoMensaje = { fecha: hoy, tipo, texto };
  if (tipo === 'primer') {
    p.primerContacto = hoy;
    p.toques = 1;
    p.etapa = 'Contactado';
    evento(p, hoy, hora, 'contacto', 'Primer mensaje');
    evento(p, hoy, hora, 'etapa', 'Etapa: Contactado', { etapa: 'Contactado' });
  } else {
    p.toques = (p.toques || 1) + 1;
    evento(p, hoy, hora, 'seguimiento', `Seguimiento ${p.toques}`);
  }
  p.proximaFecha = fechaSeguimiento(p, dias);
  p.proximoPaso = p.proximaFecha ? 'Seguimiento con valor' : '';
  delete p.proximaHora;
  return p;
}

export function posponer(p, nuevaFecha, hoy, hora) {
  p.proximaFecha = nuevaFecha;
  evento(p, hoy, hora, 'nota', `Pospuesto al ${nuevaFecha.split('-').reverse().join('/')}`);
  return p;
}

export function agregarNota(p, texto, hoy, hora) {
  if (texto.trim()) evento(p, hoy, hora, 'nota', texto.trim());
  return p;
}

export function fijarProximo(p, { proximoPaso, proximaFecha, proximaHora }) {
  if (proximoPaso !== undefined) p.proximoPaso = proximoPaso;
  if (proximaFecha !== undefined) p.proximaFecha = proximaFecha;
  if (proximaHora !== undefined) { if (proximaHora) p.proximaHora = proximaHora; else delete p.proximaHora; }
  return p;
}
