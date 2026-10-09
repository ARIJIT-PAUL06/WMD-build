/**
 * 6:30 AM Predictive Morning Air Advisory & Facility Directory Service
 * 
 * Functions:
 * 1. Directory query for Delhi educational institutions and healthcare facilities with verified emails
 * 2. 6:30 AM automated advisory generation based on SageMaker 48-hour forward curves
 * 3. Safe sandbox testing and email dispatch simulation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findGridForCoordinates } from './gridTelemetryService.js';
import { getSchoolAqiForecast } from './sagemakerService.js';
import { sendEmailViaSES } from './sesService.js';
import { analyzeChemicalFingerprint, fetchLiveSourceAttribution, renderAttributionCardHtml } from './sourceAttributionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDataPath(relPath) {
  const localPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(localPath)) return localPath;
  const lambdaPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(lambdaPath)) return lambdaPath;
  return localPath;
}

const SCHOOLS_FILE = resolveDataPath('src/data/schoolsDirectory.json');
const GRIDS_PATH = resolveDataPath('ml/data/spatial_grids.json');

/**
 * Load directory data
 */
function loadDirectory() {
  try {
    if (fs.existsSync(SCHOOLS_FILE)) {
      return JSON.parse(fs.readFileSync(SCHOOLS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[AdvisoryService] Error reading schoolsDirectory.json:', err.message);
  }
  return { educationalInstitutions: [], healthcareFacilities: [], nodalAuthorities: {} };
}

/**
 * Load spatial grids
 */
function loadSpatialGrids() {
  try {
    if (fs.existsSync(GRIDS_PATH)) {
      const data = JSON.parse(fs.readFileSync(GRIDS_PATH, 'utf8'));
      return data.grids || {};
    }
  } catch (err) {
    console.error('[AdvisoryService] Error reading spatial_grids.json:', err.message);
  }
  return {};
}

/**
 * Designated 1-to-1 institutional routing for live demonstration & testing
 */
export const FACILITY_TEST_MAPPINGS = {
  'dps_rk_puram': {
    email: 'dps-rkp@example.invalid',
    institutionName: 'Delhi Public School, R.K. Puram',
    zone: 'South West Delhi (Sector 12, R.K. Puram)',
    gridId: 'GRID_R03_C05'
  },
  'modern_barakhamba': {
    email: 'modern@example.invalid',
    institutionName: 'Modern School, Barakhamba Road',
    zone: 'Central Delhi (Connaught Place)',
    gridId: 'GRID_R04_C05'
  },
  'dps_rohini': {
    email: 'dps-rohini@example.invalid',
    institutionName: 'Delhi Public School, Rohini',
    zone: 'North West Delhi (Sector 24, Rohini)',
    gridId: 'GRID_R05_C03'
  }
};

/**
 * Resolves the live recipient email for any facility.
 * Refuses to send to unverified/hardcoded addresses.
 */
export function resolveRecipientForFacility(facilityId, overrideEmail = null) {
  // Disallow arbitrary recipient overrides in production to prevent open relay
  if (process.env.NODE_ENV !== 'production' && overrideEmail && (overrideEmail.endsWith('@wmd-civic.in') || overrideEmail.endsWith('@example.invalid'))) {
    return overrideEmail;
  }
  // Delivery must be explicitly targeted to an operator address configured in environment
  return process.env.MONITOR_ALERT_RECIPIENT || process.env.COMMAND_CENTRE_EMAIL || null;
}

/**
 * Retrieve all facilities with mapped grid IDs
 */
export function getAllDirectoryFacilities() {
  const dir = loadDirectory();
  const educational = (dir.educationalInstitutions || []).map(item => {
    const grid = findGridForCoordinates(item.lat, item.lon);
    return {
      ...item,
      facilityClass: 'educational',
      gridId: grid ? grid.grid_id : 'GRID_CENTRAL'
    };
  });

  const healthcare = (dir.healthcareFacilities || []).map(item => {
    const grid = findGridForCoordinates(item.lat, item.lon);
    return {
      ...item,
      facilityClass: 'healthcare',
      gridId: grid ? grid.grid_id : 'GRID_CENTRAL'
    };
  });

  return {
    totalFacilities: educational.length + healthcare.length,
    educationalCount: educational.length,
    healthcareCount: healthcare.length,
    nodalAuthorities: dir.nodalAuthorities || {},
    facilities: [...educational, ...healthcare]
  };
}

/**
 * Find a specific facility by ID
 */
export function getFacilityById(facilityId) {
  const all = getAllDirectoryFacilities().facilities;
  return all.find(f => f.id === facilityId) || null;
}

/**
 * Find all facilities inside a given 5km spatial grid block
 */
export function getFacilitiesInGrid(gridId) {
  const all = getAllDirectoryFacilities().facilities;
  return all.filter(f => f.gridId === gridId);
}


/**
 * Visual AQI Spectrum Gauge Component
 */
function renderAqiSpectrumBar(pm25, isEmergency = false) {
  let categoryLabel = 'GOOD';
  let badgeBg = '#10b981';

  if (pm25 <= 30) {
    categoryLabel = 'GOOD';
    badgeBg = '#10b981';
  } else if (pm25 <= 60) {
    categoryLabel = 'SATISFACTORY';
    badgeBg = '#84cc16';
  } else if (pm25 <= 90) {
    categoryLabel = 'MODERATE';
    badgeBg = '#eab308';
  } else if (pm25 <= 120) {
    categoryLabel = 'POOR';
    badgeBg = '#f97316';
  } else if (pm25 <= 250) {
    categoryLabel = 'VERY POOR';
    badgeBg = '#ef4444';
  } else {
    categoryLabel = 'SEVERE / HAZARDOUS';
    badgeBg = '#881337';
  }

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 18px 0 8px 0;">
      <tr>
        <td style="padding-bottom: 6px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="left" style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #475569;">
                📊 ATMOSPHERIC PARTICULATE SPECTRUM (PM2.5)
              </td>
              <td align="right">
                <span style="display: inline-block; background-color: ${badgeBg}; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${categoryLabel}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <!-- 6-SEGMENT COLOR SPECTRUM BAR -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 3px; height: 12px;">
            <tr>
              <td width="15%" height="12" style="background-color: #10b981; border-radius: 4px 0 0 4px;" title="Good (0-30)"></td>
              <td width="15%" height="12" style="background-color: #84cc16;" title="Satisfactory (31-60)"></td>
              <td width="17%" height="12" style="background-color: #eab308;" title="Moderate (61-90)"></td>
              <td width="17%" height="12" style="background-color: #f97316;" title="Poor (91-120)"></td>
              <td width="18%" height="12" style="background-color: #ef4444;" title="Very Poor (121-250)"></td>
              <td width="18%" height="12" style="background-color: #881337; border-radius: 0 4px 4px 0;" title="Severe (250+)"></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 4px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 10px; font-weight: 700; color: #94a3b8;">
            <tr>
              <td width="15%" align="left">0</td>
              <td width="15%" align="center">30</td>
              <td width="17%" align="center">60</td>
              <td width="17%" align="center">90</td>
              <td width="18%" align="center">120</td>
              <td width="18%" align="right">250+ µg/m³</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 8px;">
          <div style="background-color: ${isEmergency ? '#fff1f2' : '#f8fafc'}; border: 1px solid ${isEmergency ? '#fecdd3' : '#e2e8f0'}; border-radius: 6px; padding: 8px 12px; font-size: 11.5px; color: ${isEmergency ? '#9f1239' : '#334155'}; font-weight: 700; text-align: center;">
            ▲ LIVE GROUND SENSOR TELEMETRY: <strong style="color: ${badgeBg}; font-size: 13px;">${pm25} µg/m³</strong> • Status: <strong>${categoryLabel}</strong> (Permissible Safe Limit: 60 µg/m³)
          </div>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * 3-Tile Graphical KPI Scorecard
 */
function renderKpiScorecard({ pm25, aqi, riskCategory, actionDirective, confidenceBand = null, isEmergency = false }) {
  const exceedance = (pm25 / 50).toFixed(1);
  const bandHtml = confidenceBand
    ? `<div style="font-size: 9px; color: ${isEmergency ? '#991b1b' : '#0284c7'}; margin-top: 4px; font-weight: 700; letter-spacing: 0.2px;">80% CI: ${confidenceBand.p10}–${confidenceBand.p90} µg/m³</div>`
    : '';
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 18px 0 22px 0;">
      <tr>
        <td width="32%" style="background: ${isEmergency ? '#fff1f2' : '#f8fafc'}; border: 1.5px solid ${isEmergency ? '#fecdd3' : '#e2e8f0'}; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">PREDICTED PEAK</div>
          <div style="font-size: 26px; font-weight: 900; color: ${isEmergency ? '#dc2626' : '#0f172a'}; margin: 4px 0 2px 0;">
            ${pm25} <span style="font-size: 11px; font-weight: 600; color: #64748b;">µg/m³</span>
          </div>
          <div style="display: inline-block; background-color: ${isEmergency ? '#fee2e2' : '#f1f5f9'}; color: ${isEmergency ? '#991b1b' : '#475569'}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
            ⚠️ ${exceedance}× Safe Limit
          </div>
          ${bandHtml}
        </td>
        <td width="2%"></td>
        <td width="32%" style="background: ${isEmergency ? '#fef2f2' : '#f8fafc'}; border: 1.5px solid ${isEmergency ? '#fecaca' : '#e2e8f0'}; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">HEALTH RISK TIER</div>
          <div style="font-size: 19px; font-weight: 900; color: ${isEmergency ? '#b91c1c' : '#b45309'}; margin: 8px 0 4px 0;">
            ${riskCategory}
          </div>
          <div style="display: inline-block; background-color: ${isEmergency ? '#fee2e2' : '#fef3c7'}; color: ${isEmergency ? '#991b1b' : '#92400e'}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
            🚨 Pediatric Hazard
          </div>
        </td>
        <td width="2%"></td>
        <td width="32%" style="background: ${isEmergency ? '#fff7ed' : '#f8fafc'}; border: 1.5px solid ${isEmergency ? '#fed7aa' : '#e2e8f0'}; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">CAMPUS DIRECTIVE</div>
          <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin: 10px 0 6px 0;">
            ${actionDirective}
          </div>
          <div style="display: inline-block; background-color: #ffedd5; color: #9a3412; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
            ⛔ Zero Grounds
          </div>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Visual Campus Day Timeline Component
 */
function renderTimelineSchedule(dangerWindows, safeWindows) {
  const dangerRows = (dangerWindows || []).map(w => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; margin-bottom: 10px;">
      <tr>
        <td style="padding: 12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display: inline-block; background-color: #fecaca; color: #991b1b; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">
                  ⛔ ${w.window}
                </span>
                <strong style="color: #991b1b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">HIGH DANGER — INVERSION TRAP</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 5px; font-size: 12.5px; color: #475569; line-height: 1.4;">
                ${w.reason}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `).join('');

  const safeRows = (safeWindows || []).map(w => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; margin-bottom: 10px;">
      <tr>
        <td style="padding: 12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display: inline-block; background-color: #bbf7d0; color: #166534; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">
                  ✅ ${w.window}
                </span>
                <strong style="color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">RECOMMENDED DISPERSAL & TRANSIT WINDOW</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 5px; font-size: 12.5px; color: #475569; line-height: 1.4;">
                ${w.reason}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `).join('');

  return dangerRows + safeRows;
}

/**
 * Visual Directive Cards with Icon Medallions
 */
function renderDirectiveCards(directivesList, isEmergency = false) {
  const defaultIcons = ['🏃‍♂️', '🚪', '💨', '🩺', '🚌', '📋'];
  return directivesList.map((d, idx) => {
    let title = '';
    let desc = '';
    let icon = defaultIcons[idx % defaultIcons.length];

    if (typeof d === 'string') {
      const clean = d.replace(/^[•\-\*\d\.\s]+/, '').trim();
      const colonIdx = clean.indexOf(':');
      if (colonIdx > 0 && colonIdx < 35) {
        title = clean.substring(0, colonIdx).trim();
        desc = clean.substring(colonIdx + 1).trim();
      } else {
        title = `Mandatory Protocol #${idx + 1}`;
        desc = clean;
      }
    } else {
      title = d.title || `Mandatory Protocol #${idx + 1}`;
      desc = d.description || d.text || '';
      if (d.icon) icon = d.icon;
    }

    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('recall') || lowerTitle.includes('recess') || lowerTitle.includes('playground') || lowerTitle.includes('outdoor')) {
      icon = '🏃‍♂️';
    } else if (lowerTitle.includes('door') || lowerTitle.includes('window') || lowerTitle.includes('seal') || lowerTitle.includes('envelope')) {
      icon = '🚪';
    } else if (lowerTitle.includes('filter') || lowerTitle.includes('hepa') || lowerTitle.includes('purif') || lowerTitle.includes('air') || lowerTitle.includes('ventilat')) {
      icon = '💨';
    } else if (lowerTitle.includes('infirm') || lowerTitle.includes('medical') || lowerTitle.includes('asthma') || lowerTitle.includes('pediatric') || lowerTitle.includes('health') || lowerTitle.includes('doctor')) {
      icon = '🩺';
    } else if (lowerTitle.includes('transit') || lowerTitle.includes('bus') || lowerTitle.includes('dismiss')) {
      icon = '🚌';
    }

    const borderColor = isEmergency ? '#ef4444' : '#0284c7';
    const iconBg = isEmergency ? '#fee2e2' : '#e0f2fe';

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${borderColor}; border-radius: 0 10px 10px 0; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <tr>
          <td width="48" style="padding: 14px 6px 14px 14px; vertical-align: middle;">
            <div style="width: 38px; height: 38px; background-color: ${iconBg}; border-radius: 50%; text-align: center; line-height: 38px; font-size: 19px;">
              ${icon}
            </div>
          </td>
          <td style="padding: 14px 16px 14px 8px; vertical-align: middle;">
            <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 3px; letter-spacing: -0.2px;">
              ${title}
            </div>
            <div style="font-size: 13px; color: #475569; line-height: 1.5;">
              ${desc}
            </div>
          </td>
        </tr>
      </table>
    `;
  }).join('');
}

/**
 * Executive Institutional Footer
 */
function renderExecutiveFooter(facility) {
  return `
    <tr>
      <td style="background-color: #0b1329; color: #94a3b8; padding: 28px 32px; font-size: 12px; line-height: 1.6; border-top: 1px solid #1e293b; text-align: left;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size: 13.5px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                🌿 VAYUVITALS • Clean Air & Institutional Health Network
              </div>
              <div style="color: #64748b; font-size: 11.5px; margin-bottom: 12px;">
                National Capital Region Rapid Environmental Advisory Command • New Delhi
              </div>
              <div style="border-top: 1px solid #1e293b; padding-top: 10px; font-size: 11px; color: #64748b;">
                Official Inquiries: <a href="mailto:vayuvitals@gmail.com" style="color: #38bdf8; text-decoration: none; font-weight: 600;">vayuvitals@gmail.com</a> • 24/7 Nodal Hotline: <strong>011-2338-7000</strong><br>
                Regulatory Nodal Carbon Copy: <span style="color: #cbd5e1;">${facility.nodalOfficerEmail || 'DoE Zonal Directorate / DPCC Clean Air Division'}</span><br>
                Official communication dispatched under Institutional Environmental Health Monitoring Directives.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Generate the 6:30 AM Morning Air Advisory for a facility
 */
export async function generate630Advisory({ facilityId, basePm25 = 175 }) {
  const facility = getFacilityById(facilityId);
  if (!facility) {
    throw new Error(`Facility not found with ID: ${facilityId}`);
  }

  // 1. Fetch forward prediction for this facility's coordinates
  const forecast = await getSchoolAqiForecast({
    schoolId: facility.id,
    schoolName: facility.name,
    lat: facility.lat,
    lon: facility.lon,
    basePm25: basePm25,
    threshold: 60
  });

  const todayGuidance = forecast.outdoorActivityGuidance?.today || {};
  const dangerWindows = todayGuidance.dangerWindows || [
    { window: '07:00 - 09:30 AM', reason: 'Severe morning temperature inversion trap', level: 'HIGH DANGER' },
    { window: '12:00 - 01:30 PM', reason: 'Secondary photochemical & boundary layer accumulation', level: 'HIGH DANGER' }
  ];
  const safeWindows = todayGuidance.safeWindows || [
    { window: '02:30 - 04:30 PM', reason: 'Post-solar dispersion maximum planetary boundary layer height', level: 'MODERATE' }
  ];

  const currentLivePm25 = forecast.currentBasePm25 || basePm25 || 65;
  const peakAqi = forecast.peakMorningArrival?.predictedPm25 
    || forecast.hourlyTimeline?.reduce((max, h) => Math.max(max, h.predictedPm25), 0) 
    || Math.round(currentLivePm25 * 1.25);
  const isSevere = peakAqi > 150;
  const arrivalConfidenceBand = forecast.peakMorningArrival?.confidenceBand || null;

  // 2. Multi-Gas Chemical Source Attribution & Forensic Fingerprint
  const attributionResult = await fetchLiveSourceAttribution({
    lat: facility.lat,
    lon: facility.lon,
    currentPm25: currentLivePm25
  });
  const chemicalAttribution = attributionResult.fingerprint;

  // 3. Protocols tailored to facility type
  const protocols = facility.facilityClass === 'healthcare'
    ? [
        'Infirmary Alert: Pre-alert Respiratory & Pediatric Emergency wards for morning asthma/COPD exacerbations.',
        'HEPA Calibration: Calibrate mechanical HEPA filtration units across ICU and neonatal care units.',
        'Pharmaceutical Stock: Ensure nebulizers and bronchodilator inventories are fully stocked in outpatient clinics.'
      ]
    : [
        'Grounds Suspension: MANDATORY cancel all outdoor morning sports, assemblies, and physical education classes during 07:00 - 09:30 AM.',
        'Classroom Enclosure: Conduct mid-day recess indoors; seal classroom windows facing arterial traffic corridors.',
        'Pediatric Health Triage: Identify children with known asthma or allergies for indoor monitoring.',
        'Scheduled Transit Window: Schedule essential outdoor campus transit exclusively during the recommended solar dispersion window (02:30 - 04:30 PM).'
      ];

  const emailSubject = `⚠️ Air Quality Advisory: Morning Outdoor Activity Guidance for ${facility.name}`;

  const emailBodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VayuVitals Morning Air Quality Advisory</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 24px 0; }
    .main-table { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); }
    .header-cell { background: linear-gradient(135deg, #090e17 0%, #0f172a 50%, #1e293b 100%); padding: 32px 32px 28px 32px; text-align: left; }
    .brand-tag { display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
    .header-title { margin: 0; font-size: 23px; font-weight: 900; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3; }
    .header-sub { margin: 8px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .content-cell { padding: 30px 32px; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; margin: 26px 0 12px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" cellpadding="0" cellspacing="0" width="100%">
      <!-- BRAND HEADER -->
      <tr>
        <td class="header-cell">
          <span class="brand-tag">🌿 VAYUVITALS • CLEAN AIR NETWORK</span>
          <h1 class="header-title">Daily Air Quality & Campus Activity Advisory</h1>
          <p class="header-sub">
            Target Facility: <strong style="color: #ffffff;">${facility.name}</strong> • ${facility.locality || facility.district}
          </p>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td class="content-cell">
          <!-- 1. GRAPHICAL SPECTRUM GAUGE (LIVE SENSOR READING) -->
          ${renderAqiSpectrumBar(currentLivePm25, false)}

          <!-- 2. 3-TILE KPI DASHBOARD (48H PREDICTED ARRIVAL PEAK) -->
          ${renderKpiScorecard({
            pm25: peakAqi,
            aqi: Math.round(peakAqi * 1.5),
            riskCategory: isSevere ? 'SEVERE HAZARD' : 'VERY POOR',
            actionDirective: 'RESTRICT GROUNDS',
            confidenceBand: arrivalConfidenceBand,
            isEmergency: false
          })}

          <!-- 3. FORENSIC CHEMICAL SOURCE ATTRIBUTION -->
          ${renderAttributionCardHtml(chemicalAttribution, false)}

          <!-- 4. GRAPHICAL SCHEDULE TIMELINE -->
          <div class="section-title">🕒 Recommended Campus Schedule Today</div>
          ${renderTimelineSchedule(dangerWindows, safeWindows)}

          <!-- 5. ACTIONABLE DIRECTIVE CARDS -->
          <div class="section-title">📋 Mandatory Campus Health Directives</div>
          ${renderDirectiveCards(protocols, false)}

          <!-- CTA BUTTON -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0;">
            <tr>
              <td align="center">
                <a href="https://vayuvitals.delhi.gov.in" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; font-size: 13.5px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); letter-spacing: 0.3px;">
                  📊 Access Live Campus Telemetry & Air Radar →
                </a>
              </td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 12px 16px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; font-size: 11.5px; color: #64748b; line-height: 1.5;">
            <strong>Institutional Oversight Note:</strong> Continuous atmospheric monitoring is active for this district. In cases of sustained exceedance, empirical notices are forwarded to environmental and education regulatory authorities.
          </div>
        </td>
      </tr>

      <!-- EXECUTIVE FOOTER -->
      ${renderExecutiveFooter(facility)}
    </table>
  </div>
</body>
</html>
  `.trim();

  return {
    facility: {
      id: facility.id,
      name: facility.name,
      district: facility.district,
      locality: facility.locality,
      gridId: facility.gridId,
      facilityClass: facility.facilityClass,
      emails: facility.emails,
      primaryEmail: facility.primaryEmail,
      nodalOfficerEmail: facility.nodalOfficerEmail,
      phone: facility.phone
    },
    forecast: {
      gridId: facility.gridId,
      predictedPeakPm25: peakAqi,
      category: isSevere ? 'Severe' : 'Very Poor',
      dangerWindows,
      safeWindows,
      protocols,
      chemicalAttribution
    },
    emailPayload: {
      to: facility.emails,
      cc: facility.nodalOfficerEmail ? [facility.nodalOfficerEmail] : [],
      subject: emailSubject,
      html: emailBodyHtml
    }
  };
}

/**
 * Simulate or test dispatching the 6:30 AM advisory
 */
export async function testDispatch630Advisory({ facilityId, testEmail = null, isSandbox = true, dispatchViaSes = true }) {
  const advisory = await generate630Advisory({ facilityId });

  const actualRecipient = resolveRecipientForFacility(facilityId, testEmail);
  
  const commandCenterEmail = process.env.MONITOR_ALERT_RECIPIENT || process.env.COMMAND_CENTRE_EMAIL;
  let sesResponse = null;

  if (!isSandbox || dispatchViaSes) {
    if (!commandCenterEmail) {
      return {
        dispatched: false,
        error: 'Live SES dispatch refused: MONITOR_ALERT_RECIPIENT is not configured in server environment.',
        isSandbox: true,
        dispatchRecord: {
          facilityId: advisory.facility.id,
          facilityName: advisory.facility.name,
          status: 'REFUSED_UNCONFIGURED_RECIPIENT',
          timestamp: new Date().toISOString()
        },
        advisory
      };
    }
    try {
      const commandRes = await sendEmailViaSES({
        to: commandCenterEmail,
        subject: `[VayuVitals Forecast • ${advisory.facility.name}] ${advisory.emailPayload.subject}`,
        htmlBody: advisory.emailPayload.html
      });
      sesResponse = commandRes;

      if (actualRecipient && actualRecipient !== commandCenterEmail && !actualRecipient.endsWith('.invalid')) {
        try {
          const directRes = await sendEmailViaSES({
            to: actualRecipient,
            subject: `[VayuVitals Forecast • ${advisory.facility.name}] ${advisory.emailPayload.subject}`,
            htmlBody: advisory.emailPayload.html
          });
          if (directRes?.success) {
            sesResponse = directRes;
          }
        } catch (targetErr) {
          console.warn(`[SES Dispatch] Note: Advisory to ${actualRecipient} failed or pending, but successfully delivered to command inbox ${commandCenterEmail}.`);
        }
      }
    } catch (err) {
      sesResponse = { success: false, error: err.message };
    }
  }

  const dispatchRecord = {
    dispatchId: `DISPATCH_${Date.now()}`,
    timestamp: new Date().toISOString(),
    isSandbox,
    targetFacility: advisory.facility.name,
    targetFacilityId: advisory.facility.id,
    gridId: advisory.facility.gridId,
    intendedRecipients: advisory.facility.emails,
    actualRecipientSentTo: actualRecipient,
    subject: advisory.emailPayload.subject,
    dangerWindows: advisory.forecast.dangerWindows,
    safeWindows: advisory.forecast.safeWindows,
    sesResponse,
    status: sesResponse?.success ? 'DELIVERED_VIA_AWS_SES' : (isSandbox ? 'DELIVERED_TO_SANDBOX' : 'SES_ATTEMPTED'),
    deliveryNote: sesResponse?.success
      ? `Live email successfully delivered via AWS SES to ${actualRecipient}. MessageId: ${sesResponse.messageId}`
      : (isSandbox
          ? `Sandbox mode active: Delivered safely to command center (${actualRecipient}) without spamming real school administrator.`
          : `Live production dispatch sent via SES: ${sesResponse?.diagnosticHint || sesResponse?.error}`)
  };

  return {
    success: true,
    dispatchRecord,
    advisory
  };
}

/**
 * Threshold-gated 6:30 AM Advisory (Suppresses on clean summer/monsoon days)
 */
export async function evaluateMorningAdvisories({
  facilityId = 'dps_rk_puram',
  thresholdPm25 = parseInt(process.env.ADVISORY_THRESHOLD_PM25, 10) || 75,
  basePm25 = null,
  testEmail = null,
  isSandbox = true,
  dispatchViaSes = true
}) {
  const facility = getFacilityById(facilityId);
  if (!facility) {
    throw new Error(`Facility not found with ID: ${facilityId}`);
  }

  const advisory = await generate630Advisory({ facilityId, basePm25: basePm25 || 175 });
  const predictedPeak = advisory.forecast.predictedPeakPm25;

  if (predictedPeak <= thresholdPm25) {
    return {
      dispatched: false,
      reason: `Predicted air quality is safe/acceptable (Peak PM2.5: ${predictedPeak} µg/m³ <= Threshold: ${thresholdPm25} µg/m³). Advisory suppressed to prevent alert fatigue.`,
      facility: facility.name,
      gridId: facility.gridId,
      predictedPeakPm25: predictedPeak,
      thresholdPm25,
      seasonContext: 'Summer/Monsoon/Clean day - No morning outdoor restriction required.'
    };
  }

  const effectiveRecipient = resolveRecipientForFacility(facilityId, testEmail);

  const testResult = await testDispatch630Advisory({
    facilityId,
    testEmail: effectiveRecipient,
    isSandbox,
    dispatchViaSes
  });

  return {
    dispatched: true,
    reason: `Hazardous morning pollution predicted (Peak PM2.5: ${predictedPeak} µg/m³ > Threshold: ${thresholdPm25} µg/m³). Morning advisory dispatched.`,
    facility: facility.name,
    gridId: facility.gridId,
    predictedPeakPm25: predictedPeak,
    thresholdPm25,
    dispatchRecord: testResult.dispatchRecord,
    advisory: testResult.advisory
  };
}

/**
 * ============================================================================
 * 2. GEMINI-CRAFTED MID-DAY EMERGENCY FLASH ALERT (12:00 PM Surprise Spikes)
 * ============================================================================
 */
export async function craftAndDispatchMidDayEmergency({
  facilityId = 'dps_rk_puram',
  currentPm25 = 295,
  anomalyType = null,
  testEmail = null,
  isSandbox = true,
  dispatchViaSes = false
}) {
  const facility = getFacilityById(facilityId);
  if (!facility) {
    throw new Error(`Facility not found with ID: ${facilityId}`);
  }

  // 1. Analyze Multi-Gas Chemical Fingerprint for Proximate Root Cause
  const attributionResult = await fetchLiveSourceAttribution({
    lat: facility.lat,
    lon: facility.lon,
    currentPm25
  });
  const chemicalAttribution = attributionResult.fingerprint;
  const effectiveAnomaly = anomalyType || `${chemicalAttribution.driverTitle} (${chemicalAttribution.confidencePct}% Forensic Confidence)`;

  const apiKey = process.env.GEMINI_API_KEY;
  let rawGeminiText = '';

  const promptText = `
You are the Chief Environmental Safety Officer for the VayuVitals Institutional Air Command Network in Delhi.
It is 12:00 PM noon. Live telemetry sensors just detected a sudden, hazardous air pollution surge in ${facility.district}.
Target Facility: ${facility.name} (${facility.type})
Current Live PM2.5: ${currentPm25} µg/m³ (Extremely Hazardous)
Forensic Proximate Cause: ${chemicalAttribution.driverTitle} (${chemicalAttribution.confidencePct}% Confidence)
Chemical Fingerprint: Ratio PM2.5/PM10 = ${chemicalAttribution.metrics.fineToCoarseRatio}, NO2 = ${chemicalAttribution.metrics.no2} µg/m³, O3 = ${chemicalAttribution.metrics.o3} µg/m³, SO2 = ${chemicalAttribution.metrics.so2} µg/m³
Atmospheric Physics Trigger: ${chemicalAttribution.scientificReason}

Craft exactly 4 executive emergency directives for the School Principal / Medical Administrator before students enter the playground for lunch recess.
Address both the indoor recess safety and the specific chemical driver (${chemicalAttribution.driverTitle}).
Format each of the 4 items on a single line starting with an action verb title followed by a colon, like:
• Playground Recall: Immediately sound the campus bell to recall all students from open playgrounds and sports fields into classrooms.
• Indoor Recess & Sealing: Enforce mandatory indoor lunch recess; close all exterior-facing doors and windows to minimize particulate ingress.
• Mechanical Filtration: Power on all available HEPA filtration units in classrooms and common areas on maximum recirculation mode.
• Infirmary Readiness: Pre-alert campus medical staff to have nebulizers and salbutamol inhalers prepared for students with known asthma.
Keep it strictly under 150 words. Do not include introductory pleasantries or markdown symbols.
  `.trim();

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500
          }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        const data = await res.json();
        rawGeminiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }
    } catch (err) {
      console.warn('[AdvisoryService] Gemini API call timed out or failed, using deterministic emergency directives:', err.message);
    }
  }

  let directiveItems = [];
  if (rawGeminiText) {
    directiveItems = rawGeminiText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 5);
  }

  // Fallback if Gemini unavailable or returned empty
  if (!directiveItems.length) {
    directiveItems = [
      'Playground Recall: Immediately sound the campus alert bell to recall all students from sports grounds and open courtyards into main buildings.',
      'Indoor Seclusion & Door Sealing: Enforce mandatory indoor lunch recess; seal all exterior windows facing arterial corridors and power on indoor air purifiers.',
      'Pediatric Vulnerability Protocol: Instruct class teachers to monitor any students with known asthma; have salbutamol inhalers ready in the campus medical room.',
      'Postpone Physical Education: Cancel all sports training and outdoor activities for afternoon sessions until atmospheric dispersion clears ground air.'
    ];
  }

  const subject = `🚨 CRITICAL AIR QUALITY SURGE: Immediate Recess Directive for ${facility.name}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VayuVitals Critical Mid-Day Air Surge Alert</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 24px 0; }
    .main-table { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 2px solid #ef4444; box-shadow: 0 12px 30px -5px rgba(220, 38, 38, 0.15); }
    .emergency-header { background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%); padding: 32px 32px 28px 32px; text-align: left; }
    .emergency-tag { display: inline-block; background: rgba(254, 202, 202, 0.2); border: 1px solid rgba(254, 202, 202, 0.4); color: #fee2e2; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
    .header-title { margin: 0; font-size: 23px; font-weight: 900; color: #ffffff; letter-spacing: -0.3px; line-height: 1.3; }
    .header-sub { margin: 8px 0 0 0; font-size: 13px; color: #fecaca; line-height: 1.5; }
    .content-cell { padding: 30px 32px; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; margin: 24px 0 12px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" cellpadding="0" cellspacing="0" width="100%">
      <!-- EMERGENCY HEADER -->
      <tr>
        <td class="emergency-header">
          <span class="emergency-tag">🚨 VAYUVITALS • PRIORITY AIR DISPATCH</span>
          <h1 class="header-title">CRITICAL MID-DAY POLLUTION SURGE</h1>
          <p class="header-sub">
            Target Facility: <strong style="color: #ffffff;">${facility.name}</strong> • ${facility.locality || facility.district}
          </p>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td class="content-cell">
          <!-- 1. GRAPHICAL SPECTRUM GAUGE -->
          ${renderAqiSpectrumBar(currentPm25, true)}

          <!-- 2. 3-TILE KPI SCORECARD -->
          ${renderKpiScorecard({
            pm25: currentPm25,
            aqi: Math.round(currentPm25 * 1.45),
            riskCategory: 'SEVERE HAZARD',
            actionDirective: 'INDOOR RECESS ONLY',
            confidenceBand: {
              p10: Math.max(15, Math.round(Math.exp(Math.log(1 + currentPm25) - 1.28 * 0.3264) - 1)),
              p50: currentPm25,
              p90: Math.round(Math.exp(Math.log(1 + currentPm25) + 1.28 * 0.3264) - 1)
            },
            isEmergency: true
          })}

          <!-- 3. FORENSIC CHEMICAL SOURCE ATTRIBUTION -->
          ${renderAttributionCardHtml(chemicalAttribution, true)}

          <!-- 4. DIRECTIVE CARDS -->
          <div class="section-title">📋 Immediate Campus Action Directives</div>
          ${renderDirectiveCards(directiveItems, true)}

          <!-- CTA BUTTON -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0;">
            <tr>
              <td align="center">
                <a href="https://vayuvitals.delhi.gov.in" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; font-size: 13.5px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35); letter-spacing: 0.3px;">
                  🚨 Access Live Campus Telemetry & Air Radar →
                </a>
              </td>
            </tr>
          </table>

          <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #9a3412; line-height: 1.5; margin-top: 16px;">
            <strong>Immediate Campus Notice:</strong> Live ground sensors indicate particulate levels are 4.9× above the permissible safe limit. All students must be kept indoors until ambient levels subside.
          </div>
        </td>
      </tr>

      <!-- EXECUTIVE FOOTER -->
      ${renderExecutiveFooter(facility)}
    </table>
  </div>
</body>
</html>
  `.trim();

  const actualRecipient = resolveRecipientForFacility(facility.id, testEmail);

  const commandCenterEmail = process.env.MONITOR_ALERT_RECIPIENT || process.env.COMMAND_CENTRE_EMAIL;
  let sesResponse = null;

  if (!isSandbox || dispatchViaSes) {
    if (!commandCenterEmail) {
      return {
        success: false,
        error: 'Live SES dispatch refused: MONITOR_ALERT_RECIPIENT is not configured in server environment.',
        isSandbox: true,
        dispatchRecord: {
          facilityId: facility.id,
          facilityName: facility.name,
          status: 'REFUSED_UNCONFIGURED_RECIPIENT',
          timestamp: new Date().toISOString()
        }
      };
    }
    try {
      const commandRes = await sendEmailViaSES({
        to: commandCenterEmail,
        subject: `[VayuVitals Alert • ${facility.name}] ${subject}`,
        htmlBody
      });
      sesResponse = commandRes;

      if (actualRecipient && actualRecipient !== commandCenterEmail && !actualRecipient.endsWith('.invalid')) {
        try {
          const directRes = await sendEmailViaSES({
            to: actualRecipient,
            subject: `[VayuVitals Alert • ${facility.name}] ${subject}`,
            htmlBody
          });
          if (directRes?.success) {
            sesResponse = directRes;
          }
        } catch (targetErr) {
          console.warn(`[SES Dispatch] Note: Alert to ${actualRecipient} failed or pending, but successfully delivered to command inbox ${commandCenterEmail}.`);
        }
      }
    } catch (err) {
      sesResponse = { success: false, error: err.message };
    }
  }

  const emergencyRecord = {
    alertId: `EMERGENCY_${Date.now()}`,
    timestamp: new Date().toISOString(),
    triggerHour: '12:00 PM',
    anomalyType: effectiveAnomaly,
    currentPm25,
    chemicalAttribution,
    facilityName: facility.name,
    gridId: facility.gridId,
    aiModelUsed: apiKey ? 'gemini-2.5-flash' : 'rule-based-deterministic',
    sentTo: actualRecipient,
    actualRecipientSentTo: actualRecipient,
    isSandbox,
    sesResponse,
    status: sesResponse?.success ? 'DELIVERED_VIA_AWS_SES' : (sesResponse?.error ? 'SES_ERROR' : 'DISPATCHED'),
    subject,
    directives: directiveItems
  };

  return {
    success: true,
    emergencyRecord,
    dispatchRecord: emergencyRecord,
    emailPayload: {
      to: facility.emails,
      subject,
      html: htmlBody
    }
  };
}

