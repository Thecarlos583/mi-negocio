import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararTanda, aplicarTanda, prepararCambios, aplicarCambios, validarTanda } from '../js/tandas.js';
import { registrarPago, estadoCobro, saldoInstalacion, restanteCiclo, addMes, mensajeCobro, totalPorMes } from '../js/cobros.js';
import { progresoMeta, cobradoDelMes } from '../js/metas.js';
import { sugerirPrecio } from '../js/precios.js';
import { calcularHoy } from '../js/hoy-logic.js';
import { calcularResumen, resumenPendiente, semanaDe, lunesDe, respondio, serieSemanas, textoParaClaude } from '../js/resumen.js';
import { completarAjustes } from '../js/ajustes-base.js';
import { cerrarSinRespuesta, cambiarEtapa } from '../js/acciones.js';

const base = (o = {}) => ({ id: 'p' + o.telefono, negocio: 'N', telefono: '', linea: 'Sistemas', nicho: 'Carnicerías', zona: '', pais: 'Venezuela', origenes: [], primerContacto: '', etapa: 'Por contactar', nota: '', proximoPaso: '', proximaFecha: '', toques: 0, historial: [], ...o });
const estado = (prospectos = [], clientes = [], tandas = []) => ({ ajustes: completarAjustes(), prospectos, clientes, tandas, resumenes: [] });

test('tanda: nuevos, existentes y reservas', () => {
  const ex = [base({ negocio: 'Viejo', telefono: '584121234567', etapa: 'Contactado', primerContacto: '2026-10-05', origenes: ['Tanda 4'] })];
  const t = { tipo: 'tanda', nombre: 'Tanda 20', fecha: '2026-10-23', prospectos: [
    { negocio: 'Nuevo A', telefono: '0412 765 4321', linea: 'Sistemas', nicho: 'Carnicerías', mensaje: 'Hola A' },
    { negocio: 'Viejo', telefono: '04121234567' },
    { negocio: 'Nuevo A otra vez', telefono: '584127654321' },
    { negocio: 'Reserva B', telefono: '584129999999', reserva: true },
    { negocio: '' },
  ] };
  assert.equal(validarTanda(t), null);
  const prep = prepararTanda(ex, t);
  assert.equal(prep.nuevos.length, 2);
  assert.equal(prep.ya.length, 1);
  assert.match(prep.ya[0].texto, /ya le escribiste el 05\/10 en Tanda 4/);
  assert.equal(prep.duplicadosEnTanda, 1);
  assert.equal(prep.reservas, 1);
  assert.equal(prep.invalidos.length, 1);
  const e = estado(ex);
  const { creados } = aplicarTanda(e, prep, '2026-10-23', 'x');
  assert.equal(e.prospectos.length, 3);
  assert.equal(creados[0].telefono, '584127654321');
  assert.deepEqual(creados[0].origenes, ['Tanda 20']);
  assert.equal(creados[0].mensaje, 'Hola A');
  assert.equal(creados[1].reserva, true);
  assert.equal(e.tandas.length, 1);
});

test('hoy: la tanda del día destaca y las reservas van aparte', () => {
  const e = estado([
    base({ negocio: 'Del dia', telefono: '1', origenes: ['Tanda 20'] }),
    base({ negocio: 'Reserva', telefono: '2', origenes: ['Tanda 20'], reserva: true }),
    base({ negocio: 'De otra tanda', telefono: '3', origenes: ['Tanda 19'] }),
  ], [], [{ id: 'a', nombre: 'Tanda 19', fecha: '2026-10-22' }, { id: 'b', nombre: 'Tanda 20', fecha: '2026-10-23' }]);
  const h = calcularHoy(e, '2026-10-23');
  assert.deepEqual(h.primeros.lista.map(p => p.negocio), ['Del dia']);
  assert.deepEqual(h.primeros.reservas.map(p => p.negocio), ['Reserva']);
  assert.equal(h.primeros.tanda.nombre, 'Tanda 20');
});

test('hoy: No respondió nunca genera seguimientos; tras el toque 3 se pregunta si se cierra', () => {
  const e = estado([
    base({ negocio: 'Cerrado', telefono: '1', etapa: 'No respondió', primerContacto: '2026-10-01', toques: 1 }),
    base({ negocio: 'Pendiente', telefono: '2', etapa: 'Contactado', primerContacto: '2026-10-19', toques: 1 }),
    base({ negocio: 'Tres toques', telefono: '3', etapa: 'Contactado', primerContacto: '2026-10-10', toques: 3 }),
  ]);
  const h = calcularHoy(e, '2026-10-23');
  assert.deepEqual(h.seguimientos.map(s => s.p.negocio), ['Pendiente']);
  assert.deepEqual(h.paraCerrar.map(p => p.negocio), ['Tres toques']);
  assert.equal(h.reactivar, undefined);
  const p = e.prospectos[2];
  cerrarSinRespuesta(p, '2026-10-23', '10:00');
  assert.equal(p.etapa, 'No respondió');
  assert.equal(p.respondioEl, undefined);
  assert.equal(calcularHoy(e, '2026-10-23').paraCerrar.length, 0);
});

test('cambios en bloque: aplica solo lo que viene y deja historial', () => {
  const p = base({ negocio: 'A', telefono: '584121234567', etapa: 'Contactado', toques: 1, primerContacto: '2026-10-20' });
  const prep = prepararCambios([p], { tipo: 'cambios', cambios: [
    { telefono: '04121234567', etapa: 'Interesado', nota: 'Pidió precio', proximaFecha: '2026-10-24', proximoPaso: 'Mandarle la demo' },
    { telefono: '584120000000', etapa: 'Cliente' },
    { telefono: '584121234567', etapa: 'Inventada' },
  ] });
  assert.equal(prep.lista.length, 1);
  assert.equal(prep.noEncontrados.length, 1);
  assert.equal(prep.errores.length, 1);
  aplicarCambios(prep, '2026-10-23', '09:00');
  assert.equal(p.etapa, 'Interesado');
  assert.equal(p.proximaFecha, '2026-10-24');
  assert.equal(p.respondioEl, '2026-10-23');
  assert.ok(p.historial.some(h => h.tipo === 'nota' && h.texto === 'Pidió precio'));
  assert.ok(p.historial.some(h => h.tipo === 'cambio' && /Próxima fecha/.test(h.texto)));
});

test('cobros: mes siguiente, pagos parciales y aviso de suspensión', () => {
  assert.equal(addMes('2026-01-31'), '2026-02-28');
  assert.equal(addMes('2026-10-12'), '2026-11-12');
  const c = { negocio: 'C', linea: 'Páginas', instalacion: 25, mensual: 15, estado: 'Activo', fechaPublicacion: '2026-10-12', pagos: [{ fecha: '2026-10-05', monto: 12.5, concepto: 'Primera mitad de instalación' }], contactoNombre: 'Sr. Luis' };
  assert.equal(saldoInstalacion(c), 12.5);
  assert.equal(estadoCobro(c, '2026-11-10').dias, 1);
  registrarPago(c, { fecha: '2026-11-12', monto: 10, concepto: 'Mensualidad', metodo: 'Zelle', tasa: 880 });
  assert.equal(restanteCiclo(c), 5);
  assert.equal(c.proximoCobro, undefined);
  registrarPago(c, { fecha: '2026-11-13', monto: 5, concepto: 'Mensualidad', metodo: 'Zelle', tasa: 880 });
  assert.equal(c.proximoCobro, '2026-12-11');
  assert.equal(c.pagos.at(-1).bs, 4400);
  assert.equal(estadoCobro(c, '2026-12-28').aviso, 'Aviso de suspensión');
  assert.equal(estadoCobro(c, '2027-02-20').aviso, 'Aviso de fin del servicio');
  assert.match(mensajeCobro(c, 880, '2026-12-11'), /Hola Sr\. Luis, le escribo por la mensualidad de su página, que vence hoy: \$15, que hoy son Bs 13\.200,00 a tasa BCV/);
  assert.equal(totalPorMes([c])[0].mes, '2026-11');
});

test('meta: recurrente, clientes que faltan y tasa de cierre con aviso de pocos datos', () => {
  const clientes = [{ estado: 'Activo', mensual: 15, pagos: [{ fecha: '2026-10-05', monto: 25 }] }, { estado: 'Activo', mensual: 25, pagos: [] }];
  const ps = [...Array(40)].map((_, i) => base({ telefono: String(i), primerContacto: '2026-10-01', etapa: i < 2 ? 'Cliente' : 'Contactado' }));
  const m = progresoMeta({ clientes, prospectos: ps, ajustes: completarAjustes({ metaMensualUSD: 300 }) }, '2026-10-23');
  assert.equal(m.recurrente, 40);
  assert.equal(m.promedio, 20);
  assert.equal(m.clientesFaltan, 13);
  assert.equal(m.tasa, 2 / 40);
  assert.equal(m.contactosNecesarios, 260);
  assert.equal(m.pocosDatos, true);
  assert.equal(cobradoDelMes(clientes, '2026-10-23'), 25);
  assert.deepEqual(m.escalones.map(e => e.valor), [300, 1000, 3000]);
});

test('precio sugerido según cuántos clientes hay en la línea', () => {
  const a = completarAjustes({ precios: { 'Páginas': [{ desde: 1, hasta: 3, instalacion: 25, mensual: 15 }, { desde: 4, hasta: 6, instalacion: 60, mensual: 20 }] } });
  assert.equal(sugerirPrecio(a, [], 'Páginas').instalacion, 25);
  assert.equal(sugerirPrecio(a, [{ linea: 'Páginas' }, { linea: 'Páginas' }, { linea: 'Páginas' }], 'Páginas').mensual, 20);
  assert.equal(sugerirPrecio(a, [], 'Sistemas'), null);
});

test('resumen semanal: semana lunes a domingo, respuestas y conclusiones', () => {
  assert.deepEqual(semanaDe('2026-10-22'), { desde: '2026-10-19', hasta: '2026-10-25' });
  assert.equal(lunesDe('2026-10-25'), '2026-10-19');
  const ps = [];
  for (let i = 0; i < 16; i++) ps.push(base({ negocio: 'F' + i, telefono: 'f' + i, nicho: 'Fisioterapia', etapa: i < 4 ? 'Interesado' : 'No respondió', primerContacto: '2026-10-20', toques: 1,
    historial: i < 4 ? [{ fecha: '2026-10-21', tipo: 'etapa', etapa: 'Interesado', texto: 'x' }] : [] }));
  for (let i = 0; i < 15; i++) ps.push(base({ negocio: 'K' + i, telefono: 'k' + i, nicho: 'Carnicerías', etapa: 'No respondió', primerContacto: '2026-10-21', toques: 1 }));
  const e = estado(ps);
  const r = calcularResumen(e, '2026-10-19', '2026-10-25', '2026-10-26');
  assert.equal(r.frios, 31);
  assert.equal(r.respuestas, 4);
  assert.equal(r.porNicho['Fisioterapia'].respuestas, 4);
  assert.equal(r.interesadosNuevos, 4);
  assert.equal(r.diasCupo, 2);
  assert.ok(r.conclusiones.some(c => /Fisioterapia: Este funciona/.test(c.texto)));
  assert.ok(r.conclusiones.some(c => /Carnicerías: Pausa este nicho/.test(c.texto)));
  assert.ok(respondio(ps[0]) && !respondio(ps[10]));
  assert.equal(serieSemanas(e, '2026-10-26').length, 8);
  assert.match(textoParaClaude(r, e, '2026-10-26'), /Cerrados como No respondió/);
  // El lunes se arma solo el resumen de la semana anterior, una sola vez
  const pend = resumenPendiente(e, '2026-10-26');
  assert.equal(pend.id, 'sem-2026-10-19');
  e.resumenes.push(pend);
  assert.equal(resumenPendiente(e, '2026-10-27'), null);
});
