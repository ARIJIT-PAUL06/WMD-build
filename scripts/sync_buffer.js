#!/usr/bin/env node

/**
 * Regenerates the local 14-day empirical buffer on demand for offline development.
 * Queries real Open-Meteo CAMS atmospheric reanalysis data across all populated Delhi-NCR grid blocks.
 * Zero-faking compliant: never synthetic, purely empirical.
 */

import { syncAllPopulatedGrids } from '../server/gridTelemetryService.js';

console.log('======================================================================');
console.log('🔄 VayuVitals Empirical Buffer Sync');
console.log('📡 Ingesting live CAMS atmospheric data from Open-Meteo across 99 grids...');
console.log('======================================================================');

const start = Date.now();
try {
  const results = await syncAllPopulatedGrids(14);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Successfully synchronized ${results.length} spatial grid blocks in ${elapsed}s.`);
  console.log('💾 Written rolling 14-day buffer to ml/data/grid_14day_buffer.json');
} catch (err) {
  console.error(`\n❌ Failed synchronizing grid buffer: ${err.message}`);
  process.exit(1);
}
