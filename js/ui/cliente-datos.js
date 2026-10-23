// Tarjeta «completa estos datos»: fecha de publicación y fecha de los pagos que quedaron sin fecha.
import { guardarCliente } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc, hoyISO, sumarDias } from '../util.js';

export function abrirDatosCliente(c) {
  const sinFecha = (c.pagos || []).filter(p => !p.fecha);
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Datos pendientes</p>
    <h3 class="hoja-titulo">${esc(c.negocio)}</h3>
    ${c.fechaPublicacion ? '' : `<label class="campo"><span>Fecha en que se publicó la página</span><input id="cd-pub" type="date" max="${hoyISO()}"></label>`}
    ${sinFecha.map((p, i) => `<label class="campo"><span>Fecha del pago de $${p.monto} (${esc(p.concepto || 'pago')})</span><input data-pago="${i}" type="date" max="${hoyISO()}"></label>`).join('')}
    <p class="mini">La mensualidad de una página se cobra a los 30 días de publicada.</p>
    <button class="btn grande primario" id="cd-guardar">Guardar</button>`);
  $('#cd-guardar', cuerpo).addEventListener('click', async () => {
    const pub = $('#cd-pub', cuerpo)?.value;
    if (pub) { c.fechaPublicacion = pub; c.proximoCobro = sumarDias(pub, 30); c.diaCobro = Number(c.proximoCobro.slice(8)); }
    sinFecha.forEach((p, i) => { const v = $(`[data-pago="${i}"]`, cuerpo)?.value; if (v) p.fecha = v; });
    c.pendienteConfirmar = [
      ...(c.fechaPublicacion ? [] : ['fechaPublicacion']),
      ...((c.pagos || []).some(p => !p.fecha) ? ['fecha del pago'] : []),
    ];
    await guardarCliente(c); cerrarHoja(true);
    aviso(c.pendienteConfirmar.length ? 'Guardado. Falta algún dato' : 'Datos completos');
  });
}
