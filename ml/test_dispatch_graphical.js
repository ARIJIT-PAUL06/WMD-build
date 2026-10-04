import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate630Advisory, craftAndDispatchMidDayEmergency } from '../server/advisoryDispatchService.js';
import { sendEmailViaSES } from '../server/sesService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

async function main() {
  console.log('1. Generating Graphical 6:30 AM Morning Advisory...');
  const morningAdvisory = await generate630Advisory({ facilityId: 'dps_rk_puram', basePm25: 185 });
  const morningHtmlPath = path.join(publicDir, 'preview_morning_email.html');
  fs.writeFileSync(morningHtmlPath, morningAdvisory.emailPayload.html, 'utf8');
  console.log('Saved Morning Advisory Preview to:', morningHtmlPath);

  console.log('\n2. Generating Graphical 12:00 PM Mid-Day Emergency Alert...');
  const emergencyAlert = await craftAndDispatchMidDayEmergency({
    facilityId: 'dps_rk_puram',
    currentPm25: 295,
    anomalyType: 'Sudden Mid-Day Dust & Planetary Boundary Layer Stagnation',
    testEmail: 'vayuvitals@gmail.com',
    isSandbox: true,
    dispatchViaSes: true
  });

  const emergencyHtmlPath = path.join(publicDir, 'preview_emergency_email.html');
  fs.writeFileSync(emergencyHtmlPath, emergencyAlert.emailPayload.html, 'utf8');
  console.log('Saved Emergency Alert Preview to:', emergencyHtmlPath);

  console.log('\n3. SES Dispatch Result:');
  console.log(JSON.stringify(emergencyAlert.emergencyRecord.sesResponse, null, 2));

  if (emergencyAlert.emergencyRecord.sesResponse?.success) {
    console.log('\n[SUCCESS] Live Graphical Emergency Email Delivered to vayuvitals@gmail.com!');
    console.log('Message ID:', emergencyAlert.emergencyRecord.sesResponse.messageId);
  } else {
    console.log('\n[!] SES Dispatch response:', emergencyAlert.emergencyRecord.sesResponse);
  }
}

main().catch(err => {
  console.error('Error running test script:', err);
});
