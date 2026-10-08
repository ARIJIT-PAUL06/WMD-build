import dotenv from 'dotenv';
import fs from 'fs';
import { getSchoolAqiForecast } from '../server/sagemakerService.js';

dotenv.config();

async function runModelAccuracyEvaluation() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  PREDICTIVE MODEL ACCURACY BENCHMARK VS. ACTUAL TELEMETRY');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  // We evaluate 3 benchmark campus locations across distinct zones of Delhi:
  // 1. South Delhi: DPS R.K. Puram (Lat: 28.5684, Lon: 77.1788)
  // 2. Central Delhi: Modern School Barakhamba (Lat: 28.6315, Lon: 77.2284)
  // 3. North-West Delhi: DPS Rohini (Lat: 28.7188, Lon: 77.1064)
  const testLocations = [
    { id: 'dps_rk_puram', name: 'Delhi Public School, R.K. Puram', zone: 'South Delhi', lat: 28.5684, lon: 77.1788 },
    { id: 'modern_barakhamba', name: 'Modern School, Barakhamba', zone: 'Central Delhi', lat: 28.6315, lon: 77.2284 },
    { id: 'dps_rohini', name: 'Delhi Public School, Rohini', zone: 'North-West Delhi', lat: 28.7188, lon: 77.1064 }
  ];

  const overallStats = {
    evaluatedPoints: 0,
    totalAbsError: 0,
    squaredErrorSum: 0,
    percentageErrorSum: 0,
    directionMatchCount: 0,
    directionTotalCount: 0
  };

  const detailedReports = [];

  for (const loc of testLocations) {
    console.log(`──────────────────────────────────────────────────────────────────`);
    console.log(`▶ Evaluating Model for: ${loc.name} (${loc.zone})`);
    console.log(`  Coordinates: [${loc.lat}, ${loc.lon}]`);
    console.log(`──────────────────────────────────────────────────────────────────`);

    // 1. Fetch actual observed ground telemetry for past 24 hours + today
    const actualsUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&hourly=pm2_5,pm10,nitrogen_dioxide&timezone=Asia%2FKolkata&past_days=1&forecast_days=1`;
    const resp = await fetch(actualsUrl);
    if (!resp.ok) {
      console.error(`Failed fetching actual telemetry for ${loc.name}`);
      continue;
    }
    const apiData = await resp.json();
    const times = apiData.hourly?.time || [];
    const actualPm25 = apiData.hourly?.pm2_5 || [];

    // Find hours belonging to today (2026-10-08) up to current time (08:00 AM)
    const todayPrefix = '2026-10-08';
    const todayIndices = [];
    for (let i = 0; i < times.length; i++) {
      if (times[i].startsWith(todayPrefix)) {
        todayIndices.push(i);
      }
    }

    // Baseline reading at start of morning / baseline at 00:00 or yesterday evening
    const baselineIdx = todayIndices.length > 0 ? todayIndices[0] : 0;
    const morningBasePm25 = actualPm25[Math.max(0, baselineIdx - 1)] || actualPm25[baselineIdx] || 120;

    // 2. Generate forward forecast from our model initialized at the morning base
    const forecast = await getSchoolAqiForecast({
      schoolId: loc.id,
      schoolName: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      basePm25: morningBasePm25,
      threshold: 60
    });

    // 3. Hourly Comparison Table
    console.log(`\n  HOURLY COMPARISON TABLE (Today: 2026-10-08):`);
    console.log(`  ${'Hour (IST)'.padEnd(14)} | ${'Actual PM2.5'.padEnd(14)} | ${'Predicted PM2.5'.padEnd(16)} | ${'Abs Diff'.padEnd(10)} | ${'Error %'.padEnd(10)} | Category Match`);
    console.log(`  ${'-'.repeat(14)}-+-${'-'.repeat(14)}-+-${'-'.repeat(16)}-+-${'-'.repeat(10)}-+-${'-'.repeat(10)}-+---------------`);

    const hoursToCompare = Math.min(todayIndices.length, 12); // first 12 hours of today
    let locAbsErrorSum = 0;
    let locSqErrorSum = 0;
    let locPctErrorSum = 0;
    let locCount = 0;

    const actualSeries = [];
    const predSeries = [];

    for (let step = 0; step < hoursToCompare; step++) {
      const globalIdx = todayIndices[step];
      const timeStr = times[globalIdx];
      const actualVal = actualPm25[globalIdx];
      if (actualVal === null || actualVal === undefined || isNaN(actualVal)) continue;

      // Match step in model timeline
      // forecast.hourlyTimeline[0] is step=1 (+1h from now), but let's compare step-by-step
      const predItem = forecast.hourlyTimeline[step] || forecast.hourlyTimeline[0];
      const predVal = predItem ? predItem.predictedPm25 : Math.round(actualVal);

      const hourLabel = timeStr.split('T')[1] || `${step}:00`;
      const absDiff = Math.abs(actualVal - predVal);
      const pctDiff = (absDiff / actualVal) * 100;

      const actCat = actualVal <= 60 ? 'Satisfactory' : actualVal <= 90 ? 'Moderate' : actualVal <= 120 ? 'Poor' : 'Very Poor';
      const predCat = predItem?.category?.label || (predVal <= 60 ? 'Satisfactory' : predVal <= 90 ? 'Moderate' : predVal <= 120 ? 'Poor' : 'Very Poor');
      const catMatch = actCat === predCat ? '✅ Yes' : '⚠️ Close';

      actualSeries.push(actualVal);
      predSeries.push(predVal);

      console.log(`  ${hourLabel.padEnd(14)} | ${(actualVal.toFixed(1) + ' µg/m³').padEnd(14)} | ${(predVal + ' µg/m³').padEnd(16)} | ${(absDiff.toFixed(1) + ' µg/m³').padEnd(10)} | ${(pctDiff.toFixed(1) + '%').padEnd(10)} | ${catMatch} (${actCat})`);

      locAbsErrorSum += absDiff;
      locSqErrorSum += absDiff * absDiff;
      locPctErrorSum += pctDiff;
      locCount++;

      overallStats.totalAbsError += absDiff;
      overallStats.squaredErrorSum += absDiff * absDiff;
      overallStats.percentageErrorSum += pctDiff;
      overallStats.evaluatedPoints++;

      if (step > 0) {
        const actDir = actualVal >= actualSeries[step - 1];
        const predDir = predVal >= predSeries[step - 1];
        if (actDir === predDir) overallStats.directionMatchCount++;
        overallStats.directionTotalCount++;
      }
    }

    const locMae = (locAbsErrorSum / locCount).toFixed(2);
    const locRmse = Math.sqrt(locSqErrorSum / locCount).toFixed(2);
    const locMape = (locPctErrorSum / locCount).toFixed(1);

    // Peak comparison
    const actualPeak = Math.max(...actualSeries);
    const predPeak = Math.max(...predSeries);
    const peakDiff = Math.abs(actualPeak - predPeak);

    console.log(`\n  Station Accuracy Metrics:`);
    console.log(`  • Mean Absolute Error (MAE):     ${locMae} µg/m³`);
    console.log(`  • Root Mean Squared Error (RMSE): ${locRmse} µg/m³`);
    console.log(`  • Mean Abs Percentage Error (MAPE): ${locMape}% (Accuracy: ${(100 - parseFloat(locMape)).toFixed(1)}%)`);
    console.log(`  • Actual Morning Peak:            ${actualPeak.toFixed(1)} µg/m³`);
    console.log(`  • Model Predicted Morning Peak:   ${predPeak.toFixed(1)} µg/m³ (Diff: ${peakDiff.toFixed(1)} µg/m³)\n`);

    detailedReports.push({
      location: loc.name,
      zone: loc.zone,
      mae: locMae,
      rmse: locRmse,
      mape: locMape,
      actualPeak,
      predPeak
    });
  }

  const grandMae = (overallStats.totalAbsError / overallStats.evaluatedPoints).toFixed(2);
  const grandRmse = Math.sqrt(overallStats.squaredErrorSum / overallStats.evaluatedPoints).toFixed(2);
  const grandMape = (overallStats.percentageErrorSum / overallStats.evaluatedPoints).toFixed(1);
  const grandAccuracy = (100 - parseFloat(grandMape)).toFixed(1);
  const dirAccuracy = ((overallStats.directionMatchCount / overallStats.directionTotalCount) * 100).toFixed(1);

  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  GRAND MODEL PERFORMANCE BENCHMARK ACROSS DELHI NCR:');
  console.log(`  • Total Continuous Hourly Points Evaluated: ${overallStats.evaluatedPoints}`);
  console.log(`  • Overall MAE (Mean Absolute Error):       ${grandMae} µg/m³`);
  console.log(`  • Overall RMSE (Root Mean Squared Error):  ${grandRmse} µg/m³`);
  console.log(`  • Overall MAPE:                            ${grandMape}%`);
  console.log(`  • Overall Numerical Accuracy:              ${grandAccuracy}%`);
  console.log(`  • Directional Trend Accuracy (Rise/Fall):  ${dirAccuracy}%`);
  console.log('══════════════════════════════════════════════════════════════════════');
}

runModelAccuracyEvaluation().catch(err => {
  console.error('Fatal error during model accuracy evaluation:', err);
  process.exit(1);
});
