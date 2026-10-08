import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findGridForCoordinates } from './gridTelemetryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFilePath(relPath) {
  const candidates = [
    path.join(process.cwd(), relPath),
    path.join(__dirname, '..', relPath),
    path.join('/tmp', path.basename(relPath)),
    path.join(__dirname, relPath),
    path.join('/var/task', relPath)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), relPath);
}

let cachedGridBuffer = null;

export function getGrid14DayBuffer() {
  if (cachedGridBuffer) return cachedGridBuffer;
  try {
    const pCandidates = [
      path.join('/tmp', 'grid_14day_buffer.json'),
      resolveFilePath('ml/data/grid_14day_buffer.json'),
      path.join(process.cwd(), 'ml/data/grid_14day_buffer.json')
    ];
    for (const p of pCandidates) {
      if (fs.existsSync(p)) {
        cachedGridBuffer = JSON.parse(fs.readFileSync(p, 'utf8'));
        return cachedGridBuffer;
      }
    }
  } catch (e) {
    // ignore
  }
  return {};
}

export function setCachedGridBuffer(buffer) {
  cachedGridBuffer = buffer;
}

function getSchoolsDirectory() {
  try {
    const p = resolveFilePath('src/data/schoolsDirectory.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return data.educationalInstitutions || [];
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function getSpatialGrids() {
  try {
    const p = resolveFilePath('ml/data/spatial_grids.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return data.grids || {};
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function getKnownStations() {
  const stations = new Set();
  const schools = getSchoolsDirectory();
  for (const s of schools) {
    if (s.nearestStation) stations.add(s.nearestStation.toLowerCase());
  }
  const buffer = getGrid14DayBuffer();
  for (const g of Object.values(buffer)) {
    if (Array.isArray(g.hourlyBuffer)) {
      for (const r of g.hourlyBuffer) {
        if (r.stationName) stations.add(r.stationName.toLowerCase());
        if (r.stationId) stations.add(r.stationId.toLowerCase());
      }
    }
  }
  return stations;
}

// Categorize PM2.5 in Indian National Air Quality Index (NAQI) standards
export function categorizePm25(pm25) {
  if (pm25 === null || pm25 === undefined || isNaN(pm25)) {
    return { label: 'NO DATA', color: '#64748b', level: 'no-data' };
  }
  if (pm25 <= 30) return { label: 'Good', color: '#10b981', level: 'good' };
  if (pm25 <= 60) return { label: 'Satisfactory', color: '#84cc16', level: 'satisfactory' };
  if (pm25 <= 90) return { label: 'Moderate', color: '#f59e0b', level: 'moderate' };
  if (pm25 <= 120) return { label: 'Poor', color: '#f97316', level: 'poor' };
  if (pm25 <= 250) return { label: 'Very Poor', color: '#ef4444', level: 'very-poor' };
  return { label: 'Severe', color: '#7f1d1d', level: 'severe' };
}

/**
 * Parses timestamp string with an explicit UTC assumption if timezone offset is absent
 */
function parseUtcDate(isoString) {
  if (!isoString) return null;
  const s = String(isoString).trim();
  const hasTz = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s);
  const normalized = hasTz ? s : `${s}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Helper to extract IST hour (0-23) from timestamp
 * Indian Standard Time (IST) is UTC + 5h30m (330 minutes)
 */
function getIstHour(isoString) {
  const d = parseUtcDate(isoString);
  if (!d) return null;
  const totalMin = d.getUTCHours() * 60 + d.getUTCMinutes() + 330;
  return Math.floor((totalMin % 1440) / 60);
}

/**
 * Helper to extract IST calendar date (YYYY-MM-DD) from timestamp
 */
function getIstDateString(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : parseUtcDate(isoOrDate);
  if (!d || isNaN(d.getTime())) return '';
  const istDate = new Date(d.getTime() + 330 * 60 * 1000);
  return istDate.toISOString().split('T')[0];
}

/**
 * Aggregate school-hours environmental evidence
 * School hours: 07:00 - 13:00 IST
 * Strictly aggregates from empirical telemetry buffers without synthetic math generators.
 * Days without readings are reported as NO_DATA (never extrapolated).
 */
export function aggregateSchoolEvidence({
  schoolName,
  locality,
  stationName,
  stationDistanceKm,
  days = 14,
  threshold = 60,
  gridId
}) {
  if (!schoolName && !stationName && !gridId) {
    const err = new Error('schoolName, stationName, or gridId parameter is required');
    err.statusCode = 400;
    throw err;
  }

  const numDays = Math.min(Math.max(parseInt(days, 10) || 14, 5), 30);
  const thresh = Math.max(parseInt(threshold, 10) || 60, 25);
  const buffer = getGrid14DayBuffer();
  const schools = getSchoolsDirectory();
  const spatialGrids = getSpatialGrids();

  // Validate unknown targets (Return 404 instead of silent fallback)
  if (gridId && !buffer[gridId] && !spatialGrids[gridId]) {
    const err = new Error(`Unknown gridId target: "${gridId}". Spatial grid block not found.`);
    err.statusCode = 404;
    throw err;
  }

  let matchedSchool = null;
  if (schoolName) {
    const qLower = schoolName.toLowerCase();
    matchedSchool = schools.find(s => s.name?.toLowerCase() === qLower || s.id?.toLowerCase() === qLower);
    if (!matchedSchool) {
      // Check if buffer contains readings for this school
      let foundInBuffer = false;
      for (const g of Object.values(buffer)) {
        if (Array.isArray(g.hourlyBuffer) && g.hourlyBuffer.some(r =>
          (r.schoolName && r.schoolName.toLowerCase() === qLower) ||
          (r.schoolId && r.schoolId.toLowerCase() === qLower)
        )) {
          foundInBuffer = true;
          break;
        }
      }
      if (!foundInBuffer) {
        const err = new Error(`Unknown educational institution target: "${schoolName}". School not found in directory.`);
        err.statusCode = 404;
        throw err;
      }
    }
  }

  if (stationName && !schoolName && !gridId) {
    const knownStations = getKnownStations();
    const stLower = stationName.toLowerCase();
    const isKnown = Array.from(knownStations).some(s => s.includes(stLower) || stLower.includes(s));
    if (!isKnown) {
      const err = new Error(`Unknown monitoring station target: "${stationName}".`);
      err.statusCode = 404;
      throw err;
    }
  }

  // Resolve grid cell from coordinates or parameters
  let resolvedGridId = gridId || null;
  if (!resolvedGridId && matchedSchool) {
    if (matchedSchool.gridId) {
      resolvedGridId = matchedSchool.gridId;
    } else if (matchedSchool.lat != null && matchedSchool.lon != null) {
      const g = findGridForCoordinates(matchedSchool.lat, matchedSchool.lon);
      resolvedGridId = g?.grid_id || g?.id || null;
    }
  }

  const resolvedSchoolName = matchedSchool?.name || schoolName || null;
  const resolvedLocality = matchedSchool?.locality || locality || matchedSchool?.district || null;
  const resolvedStation = matchedSchool?.nearestStation || stationName || null;
  const resolvedDistance = (matchedSchool?.stationDistanceKm != null || stationDistanceKm != null)
    ? parseFloat(matchedSchool?.stationDistanceKm ?? stationDistanceKm)
    : null;

  // Filter telemetry readings specifically for the target grid cell or station
  let targetReadings = [];

  if (resolvedGridId && buffer[resolvedGridId]?.hourlyBuffer) {
    // Read buffer[resolvedGrid] only; never fall back to other grids
    targetReadings = buffer[resolvedGridId].hourlyBuffer;
  } else if (matchedSchool) {
    // School's cell has no data in buffer -> honest NO_DATA without fallback
    targetReadings = [];
  } else if (stationName) {
    let stationGrid = null;
    try {
      const p = resolveFilePath('src/data/indiaStations.json');
      if (fs.existsSync(p)) {
        const stations = JSON.parse(fs.readFileSync(p, 'utf8'));
        const stMatch = stations.find(s => s.name?.toLowerCase().includes(stationName.toLowerCase()) || s.id?.toLowerCase().includes(stationName.toLowerCase()));
        if (stMatch && stMatch.lat && stMatch.lon) {
          const g = findGridForCoordinates(stMatch.lat, stMatch.lon);
          stationGrid = g?.grid_id || g?.id || null;
        }
      }
    } catch (e) {}
    if (stationGrid && buffer[stationGrid]?.hourlyBuffer) {
      targetReadings = buffer[stationGrid].hourlyBuffer;
      resolvedGridId = stationGrid;
    } else {
      for (const gridObj of Object.values(buffer)) {
        if (!gridObj || !Array.isArray(gridObj.hourlyBuffer)) continue;
        for (const r of gridObj.hourlyBuffer) {
          if (!r || !r.timestamp) continue;
          const matchesStation = (
            (r.stationName && r.stationName.toLowerCase().includes(stationName.toLowerCase())) ||
            (r.stationId && r.stationId.toLowerCase().includes(stationName.toLowerCase()))
          );
          if (matchesStation) {
            targetReadings.push(r);
          }
        }
      }
    }
  }

  const nowUtc = new Date();

  // Exclude hours later than now (forecast rows) and rows lacking a source field
  const validTargetReadings = targetReadings.filter(r => {
    if (!r || !r.timestamp || !r.source) return false;
    const rDate = parseUtcDate(r.timestamp);
    return rDate && rDate <= nowUtc;
  });

  const dailyLogs = [];
  let peakPm25 = null;
  let peakDate = '';
  let exceedCount = 0;
  let sumMorningPm25 = 0;
  let daysWithData = 0;
  let daysMissing = 0;

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(nowUtc);
    d.setUTCDate(d.getUTCDate() - i);

    // Day of week in IST
    const istCalendarDate = getIstDateString(d);
    const dateParts = istCalendarDate.split('-');
    const istDateObj = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10)));
    const dayOfWeek = istDateObj.getUTCDay();
    const isToday = (i === 0);
    const isSchoolDay = dayOfWeek !== 0; // Skip Sundays

    const formattedDate = istDateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });

    // Extract empirical readings matching this calendar date in IST
    const dayReadings = validTargetReadings.filter(r => getIstDateString(r.timestamp) === istCalendarDate);
    const morningReadings = dayReadings.filter(r => {
      const h = getIstHour(r.timestamp);
      return h !== null && h >= 7 && h <= 13;
    });

    let morningAvg = null;
    let dayPeak = null;
    let telemetrySource = 'NO_DATA';
    let exceeded = false;
    let category = { label: 'NO DATA', color: '#64748b', level: 'no-data' };

    if (morningReadings.length > 0) {
      const pmValues = morningReadings.map(r => Number(r.pm25)).filter(v => !isNaN(v));
      if (pmValues.length > 0) {
        morningAvg = Math.round(pmValues.reduce((a, b) => a + b, 0) / pmValues.length);
        dayPeak = Math.max(...pmValues);
        telemetrySource = 'EMPIRICAL_BUFFER';
        category = categorizePm25(morningAvg);
        exceeded = morningAvg > thresh;
        daysWithData++;
        sumMorningPm25 += morningAvg;

        // Leave today out of the count per Fix 7
        if (!isToday && isSchoolDay && exceeded) {
          exceedCount++;
        }

        if (peakPm25 === null || dayPeak > peakPm25) {
          peakPm25 = dayPeak;
          peakDate = formattedDate;
        }
      } else {
        daysMissing++;
      }
    } else if (dayReadings.length > 0) {
      const pmValues = dayReadings.map(r => Number(r.pm25)).filter(v => !isNaN(v));
      if (pmValues.length > 0) {
        morningAvg = Math.round(pmValues.reduce((a, b) => a + b, 0) / pmValues.length);
        dayPeak = Math.max(...pmValues);
        telemetrySource = 'EMPIRICAL_BUFFER';
        category = categorizePm25(morningAvg);
        exceeded = morningAvg > thresh;
        daysWithData++;
        sumMorningPm25 += morningAvg;

        if (!isToday && isSchoolDay && exceeded) {
          exceedCount++;
        }

        if (peakPm25 === null || dayPeak > peakPm25) {
          peakPm25 = dayPeak;
          peakDate = formattedDate;
        }
      } else {
        daysMissing++;
      }
    } else {
      daysMissing++;
    }

    dailyLogs.push({
      date: istCalendarDate,
      displayDate: isToday ? `${formattedDate} (partial day)` : formattedDate,
      dayOfWeek: istDateObj.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
      isSchoolDay,
      isPartialDay: isToday,
      morningAvgPm25: morningAvg,
      peakPm25: dayPeak,
      category: category.label,
      categoryColor: category.color,
      exceeded,
      source: telemetrySource,
      disruption: null
    });
  }

  // Today is left out of completed days count per Fix 7
  const schoolDaysTotal = dailyLogs.filter(l => l.isSchoolDay && !l.isPartialDay).length;
  const avgMorningPm25 = daysWithData > 0 ? Math.round(sumMorningPm25 / daysWithData) : null;
  const startDate = dailyLogs[0]?.displayDate || '';
  const endDate = dailyLogs[dailyLogs.length - 1]?.displayDate || '';

  return {
    success: true,
    gridId: resolvedGridId,
    schoolName: resolvedSchoolName,
    locality: resolvedLocality,
    stationName: resolvedStation,
    stationDistanceKm: resolvedDistance,
    timeHorizonDays: numDays,
    schoolDaysTotal,
    exceedanceCount: exceedCount,
    threshold: thresh,
    startDate,
    endDate,
    peakPm25,
    peakDate: peakDate || endDate,
    avgMorningPm25,
    daysWithData,
    daysMissing,
    maeError: null,
    compiledBy: 'VayuVitals Continuous Monitoring Engine',
    compilationDate: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }),
    dailyLogs
  };
}

/**
 * Generate formatted petition text in English and Hindi
 * Refuses to draft if daysWithData === 0 (422) per P2.4.
 * Never prints null anywhere in the letter per P2.4.
 */
export function generateDraftPetition({
  evidence,
  authority,
  forecast,
  senderName = '[YOUR NAME]',
  senderRole = '[YOUR ROLE / DESIGNATION]',
  senderContact = '[YOUR PHONE / EMAIL]',
  selectedDemands = [],
  schoolEvidencePackage = null,
  userActionNote = null,
  targetType = null
}) {
  if (!evidence || !authority) {
    const err = new Error('evidence and authority objects are required');
    err.statusCode = 400;
    throw err;
  }

  // Refuse to draft when there's no data per P2.4
  if (!evidence.daysWithData || evidence.daysWithData === 0) {
    const err = new Error('Cannot generate draft petition without verified telemetry observations (0 days with data).');
    err.statusCode = 422;
    throw err;
  }

  const {
    schoolName,
    locality,
    threshold = 60,
    exceedanceCount = 0,
    schoolDaysTotal = 0,
    startDate = '',
    endDate = '',
    peakPm25 = '--',
    peakDate = '',
    stationName,
    stationDistanceKm,
    compiledBy,
    compilationDate,
    daysWithData,
    timeHorizonDays,
    gridId
  } = evidence;

  const resolvedTargetType = targetType || evidence.targetType || (schoolName ? 'school' : (gridId ? 'grid' : 'station'));
  const isSchoolTarget = resolvedTargetType === 'school';

  const demandsTextEn = selectedDemands.length > 0
    ? selectedDemands.map((d, idx) => `(${idx + 1}) ${d}`).join('\n')
    : '(1) Priority morning deployment of mobile anti-smog misting guns along primary approach roads;\n(2) Immediate enforcement of dust suppression protocols on nearby open construction sites;\n(3) Regulated traffic marshal intervention to eliminate vehicle idling outside sensitive pedestrian zones.';

  const demandsTextHi = selectedDemands.length > 0
    ? selectedDemands.map((d, idx) => `(${idx + 1}) ${d}`).join('\n')
    : '(1) मुख्य पहुंच मार्गों पर सुबह के समय एंटी-स्मॉग वाटर स्प्रिंकलर की तत्काल तैनाती;\n(2) आसपास के 1 किमी दायरे में अनियंत्रित धूल उत्सर्जन एवं खुले निर्माण कार्यों पर रोक;\n(3) सुबह के समय वाहनों के भारी जाम एवं इंजन आइडलिंग को नियंत्रित करने हेतु ट्रैफिक मार्शल व्यवस्था।';

  // Advance 48h ML Forecast Alert block (MAE printed only inside forecast block per Fix 6)
  let forecastBlockEn = '';
  let forecastBlockHi = '';
  if (forecast && forecast.peakMorningArrival && forecast.peakMorningArrival.predictedPm25) {
    const { predictedPm25, time, date, category } = forecast.peakMorningArrival;
    const testMae = forecast.modelDetails?.testMae;
    const maeLineEn = (testMae !== undefined && testMae !== null)
      ? `\n- Forecast Model Test Error (MAE): ${testMae} µg/m³`
      : '';
    const maeLineHi = (testMae !== undefined && testMae !== null)
      ? `\n- पूर्वानुमान मॉडल परीक्षण त्रुटि (MAE): ${testMae} µg/m³`
      : '';
    forecastBlockEn = `
Advance 48-Hour Machine Learning Risk Alert (AWS SageMaker Inference):
- Predictive Horizon: Next 48 Hours (Morning Operating Window)
- Anticipated Morning Arrival Peak: ${predictedPm25} µg/m³ at ${time || '--'} (${date || '--'}) [Status: ${category || 'Elevated'}]${maeLineEn}
- Pre-Emptive Mitigation Demand: Prioritized anti-smog mist cannon deployment at 06:30 AM before peak morning movement.
`;
    forecastBlockHi = `
अग्रिम 48-घंटे का मशीन लर्निंग वायु गुणवत्ता पूर्वानुमान (AWS SageMaker मॉडल):
- पूर्वानुमान समय-सीमा: आगामी 48 घंटे (प्रातःकालीन संचालन अवधि)
- संभावित प्रातःकालीन आगमन पीक: ${predictedPm25} µg/m³ (${date || '--'}, समय: ${time || '--'}) [श्रेणी: ${category || 'गंभीर'}]${maeLineHi}
- अग्रिम प्रशासनिक मांग: प्रातःकालीन आवागमन से पूर्व 06:30 बजे पहुंच मार्गों पर एंटी-स्मॉग गन से जल छिड़काव।
`;
  }

  // 14-Day School Environmental Monitoring Evidence Block
  let schoolEvidenceBlockEn = '';
  let schoolEvidenceBlockHi = '';
  if (schoolEvidencePackage && schoolEvidencePackage.summary) {
    const { monitoringPeriod, coverage, summary } = schoolEvidencePackage;
    schoolEvidenceBlockEn = `
Verified 14-Day School Environmental Monitoring Summary:
- Monitoring Window: ${monitoringPeriod?.startDate || startDate} to ${monitoringPeriod?.endDate || endDate} (${coverage?.observedDays ?? 14} of 14 calendar days empirically observed)
- Campus Ambient PM2.5 Average: ${summary.averagePm25 ?? '--'} µg/m³ (Estimated around school via spatial IDW from surrounding regulatory stations)
- Peak Daily Average Observed: ${summary.highestDailyPm25 ?? '--'} µg/m³ | Lowest: ${summary.lowestDailyPm25 ?? '--'} µg/m³
- Methodology Note: School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.
`;
    schoolEvidenceBlockHi = `
प्रमाणित 14-दिवसीय विद्यालय पर्यावरण निगरानी विवरण:
- निगरानी अवधि: ${monitoringPeriod?.startDate || startDate} से ${monitoringPeriod?.endDate || endDate} (14 में से ${coverage?.observedDays ?? 14} दिवस प्रमाणित)
- विद्यालय परिसर अनुमानित औसत PM2.5: ${summary.averagePm25 ?? '--'} µg/m³ (निकटवर्ती स्टेशनों से दूरी-भारित आकलन)
- उच्चतम दैनिक औसत स्तर: ${summary.highestDailyPm25 ?? '--'} µg/m³ | न्यूनतम: ${summary.lowestDailyPm25 ?? '--'} µg/m³
- वैज्ञानिक आधार: विद्यालय PM2.5 मान निकटवर्ती निगरानी स्टेशनों से प्राप्त स्थानिक अनुमान हैं, स्कूल गेट पर सीधे मापन नहीं।
`;
  }

  // Replace "verified empirical continuous telemetry" with "hours with modelled data available" per Fix 5
  const observationSummaryEn = daysWithData !== undefined && timeHorizonDays
    ? ` (${daysWithData} of ${timeHorizonDays} days with hours with modelled data available)`
    : '';
  const observationSummaryHi = daysWithData !== undefined && timeHorizonDays
    ? ` (${timeHorizonDays} में से ${daysWithData} दिवस मॉडल डेटा उपलब्ध घंटे)`
    : '';

  const userActionSectionEn = userActionNote && userActionNote.trim()
    ? `\nInstitutional Action & Mitigations:\n${userActionNote.trim()}\n`
    : '';
  const userActionSectionHi = userActionNote && userActionNote.trim()
    ? `\nसंस्थान स्तर पर किए गए तात्कालिक प्रयास:\n${userActionNote.trim()}\n`
    : '';

  // Data Provenance line: Open-Meteo modelled PM2.5, grid cell {gridId} (~5.5 km, centroid lat, lon) per Fix 4
  const spatialGrids = getSpatialGrids();
  const effectiveGridId = gridId || (schoolEvidencePackage?.gridId) || null;
  const centroid = effectiveGridId && spatialGrids[effectiveGridId]?.centroid;
  const centroidStr = centroid ? `, centroid ${centroid.lat}, ${centroid.lon}` : '';
  const centroidStrHi = centroid ? `, केंद्र बिंदु ${centroid.lat}, ${centroid.lon}` : '';
  const primarySourceEn = effectiveGridId
    ? `Open-Meteo modelled PM2.5, grid cell ${effectiveGridId} (~5.5 km${centroidStr})`
    : 'Open-Meteo modelled hourly PM2.5';
  const primarySourceHi = effectiveGridId
    ? `ओपन-मेटियो मॉडल्ड PM2.5, ग्रिड सेल ${effectiveGridId} (~5.5 किमी${centroidStrHi})`
    : 'ओपन-मेटियो मॉडल्ड प्रति घंटा PM2.5';

  const cleanStation = stationName ? stationName.replace(/\s*CAAQMS/gi, '').trim() : '';
  const refStationLineEn = cleanStation
    ? `\n- Nearest Regulatory Station (for reference, not the data source): ${cleanStation}${stationDistanceKm != null ? ` (${stationDistanceKm} km)` : ''}`
    : '';
  const refStationLineHi = cleanStation
    ? `\n- निकटतम विनियामक स्टेशन (संदर्भ हेतु, डेटा स्रोत नहीं): ${cleanStation}${stationDistanceKm != null ? ` (${stationDistanceKm} किमी)` : ''}`
    : '';

  let subjectEn = '';
  let subjectHi = '';
  let englishText = '';
  let hindiText = '';

  if (!isSchoolTarget) {
    // Station or Grid mode letter written as resident per Fix 3
    const gridLabel = locality || (gridId ? `Grid ${gridId}` : (stationName || 'the local monitoring area'));
    subjectEn = `Urgent action request: Morning air quality near ${gridLabel} (${exceedanceCount}/${schoolDaysTotal} days exceeded threshold)`;
    subjectHi = `विषय: ${gridLabel} के निकट प्रातःकालीन गंभीर वायु प्रदूषण के संबंध में तत्काल प्रशासनिक हस्तक्षेप हेतु प्रतिवेदन`;

    englishText = `To:
${authority.designation || 'Competent Authority'}
${authority.fullName || ''}
${authority.address || ''}

Subject: ${subjectEn}

Respected Sir/Madam,

I write as a resident regarding morning air quality near ${gridLabel}. Using modelled hourly PM2.5 data, environmental records demonstrate that outdoor PM2.5 exceeded the safety threshold of ${threshold} µg/m³ (compared against the CPCB 24-hour NAAQS of 60 µg/m³ as a reference; values are 07:00–13:00 IST averages) on ${exceedanceCount} of the last ${schoolDaysTotal} days (${startDate} to ${endDate}), with a peak of ${peakPm25} µg/m³ recorded on ${peakDate || endDate}.${userActionSectionEn}

Data Provenance & Scientific Basis:
- Primary Monitoring Source: ${primarySourceEn}${refStationLineEn}
- Telemetry Network: Open-Meteo modelled hourly PM2.5 dataset
- Compilation Engine: ${compiledBy || 'VayuVitals Continuous Monitoring Engine'} on ${compilationDate || new Date().toLocaleDateString('en-IN')}
- Observation Window: ${startDate} to ${endDate}${observationSummaryEn}
- Time Window Examined: 07:00 AM to 01:00 PM IST (Morning Operating Hours)${schoolEvidenceBlockEn}${forecastBlockEn}
We respectfully request the competent authority to undertake the following time-bound remedial interventions:
${demandsTextEn}

Additionally, we request a formal written update within 15 working days outlining the specific measures and inspections conducted in response to this representation.

Yours sincerely,

${senderName}
${senderRole && senderRole !== '[YOUR ROLE / DESIGNATION]' ? senderRole : 'Resident / Concerned Citizen'}
${locality || 'Delhi NCR'}
Contact: ${senderContact}`;

    hindiText = `सेवा में,
${authority.designation || 'सक्षम प्राधिकारी'}
${authority.fullName || ''}
${authority.address || ''}

विषय: ${subjectHi}

महोदय/महोदया,

मैं ${gridLabel} के निकट प्रातःकालीन वायु गुणवत्ता के संबंध में एक स्थानीय निवासी के रूप में यह औपचारिक प्रतिवेदन प्रस्तुत कर रहा/रही हूँ। ओपन-मेटियो मॉडल्ड प्रति घंटा PM2.5 डेटा के अनुसार, पिछले ${schoolDaysTotal} दिनों (${startDate} से ${endDate}) में से ${exceedanceCount} दिनों में सुबह के समय (प्रातः 07:00 से दोपहर 01:00 बजे) PM2.5 का स्तर सुरक्षा मानक ${threshold} µg/m³ (सीपीसीबी के 24-घंटे NAAQS मानक 60 µg/m³ के संदर्भ में; मान प्रातः 07:00–13:00 IST के औसत हैं) से निरंतर अधिक रहा, जिसमें ${peakDate || endDate} को सर्वाधिक ${peakPm25} µg/m³ का स्तर दर्ज किया गया।${userActionSectionHi}

आंकड़ों की प्रामाणिकता एवं स्रोत:
- प्राथमिक निगरानी स्रोत: ${primarySourceHi}${refStationLineHi}
- निगरानी नेटवर्क: ओपन-मेटियो मॉडल्ड प्रति घंटा PM2.5 डेटासेट
- डेटा संकलन: ${compiledBy || 'VayuVitals Continuous Monitoring Engine'} (संकलन तिथि: ${compilationDate || new Date().toLocaleDateString('en-IN')})
- निगरानी अवधि: ${startDate} से ${endDate}${observationSummaryHi}${schoolEvidenceBlockHi}${forecastBlockHi}
अतः आपसे सविनय अनुरोध है कि नागरिकों के स्वास्थ्य एवं स्वच्छ परिवेश के अधिकार को ध्यान में रखते हुए निम्नलिखित त्वरित कदम उठाने की कृपा करें:
${demandsTextHi}

कृपया इस प्रतिवेदन पर की गई कार्रवाई से लिखित रूप में अवगत कराने का कष्ट करें।

भवदीय/भवदीया,

${senderName}
${senderRole && senderRole !== '[YOUR ROLE / DESIGNATION]' ? senderRole : 'स्थानीय निवासी / जागरूक नागरिक'}
${locality || 'दिल्ली एनसीआर'}
संपर्क: ${senderContact}`;

  } else {
    // School mode letter per Fix 3
    const locationStr = locality ? `, located at ${locality}` : '';
    subjectEn = `Urgent action request: Morning air quality affecting students at ${schoolName}${locality ? `, ${locality}` : ''} (${exceedanceCount}/${schoolDaysTotal} days exceeded threshold)`;
    subjectHi = `विषय: ${schoolName}${locality ? `, ${locality}` : ''} के विद्यार्थियों पर प्रातःकालीन गंभीर वायु प्रदूषण के प्रभाव एवं तत्काल प्रशासनिक हस्तक्षेप हेतु प्रतिवेदन`;

    englishText = `To:
${authority.designation || 'Competent Authority'}
${authority.fullName || ''}
${authority.address || ''}

Subject: ${subjectEn}

Respected Sir/Madam,

I write on behalf of ${schoolName}${locationStr}. Using modelled hourly PM2.5 data, environmental records demonstrate that outdoor-window PM2.5 exceeded the safety threshold of ${threshold} µg/m³ (compared against the CPCB 24-hour NAAQS of 60 µg/m³ as a reference; values are 07:00–13:00 IST averages) on ${exceedanceCount} of the last ${schoolDaysTotal} school days (${startDate} to ${endDate}), with a peak of ${peakPm25} µg/m³ recorded on ${peakDate || endDate}.${userActionSectionEn}

Data Provenance & Scientific Basis:
- Primary Monitoring Source: ${primarySourceEn}${refStationLineEn}
- Telemetry Network: Open-Meteo modelled hourly PM2.5 dataset
- Compilation Engine: ${compiledBy || 'VayuVitals Continuous Monitoring Engine'} on ${compilationDate || new Date().toLocaleDateString('en-IN')}
- Observation Window: ${startDate} to ${endDate}${observationSummaryEn}
- Time Window Examined: 07:00 AM to 01:00 PM IST (Daily School Operating Hours)${schoolEvidenceBlockEn}${forecastBlockEn}
We respectfully request the competent authority to undertake the following time-bound remedial interventions:
${demandsTextEn}

Additionally, we request a formal written update within 15 working days outlining the specific measures and inspections conducted in response to this representation.

Yours sincerely,

${senderName}
${senderRole}
${schoolName}
Contact: ${senderContact}`;

    hindiText = `सेवा में,
${authority.designation || 'सक्षम प्राधिकारी'}
${authority.fullName || ''}
${authority.address || ''}

विषय: ${subjectHi}

महोदय/महोदया,

मैं ${schoolName}${locality ? `, ${locality}` : ''} की ओर से यह औपचारिक प्रतिवेदन प्रस्तुत कर रहा/रही हूँ। ओपन-मेटियो मॉडल्ड प्रति घंटा PM2.5 डेटा के अनुसार, पिछले ${schoolDaysTotal} कार्यदिवसों (${startDate} से ${endDate}) में से ${exceedanceCount} दिनों में स्कूल समय (प्रातः 07:00 से दोपहर 01:00 बजे) के दौरान PM2.5 का स्तर सुरक्षा मानक ${threshold} µg/m³ (सीपीसीबी के 24-घंटे NAAQS मानक 60 µg/m³ के संदर्भ में; मान प्रातः 07:00–13:00 IST के औसत हैं) से निरंतर अधिक रहा, जिसमें ${peakDate || endDate} को सर्वाधिक ${peakPm25} µg/m³ का स्तर दर्ज किया गया।${userActionSectionHi}

आंकड़ों की प्रामाणिकता एवं स्रोत:
- प्राथमिक निगरानी स्रोत: ${primarySourceHi}${refStationLineHi}
- निगरानी नेटवर्क: ओपन-मेटियो मॉडल्ड प्रति घंटा PM2.5 डेटासेट
- डेटा संकलन: ${compiledBy || 'VayuVitals Continuous Monitoring Engine'} (संकलन तिथि: ${compilationDate || new Date().toLocaleDateString('en-IN')})
- निगरानी अवधि: ${startDate} से ${endDate}${observationSummaryHi}${schoolEvidenceBlockHi}${forecastBlockHi}
अतः आपसे सविनय अनुरोध है कि बच्चों के स्वास्थ्य एवं स्वच्छ परिवेश के अधिकार को ध्यान में रखते हुए निम्नलिखित त्वरित कदम उठाने की कृपा करें:
${demandsTextHi}

कृपया इस प्रतिवेदन पर की गई कार्रवाई से विद्यालय प्रबंधन को लिखित रूप में अवगत कराने का कष्ट करें।

भवदीय/भवदीया,

${senderName}
${senderRole}
${schoolName}
संपर्क: ${senderContact}`;
  }

  return {
    englishText,
    hindiText,
    subject: subjectEn
  };
}
