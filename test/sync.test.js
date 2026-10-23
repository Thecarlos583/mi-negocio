import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularHoy } from '../js/hoy-logic.js';
import { darPorMuerto, revivir, registrarEnvio } from '../js/acciones.js';
import { construirEstadoNube, aBase64, deBase64, huella, sinHora } from '../js/sync-datos.js';
import { completarAjustes } from '../js/ajustes-base.js';

const base = (o = {}) => ({ id: 'p' + o.telefono, negocio: 'N', telefono: '', linea: 'Sistemas', nicho: 'Carnicerías', zona: '', pais: 'Venezuela', origenes: [], primerContacto: '', etapa: 'Por contactar', nota: '', proximoPaso: '', proximaFecha: '', toques: 0, historial: [], ...o });
const estado = (prospectos = [], clientes = [], tandas = []) => ({ ajustes: completarAjustes(), prospectos, clientes, tandas, resumenes: [] });

test('vivos o muertos: dar por muerto con motivo y revivir con fecha', () => {
  const p = base({ negocio: 'V', telefono: '584121111111', etapa: 'Contactado', toques: 3, primerContacto: '2026-10-10' });
  darPorMuerto(p, 'Dijo que no', '2026-10-22', '10:00');
  assert.equal(p.etapa, 'Perdido');
  assert.equal(p.motivoMuerte, 'Dijo que no');
  assert.equal(p.respondioEl, '2026-10-22');
  const q = base({ negocio: 'W', telefono: '584122222222', etapa: 'Contactado', toques: 1, primerContacto: '2026-10-10' });
  darPorMuerto(q, 'No respondió', '2026-10-22', '10:00');
  assert.equal(q.etapa, 'No respondió');
  assert.equal(q.respondioEl, undefined);
  revivir(q, '2026-10-24', '2026-10-23', '09:00');
  assert.equal(q.etapa, 'Contactado');
  assert.equal(q.proximaFecha, '2026-10-24');
  const e = estado([q]);
  assert.equal(calcularHoy(e, '2026-10-24').seguimientos.length, 1);
  assert.equal(calcularHoy(e, '2026-10-23').seguimientos.length, 0);
  // al enviar el seguimiento, el siguiente se cuenta desde que revivió y no desde el primer mensaje viejo
  registrarEnvio(q, 'seg2', '2026-10-24', '10:00', [3, 7], 'Hola de nuevo');
  assert.equal(q.proximaFecha, '2026-10-30');
  assert.equal(q.ultimoMensaje.texto, 'Hola de nuevo');
});

test('estado para Claude: teléfonos, vivos recientes, muertos recientes y clientes', () => {
  const ps = [
    base({ negocio: 'Vivo', telefono: '584121000001', etapa: 'Contactado', toques: 1, primerContacto: '2026-10-20', ultimoMensaje: { fecha: '2026-10-20', tipo: 'primer', texto: 'Hola' } }),
    base({ negocio: 'Viejo vivo', telefono: '584121000002', etapa: 'Contactado', toques: 1, primerContacto: '2026-08-01' }),
    base({ negocio: 'Muerto', telefono: '584121000003', etapa: 'No respondió', primerContacto: '2026-10-10', historial: [{ fecha: '2026-10-20', tipo: 'etapa', etapa: 'No respondió', texto: 'x' }] }),
    base({ negocio: 'Muerto viejo', telefono: '584121000004', etapa: 'No respondió', primerContacto: '2026-08-10', historial: [{ fecha: '2026-08-20', tipo: 'etapa', etapa: 'No respondió', texto: 'x' }] }),
    base({ negocio: 'Insta', telefono: '', canal: 'Instagram' }),
  ];
  const e = estado(ps, [{ negocio: 'Cli', linea: 'Páginas', mensual: 15, instalacion: 25, estado: 'Activo', fechaPublicacion: '2026-10-01', pagos: [] }]);
  const n = construirEstadoNube(e, '2026-10-23', '2026-10-23T12:00:00Z');
  assert.equal(n.tipo, 'estado');
  assert.deepEqual(n.telefonos, ['584121000001', '584121000002', '584121000003', '584121000004']);
  assert.deepEqual(n.vivos.map(v => v.negocio), ['Vivo']);
  assert.equal(n.vivos[0].ultimoMensaje.texto, 'Hola');
  assert.deepEqual(n.muertosRecientes.map(v => v.negocio), ['Muerto']);
  assert.deepEqual(n.sinTelefono, ['Insta']);
  assert.equal(n.clientes[0].saldoInstalacion, 25);
  assert.ok(n.semana.desde);
});

test('base 64 con acentos y huella estable sin la hora', () => {
  const t = 'Mérida, ñandú ✓ ' + 'x'.repeat(100000);
  assert.equal(deBase64(aBase64(t)), t);
  assert.equal(huella(sinHora({ a: 1, actualizado: 'x' })), huella(sinHora({ a: 1, actualizado: 'y' })));
  assert.notEqual(huella(sinHora({ a: 1 })), huella(sinHora({ a: 2 })));
});
