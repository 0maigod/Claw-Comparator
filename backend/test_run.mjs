// test_run.mjs - Script de prueba temporal
import { analyzeSystems } from './src/services/diffService.js';

const SYS_A = 'o:/DiscoM2/code/PLUGFACTORY/Claw-comparator/test_systems/Sistema_v1';
const SYS_B = 'o:/DiscoM2/code/PLUGFACTORY/Claw-comparator/test_systems/Sistema_v2';

console.log('=== OpenClaw Comparator - Prueba de Análisis ===\n');
console.log(`Sistema A: ${SYS_A}`);
console.log(`Sistema B: ${SYS_B}\n`);

try {
    const result = await analyzeSystems(SYS_A, SYS_B);
    console.log('✅ Análisis completado con éxito:\n');
    console.log(JSON.stringify(result, null, 2));
} catch (e) {
    console.error('❌ Error:', e.message);
}
