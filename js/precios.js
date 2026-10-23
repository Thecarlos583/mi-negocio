// Precio sugerido según la escalera de la línea y cuántos clientes ya tengo en ella.
export function sugerirPrecio(ajustes, clientes, linea) {
  const escalera = ajustes.precios?.[linea];
  if (!escalera?.length) return null;
  const n = clientes.filter(c => c.linea === linea && c.estado !== 'Cancelado').length + 1;
  const tramo = escalera.find(t => n >= t.desde && (t.hasta == null || n <= t.hasta)) || escalera[escalera.length - 1];
  return { instalacion: tramo.instalacion, mensual: tramo.mensual, n, nota: tramo.nota || '' };
}
