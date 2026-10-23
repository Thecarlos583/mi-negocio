// Cambios sobre un prospecto. Todo queda en su historial con fecha y hora.
import { sumarDias } from './util.js';

export function evento(p, hoy, hora, tipo, texto, extra = {}) {
  (p.historial ||= []).push({ fecha: hoy, hora, tipo, texto, ...extra });
}

// Siguiente seguimiento: toque 2 a los 3 días del primer mensaje, toque 3 a los 7. Después ya no hay.
export function fechaSeguimiento(p, dias) {
  if (!p.primerContacto || !(p.toques >= 1) || p.toques > dias.length) return '';
  return sumarDias(p.primerContacto, dias[p.toques - 1]);
}

export function cambiarEtapa(p, etapa, hoy, hora) {
  if (p.etapa === etapa) return p;
  if (p.etapa === 'Contactado' && !['Contactado', 'Por contactar'].includes(etapa) && !p.respondioEl) p.respondioEl = hoy;
  p.etapa = etapa;
  evento(p, hoy, hora, 'etapa', `Etapa: ${etapa}`, { etapa });
  return p;
}

// El usuario confirmó que lo envió. tipo: 'primer' | 'seg2' | 'seg3'
export function registrarEnvio(p, tipo, hoy, hora, dias) {
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
