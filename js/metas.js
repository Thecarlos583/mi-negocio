// Meta mensual: lo cobrado, el ingreso recurrente y lo que falta para llegar.
import { mesDe } from './util.js';

export const cobradoDelMes = (clientes, hoy) => {
  const mes = mesDe(hoy);
  return clientes.reduce((s, c) => s + (c.pagos || []).filter(p => mesDe(p.fecha) === mes).reduce((a, p) => a + (p.monto || 0), 0), 0);
};
export const ingresoRecurrente = clientes => clientes.filter(c => c.estado === 'Activo').reduce((s, c) => s + (c.mensual || 0), 0);

export const MIN_CONTACTOS = 30;   // con menos contactos la tasa de cierre no dice mucho
export const MIN_CIERRES = 3;

export function escalones(objetivo) {
  return [...new Set([objetivo, 1000, 3000])].sort((a, b) => a - b);
}

export function progresoMeta({ clientes, prospectos, ajustes }, hoy) {
  const objetivo = ajustes.metaMensualUSD;
  const recurrente = ingresoRecurrente(clientes);
  const cobrado = cobradoDelMes(clientes, hoy);
  const activos = clientes.filter(c => c.estado === 'Activo');
  const promedio = activos.length ? recurrente / activos.length : (ajustes.precios?.['Páginas']?.[0]?.mensual || 15);
  const faltan = Math.max(0, objetivo - recurrente);
  const clientesFaltan = faltan > 0 ? Math.ceil(faltan / promedio - 1e-9) : 0;
  const contactos = prospectos.filter(p => p.primerContacto).length;
  const cierres = prospectos.filter(p => p.etapa === 'Cliente').length;
  const tasa = contactos ? cierres / contactos : 0;
  return {
    objetivo, recurrente, cobrado, promedio, faltan, clientesFaltan, contactos, cierres, tasa,
    contactosNecesarios: tasa > 0 ? Math.ceil(clientesFaltan / tasa) : null,
    pocosDatos: contactos < MIN_CONTACTOS || cierres < MIN_CIERRES,
    escalones: escalones(objetivo).map(valor => ({ valor, alcanzado: recurrente >= valor })),
  };
}
