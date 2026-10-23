import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { normalizarTelefono, buscarRepetido, describirRepetido } from '../js/telefono.js';
import { leerJSON, validarRespaldo, prepararRespaldo, construirRespaldo, normalizarProspectos } from '../js/datos.js';
import { registrarEnvio, cambiarEtapa, fechaSeguimiento } from '../js/acciones.js';
import { calcularHoy } from '../js/hoy-logic.js';
import { estadoCobro } from '../js/cobros.js';
import { mensajePara, llenar } from '../js/mensajes.js';
import { completarAjustes } from '../js/ajustes-base.js';

test('normalizar teléfonos', () => {
  assert.equal(normalizarTelefono('0412-123 4567'), '584121234567');
  assert.equal(normalizarTelefono('4121234567'), '584121234567');
  assert.equal(normalizarTelefono('+58 412 123 4567'), '584121234567');
  assert.equal(normalizarTelefono('584121234567'), '584121234567');
  assert.equal(normalizarTelefono('+1 (305) 642-0504'), '13056420504');
  assert.equal(normalizarTelefono(''), '');
  assert.equal(normalizarTelefono(null), '');
});

test('buscar repetidos por teléfono y por nombre (Instagram)', () => {
  const lista = [
    { negocio: 'A', telefono: '584121234567', etapa: 'Contactado', primerContacto: '2026-10-05', origenes: ['Tanda 4'] },
    { negocio: 'Negocio Instagram', telefono: '', etapa: 'Por contactar' },
  ];
  assert.equal(buscarRepetido(lista, { telefono: '0412 123 45 67' }).negocio, 'A');
  assert.equal(buscarRepetido(lista, { telefono: '04129999999' }), null);
  assert.equal(buscarRepetido(lista, { negocio: 'negocio  INSTAGRAM' }).negocio, 'Negocio Instagram');
  assert.match(describirRepetido(lista[0]), /ya le escribiste el 05\/10 en Tanda 4/);
});

test('quitar repetidos al normalizar', () => {
  const r = normalizarProspectos([{ negocio: 'A', telefono: '04121234567' }, { negocio: 'A2', telefono: '584121234567' }, { negocio: 'B', telefono: '' }, { negocio: 'b', telefono: '' }]);
  assert.equal(r.prospectos.length, 2);
  assert.equal(r.repetidos, 2);
  assert.equal(r.prospectos[1].canal, 'Instagram');
});

test('leer JSON con comillas de bloque y texto alrededor', () => {
  const o = leerJSON('Aquí va:\n```json\n{"tipo":"tanda","prospectos":[]}\n```\nlisto');
  assert.equal(o.tipo, 'tanda');
  assert.throws(() => leerJSON('hola'));
  assert.throws(() => leerJSON('{"a":'));
});

test('validar respaldo', () => {
  assert.match(validarRespaldo({ tipo: 'tanda' }), /tanda/);
  assert.ok(validarRespaldo({ tipo: 'respaldo' }));
  assert.equal(validarRespaldo({ tipo: 'respaldo', prospectos: [] }), null);
});

test('ida y vuelta del respaldo', () => {
  const { estado } = prepararRespaldo({ tipo: 'respaldo', prospectos: [{ negocio: 'A', telefono: '584121234567', proximaHora: '18:30' }], clientes: [{ id: 'c1' }] });
  const salida = construirRespaldo(estado, '2026-10-22');
  assert.equal(salida.tipo, 'respaldo');
  assert.equal(salida.prospectos[0].proximaHora, '18:30');
  assert.equal(prepararRespaldo(salida).estado.prospectos.length, 1);
});

test('seguimientos: toque 2 a los 3 días, toque 3 a los 7, luego nada', () => {
  const dias = [3, 7];
  const p = { negocio: 'A', linea: 'Sistemas', etapa: 'Por contactar', toques: 0, historial: [] };
  registrarEnvio(p, 'primer', '2026-10-01', '10:00', dias);
  assert.equal(p.etapa, 'Contactado');
  assert.equal(p.proximaFecha, '2026-10-04');
  registrarEnvio(p, 'seg2', '2026-10-04', '10:00', dias);
  assert.equal(p.toques, 2);
  assert.equal(p.proximaFecha, '2026-10-08');
  registrarEnvio(p, 'seg3', '2026-10-08', '10:00', dias);
  assert.equal(p.proximaFecha, '');
  assert.equal(fechaSeguimiento(p, dias), '');
  assert.equal(p.historial.filter(h => h.tipo === 'seguimiento').length, 2);
});

test('respondioEl se guarda la primera vez que sale de Contactado', () => {
  const p = { etapa: 'Contactado', historial: [] };
  cambiarEtapa(p, 'Respondió', '2026-10-05', '09:00');
  assert.equal(p.respondioEl, '2026-10-05');
  cambiarEtapa(p, 'Interesado', '2026-10-06', '09:00');
  assert.equal(p.respondioEl, '2026-10-05');
});

test('plantillas y variables', () => {
  const a = completarAjustes();
  const p = { negocio: 'Fisio X', linea: 'Páginas', nicho: 'Fisioterapia', toques: 0 };
  assert.match(mensajePara(a.plantillas, p, 'primer'), /fisioterapeutas/);
  assert.equal(mensajePara(a.plantillas, { ...p, mensaje: 'Hola {negocio}' }, 'primer'), 'Hola Fisio X');
  assert.equal(llenar('Hola {nombre}, qué tal', { contactoNombre: '' }), 'Hola, qué tal');
});

test('estado de cobro', () => {
  const c = { fechaPublicacion: '2026-09-22', estado: 'Activo' };
  assert.equal(estadoCobro(c, '2026-10-22').clave, 'hoy');
  assert.equal(estadoCobro(c, '2026-10-25').clave, 'vencido');
  assert.equal(estadoCobro({ estado: 'Activo' }, '2026-10-25').clave, 'sin-fecha');
});
