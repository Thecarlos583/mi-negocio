// Cambios que deja Claude en cambios/*.json (formato del LEEME del repo privado). Funciones puras sobre el estado.
import { normalizarTelefono, normalizarNombre } from '../telefono.js';
import { cambiarEtapa, RESPONDIERON, SERVICIO_DE_LINEA } from './prospectos.js';
import { marcarPublicada, fijarProximoCobro, usdTxt } from './cobros.js';
import { uid } from '../util.js';

export function validarCambios(obj) {
  if (!obj || !Array.isArray(obj.cambios)) return 'El archivo no trae la lista «cambios».';
  return '';
}

const buscarProspecto = (s, x) => {
  const t = normalizarTelefono(x.telefono), n = normalizarNombre(x.negocio);
  return s.prospectos.find(p => (t && p.telefono === t) || (!t && n && normalizarNombre(p.negocio) === n));
};
export const buscarCliente = (s, nombre) => {
  const n = normalizarNombre(nombre);
  return n ? s.clientes.find(c => [c.negocio, c.contacto].some(v => normalizarNombre(v) === n)) || s.clientes.find(c => normalizarNombre(c.negocio).includes(n)) : null;
};

const MAPA_CONCEPTO = c => (/instalaci/i.test(c || '') ? 'Instalación' : 'Mensualidad');

export function nuevoCliente(datos) {
  return {
    id: 'c' + uid(), negocio: datos.negocio || '', contacto: datos.contacto || datos.contactoNombre || '', telefono: normalizarTelefono(datos.telefono),
    zona: datos.zona || '', servicio: datos.servicio || SERVICIO_DE_LINEA[datos.linea] || 'Página web', linea: datos.linea || '',
    instalacion: +datos.instalacion || 0, mensual: +datos.mensual || 0, diaCobro: +datos.diaCobro || null,
    publicada: null, inicioCobro: null, baseMensualidades: 0, alta: datos.alta || '', estado: datos.estado || 'Activo', pagos: [], url: datos.url || '',
  };
}

// Aplica la lista y devuelve avisos cortos y errores.
export function aplicarCambios(s, obj, hoy, tasa) {
  const avisos = [], errores = [];
  for (const x of obj.cambios) {
    try {
      if (x.op === 'etapa') {
        let p = buscarProspecto(s, x);
        const t = normalizarTelefono(x.telefono);
        if (!p && t && RESPONDIERON.includes(x.etapa) && s.historial.some(h => h.telefono === t)) {
          // alguien del historial respondió: vuelve a la lista con lo que trae el cambio
          const h = s.historial.find(h => h.telefono === t);
          s.historial = s.historial.filter(y => y !== h);
          p = { id: 'p' + t, telefono: t, negocio: x.negocio || t, linea: x.linea || '', nicho: '', zona: '', nota: '', mensaje: '', tanda: x.tanda || 'Historial',
            tandaId: '', tandaFecha: '', etapa: 'Escrito', escrito: h.fecha, seguimientos: [], proximoPaso: '', proximaFecha: '' };
          s.prospectos.push(p);
        }
        if (!p) { errores.push(`No encontré a ${x.negocio || x.telefono}`); continue; }
        if (x.nota) p.nota = x.nota;
        if (x.contactoNombre) p.contacto = x.contactoNombre;
        const etapa = x.etapa === 'Llamada agendada' ? 'Llamada agendada' : x.etapa;
        cambiarEtapa(s, p, etapa, { paso: x.proximoPaso || '', fecha: x.proximaFecha || '' }, hoy);
        avisos.push(`${p.negocio}: ${x.etapa}`);
      } else if (x.op === 'pago') {
        const c = buscarCliente(s, x.cliente);
        if (!c) { errores.push(`No encontré al cliente ${x.cliente}`); continue; }
        c.pagos.push({ id: uid(), fecha: x.fecha || hoy, monto: +x.monto || 0, concepto: MAPA_CONCEPTO(x.concepto), metodo: x.metodo || '', tasa: +x.tasa || tasa?.usd || null });
        avisos.push(`${c.contacto || c.negocio} pagó ${usdTxt(+x.monto || 0)}`);
      } else if (x.op === 'cliente_nuevo') {
        const t = normalizarTelefono(x.telefono);
        if (t && s.clientes.some(c => c.telefono === t)) { errores.push(`${x.negocio} ya es cliente`); continue; }
        const c = nuevoCliente({ ...x, alta: x.alta || hoy });
        s.clientes.push(c);
        const p = buscarProspecto(s, x);
        if (p) cambiarEtapa(s, p, 'Cliente', {}, hoy);
        else if (t && !s.historial.some(h => h.telefono === t)) s.historial.push({ telefono: t, fecha: hoy });
        avisos.push(`${c.negocio} es cliente`);
      } else if (x.op === 'fecha_cobro') {
        const c = buscarCliente(s, x.cliente);
        if (!c || !x.fechaProximoCobro) { errores.push(`No encontré al cliente ${x.cliente}`); continue; }
        fijarProximoCobro(c, x.fechaProximoCobro);
        avisos.push(`${c.negocio}: próximo cobro ${x.fechaProximoCobro.split('-').reverse().join('/')}`);
      } else if (x.op === 'publicada') {
        const c = buscarCliente(s, x.cliente);
        if (!c) { errores.push(`No encontré al cliente ${x.cliente}`); continue; }
        marcarPublicada(c, x.fecha || hoy);
        avisos.push(`${c.negocio} quedó publicada`);
      } else if (x.op === 'cerrar_tanda') {
        const lista = s.prospectos.filter(p => p.tanda === x.tanda && p.etapa === 'Escrito');
        lista.forEach(p => cambiarEtapa(s, p, 'No respondió', {}, hoy));
        avisos.push(`${x.tanda} cerrada (${lista.length})`);
      } else errores.push(`No conozco la operación «${x.op}»`);
    } catch (e) { errores.push(e.message); }
  }
  return { avisos, errores };
}
