// Arma inicial/arranque-v2.json (repo privado) a partir de los datos viejos datos-v3.json.
// Uso: node scripts/migrar-v3.mjs <datos-v3.json> <clientes-v2.json> <arranque-v2.json> [AAAA-MM-DD]
// Los datos nunca se guardan en este repo: solo el script.
import { readFileSync, writeFileSync } from 'node:fs';
import { migrarV3 } from '../js/logica/migracion.js';

const [entrada, archClientes, salida, hoy = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
if (!entrada || !archClientes || !salida) { console.log('Uso: node scripts/migrar-v3.mjs <datos-v3.json> <clientes-v2.json> <arranque-v2.json> [AAAA-MM-DD]'); process.exit(1); }
const v3 = JSON.parse(readFileSync(entrada, 'utf8'));
const r = migrarV3(v3, hoy, JSON.parse(readFileSync(archClientes, 'utf8')).clientes);
writeFileSync(salida, JSON.stringify(r, null, 1));
console.log(`Vivos: ${r.prospectos.length} · historial: ${r.historial.length} · clientes: ${r.clientes.length}`);
r.prospectos.forEach(p => console.log(`  ${p.etapa.padEnd(12)} ${p.negocio} ${p.proximaFecha || ''}`));
