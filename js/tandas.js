// Importar tanda («tipo: tanda») y cambios en bloque («tipo: cambios»). Funciones puras sobre listas.
import { LINEAS, ETAPAS } from './ajustes-base.js';
import { normalizarTelefono, normalizarNombre, buscarRepetido, describirRepetido } from './telefono.js';
import { cambiarEtapa, evento } from './acciones.js';

const slug = s => normalizarNombre(s).replace(/ /g, '-');

export function validarTanda(o) {
  if (!o || o.tipo !== 'tanda') return `Este texto es de tipo «${o?.tipo ?? 'desconocido'}», no una tanda.`;
  if (!Array.isArray(o.prospectos) || !o.prospectos.length) return 'La tanda no trae negocios.';
  return null;
}

// Vista previa: qué es nuevo, qué ya existía y qué es reserva. Lo que ya existía no se importa.
export function prepararTanda(existentes, tanda) {
  const nuevos = [], ya = [], invalidos = [];
  let duplicadosEnTanda = 0;
  const vistos = new Set();
  for (const item of tanda.prospectos) {
    if (!item || !String(item.negocio || '').trim()) { invalidos.push(item); continue; }
    const rep = buscarRepetido(existentes, item);
    if (rep) { ya.push({ item, previo: rep, texto: describirRepetido(rep) }); continue; }
    const tel = normalizarTelefono(item.telefono);
    const clave = tel ? 't' + tel : 'n' + normalizarNombre(item.negocio);
    if (vistos.has(clave)) { duplicadosEnTanda++; continue; }
    vistos.add(clave);
    nuevos.push(item);
  }
  return { nombre: tanda.nombre || 'Tanda', fecha: tanda.fecha || '', nuevos, ya, invalidos, duplicadosEnTanda, reservas: nuevos.filter(n => n.reserva === true).length };
}

export function aplicarTanda(estado, prep, hoy, ahora) {
  const usados = new Set(estado.prospectos.map(p => p.id));
  const creados = prep.nuevos.map(item => {
    const telefono = normalizarTelefono(item.telefono);
    let id = telefono ? 'p' + telefono : 'n-' + slug(item.negocio);
    while (usados.has(id)) id += '-2';
    usados.add(id);
    return {
      id, negocio: String(item.negocio).trim(), telefono,
      linea: LINEAS.includes(item.linea) ? item.linea : 'Páginas',
      nicho: item.nicho || '', zona: item.zona || '', pais: item.pais || 'Venezuela', google: item.google || '',
      origenes: [prep.nombre], primerContacto: '', etapa: 'Por contactar', nota: item.nota || '',
      mensaje: item.mensaje || '', proximoPaso: '', proximaFecha: '', toques: 0,
      canal: item.canal || (telefono ? 'WhatsApp' : 'Instagram'), historial: [], reserva: item.reserva === true,
    };
  });
  estado.prospectos.push(...creados);
  const tanda = { id: `tanda-${prep.fecha || hoy}-${slug(prep.nombre)}`, nombre: prep.nombre, fecha: prep.fecha || hoy, total: creados.length, reservas: prep.reservas, creada: ahora };
  estado.tandas = estado.tandas.filter(t => t.id !== tanda.id);
  estado.tandas.push(tanda);
  return { creados, tanda };
}

// ---------- Cambios ----------
export const CAMPOS_CAMBIO = ['etapa', 'nota', 'proximoPaso', 'proximaFecha', 'proximaHora', 'contactoNombre'];
const ROTULO = { etapa: 'Etapa', nota: 'Nota nueva', proximoPaso: 'Próximo paso', proximaFecha: 'Próxima fecha', proximaHora: 'Hora', contactoNombre: 'Contacto' };
export const rotulo = c => ROTULO[c] || c;

export function validarCambios(o) {
  if (!o || o.tipo !== 'cambios') return `Este texto es de tipo «${o?.tipo ?? 'desconocido'}», no cambios.`;
  if (!Array.isArray(o.cambios) || !o.cambios.length) return 'No trae cambios.';
  return null;
}

export function prepararCambios(prospectos, obj) {
  const lista = [], noEncontrados = [], errores = [];
  for (const raw of obj.cambios) {
    let p = null;
    if (raw.telefono) p = buscarRepetido(prospectos, { telefono: raw.telefono });
    if (!p && raw.id) p = prospectos.find(x => x.id === raw.id) || null;
    if (!p && raw.negocio) p = buscarRepetido(prospectos, { negocio: raw.negocio }) || prospectos.find(x => normalizarNombre(x.negocio) === normalizarNombre(raw.negocio)) || null;
    if (!p) { noEncontrados.push(raw); continue; }
    if (raw.etapa && !ETAPAS.includes(raw.etapa)) { errores.push(`${p.negocio}: la etapa «${raw.etapa}» no existe`); continue; }
    const cambios = [];
    for (const campo of CAMPOS_CAMBIO) {
      if (raw[campo] === undefined) continue;
      const antes = campo === 'nota' ? '' : (p[campo] ?? '');
      if (campo !== 'nota' && String(antes) === String(raw[campo])) continue;
      cambios.push({ campo, antes, despues: raw[campo] });
    }
    if (cambios.length) lista.push({ p, cambios });
  }
  return { lista, noEncontrados, errores, fecha: obj.fecha || '' };
}

export function aplicarCambios(prep, hoy, hora) {
  for (const { p, cambios } of prep.lista) {
    for (const c of cambios) {
      if (c.campo === 'etapa') {
        cambiarEtapa(p, c.despues, hoy, hora);
        if (c.despues === 'No respondió') { p.proximaFecha = ''; p.proximoPaso = ''; delete p.proximaHora; }
      } else if (c.campo === 'nota') {
        evento(p, hoy, hora, 'nota', c.despues);
      } else {
        if (c.campo === 'proximaHora' && !c.despues) delete p.proximaHora; else p[c.campo] = c.despues;
        evento(p, hoy, hora, 'cambio', `${rotulo(c.campo)}: ${c.antes || 'vacío'} → ${c.despues || 'vacío'}`);
      }
    }
  }
  return prep.lista.map(x => x.p);
}
