// Ficha de un prospecto: hoja que sube desde abajo.
import { estado, buscarProspecto, guardarProspecto } from '../estado.js';
import { abrirHoja, repintarHoja, cerrarHoja, aviso, copiar, chipEtapa, chipLinea, $ } from './comun.js';
import { esc, hoyISO, horaAhora, fechaDMA } from '../util.js';
import { ETAPAS } from '../ajustes-base.js';
import { cambiarEtapa, agregarNota, fijarProximo, esVivo, esMuerto, cerrarSinRespuesta } from '../acciones.js';
import { abrirEnvio } from './enviar.js';
import { abrirSeguir, abrirMuerte, abrirRevivir } from './decidir.js';
import { abrirTrato } from './trato.js';
import { abrirCliente } from './clientes.js';

let actualId = null;

export function abrirFicha(id) {
  actualId = id;
  const cuerpo = abrirHoja(html(buscarProspecto(id)), { alCerrar: () => { actualId = null; } });
  enlazar(cuerpo);
}

function html(p) {
  const hist = [...(p.historial || [])].reverse().slice(0, 40);
  const cliente = estado.clientes.find(c => c.prospectoId === p.id);
  const decidir = esVivo(p)
    ? `<div class="vivo-muerto"><button class="btn grande primario" data-f="seguir">Seguir</button><button class="btn grande suave" data-f="muerto">Dar por muerto</button></div>`
    : esMuerto(p) ? `<div class="vivo-muerto"><button class="btn grande primario" data-f="revivir">Revivir</button></div>` : '';
  return `
    <p class="eyebrow">${chipLinea(p.linea)} <span>${esc(p.nicho || '')}</span></p>
    <h3 class="hoja-titulo">${esc(p.negocio)}</h3>
    <p class="hoja-texto">${[p.zona, p.pais !== 'Venezuela' ? p.pais : '', p.google ? 'Google ' + p.google : '', p.contactoNombre].filter(Boolean).map(esc).join(' · ')}</p>
    ${p.nota ? `<p class="nota-caja">${esc(p.nota)}</p>` : ''}

    <div class="acciones-contacto">
      <button class="btn wa" data-f="wa">${p.telefono ? 'WhatsApp' : 'Ya le escribí'}</button>
      ${p.telefono ? `<a class="btn suave" href="tel:+${esc(p.telefono)}">Llamar</a><button class="btn suave" data-f="copiar">Copiar número</button>` : '<span class="mini">Sin número: lo encontraste en Instagram</span>'}
    </div>
    ${decidir}
    ${p.etapa === 'Contactado' ? '<button class="btn suave ancho" data-f="noresp">No respondió más</button>' : ''}
    ${['Por pagar', 'Cliente'].includes(p.etapa) ? `<button class="btn suave ancho" data-f="${cliente ? 'vercliente' : 'trato'}">${cliente ? 'Ver cliente y cobros' : p.trato ? 'Datos del trato y pasar a cliente' : 'Pasar a cliente'}</button>` : ''}

    <h4 class="sub">Etapa <span class="actual">${chipEtapa(p.etapa)}</span></h4>
    <div class="etapas">${ETAPAS.map(e => `<button class="etapa-btn ${e === p.etapa ? 'activa' : ''}" data-f="etapa" data-e="${esc(e)}">${esc(e)}</button>`).join('')}</div>

    <h4 class="sub">Próximo paso</h4>
    <label class="campo"><span>Qué voy a hacer</span><input id="f-paso" type="text" value="${esc(p.proximoPaso || '')}" placeholder="Ej: mandarle la demo"></label>
    <div class="dos">
      <label class="campo"><span>Fecha</span><input id="f-fecha" type="date" value="${esc(p.proximaFecha || '')}"></label>
      <label class="campo"><span>Hora (opcional)</span><input id="f-hora" type="time" value="${esc(p.proximaHora || '')}"></label>
    </div>
    <button class="btn primario" data-f="guardar-paso">Guardar</button>

    <h4 class="sub">Notas</h4>
    <label class="campo"><textarea id="f-nota" rows="2" placeholder="Qué pasó, qué dijo…"></textarea></label>
    <button class="btn suave" data-f="nota">Agregar nota</button>

    <h4 class="sub">Historial <span class="mini">${(p.historial || []).length} eventos</span></h4>
    <ol class="historial">${hist.map(h => `<li><time>${esc(fechaDMA(h.fecha))}${h.hora ? ' ' + esc(h.hora) : ''}</time><span>${esc(h.texto)}</span></li>`).join('') || '<li><span class="mini">Todavía sin movimientos</span></li>'}</ol>`;
}

const repintar = p => repintarHoja(html(p));

function enlazar(cuerpo) {
  cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const p = buscarProspecto(actualId); if (!p) return;
    const hoy = hoyISO(), hora = horaAhora();
    switch (b.dataset.f) {
      case 'wa': cerrarHoja(true); actualId = null; return abrirEnvio(p);
      case 'copiar': return copiar(p.telefono);
      case 'seguir': return abrirSeguir(p);
      case 'muerto': return abrirMuerte(p, () => cerrarHoja(true));
      case 'revivir': return abrirRevivir(p, () => cerrarHoja(true));
      case 'trato': cerrarHoja(true); actualId = null; return abrirTrato(p);
      case 'vercliente': cerrarHoja(true); actualId = null; return abrirCliente(estado.clientes.find(c => c.prospectoId === p.id).id);
      case 'noresp':
        cerrarSinRespuesta(p, hoy, hora); await guardarProspecto(p); aviso('Cerrado como No respondió'); return cerrarHoja(true);
      case 'etapa': {
        const antes = p.etapa;
        cambiarEtapa(p, b.dataset.e, hoy, hora); await guardarProspecto(p);
        if (antes !== p.etapa && ['Por pagar', 'Cliente'].includes(p.etapa)) { cerrarHoja(true); actualId = null; return abrirTrato(p); }
        break;
      }
      case 'guardar-paso':
        fijarProximo(p, { proximoPaso: $('#f-paso', cuerpo).value.trim(), proximaFecha: $('#f-fecha', cuerpo).value, proximaHora: $('#f-hora', cuerpo).value });
        await guardarProspecto(p); aviso('Guardado'); break;
      case 'nota': {
        const t = $('#f-nota', cuerpo).value; if (!t.trim()) return;
        agregarNota(p, t, hoy, hora); await guardarProspecto(p); break;
      }
    }
    repintar(p);
  });
}

export const fichaAbierta = () => actualId;
