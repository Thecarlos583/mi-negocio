// Pasar a cliente: servicio, precio sugerido por la escalera, forma de pago y fecha de publicación o activación.
import { estado, guardarProspecto, guardarCliente } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc, hoyISO, sumarDias, uid, usd } from '../util.js';
import { sugerirPrecio } from '../precios.js';
import { abrirCliente } from './clientes.js';

const SERVICIO = { 'Páginas': 'Página web', 'Sistemas': 'Sistema de control', 'Afuera': 'Renovación de página', 'Asistentes': 'Asistente de WhatsApp' };

export function abrirTrato(p) {
  const sug = sugerirPrecio(estado.ajustes, estado.clientes, p.linea);
  const inst = p.trato?.instalacion ?? sug?.instalacion ?? '';
  const mens = p.trato?.mensual ?? sug?.mensual ?? '';
  const activacion = p.linea === 'Asistentes';
  const creaCliente = p.etapa === 'Cliente';
  const cuerpo = abrirHoja(`
    <p class="eyebrow">${creaCliente ? 'Nuevo cliente' : 'Trato'}</p>
    <h3 class="hoja-titulo">${esc(p.negocio)}</h3>
    <label class="campo"><span>Servicio</span><input id="t-serv" type="text" value="${esc(p.trato?.servicio || SERVICIO[p.linea] || '')}"></label>
    <div class="dos">
      <label class="campo"><span>Instalación ($)</span><input id="t-inst" type="number" inputmode="decimal" step="0.01" value="${esc(inst)}"></label>
      <label class="campo"><span>Mensualidad ($)</span><input id="t-mens" type="number" inputmode="decimal" step="0.01" value="${esc(mens)}"></label>
    </div>
    ${sug ? `<p class="mini">Sugerido por tu escalera: cliente número ${sug.n} de ${esc(p.linea)}, ${usd(sug.instalacion)} + ${usd(sug.mensual)} al mes.${sug.nota ? ' ' + esc(sug.nota) : ''}</p>` : ''}
    <p class="nota-caja" id="t-pago"></p>
    <label class="campo"><span>${activacion ? 'Fecha de activación' : 'Fecha de publicación'} (si ya la sabes)</span><input id="t-fecha" type="date"></label>
    <label class="campo"><span>Enlace (por ejemplo la página publicada)</span><input id="t-url" type="url" placeholder="https://" value="${esc(p.trato?.url || '')}"></label>
    <button class="btn grande primario" id="t-guardar">${creaCliente ? 'Crear cliente' : 'Guardar trato'}</button>`);

  const resumen = () => {
    const i = Number($('#t-inst', cuerpo).value) || 0;
    $('#t-pago', cuerpo).textContent = i ? `Forma de pago: 50% para empezar (${usd(i / 2)}) y 50% al aprobar, antes de publicar (${usd(i / 2)}).${activacion ? ' La mensualidad se cobra por adelantado, al activar.' : ' La mensualidad se cobra a los 30 días de publicada.'}` : 'Forma de pago: 50% para empezar y 50% al aprobar, antes de publicar.';
  };
  cuerpo.addEventListener('input', resumen); resumen();

  $('#t-guardar', cuerpo).addEventListener('click', async () => {
    const instalacion = Number($('#t-inst', cuerpo).value) || 0, mensual = Number($('#t-mens', cuerpo).value) || 0;
    const servicio = $('#t-serv', cuerpo).value.trim(), url = $('#t-url', cuerpo).value.trim(), fecha = $('#t-fecha', cuerpo).value;
    p.trato = { ...(p.trato || {}), servicio, instalacion, mensual, url };
    await guardarProspecto(p);
    if (!creaCliente) { cerrarHoja(true); return aviso('Trato guardado'); }
    let c = estado.clientes.find(x => x.prospectoId === p.id);
    if (!c) {
      const cobro = activacion ? (fecha || hoyISO()) : (fecha ? sumarDias(fecha, 30) : '');
      c = { id: 'c-' + uid(), prospectoId: p.id, negocio: p.negocio, telefono: p.telefono, contactoNombre: p.contactoNombre || '', linea: p.linea,
        servicio, url, instalacion, mensual, moneda: 'USD', fechaPublicacion: fecha || null, fechaAlta: hoyISO(), diaCobro: cobro ? Number(cobro.slice(8)) : null,
        proximoCobro: cobro || '', estado: 'Activo', pagos: [], pendienteConfirmar: fecha ? [] : ['fechaPublicacion'], nota: '' };
      await guardarCliente(c);
    }
    cerrarHoja(true); aviso('Cliente creado'); abrirCliente(c.id);
  });
}
