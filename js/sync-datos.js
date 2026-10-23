// Lo que la app le deja a Claude en el repo privado: un resumen corto y el respaldo completo. Funciones puras.
import { sumarDias, difDias } from './util.js';
import { ETAPAS_VIVAS, ETAPAS_MUERTAS } from './ajustes-base.js';
import { estadoCobro, saldoInstalacion } from './cobros.js';
import { calcularResumen, semanaDe } from './resumen.js';
import { calcularHoy } from './hoy-logic.js';
import { construirRespaldo } from './datos.js';

const DIAS_VIVOS = 21;      // «tandas recientes»
const DIAS_MUERTOS = 14;

const fechaMuerte = p => (p.historial || []).filter(h => h.tipo === 'etapa' && ETAPAS_MUERTAS.includes(h.etapa)).map(h => h.fecha).sort().pop() || '';

export function construirEstadoNube(estado, hoy, ahora) {
  const { prospectos, clientes } = estado;
  const reciente = p => p.primerContacto && difDias(hoy, p.primerContacto) <= DIAS_VIVOS;
  const { desde, hasta } = semanaDe(hoy);
  const r = calcularResumen(estado, desde, hasta, hoy);
  const h = calcularHoy(estado, hoy);
  return {
    tipo: 'estado', version: 1, actualizado: ahora, hoy,
    // Todos los números que ya existen (tengan la etapa que tengan), para no repetir ninguno.
    telefonos: [...new Set(prospectos.map(p => p.telefono).filter(Boolean))].sort(),
    sinTelefono: prospectos.filter(p => !p.telefono).map(p => p.negocio),
    pendientesDeEscribir: prospectos.filter(p => p.etapa === 'Por contactar').length,
    vivos: prospectos.filter(p => ETAPAS_VIVAS.includes(p.etapa) && (reciente(p) || p.etapa !== 'Contactado')).map(p => ({
      negocio: p.negocio, telefono: p.telefono, linea: p.linea, nicho: p.nicho, zona: p.zona, etapa: p.etapa, toques: p.toques || 0,
      primerContacto: p.primerContacto || '', ultimoMensaje: p.ultimoMensaje || null, proximaFecha: p.proximaFecha || '', proximoPaso: p.proximoPaso || '', nota: p.nota || '',
    })),
    muertosRecientes: prospectos.filter(p => ETAPAS_MUERTAS.includes(p.etapa) && fechaMuerte(p) && difDias(hoy, fechaMuerte(p)) <= DIAS_MUERTOS).map(p => ({
      negocio: p.negocio, telefono: p.telefono, nicho: p.nicho, etapa: p.etapa, motivo: p.motivoMuerte || (p.etapa === 'Perdido' ? 'Dijo que no' : p.etapa), fecha: fechaMuerte(p),
    })),
    porDecidir: h.paraCerrar.map(p => p.negocio),
    clientes: clientes.map(c => ({ negocio: c.negocio, linea: c.linea, servicio: c.servicio || '', mensual: c.mensual || 0, estado: c.estado, cobro: estadoCobro(c, hoy).texto, proximoCobro: c.proximoCobro || '', saldoInstalacion: saldoInstalacion(c) })),
    semana: {
      desde, hasta, frios: r.frios, seguimientos: r.seguimientos, respuestas: r.respuestas, tasaRespuesta: Math.round(r.tasa * 1000) / 1000,
      interesadosNuevos: r.interesadosNuevos, llamadas: r.llamadas, cierres: r.cierres, cobrado: r.cobrado, recurrente: r.recurrente,
      porNicho: r.porNicho, porLinea: r.porLinea, conclusiones: r.conclusiones.map(c => c.texto),
    },
  };
}

export const construirRespaldoNube = (estado, hoy) => construirRespaldo(estado, hoy);

// Hash sencillo para saber si el contenido cambió desde la última subida (sin contar la hora de actualización).
export function huella(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return String(h);
}
export const sinHora = o => JSON.stringify({ ...o, actualizado: '' });

// Base 64 con acentos (UTF-8), sin reventar la pila con textos grandes.
export function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export const deBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(String(b64).replace(/\s/g, '')), c => c.charCodeAt(0)));

export { sumarDias };
