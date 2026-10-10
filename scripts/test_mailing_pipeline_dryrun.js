/**
 * End-to-End Dry-Run Diagnostic & Validation for VayuVitals Automatic Mailing Service
 * Tests: SageMaker Inference -> Forecast Processing -> Advisory Generation -> Decision Gates -> SES Sandbox Validation
 * 
 * STRICT DIRECTIVE:
 * - 100% Real Live AWS Data & Endpoints.
 * - ZERO email dispatch (dispatchViaSes: false).
 * - ZERO synthetic/mock telemetry or fake responses.
 */

import dotenv from 'dotenv';
dotenv.config();

import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { SESClient, GetSendQuotaCommand, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';
import { getSchoolAqiForecast } from '../server/sagemakerService.js';
import { generate630Advisory, resolveRecipientForFacility, FACILITY_TEST_MAPPINGS } from '../server/advisoryDispatchService.js';
import { runPredictiveAdvisoryEvaluation } from '../server/autonomousAtmosphericMonitor.js';
import { getMonitorStateFromDynamoDB } from '../server/awsServices.js';

async function runAudit() {
  console.log('='.repeat(70));
  console.log('STAGE 1: SAGEMAKER REAL ENDPOINT INVOCATION TEST');
  console.log('='.repeat(70));

  const smRegion = process.env.AWS_REGION || 'ap-south-1';
  const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME || 'wmd-delhi-48h-forecast-endpoint';
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  const smClient = new SageMakerRuntimeClient({
    region: smRegion,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
  });

  // Construct a single 14-feature row for Delhi Public School, Rohini
  // [pm25_now, horizon_hours, temperature, humidity, wind_speed, hour_sin, hour_cos, doy_sin, doy_cos, is_winter, is_stubble_burning, is_school_rush, latitude, longitude]
  const sampleRow = [85, 1, 27.5, 55.0, 2.1, 0.5, 0.86, 0.8, -0.6, 0, 0, 1, 28.7188, 77.1064];
  const csvPayload = sampleRow.join(',');

  console.log(`Endpoint Name: ${endpointName}`);
  console.log(`Region:        ${smRegion}`);
  console.log(`Input Payload: ${csvPayload}`);

  const smStart = Date.now();
  let smInferenceVal = null;
  let smLatency = 0;
  try {
    const cmd = new InvokeEndpointCommand({
      EndpointName: endpointName,
      ContentType: 'text/csv',
      Accept: 'text/csv',
      Body: Buffer.from(csvPayload)
    });
    const res = await smClient.send(cmd);
    smLatency = Date.now() - smStart;
    const bodyStr = new TextDecoder().decode(res.Body).trim();
    smInferenceVal = parseFloat(bodyStr);
    const predictedPm25 = Math.max(15, Math.round(Math.expm1(smInferenceVal)));
    console.log(`STATUS:        SUCCESS`);
    console.log(`Latency:       ${smLatency} ms`);
    console.log(`Raw Log-Score: ${smInferenceVal}`);
    console.log(`exp(x)-1 PM2.5:${predictedPm25} µg/m³`);
  } catch (err) {
    console.error(`SageMaker invocation error: ${err.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('STAGE 2: 48-HOUR SCHOOL FORECAST SERVICE PIPELINE (sagemakerService.js)');
  console.log('='.repeat(70));

  const fcStart = Date.now();
  const schoolForecast = await getSchoolAqiForecast({
    schoolId: 'dps_rohini',
    schoolName: 'Delhi Public School, Rohini',
    lat: 28.7188,
    lon: 77.1064,
    threshold: 75
  });
  const fcLatency = Date.now() - fcStart;

  console.log(`School:             ${schoolForecast.institution?.name}`);
  console.log(`Execution Mode:     ${schoolForecast.modelDetails?.executionMode}`);
  console.log(`SageMaker Status:   ${schoolForecast.modelDetails?.sagemakerStatus}`);
  console.log(`Inference Latency:  ${schoolForecast.modelDetails?.inferenceLatencyMs} ms`);
  console.log(`Current Baseline:   ${schoolForecast.institution?.currentBasePm25} µg/m³`);
  console.log(`Peak Predicted:     ${schoolForecast.summary?.peakPm25} µg/m³ (${schoolForecast.summary?.peakCategory})`);
  console.log(`Arrival Average:    ${schoolForecast.summary?.arrivalAverage} µg/m³`);
  console.log(`Morning Average:    ${schoolForecast.summary?.morningAverage} µg/m³`);
  console.log(`Exceedance Hours:   ${schoolForecast.summary?.totalExceedanceHours} / 48 hrs (> 75 µg/m³)`);
  console.log(`Timeline Points:    ${schoolForecast.hourlyTimeline?.length} hours generated`);
  console.log(`Danger Windows:     ${JSON.stringify(schoolForecast.dangerWindows)}`);
  console.log(`Safe Windows:       ${JSON.stringify(schoolForecast.safeWindows)}`);

  console.log('\n' + '='.repeat(70));
  console.log('STAGE 3: ADVISORY EMAIL CRAFTING & RECIPIENT ROUTING (advisoryDispatchService.js)');
  console.log('='.repeat(70));

  const targetRecipient = resolveRecipientForFacility('dps_rohini');
  console.log(`Designated Recipient for 'dps_rohini': ${targetRecipient}`);
  console.log('All Test Mappings:');
  for (const [fId, meta] of Object.entries(FACILITY_TEST_MAPPINGS)) {
    console.log(`  - ${fId}: ${meta.institutionName} -> ${meta.email}`);
  }

  const advisory = await generate630Advisory({ facilityId: 'dps_rohini' });
  console.log(`\nCrafted Subject:   ${advisory.emailPayload?.subject}`);
  console.log(`HTML Payload Size: ${advisory.emailPayload?.html?.length} characters`);
  console.log(`Preview Text:      ${advisory.emailPayload?.previewText || 'N/A'}`);
  console.log(`Forecast Inversion Level: ${advisory.inversionMetrics?.level}`);

  console.log('\n' + '='.repeat(70));
  console.log('STAGE 4: AUTONOMOUS DECISION GATEWAYS DRY-RUN (ZERO SES DISPATCH)');
  console.log('='.repeat(70));

  // Test with dispatchViaSes: false and ignoreDebounce: true so we evaluate full logic without sending any email
  const evalResults = await runPredictiveAdvisoryEvaluation({
    facilityId: 'dps_rohini',
    thresholdPm25: 75,
    dispatchViaSes: false, // ZERO SEND
    isSandbox: true,
    ignoreDebounce: true   // Force evaluation to check threshold condition
  });

  console.log('Dry-Run Evaluation Result (dispatchViaSes=false, ignoreDebounce=true):');
  console.log(JSON.stringify(evalResults, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('STAGE 5: DYNAMODB STATE & PERSISTENCE VERIFICATION');
  console.log('='.repeat(70));
  const ddbState = await getMonitorStateFromDynamoDB();
  console.log('Live DynamoDB State:', JSON.stringify(ddbState, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('STAGE 6: AMAZON SES US-EAST-1 LIVE STATUS & QUOTA AUDIT');
  console.log('='.repeat(70));

  const sesClient = new SESClient({
    region: process.env.AWS_SES_REGION || 'us-east-1',
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
  });

  const quota = await sesClient.send(new GetSendQuotaCommand({}));
  console.log(`Max 24h Send Quota:  ${quota.Max24HourSend}`);
  console.log(`Max Send Rate:       ${quota.MaxSendRate}/sec`);
  console.log(`Sent Last 24h:       ${quota.SentLast24Hours}`);

  const idRes = await sesClient.send(new ListIdentitiesCommand({}));
  const idAttrs = await sesClient.send(new GetIdentityVerificationAttributesCommand({ Identities: idRes.Identities }));
  console.log('Verified SES Identities in us-east-1:');
  for (const ident of idRes.Identities) {
    const status = idAttrs.VerificationAttributes?.[ident]?.VerificationStatus;
    console.log(`  - ${ident}: VerificationStatus = ${status}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('END OF DRY-RUN DIAGNOSTIC PIPELINE (ZERO MAILS SENT)');
  console.log('='.repeat(70));
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
});
