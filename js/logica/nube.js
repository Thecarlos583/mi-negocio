// Lo que la app le deja a Claude en el repo privado y el arranque de la v2. Funciones puras.
import { todosLosTelefonos, tandaDeHoy, seguimientosDeHoy, respondieron, recorrido } from './prospectos.js';
import { proximosCobros, ingresoFijo, porCobrar, cobradoEnMes, debe } from './cobros.js';
import { metaActiva } from './metas.js';

export function validarArranque(obj) {
  if (obj?.tipo !== 'arranque' || !Array.isArray(obj.historial) || !Array.isArray(obj.clientes)) return 'No es un archivo de arranque de la v2.';
  return '';
}

// Reemplaza todo con el arranque (solo se usa una vez, con la base vacía).
export function aplicarArranque(s, obj) {
  s.prospectos = obj.prospectos || [];
  s.historial = obj.historial;
  s.clientes = obj.clientes;
  s.tandas = obj.tandas || [];
  if (obj.tasa?.usd && !s.meta.tasa) s.meta.tasa = obj.tasa;
  if (obj.aprendizajes) s.meta.aprendizajes = obj.aprendizajes;
}

export function construirEstado(s, hoy, ahora) {
  const m = metaActiva(s.clientes), r = recorrido(s, hoy);
  return {
    tipo: 'estado', app: 'mi-negocio-v2', version: 3, actualizado: ahora, hoy,
    // Todos los números que ya existen (prospectos, historial y clientes): para no repetir ninguno al armar tandas.
    telefonos: [...todosLosTelefonos(s)].sort(),
    recorrido: { total: r.total, semana: r.semana, hoy: r.hoy.escritos, tandaHoy: r.hoy.total },
    porEscribirHoy: tandaDeHoy(s, hoy).map(p => p.negocio),
    seguimientosHoy: seguimientosDeHoy(s, hoy).map(x => ({ negocio: x.p.negocio, telefono: x.p.telefono, tanda: x.p.tanda, numero: x.numero, atraso: x.atraso })),
    vivos: s.prospectos.filter(p => p.escrito).map(p => ({
      negocio: p.negocio, telefono: p.telefono, linea: p.linea, nicho: p.nicho, zona: p.zona, etapa: p.etapa, tanda: p.tanda,
      escrito: p.escrito, seguimientos: p.seguimientos, proximoPaso: p.proximoPaso || '', proximaFecha: p.proximaFecha || '', nota: p.nota || '',
    })),
    respondieron: respondieron(s).map(p => p.negocio),
    tandas: s.tandas.slice(-6).map(t => ({ nombre: t.nombre, fecha: t.fecha, total: t.total })),
    meta: { objetivo: m.objetivo, ingresoFijo: m.ingreso, falta: m.falta },
    clientes: s.clientes.map(c => ({
      negocio: c.negocio, contacto: c.contacto, servicio: c.servicio, mensual: c.mensual, diaCobro: c.diaCobro, publicada: c.publicada,
      debe: debe(c, hoy), pagado: (c.pagos || []).reduce((t, p) => t + (+p.monto || 0), 0),
    })),
    proximosCobros: proximosCobros(s.clientes, hoy).map(x => ({ cliente: x.c.negocio, concepto: x.concepto, monto: x.monto, fecha: x.fecha })),
    numeros: { ingresoFijo: ingresoFijo(s.clientes), porCobrar: porCobrar(s.clientes, hoy), cobradoMes: cobradoEnMes(s.clientes, hoy.slice(0, 7)) },
  };
}

export function construirRespaldo(s, hoy) {
  const { sync, ...meta } = s.meta;      // el token nunca sale del teléfono
  return { tipo: 'respaldo', app: 'mi-negocio-v2', version: 3, generado: hoy, prospectos: s.prospectos, historial: s.historial, clientes: s.clientes, tandas: s.tandas, meta };
}

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
