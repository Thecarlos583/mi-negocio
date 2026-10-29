// Paso de los datos viejos (v3) a la base nueva de la v2. Función pura.
//  - Respondió, Interesado, Llamada agendada y Por pagar pasan a «Te respondieron» con su próximo paso.
//  - Los «Contactado» de menos de 10 días siguen vivos para no perder su seguimiento.
//  - Todos los demás van al historial, solo con su teléfono y la fecha del primer mensaje.
import { difDias } from '../util.js';
import { normalizarTelefono } from '../telefono.js';
import { DIAS_CIERRE } from './prospectos.js';

const VIVAS = ['Respondió', 'Interesado', 'Llamada agendada', 'Por pagar'];

// clientes: los de la v2, que vienen de un archivo del repo privado (aquí nunca van datos).
export function migrarV3(v3, hoy, clientes = []) {
  const prospectos = [], historial = [], vistos = new Set(clientes.map(c => c.telefono));
  for (const x of v3.prospectos || []) {
    const telefono = normalizarTelefono(x.telefono);
    if (!telefono) continue;
    const fecha = x.primerContacto || (x.historial || []).map(h => h.fecha).filter(Boolean).sort()[0] || v3.generado || hoy;
    const reciente = x.etapa === 'Contactado' && x.primerContacto && difDias(hoy, x.primerContacto) < DIAS_CIERRE;
    if (VIVAS.includes(x.etapa) || reciente) {
      if (prospectos.some(p => p.telefono === telefono)) continue;
      const seguimientos = (x.historial || []).filter(h => h.tipo === 'seguimiento').map(h => h.fecha).filter(Boolean).sort();
      prospectos.push({
        id: 'p' + telefono, telefono, negocio: x.negocio, linea: x.linea || '', nicho: x.nicho || '', zona: x.zona || '', pais: x.pais || '',
        google: x.google || '', nota: x.nota || '', mensaje: '', canal: x.canal || 'WhatsApp', reserva: false,
        tanda: x.tanda || (x.origenes || [])[0] || '', tandaId: '', tandaFecha: '',
        etapa: reciente ? 'Escrito' : x.etapa, escrito: fecha, seguimientos, proximoPaso: x.proximoPaso || '', proximaFecha: x.proximaFecha || '',
        contacto: x.contactoNombre || '',
      });
    } else if (!historial.some(h => h.telefono === telefono)) historial.push({ telefono, fecha });
    vistos.add(telefono);
  }
  const t = v3.ajustes?.tasaBCV;
  return {
    tipo: 'arranque', version: 2, generado: hoy, prospectos, historial,
    clientes: clientes.map(c => structuredClone(c)),
    tandas: (v3.tandas || []).map(x => ({ id: 'v3-' + x.nombre, nombre: x.nombre, nombreBase: x.nombre, fecha: x.fecha, total: x.total })),
    tasa: t?.usd ? { fecha: t.fecha, usd: t.usd } : null,
    aprendizajes: v3.aprendizajes || [],
  };
}
