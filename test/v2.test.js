// Pruebas de la v2 con fechas simuladas: tandas, seguimientos, cierre, cobros y metas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumarDias } from '../js/util.js';
import * as P from '../js/logica/prospectos.js';
import * as C from '../js/logica/cobros.js';
import * as M from '../js/logica/metas.js';
import { aplicarCambios } from '../js/logica/cambios.js';
import { migrarV3 } from '../js/logica/migracion.js';

// Clientes de ejemplo con la misma forma que los reales (los reales viven solo en el repo privado).
const CLIENTES_V2 = [
  { id: 'c1', negocio: 'Cabaña de Ejemplo', contacto: 'Sr. Pedro', telefono: '584120000001', servicio: 'Página web', instalacion: 25, mensual: 15, diaCobro: 14,
    publicada: '2026-10-14', inicioCobro: '2026-11-14', baseMensualidades: 0, alta: '2026-10-09', estado: 'Activo', pagos: [{ id: 'a', fecha: '2026-10-09', monto: 25, concepto: 'Instalación', metodo: '' }] },
  { id: 'c2', negocio: 'Posada de Ejemplo', contacto: 'Sra. María', telefono: '584120000002', servicio: 'Página web', instalacion: 25, mensual: 15, diaCobro: null,
    publicada: null, inicioCobro: null, baseMensualidades: 0, alta: '2026-10-23', estado: 'Activo', pagos: [{ id: 'b', fecha: '2026-10-23', monto: 12.5, concepto: 'Instalación', metodo: 'Pago móvil' }] },
];
import { construirEstado } from '../js/logica/nube.js';

const vacio = () => ({ prospectos: [], historial: [], clientes: [], tandas: [], meta: {} });
const tanda = (fecha, n, desde = 0, nombre = `Tanda ${fecha}`) => ({
  tipo: 'tanda', nombre, fecha,
  prospectos: Array.from({ length: n }, (_, i) => ({ negocio: `Negocio ${desde + i}`, telefono: `58412${String(1000000 + desde + i)}`, linea: i % 3 ? 'Páginas' : 'Afuera', mensaje: 'Hola' })),
});
const llega = (s, t, archivo) => P.aplicarTanda(s, P.prepararTanda(s, t, { archivo }));
const escribirTodo = (s, hoy) => P.tandaDeHoy(s, hoy).forEach(p => P.marcarEscrito(s, p, hoy));
// Simula abrir la app un día: cierre automático, luego hago los seguimientos que tocan.
const abrirDia = (s, hoy, { seguir = true } = {}) => { P.mantener(s, hoy); const l = P.seguimientosDeHoy(s, hoy); if (seguir) l.forEach(x => P.marcarSeguimiento(x.p, hoy)); return l; };

test('3 tandas en días seguidos: cada día solo aparece la suya', () => {
  const s = vacio();
  llega(s, tanda('2026-11-02', 15, 0), 'tandas/2026-11-02-1.json');
  assert.equal(P.tandaDeHoy(s, '2026-11-02').length, 15);
  escribirTodo(s, '2026-11-02');
  llega(s, tanda('2026-11-03', 15, 100), 'tandas/2026-11-03-1.json');
  llega(s, tanda('2026-11-04', 15, 200), 'tandas/2026-11-04-1.json');
  assert.equal(P.tandaDeHoy(s, '2026-11-03').length, 15);
  assert.ok(P.tandaDeHoy(s, '2026-11-03').every(p => p.tanda === 'Tanda 2026-11-03'));
  assert.ok(P.tandaDeHoy(s, '2026-11-04').every(p => p.tanda === 'Tanda 2026-11-04'));
  assert.equal(P.tandaDeHoy(s, '2026-11-05').length, 0, 'una tanda vieja nunca sale en la de hoy');
  assert.deepEqual(s.meta.constancia, ['2026-11-02']);
});

test('tanda repetida y teléfonos repetidos se ignoran', () => {
  const s = vacio();
  assert.equal(llega(s, tanda('2026-11-02', 15), 'tandas/2026-11-02-1.json'), 15);
  assert.equal(llega(s, tanda('2026-11-02', 15), 'tandas/2026-11-02-1.json'), 0, 'mismo archivo');
  assert.equal(llega(s, tanda('2026-11-02', 15), 'tandas/2026-11-02-2.json'), 0, 'mismos teléfonos en otro archivo');
  const conDoble = tanda('2026-11-03', 3, 50); conDoble.prospectos.push({ ...conDoble.prospectos[0] });
  assert.equal(llega(s, conDoble, 'tandas/2026-11-03-1.json'), 3, 'repetido dentro de la misma tanda');
  s.historial.push({ telefono: '584121000900', fecha: '2026-10-01' });
  assert.equal(llega(s, tanda('2026-11-04', 1, 900), 'tandas/2026-11-04-1.json'), 0, 'ya está en el historial');
  assert.equal(new Set(s.prospectos.map(p => p.telefono)).size, s.prospectos.length);
  assert.equal(P.prepararTanda(s, tanda('2026-11-03', 3, 50), {}).nuevos.length, 0, 'pegar la misma tanda');
});

test('seguimientos a los 3 y 7 días, un día sin abrir y sin duplicados; cierre a los 10', () => {
  const s = vacio();
  llega(s, tanda('2026-11-02', 15, 0), 'a'); escribirTodo(s, '2026-11-02');
  llega(s, tanda('2026-11-03', 15, 100), 'b'); escribirTodo(s, '2026-11-03');
  llega(s, tanda('2026-11-04', 15, 200), 'c'); escribirTodo(s, '2026-11-04');
  const vistos = {};
  for (let d = 0; d <= 25; d++) {
    const hoy = sumarDias('2026-11-02', d);
    const sinAbrir = hoy === '2026-11-06';          // el 6 no abrí la app
    if (sinAbrir) continue;
    const l = abrirDia(s, hoy);
    vistos[hoy] = l;
    const ids = l.map(x => x.p.id);
    assert.equal(new Set(ids).size, ids.length, `sin duplicados el ${hoy}`);
  }
  // El 5 tocaba la tanda del 2 (día 3). El 6 no abrí: la del 3 sale el 7, atrasada, junto con la del 4.
  assert.equal(vistos['2026-11-05'].length, 15);
  assert.ok(vistos['2026-11-05'].every(x => x.p.tanda === 'Tanda 2026-11-02' && x.numero === 1));
  const el7 = vistos['2026-11-07'];
  assert.equal(el7.length, 30);
  assert.equal(el7.filter(x => x.atraso === 1).length, 15, 'los del 3 salen marcados como atrasados');
  // 2.º seguimiento: el 9 (tanda del 2), el 10 (del 3) y el 11 (del 4); nunca se repite el 1.º
  assert.ok(vistos['2026-11-09'].every(x => x.numero === 2 && x.p.tanda === 'Tanda 2026-11-02'));
  // Cierre silencioso: a los 10 días con los 2 seguimientos hechos, todos al historial
  assert.equal(s.prospectos.length, 0);
  assert.equal(s.historial.length, 45);
  assert.equal(P.recorrido(s, '2026-11-27').total, 45);
});

test('si nunca hago los seguimientos, igual se cierran a los 21 días (no se acumulan)', () => {
  const s = vacio();
  llega(s, tanda('2026-11-02', 5), 'a'); escribirTodo(s, '2026-11-02');
  for (let d = 1; d <= 22; d++) abrirDia(s, sumarDias('2026-11-02', d), { seguir: false });
  assert.equal(s.prospectos.length, 0);
});

test('respondieron, cliente y perdido', () => {
  const s = vacio();
  llega(s, tanda('2026-11-02', 3), 'a'); escribirTodo(s, '2026-11-02');
  const [a, b, c] = s.prospectos;
  P.cambiarEtapa(s, a, 'Interesado', { paso: 'Mandar demo', fecha: '2026-11-05' }, '2026-11-03');
  assert.deepEqual(P.respondieron(s).map(p => p.id), [a.id]);
  assert.equal(P.seguimientosDeHoy(s, '2026-11-05').some(x => x.p === a), false, 'quien respondió no recibe seguimientos');
  assert.equal(P.cambiarEtapa(s, b, 'Perdido', {}, '2026-11-03'), true);
  assert.equal(P.cambiarEtapa(s, c, 'Cliente', {}, '2026-11-03'), true);
  assert.equal(s.prospectos.length, 1);
  assert.equal(s.historial.length, 2);
});

test('cobros: una cobra el 14, la otra al aprobar y luego 30 días después de publicada', () => {
  const [chalet, posada] = structuredClone(CLIENTES_V2);
  assert.equal(C.proximaMensualidad(chalet), '2026-11-14');
  assert.deepEqual(C.cuando('2026-11-14', '2026-10-29'), { texto: 'en 16 días', clase: 'gray' });
  assert.equal(C.debe(chalet, '2026-11-14'), 15);
  assert.equal(C.cuando('2026-11-14', '2026-11-17').texto, 'vencido hace 3 días');
  chalet.pagos.push({ fecha: '2026-11-15', monto: 15, concepto: 'Mensualidad', metodo: 'Zelle' });
  assert.equal(C.proximaMensualidad(chalet), '2026-12-14');
  assert.equal(C.debe(chalet, '2026-11-20'), 0);
  assert.equal(C.saldoInstalacion(posada), 12.5);
  assert.equal(C.proximaMensualidad(posada), null);
  const l = C.proximosCobros([chalet, posada], '2026-10-29');
  assert.equal(l[0].c.negocio, 'Posada de Ejemplo');
  C.marcarPublicada(posada, '2026-11-10');
  assert.equal(posada.inicioCobro, '2026-12-10');
  assert.equal(posada.diaCobro, 10);
  assert.equal(C.vencimiento(posada, 1), '2027-01-10');
  assert.equal(C.primerCobro('2026-01-31', 31), '2026-02-28');
});

test('números de octubre: fijo $30, cobrado $37,50, por cobrar $12,50; meta y mensaje', () => {
  const cl = structuredClone(CLIENTES_V2);
  assert.equal(C.ingresoFijo(cl), 30);
  assert.equal(C.cobradoEnMes(cl, '2026-10'), 37.5);
  assert.equal(C.porCobrar(cl, '2026-10-29'), 12.5);
  assert.equal(C.ingresoFijoEnMes(cl, '2026-09'), 0);
  const m = M.metaActiva(cl);
  assert.equal(m.objetivo, 100); assert.equal(m.pct, 30); assert.equal(m.clientesFaltan, 4);
  assert.equal(M.escalonPorCelebrar(cl, 0), null);
  const cobro = C.proximosCobros(cl, '2026-11-14').find(x => x.tipo === 'mensualidad');
  const txt = C.mensajeCobro(cobro, { fecha: '2026-11-14', usd: 300 }, '2026-11-14', 9);
  assert.equal(txt, 'Buenos días, Sr. Pedro. Le escribo por la mensualidad de noviembre de su página, $15 (Bs 4.500,00 a la tasa de hoy). ¿Le parece si lo coordinamos?');
  assert.ok(!/[—–]/.test(txt));
});

test('racha y calendario de constancia', () => {
  assert.equal(M.racha(['2026-10-27', '2026-10-28', '2026-10-29'], '2026-10-29'), 3);
  assert.equal(M.racha(['2026-10-27', '2026-10-28'], '2026-10-29'), 2, 'hoy todavía no cuenta');
  assert.equal(M.racha(['2026-10-26'], '2026-10-29'), 0);
  const cal = M.calendarioMes(['2026-10-05'], '2026-10-29');
  assert.equal(cal.dias.length, 31); assert.equal(cal.hueco, 3); assert.ok(cal.dias[4].lleno);
});

test('cambios desde el chat: pago, etapa, revivir del historial y cerrar tanda', () => {
  const s = vacio(); s.clientes = structuredClone(CLIENTES_V2);
  llega(s, tanda('2026-11-02', 3), 'a'); escribirTodo(s, '2026-11-02');
  s.historial.push({ telefono: '584149999999', fecha: '2026-10-01' });
  const r = aplicarCambios(s, { cambios: [
    { op: 'pago', cliente: 'Sra. María', fecha: '2026-11-03', monto: 12.5, concepto: 'Resto de instalación', metodo: 'Zelle' },
    { op: 'etapa', telefono: '0412 100 0000', etapa: 'Interesado', proximoPaso: 'Llamar', proximaFecha: '2026-11-05' },
    { op: 'etapa', telefono: '0414 999 9999', negocio: 'Viejo', etapa: 'Respondió' },
    { op: 'cerrar_tanda', tanda: 'Tanda 2026-11-02' },
    { op: 'nada' },
  ] }, '2026-11-03', { usd: 300 });
  assert.equal(C.saldoInstalacion(s.clientes[1]), 0);
  assert.equal(r.errores.length, 1);
  assert.deepEqual(s.prospectos.map(p => p.negocio).sort(), ['Negocio 0', 'Viejo']);
  assert.equal(s.historial.some(h => h.telefono === '584149999999'), false);
});

test('migración de los datos viejos y estado para Claude', () => {
  const v3 = { generado: '2026-10-23', ajustes: { tasaBCV: { fecha: '2026-10-22', usd: 884.7 } }, tandas: [], prospectos: [
    { negocio: 'Alberto', telefono: '17864453327', etapa: 'Respondió', primerContacto: '2026-10-23', proximaFecha: '2026-11-20', proximoPaso: 'Volver a escribir' },
    { negocio: 'Viejo', telefono: '584121111111', etapa: 'No respondió', primerContacto: '2026-10-05' },
    { negocio: 'Reciente', telefono: '584122222222', etapa: 'Contactado', primerContacto: '2026-10-23' },
    { negocio: 'Frío', telefono: '584123333333', etapa: 'Contactado', primerContacto: '2026-10-10' },
    { negocio: 'Cabaña', telefono: '584120000001', etapa: 'Cliente', primerContacto: '2026-10-01' },
  ] };
  const r = migrarV3(v3, '2026-10-29', CLIENTES_V2);
  assert.deepEqual(r.prospectos.map(p => p.negocio), ['Alberto', 'Reciente']);
  assert.equal(r.prospectos[0].proximaFecha, '2026-11-20');
  assert.equal(r.historial.length, 3);
  const s = { ...vacio(), ...r, meta: {} };
  const e = construirEstado(s, '2026-10-29', 'x');
  assert.equal(e.telefonos.length, 6);
  assert.equal(e.recorrido.total, 5);
  assert.equal(e.respondieron[0], 'Alberto');
  // El 26 tocaba el 1.er seguimiento de «Reciente»: sale atrasado
  assert.equal(P.seguimientosDeHoy(s, '2026-10-29')[0].atraso, 3);
});
