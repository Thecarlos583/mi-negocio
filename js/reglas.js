// «Qué funcionó y qué no»: reglas claras, no adivinanzas. Todos los números de partida viven aquí.
export const UMBRAL = {
  contactosMinimos: 15,        // menos que esto: «todavía pocos datos»
  respuestaBuena: 0.15,        // 15% o más: dale más cupo
  seguimientosAtrasados: 10,   // más que esto: haz seguimientos antes de una tanda nueva
  diasSinMovimiento: 5,        // interesados quietos
};

const pct = x => `${Math.round(x * 1000) / 10}%`;
const dato = n => `con ${n} contacto${n === 1 ? '' : 's'}`;

// Cada regla recibe el resumen y devuelve una lista de {tipo: 'bien' | 'mal' | 'aviso', texto, datos}.
export const REGLAS = [
  r => Object.entries(r.porNicho).filter(([, v]) => v.contactos >= UMBRAL.contactosMinimos && v.respuestas === 0)
    .map(([n, v]) => ({ tipo: 'mal', texto: `${n}: Pausa este nicho o cambia el mensaje. Nadie respondió.`, datos: dato(v.contactos) })),
  r => Object.entries(r.porNicho).filter(([, v]) => v.contactos >= UMBRAL.contactosMinimos && v.respuestas / v.contactos >= UMBRAL.respuestaBuena)
    .map(([n, v]) => ({ tipo: 'bien', texto: `${n}: Este funciona, dale más cupo. Respondió el ${pct(v.respuestas / v.contactos)}.`, datos: dato(v.contactos) })),
  r => {
    const pocos = Object.entries(r.porNicho).filter(([, v]) => v.contactos > 0 && v.contactos < UMBRAL.contactosMinimos);
    return pocos.length ? [{ tipo: 'aviso', texto: `Todavía pocos datos en: ${pocos.map(([n, v]) => `${n} (${v.contactos})`).join(', ')}. Con menos de ${UMBRAL.contactosMinimos} contactos no saco conclusiones.`, datos: '' }] : [];
  },
  r => r.seguimientosPendientes > UMBRAL.seguimientosAtrasados
    ? [{ tipo: 'mal', texto: 'Antes de mandar tanda nueva, haz los seguimientos.', datos: `${r.seguimientosPendientes} pendientes` }] : [],
  r => r.cobrosVencidos.length ? [{ tipo: 'mal', texto: `Cobra primero: ${r.cobrosVencidos.join(', ')}.`, datos: `${r.cobrosVencidos.length} vencido${r.cobrosVencidos.length > 1 ? 's' : ''}` }] : [],
  r => {
    if (r.meta.recurrente >= r.meta.objetivo) return [];
    const proyectado = r.meta.recurrente + r.cierres * 4 * r.meta.promedio;   // un mes tiene unas 4 semanas
    if (proyectado >= r.meta.objetivo) return [];
    return [{ tipo: 'aviso', texto: `Al ritmo de ${r.cierres} cierre${r.cierres === 1 ? '' : 's'} por semana llegas a $${Math.round(proyectado)} de recurrente y la meta es $${r.meta.objetivo}. Faltan $${Math.round(r.meta.faltan)}: sube los contactos o los seguimientos.`, datos: `${r.meta.cierres} cierres en ${r.meta.contactos} contactos` }];
  },
  r => r.interesadosQuietos.length ? [{ tipo: 'aviso', texto: `Interesados sin movimiento en ${UMBRAL.diasSinMovimiento} días o más: ${r.interesadosQuietos.join(', ')}.`, datos: `${r.interesadosQuietos.length} negocio${r.interesadosQuietos.length > 1 ? 's' : ''}` }] : [],
];

export const evaluarReglas = r => REGLAS.flatMap(regla => regla(r));
