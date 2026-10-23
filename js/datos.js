// Respaldo: leer, validar, normalizar y armar. Todo con objetos simples (se prueba con node --test).
import { ETAPAS, completarAjustes } from './ajustes-base.js';
import { normalizarTelefono, normalizarNombre } from './telefono.js';

// Acepta el JSON suelto o rodeado de texto y de las comillas de bloque de código.
export function leerJSON(texto) {
  const t = String(texto ?? '').trim();
  if (!t) throw new Error('No hay nada que leer.');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No encontré un JSON en ese texto.');
  try { return JSON.parse(t.slice(a, b + 1)); }
  catch { throw new Error('El texto parece un JSON pero está cortado o tiene un error.'); }
}

export function validarRespaldo(o) {
  if (!o || typeof o !== 'object') return 'El archivo no es un respaldo.';
  if (o.tipo !== 'respaldo') return `Este archivo es de tipo «${o.tipo ?? 'desconocido'}», no un respaldo.`;
  if (!Array.isArray(o.prospectos)) return 'Al respaldo le faltan los prospectos.';
  return null;
}

// Deja cada prospecto con la forma que espera la app y quita repetidos (teléfono, o nombre si no tiene).
export function normalizarProspectos(lista) {
  const vistos = new Set(), salida = [];
  let repetidos = 0;
  for (const raw of lista) {
    const p = { ...raw };
    p.telefono = normalizarTelefono(p.telefono);
    p.etapa = ETAPAS.includes(p.etapa) ? p.etapa : 'Por contactar';
    p.toques = Number(p.toques) || 0;
    p.historial = Array.isArray(p.historial) ? p.historial : [];
    p.origenes = Array.isArray(p.origenes) ? p.origenes : [];
    p.canal = p.canal || (p.telefono ? 'WhatsApp' : 'Instagram');
    p.id = p.id || (p.telefono ? 'p' + p.telefono : 'n-' + normalizarNombre(p.negocio).replace(/ /g, '-'));
    const clave = p.telefono ? 't' + p.telefono : 'n' + normalizarNombre(p.negocio);
    if (vistos.has(clave)) { repetidos++; continue; }
    vistos.add(clave);
    salida.push(p);
  }
  return { prospectos: salida, repetidos };
}

export function prepararRespaldo(o) {
  const { prospectos, repetidos } = normalizarProspectos(o.prospectos);
  return {
    repetidos,
    estado: {
      ajustes: completarAjustes(o.ajustes),
      prospectos,
      clientes: Array.isArray(o.clientes) ? o.clientes : [],
      resumenes: Array.isArray(o.resumenes) ? o.resumenes : [],
      tandas: Array.isArray(o.tandas) ? o.tandas : [],
    },
  };
}

export function construirRespaldo(estado, hoy) {
  return {
    tipo: 'respaldo', app: 'mi-negocio', version: 1, generado: hoy,
    ajustes: estado.ajustes, prospectos: estado.prospectos, clientes: estado.clientes,
    resumenes: estado.resumenes, tandas: estado.tandas,
  };
}
