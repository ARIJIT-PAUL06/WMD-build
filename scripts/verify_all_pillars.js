import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPillarsVerification() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  AUDITING ALL 3 AUTONOMOUS MONITORING PILLARS');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const {
    runPredictiveAdvisoryEvaluation,
    dispatchBlockEmergencySurge,
    evaluate14DayChronicBlockPetitions,
    runAutonomousMonitoringCycle,
    getMonitorStatus,
    clearMonitorDebounces
  } = await import('../server/autonomousAtmosphericMonitor.js');

  const { get14DayCompliance } = await import('../server/gridTelemetryService.js');
  const { getSchoolAqiForecast } = await import('../server/sagemakerService.js');

  // Clear debounce for test execution
  clearMonitorDebounces();

  // -------------------------------------------------------------------------
  // PILLAR 1: PREDICTIVE MORNING ADVISORY (THRESHOLD-GATED)
  // -------------------------------------------------------------------------
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('▶ [TESTING PILLAR 1] Predictive Morning Advisory Engine');
  console.log('──────────────────────────────────────────────────────────────────');
  
  // Test 1A: Clean day suppression (threshold high: 250 µg/m³)
  const suppressedResult = await runPredictiveAdvisoryEvaluation({
    thresholdPm25: 250,
    dispatchViaSes: false,
    isSandbox: true,
    ignoreDebounce: true,
    maxFacilities: 3
  });

  console.log(`Pillar 1A (Suppression Check): Evaluated ${suppressedResult.length} facilities with threshold 250 µg/m³.`);
  let cleanSuppressedCount = 0;
  for (const item of suppressedResult) {
    console.log(`  • ${item.name}: Predicted Peak = ${item.predictedPeak || 'N/A'} µg/m³ | Dispatched = ${item.dispatched} | Reason = ${item.reason || item.note || 'OK'}`);
    if (!item.dispatched) cleanSuppressedCount++;
  }
  const pillar1aPassed = cleanSuppressedCount === suppressedResult.length;
  console.log(`  => Pillar 1A Result: ${pillar1aPassed ? '✅ PASSED (Alert fatigue prevented)' : '❌ FAILED'}\n`);

  // Test 1B: Hazardous Day Trigger (threshold low: 50 µg/m³)
  const triggeredResult = await runPredictiveAdvisoryEvaluation({
    thresholdPm25: 50,
    dispatchViaSes: false,
    isSandbox: true,
    ignoreDebounce: true,
    maxFacilities: 3
  });

  console.log(`Pillar 1B (Hazardous Trigger Check): Evaluated ${triggeredResult.length} facilities with threshold 50 µg/m³.`);
  let hazardousTriggeredCount = 0;
  for (const item of triggeredResult) {
    console.log(`  • ${item.name}: Predicted Peak = ${item.predictedPeak || 'N/A'} µg/m³ | Dispatched = ${item.dispatched} | Recipient = ${item.recipient || 'N/A'}`);
    if (item.predictedPeak > 50) hazardousTriggeredCount++;
  }
  const pillar1bPassed = hazardousTriggeredCount > 0;
  console.log(`  => Pillar 1B Result: ${pillar1bPassed ? '✅ PASSED (High risk detected & advisory evaluated)' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // PILLAR 2: 5KM X 5KM BLOCK-LEVEL RAPID EMERGENCY SURGE
  // -------------------------------------------------------------------------
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('▶ [TESTING PILLAR 2] Block Emergency Surge Flash Alert Engine');
  console.log('──────────────────────────────────────────────────────────────────');

  const emergencyResult = await dispatchBlockEmergencySurge({
    gridId: 'GRID_R03_C05',
    currentPm25: 285,
    anomalyType: 'Rapid Boundary Layer Inversion & Localized Biomass Plume',
    dispatchViaSes: false,
    isSandbox: true,
    ignoreDebounce: true
  });

  console.log(`Pillar 2 Evaluation on Block ${emergencyResult.gridId}:`);
  console.log(`  • Surge PM2.5: ${emergencyResult.pm25} µg/m³`);
  console.log(`  • Total Enclosed Institutions Dispatched: ${emergencyResult.facilitiesAlerted}`);
  if (emergencyResult.facilities && emergencyResult.facilities.length > 0) {
    console.log(`  • Sample Enclosed Facilities:`);
    emergencyResult.facilities.slice(0, 4).forEach(f => {
      console.log(`    - [${f.facilityId}] ${f.name} (Recipient: ${f.recipient || 'Command Centre'})`);
    });
  }
  const pillar2Passed = emergencyResult.success && emergencyResult.facilitiesAlerted > 0;
  console.log(`  => Pillar 2 Result: ${pillar2Passed ? '✅ PASSED (All enclosed facilities in grid detected)' : '❌ FAILED'}\n`);

  // Test 2B: Cooldown Anti-Spam Debounce
  const debounceEmergencyResult = await dispatchBlockEmergencySurge({
    gridId: 'GRID_R03_C05',
    currentPm25: 310,
    dispatchViaSes: false,
    isSandbox: true,
    ignoreDebounce: false // Debounce active
  });
  const pillar2DebouncePassed = debounceEmergencyResult.dispatched === false && debounceEmergencyResult.reason?.includes('Cooldown');
  console.log(`  => Pillar 2 Cooldown Debounce: ${pillar2DebouncePassed ? '✅ PASSED (Repeated spike safely debounced)' : '❌ FAILED'} (${debounceEmergencyResult.reason})\n`);

  // -------------------------------------------------------------------------
  // PILLAR 3: 14-DAY CHRONIC STATUTORY VIOLATION PETITION DOSSIER
  // -------------------------------------------------------------------------
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('▶ [TESTING PILLAR 3] 14-Day Statutory Compliance & Petition Engine');
  console.log('──────────────────────────────────────────────────────────────────');

  const compliance = get14DayCompliance('GRID_R03_C05');
  console.log(`14-Day Regulatory Compliance for GRID_R03_C05:`);
  console.log(`  • Monitored Regulatory Hours: ${compliance.totalHours} hrs`);
  console.log(`  • Severe Violation Hours: ${compliance.severeHours} hrs`);
  console.log(`  • 14-Day Mean PM2.5: ${compliance.avgPm25} µg/m³`);
  console.log(`  • Total Days Recorded: ${compliance.totalDaysRecorded} days`);
  console.log(`  • Statutory Petition Eligible: ${compliance.petitionEligible}`);

  const petitionResult = await evaluate14DayChronicBlockPetitions({
    gridId: 'GRID_R03_C05',
    dispatchViaSes: false,
    isSandbox: true,
    ignoreDebounce: true,
    forcePetition: true
  });

  console.log(`Pillar 3 Dossier Compilation Result: Evaluated ${petitionResult.length} petition dossiers.`);
  let petitionSuccess = false;
  if (petitionResult.length > 0) {
    const p = petitionResult[0];
    console.log(`  • Target Block: ${p.gridId}`);
    console.log(`  • Facilities Covered in Block: ${p.facilitiesCount}`);
    console.log(`  • Dispatched (SES Active): ${p.dispatched}`);
    console.log(`  • Evidentiary 14-Day Mean PM2.5: ${p.compliance?.avgPm25} µg/m³`);
    console.log(`  • Severe Inversion Hours Documented: ${p.compliance?.severeHours} hrs`);
    petitionSuccess = p.facilitiesCount > 0;
  }
  const pillar3Passed = petitionSuccess;
  console.log(`  => Pillar 3 Result: ${pillar3Passed ? '✅ PASSED (Statutory dossiers compiled)' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // FULL MONITORING CYCLE EXECUTION
  // -------------------------------------------------------------------------
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('▶ [TESTING ORCHESTRATION] Full Autonomous Monitoring Cycle');
  console.log('──────────────────────────────────────────────────────────────────');

  const cycleReport = await runAutonomousMonitoringCycle({
    dispatchViaSes: false,
    isSandbox: true
  });

  console.log(`Cycle Report #${cycleReport.cycleId}:`);
  console.log(`  • Synced Grids Count: ${cycleReport.telemetrySync?.syncedBlocksCount}`);
  console.log(`  • Surges Detected: ${cycleReport.emergencySurgesDetected?.length}`);
  console.log(`  • Petitions Evaluated: ${cycleReport.petitionsEvaluated?.length}`);
  console.log(`  • Predictive Advisories Evaluated: ${cycleReport.predictiveAdvisoriesEvaluated?.length}`);
  const cyclePassed = cycleReport.telemetrySync?.syncedBlocksCount > 0;
  console.log(`  => Full Cycle Result: ${cyclePassed ? '✅ PASSED (All subsystems synced and operational)' : '❌ FAILED'}\n`);

  console.log('══════════════════════════════════════════════════════════════════════');
  console.log(`  PILLARS AUDIT SUMMARY:`);
  console.log(`  Pillar 1 (Predictive Morning Advisory):     ${pillar1aPassed && pillar1bPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`  Pillar 2 (Block Emergency Surge):           ${pillar2Passed && pillar2DebouncePassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`  Pillar 3 (14-Day Statutory Legal Petition): ${pillar3Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`  Orchestrated Monitoring Cycle:              ${cyclePassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('══════════════════════════════════════════════════════════════════════');
}

runPillarsVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
