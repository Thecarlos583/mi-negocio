// Registrar un pago: fecha, monto en dólares y su equivalente en bolívares a la tasa del día.
import { estado, guardarCliente } from '../estado.js';
import { abrirHoja, cerrarHoja, aviso, $ } from './comun.js';
import { esc, hoyISO, usd, bs } from '../util.js';
import { CONCEPTOS, METODOS, registrarPago, saldoInstalacion, restanteCiclo, pagadoInstalacion } from '../cobros.js';
import { tasaActual } from '../tasa.js';
import { abrirCliente } from './clientes.js';

// Concepto y monto que casi siempre corresponden al siguiente pago.
function sugerencia(c) {
  if (pagadoInstalacion(c) === 0 && c.instalacion) return { concepto: CONCEPTOS[0], monto: Math.round(c.instalacion / 2 * 100) / 100 };
  if (saldoInstalacion(c) > 0) return { concepto: CONCEPTOS[1], monto: saldoInstalacion(c) };
  return { concepto: CONCEPTOS[2], monto: restanteCiclo(c) || c.mensual || 0 };
}

export function abrirPago(cliente) {
  if (!estado.clientes.length) return aviso('Todavía no tienes clientes. Pasa un prospecto a cliente primero.');
  const c0 = cliente || estado.clientes[0];
  const s0 = sugerencia(c0);
  const cuerpo = abrirHoja(`
    <p class="eyebrow">Registrar pago</p>
    ${cliente ? `<h3 class="hoja-titulo">${esc(cliente.negocio)}</h3>` : `<label class="campo"><span>Cliente</span><select id="p-cli">${estado.clientes.map(c => `<option value="${esc(c.id)}">${esc(c.negocio)}</option>`).join('')}</select></label>`}
    <div class="dos">
      <label class="campo"><span>Fecha</span><input id="p-fecha" type="date" value="${hoyISO()}" max="${hoyISO()}"></label>
      <label class="campo"><span>Monto ($)</span><input id="p-monto" type="number" inputmode="decimal" step="0.01" value="${s0.monto}"></label>
    </div>
    <div class="dos">
      <label class="campo"><span>Tasa BCV usada</span><input id="p-tasa" type="number" inputmode="decimal" step="0.0001" value="${tasaActual() || ''}"></label>
      <div class="campo"><span>Equivale a</span><p class="equivale" id="p-bs">—</p></div>
    </div>
    <label class="campo"><span>Concepto</span><select id="p-conc">${CONCEPTOS.map(x => `<option ${x === s0.concepto ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="campo"><span>Método</span><select id="p-met">${METODOS.map(x => `<option>${x}</option>`).join('')}</select></label>
    <p class="mini" id="p-ayuda"></p>
    <button class="btn grande primario" id="p-guardar">Guardar pago</button>`);

  const actual = () => cliente || estado.clientes.find(c => c.id === $('#p-cli', cuerpo).value);
  const refrescar = () => {
    const c = actual(), tasa = Number($('#p-tasa', cuerpo).value) || 0, monto = Number($('#p-monto', cuerpo).value) || 0;
    $('#p-bs', cuerpo).textContent = tasa && monto ? bs(monto * tasa) : (tasa ? '—' : 'Falta la tasa');
    const falta = [];
    if (saldoInstalacion(c) > 0) falta.push(`instalación: faltan ${usd(saldoInstalacion(c))}`);
    if (c.mensual) falta.push(`mensualidad: ${restanteCiclo(c) ? `faltan ${usd(restanteCiclo(c))}` : 'al día'}`);
    $('#p-ayuda', cuerpo).textContent = falta.join(' · ');
  };
  cuerpo.addEventListener('input', refrescar);
  $('#p-cli', cuerpo)?.addEventListener('change', () => { const s = sugerencia(actual()); $('#p-monto', cuerpo).value = s.monto; $('#p-conc', cuerpo).value = s.concepto; refrescar(); });
  refrescar();

  $('#p-guardar', cuerpo).addEventListener('click', async () => {
    const c = actual(), monto = Number($('#p-monto', cuerpo).value), fecha = $('#p-fecha', cuerpo).value;
    if (!(monto > 0)) return aviso('Escribe el monto en dólares');
    if (!fecha) return aviso('Elige la fecha del pago');
    registrarPago(c, { fecha, monto, concepto: $('#p-conc', cuerpo).value, metodo: $('#p-met', cuerpo).value, tasa: Number($('#p-tasa', cuerpo).value) || 0 });
    c.pendienteConfirmar = (c.pendienteConfirmar || []).filter(x => !(/pago/.test(x) && !(c.pagos || []).some(p => !p.fecha)));
    await guardarCliente(c); cerrarHoja(true);
    const resto = saldoInstalacion(c) > 0 ? ` Falta de instalación: ${usd(saldoInstalacion(c))}.` : '';
    aviso(`Pago registrado.${resto}`); abrirCliente(c.id);
  });
}
