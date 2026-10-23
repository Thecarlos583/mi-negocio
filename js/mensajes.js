// Mensaje de WhatsApp: el del prospecto si la tanda lo trajo; si no, la plantilla de su línea y nicho.
export function plantillaPara(plantillas, p, tipo) {
  const t = plantillas[`${p.linea}|${p.nicho}`] || plantillas[p.linea] || plantillas['Páginas'];
  return (t && t[tipo]) || '';
}

export function llenar(texto, p) {
  const nombre = (p.contactoNombre || '').replace(/\s*\(.*\)/, '').trim();
  return texto
    .replaceAll('{negocio}', p.negocio || '').replaceAll('{zona}', p.zona || '').replaceAll('{nombre}', nombre)
    .replace(/\s+([,.!?])/g, '$1').replace(/ {2,}/g, ' ').trim();
}

// tipo: 'primer' | 'seg2' | 'seg3'
export const tipoSiguiente = p => (!p.toques ? 'primer' : p.toques === 1 ? 'seg2' : 'seg3');

export function mensajePara(plantillas, p, tipo) {
  if (tipo === 'primer' && p.mensaje) return llenar(p.mensaje, p);
  return llenar(plantillaPara(plantillas, p, tipo), p);
}

export const urlWhatsApp = (tel, texto) => `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
