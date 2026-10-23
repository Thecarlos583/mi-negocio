// Cargar, exportar y restaurar respaldos (lo usan Bienvenida, Hoy y Más).
import { estado, importarRespaldo, armarRespaldo, guardarMeta } from '../estado.js';
import { leerJSON, validarRespaldo, prepararRespaldo } from '../datos.js';
import { confirmar, aviso } from './comun.js';
import { hoyISO } from '../util.js';

// Lee el texto (archivo o pegado), lo valida y pide confirmación mostrando cuánto trae.
export async function cargarRespaldoDesdeTexto(texto, { pedirConfirmacion = true } = {}) {
  let obj;
  try { obj = leerJSON(texto); } catch (e) { aviso(e.message); return false; }
  const error = validarRespaldo(obj);
  if (error) { aviso(error); return false; }
  const { estado: nuevo, repetidos } = prepararRespaldo(obj);
  if (pedirConfirmacion) {
    const ok = await confirmar({
      titulo: 'Cargar este respaldo',
      texto: `Trae ${nuevo.prospectos.length} prospectos y ${nuevo.clientes.length} clientes${repetidos ? ` (quité ${repetidos} repetidos)` : ''}. Esto reemplaza todo lo que hay ahora en la app.`,
      si: 'Cargar', no: 'Cancelar',
    });
    if (!ok) return false;
  }
  await importarRespaldo(obj);
  aviso(`Listo: ${nuevo.prospectos.length} prospectos`);
  return true;
}

export async function cargarRespaldoDesdeArchivo(archivo, opciones) {
  if (!archivo) return false;
  return cargarRespaldoDesdeTexto(await archivo.text(), opciones);
}

// Hoja de compartir del iPhone con el archivo; si no se puede, se descarga.
export async function hacerRespaldo() {
  const json = JSON.stringify(armarRespaldo(), null, 1);
  const nombre = `respaldo-mi-negocio-${hoyISO()}.json`;
  const archivo = new File([json], nombre, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: 'Respaldo Mi Negocio' });
      await guardarMeta('ultimoRespaldo', hoyISO()); aviso('Respaldo guardado'); return true;
    }
  } catch (e) { if (e.name === 'AbortError') return false; }
  const url = URL.createObjectURL(archivo);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  await guardarMeta('ultimoRespaldo', hoyISO()); aviso('Respaldo descargado');
  return true;
}
