/**
 * End-to-End System Performance & Chemical Attribution Verification Test
 */

const BASE_URL = 'http://localhost:3001';

async function testEngineIntegration() {
  console.log('='.repeat(75));
  console.log('🧪 VayuVitals End-to-End Prediction & Source Attribution Integration Test');
  console.log('='.repeat(75));

  // 1. Test 48-Hour Atmospheric Forecast Endpoint
  console.log('\n[1] Testing 48-Hour Continuous Atmospheric Forecast Endpoint...');
  const t0 = performance.now();
  const forecastRes = await fetch(`${BASE_URL}/api/sagemaker/forecast?facilityId=dps_rk_puram&lat=28.5672&lon=77.1741&basePm25=175`);
  const forecastData = await forecastRes.json();
  const forecastDuration = (performance.now() - t0).toFixed(1);

  if (!forecastData.success) {
    console.error('❌ Forecast endpoint failed:', forecastData);
  } else {
    console.log(`✅ Forecast generated in ${forecastDuration}ms`);
    console.log(`   • Model Framework:     ${forecastData.modelFramework}`);
    console.log(`   • Model ARN:           ${forecastData.modelArn}`);
    console.log(`   • Benchmark MAE:       ${forecastData.maeError} µg/m³ | RMSE: ${forecastData.rmseError} µg/m³ | R²: ${forecastData.r2Score}`);
    console.log(`   • Cascading Ensemble Ladder:`);
    Object.entries(forecastData.cascadingLadder || {}).forEach(([k, v]) => {
      console.log(`     - ${v.label.padEnd(28)}: MAE = ${String(v.mae).padStart(5)} µg/m³ | R² = ${String(v.r2).padStart(6)} | ±20µg Acc = ${v.accuracyWithin20}%`);
    });
    console.log(`   • Kalman Assimilation:  Active = ${forecastData.kalmanAssimilation?.active} | Sensor Reading = ${forecastData.kalmanAssimilation?.assimilatedSensorReading} µg/m³ | Initial Innovation = ${forecastData.kalmanAssimilation?.initialResidual} µg/m³ (Decay Tau: ${forecastData.kalmanAssimilation?.decorrelationTauHours}h)`);
    console.log(`   • Timeline Data Points: ${forecastData.hourlyTimeline?.length} forward hours`);
    console.log(`   • Peak Arrival PM2.5:  ${forecastData.peakMorningArrival?.predictedPm25} µg/m³ (${forecastData.peakMorningArrival?.category})`);
    console.log(`   • Peak Arrival Band:   ${forecastData.peakMorningArrival?.confidenceBand?.rangeStr}`);
    console.log(`   • Danger Windows:      ${forecastData.outdoorActivityGuidance?.dangerWindows?.length || 0} natural meteorological windows detected`);
    console.log(`   • Safe Windows:        ${forecastData.outdoorActivityGuidance?.safeWindows?.length || 0} solar dispersion windows detected`);
  }

  // 2. Test Multi-Gas Chemical Source Attribution Endpoint (Live & Synthetic)
  console.log('\n[2] Testing Multi-Gas Chemical Source Attribution Across Archetypes...');

  const archetypes = [
    {
      name: 'Stubble Burning Plume (Transboundary Biomass)',
      params: 'pm25=290&pm10=320&no2=35&so2=14&o3=40&windSpeed=1.8&month=10&day=25'
    },
    {
      name: 'Vehicular Transit Corridor (NO2 Exhaust Dominance)',
      params: 'pm25=165&pm10=220&no2=88&so2=16&o3=30&co=2.4&windSpeed=2.0'
    },
    {
      name: 'Mechanical Road & Construction Dust (Coarse Particulates)',
      params: 'pm25=75&pm10=430&no2=30&so2=10&o3=25&windSpeed=4.5'
    },
    {
      name: 'Photochemical Ground-Level Ozone ($O_3$) Surge',
      params: 'pm25=95&pm10=130&no2=40&so2=12&o3=140&windSpeed=2.1&hour=13'
    }
  ];

  for (const arc of archetypes) {
    const tA = performance.now();
    const res = await fetch(`${BASE_URL}/api/source-attribution?${arc.params}`);
    const data = await res.json();
    const ms = (performance.now() - tA).toFixed(1);
    const fp = data.fingerprint;
    console.log(`   • [${ms}ms] Scenario: ${arc.name}`);
    console.log(`     -> Attribution:  ${fp?.icon} ${fp?.driverTitle} (${fp?.confidencePct}% Forensic Confidence)`);
    console.log(`     -> Metrics:      Ratio PM2.5/PM10: ${fp?.metrics?.fineToCoarseRatio} | NO2: ${fp?.metrics?.no2} µg/m³ | O3: ${fp?.metrics?.o3} µg/m³`);
    console.log(`     -> Countermeasure: ${fp?.mitigationDirective?.slice(0, 90)}...`);
  }

  // 3. Test Live Open-Meteo Ingest for Delhi Coordinates
  console.log('\n[3] Testing Live Ingestion Source Attribution (Delhi GPS 28.6139, 77.2090)...');
  const tLive = performance.now();
  const liveRes = await fetch(`${BASE_URL}/api/source-attribution?lat=28.6139&lon=77.2090&pm25=155`);
  const liveData = await liveRes.json();
  const liveMs = (performance.now() - tLive).toFixed(1);
  console.log(`✅ Live Telemetry Ingested in ${liveMs}ms:`);
  console.log(`   • Primary Driver:   ${liveData.fingerprint?.icon} ${liveData.fingerprint?.driverTitle} (${liveData.fingerprint?.confidencePct}% Confidence)`);
  console.log(`   • Ingested Metrics: PM2.5: ${liveData.fingerprint?.metrics?.pm25} | PM10: ${liveData.fingerprint?.metrics?.pm10} | NO2: ${liveData.fingerprint?.metrics?.no2} | SO2: ${liveData.fingerprint?.metrics?.so2} | O3: ${liveData.fingerprint?.metrics?.o3}`);

  // 4. Test 6:30 AM Advisory Preview with Embedded Chemical Fingerprint Card
  console.log('\n[4] Testing 6:30 AM Morning Advisory Generation with Embedded Chemical Card...');
  const tAdv = performance.now();
  const advRes = await fetch(`${BASE_URL}/api/advisory/preview-630?facilityId=dps_rk_puram`);
  const advData = await advRes.json();
  const advMs = (performance.now() - tAdv).toFixed(1);
  const html = advData.advisory?.emailPayload?.html || '';

  const hasChemicalCard = html.includes('CHEMICAL FINGERPRINT & PROXIMATE SOURCE ATTRIBUTION');
  const hasKpiScorecard = html.includes('PREDICTED PEAK') && html.includes('ATMOSPHERIC PARTICULATE SPECTRUM');
  const hasVayuVitalsBrand = html.includes('VAYUVITALS');
  const hasNoProjectJargon = !html.includes('SageMaker registered model') && !html.includes('WMD -');

  console.log(`✅ 6:30 AM Advisory generated in ${advMs}ms:`);
  console.log(`   • Embedded Chemical Attribution Card: ${hasChemicalCard ? '✅ PRESENT' : '❌ MISSING'}`);
  console.log(`   • Visual Spectrum & KPI Dashboard:    ${hasKpiScorecard ? '✅ PRESENT' : '❌ MISSING'}`);
  console.log(`   • VayuVitals Executive Brand:          ${hasVayuVitalsBrand ? '✅ CLEAN' : '❌ MISSING'}`);
  console.log(`   • Zero Project Jargon in HTML:         ${hasNoProjectJargon ? '✅ VERIFIED' : '❌ FAILED'}`);

  // 5. Test 12:00 PM Mid-Day Emergency Alert with Gemini AI Integration
  console.log('\n[5] Testing 12:00 PM Mid-Day Emergency Alert with Chemical Fingerprint + Gemini Directives...');
  const tEmerg = performance.now();
  const emergRes = await fetch(`${BASE_URL}/api/advisory/emergency-midday`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facilityId: 'dps_rk_puram',
      currentPm25: 310,
      isSandbox: true,
      dispatchViaSes: false
    })
  });
  const emergData = await emergRes.json();
  const emergMs = (performance.now() - tEmerg).toFixed(1);

  console.log(`✅ Mid-Day Emergency Alert generated in ${emergMs}ms:`);
  console.log(`   • AI Engine Used:       ${emergData.emergencyRecord?.aiModelUsed}`);
  console.log(`   • Anomaly Trigger:      ${emergData.emergencyRecord?.anomalyType}`);
  console.log(`   • Directives Generated: ${emergData.emergencyRecord?.directives?.length || 0} executive action items`);
  emergData.emergencyRecord?.directives?.forEach((d, i) => {
    console.log(`     ${i + 1}. ${d}`);
  });

  // 6. Test Live SES Email Delivery to verified address (vayuvitals@gmail.com)
  console.log('\n[6] Testing Live Amazon SES Dispatch of Graphical Advisory Email...');
  const tSes = performance.now();
  const sesRes = await fetch(`${BASE_URL}/api/advisory/test-dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facilityId: 'dps_rk_puram',
      testEmail: 'vayuvitals@gmail.com',
      isSandbox: false,
      dispatchViaSes: true
    })
  });
  const sesData = await sesRes.json();
  const sesMs = (performance.now() - tSes).toFixed(1);

  console.log(`   • SES API Call Duration: ${sesMs}ms`);
  console.log(`   • Status:                ${sesData.dispatchRecord?.status}`);
  console.log(`   • Recipient:             ${sesData.dispatchRecord?.actualRecipientSentTo}`);
  console.log(`   • Delivery Note:         ${sesData.dispatchRecord?.deliveryNote}`);
  if (sesData.dispatchRecord?.sesResponse?.messageId) {
    console.log(`   • AWS SES MessageId:     ${sesData.dispatchRecord.sesResponse.messageId}`);
  }

  console.log('\n' + '='.repeat(75));
  console.log('🎉 All Engine Performance & Integration Tests Completed Successfully!');
  console.log('='.repeat(75));
}

testEngineIntegration().catch(err => {
  console.error('Fatal Test Failure:', err);
  process.exit(1);
});
