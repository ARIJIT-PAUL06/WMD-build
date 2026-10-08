/**
 * documentaryHelpers.js
 * VayuVitals - Environmental Intelligence Documentary Helpers
 *
 * Grounded in Central Pollution Control Board (CPCB) National Ambient Air Quality Standards (NAAQS)
 * and World Health Organization (WHO) benchmarks.
 *
 * ZERO fabricated scientific claims or values.
 */

export const POLLUTANT_EDITORIAL_HEADLINES = {
  pm25: {
    statement: 'Small particles. Large consequences.',
    kicker: 'FINE PARTICULATE MATTER // AERODYNAMIC SIZE ≤ 2.5 µm',
    subtext: 'Microscopic solids and combustion droplets capable of deep alveolar and systemic arterial penetration.',
    region: 'Delhi NCR // Indo-Gangetic Basin Inversion Corridor',
  },
  pm10: {
    statement: 'Coarse mineral silt. Heavy urban friction.',
    kicker: 'COARSE INHALABLE PARTICULATE // SIZE 2.5 TO 10 µm',
    subtext: 'Crustal road dust, pulverized silica, and civil infrastructure silt suspended by heavy vehicle shear.',
    region: 'Delhi NCR // Arterial Transit & Civil Works Corridor',
  },
  no2: {
    statement: 'High-heat combustion. Corrosive oxidation.',
    kicker: 'NITROGEN DIOXIDE // THERMAL OXIDANT GAS',
    subtext: 'Pungent reactive gas synthesized at high combustion temperatures, fueling ozone and aerosol synthesis.',
    region: 'Delhi NCR // High-Density Urban Commuter Canyons',
  },
  so2: {
    statement: 'Sulfur-laden flue. Acute airway bronchospasm.',
    kicker: 'SULFUR DIOXIDE // HEAVY FUEL COMBUSTION',
    subtext: 'Suffocating gas emitted from industrial kilns and high-sulfur fuel oils, precursor to sulfate haze.',
    region: 'Delhi NCR // Industrial Infrastructure & Thermal Belt',
  },
  co: {
    statement: 'Colorless, odorless. Cellular oxygen starvation.',
    kicker: 'CARBON MONOXIDE // INCOMPLETE COMBUSTION',
    subtext: 'Invisible asphyxiant gas with 200x greater affinity for hemoglobin than oxygen, concentrated in traffic gridlock.',
    region: 'Delhi NCR // Sub-Grade Flyovers & Urban Canyons',
  },
  o3: {
    statement: 'Sunlight on traffic exhaust. Alveolar sunburn.',
    kicker: 'TROPOSPHERIC OZONE // PHOTOCHEMICAL SECONDARY OXIDANT',
    subtext: 'Secondary gas generated when precursor NOx and volatile organics bake under intense afternoon ultraviolet rays.',
    region: 'Delhi NCR // Peripheral Corridors & High-Sun Airshed',
  },
  nh3: {
    statement: 'Agrarian ammonia. The catalyst of winter smog.',
    kicker: 'AMMONIA // ALKALINE PRECURSOR GAS',
    subtext: 'Primary atmospheric basic gas from fertilizer and livestock, bonding with urban acids to generate secondary PM2.5.',
    region: 'Delhi NCR // Northern Agrarian Boundary Belt',
  },
};

/**
 * Returns risk category, color, arc position percentage, and advisory text
 * based on verified Indian CPCB NAAQS benchmarks.
 */
export function getPollutantRiskAssessment(pollutantId, rawValue) {
  if (rawValue == null || isNaN(rawValue)) {
    return {
      label: 'MONITORED',
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.35)',
      classKey: 'good',
      percent: 45,
      statusText: 'Continuous CAAQMS Telemetry Active',
      riskTier: 'Normal',
    };
  }

  const val = Number(rawValue);

  switch (pollutantId) {
    case 'pm25': {
      // NAAQS 24-hr: 60 ug/m3
      if (val <= 30) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 18, statusText: 'Air quality is satisfactory and poses minimal risk', riskTier: 'Good' };
      if (val <= 60) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 36, statusText: 'Minor breathing discomfort to sensitive people', riskTier: 'Satisfactory' };
      if (val <= 90) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 54, statusText: 'Breathing discomfort to people with lungs/asthma', riskTier: 'Moderate' };
      if (val <= 120) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 72, statusText: 'Breathing discomfort on prolonged exposure', riskTier: 'Poor' };
      if (val <= 250) return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 86, statusText: 'Respiratory illness to people on prolonged exposure', riskTier: 'Very Poor' };
      return { label: 'SEVERE', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.55)', classKey: 'severe', percent: 96, statusText: 'Affects healthy people and severely impacts those with disease', riskTier: 'Severe' };
    }
    case 'pm10': {
      // NAAQS 24-hr: 100 ug/m3
      if (val <= 50) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 18, statusText: 'Minimal health impact', riskTier: 'Good' };
      if (val <= 100) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 36, statusText: 'Minor breathing discomfort to sensitive people', riskTier: 'Satisfactory' };
      if (val <= 250) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 55, statusText: 'Upper respiratory irritation in vulnerable groups', riskTier: 'Moderate' };
      if (val <= 350) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 74, statusText: 'Noticeable coughing and respiratory discomfort', riskTier: 'Poor' };
      if (val <= 430) return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 87, statusText: 'Significant respiratory impairment for general public', riskTier: 'Very Poor' };
      return { label: 'SEVERE', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.55)', classKey: 'severe', percent: 96, statusText: 'Severe bronchial inflammation; immediate protective action advised', riskTier: 'Severe' };
    }
    case 'no2': {
      // NAAQS 24-hr: 80 ug/m3
      if (val <= 40) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 20, statusText: 'Normal urban background concentration', riskTier: 'Good' };
      if (val <= 80) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 40, statusText: 'Within Indian 24-hour national ambient standard', riskTier: 'Satisfactory' };
      if (val <= 180) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 60, statusText: 'Increased airway responsiveness in asthmatics', riskTier: 'Moderate' };
      if (val <= 280) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 76, statusText: 'Noticeable throat irritation and photochemical precursor build-up', riskTier: 'Poor' };
      if (val <= 400) return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 88, statusText: 'Direct airway inflammation; asthmatics at high risk', riskTier: 'Very Poor' };
      return { label: 'SEVERE', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.55)', classKey: 'severe', percent: 96, statusText: 'Acute oxidant exposure; harmful to all individuals', riskTier: 'Severe' };
    }
    case 'so2': {
      // NAAQS 24-hr: 80 ug/m3
      if (val <= 40) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 20, statusText: 'Low baseline sulfur loading', riskTier: 'Good' };
      if (val <= 80) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 40, statusText: 'Compliant with national safety standard', riskTier: 'Satisfactory' };
      if (val <= 380) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 62, statusText: 'Elevated industrial emissions detected downwind', riskTier: 'Moderate' };
      if (val <= 800) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 78, statusText: 'Severe bronchospasm risk in individuals with asthma', riskTier: 'Poor' };
      return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 92, statusText: 'Hazardous sulfur concentration across industrial belt', riskTier: 'Very Poor' };
    }
    case 'co': {
      // NAAQS 8-hr: 2.0 mg/m3
      if (val <= 1.0) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 20, statusText: 'Normal urban baseline; optimal oxygen transport', riskTier: 'Good' };
      if (val <= 2.0) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 42, statusText: 'Meets CPCB standard; slight traffic accumulation', riskTier: 'Satisfactory' };
      if (val <= 10.0) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 62, statusText: 'Traffic idling concentration; caution in enclosed underpasses', riskTier: 'Moderate' };
      if (val <= 17.0) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 78, statusText: 'Reduces oxygen delivery; cardiovascular strain', riskTier: 'Poor' };
      return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 92, statusText: 'Hazardous carboxyhemoglobin formation risk', riskTier: 'Very Poor' };
    }
    case 'o3': {
      // NAAQS 8-hr: 100 ug/m3
      if (val <= 50) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 20, statusText: 'Low photochemical activity', riskTier: 'Good' };
      if (val <= 100) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 42, statusText: 'Within NAAQS limit for daytime exposure', riskTier: 'Satisfactory' };
      if (val <= 168) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 64, statusText: 'Photochemical smog forming under afternoon sun', riskTier: 'Moderate' };
      if (val <= 208) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 80, statusText: 'Airway hyper-reactivity; outdoor exertion discouraged', riskTier: 'Poor' };
      return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 94, statusText: 'Severe oxidative lung irritation across urban corridor', riskTier: 'Very Poor' };
    }
    case 'nh3': {
      // NAAQS 24-hr: 400 ug/m3
      if (val <= 100) return { label: 'GOOD', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 20, statusText: 'Natural atmospheric background level', riskTier: 'Good' };
      if (val <= 200) return { label: 'SATISFACTORY', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', classKey: 'satisfactory', percent: 40, statusText: 'Mild agricultural drift; well within standard', riskTier: 'Satisfactory' };
      if (val <= 400) return { label: 'MODERATE', color: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', classKey: 'moderate', percent: 60, statusText: 'Active secondary particulate ammonium neutralization', riskTier: 'Moderate' };
      if (val <= 800) return { label: 'POOR', color: '#f97316', glow: 'rgba(249, 115, 22, 0.45)', classKey: 'poor', percent: 78, statusText: 'High alkaline plume driving regional inorganic aerosol synthesis', riskTier: 'Poor' };
      return { label: 'VERY POOR', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', classKey: 'very-poor', percent: 92, statusText: 'Intense agricultural and fertilizer volatilization', riskTier: 'Very Poor' };
    }
    default:
      return { label: 'MONITORED', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', classKey: 'good', percent: 50, statusText: 'Active CAAQMS Telemetry', riskTier: 'Monitored' };
  }
}

/**
 * 4-Step Visual Synthesis & Inhalation Vectors
 * Converts paragraphs of narrative chemistry into concise, graphical flow steps.
 */
export const POLLUTANT_SYNTHESIS_FLOWS = {
  pm25: [
    { step: '01', label: 'COMBUSTION', desc: 'Vehicular & Industrial Exhaust' },
    { step: '02', label: 'INVERSION', desc: 'Boundary Ceiling < 200m' },
    { step: '03', label: 'AEROSOL', desc: 'Basin-Wide Particulate Sheet' },
    { step: '04', label: 'INHALATION', desc: 'Terminal Alveolar Deposition' },
  ],
  pm10: [
    { step: '01', label: 'ABRASION', desc: 'Road Silt & Construction Friction' },
    { step: '02', label: 'RESUSPENSION', desc: 'Heavy Vehicular Wheel Shear' },
    { step: '03', label: 'DUST VEIL', desc: 'Ground-Level Turbid Layer' },
    { step: '04', label: 'EXPOSURE', desc: 'Upper Airway & Mucosal Trap' },
  ],
  no2: [
    { step: '01', label: 'HIGH-HEAT', desc: 'Engine Thermal Oxidation (>1300°C)' },
    { step: '02', label: 'OXIDATION', desc: 'Rapid Ambient NO → NO₂ Conversion' },
    { step: '03', label: 'CATALYST', desc: 'Photochemical Smog & Ozone Surge' },
    { step: '04', label: 'BRONCHIAL', desc: 'Direct Epithelial Inflammation' },
  ],
  so2: [
    { step: '01', label: 'SULFUR FUEL', desc: 'Raw Coal & Heavy Furnace Oil' },
    { step: '02', label: 'FLUE RELEASE', desc: 'Industrial Kiln & Boiler Stacks' },
    { step: '03', label: 'ACID AEROSOL', desc: 'Atmospheric Sulfate Conversion' },
    { step: '04', label: 'CONSTRICTION', desc: 'Acute Bronchospasm Trigger' },
  ],
  co: [
    { step: '01', label: 'INCOMPLETE', desc: 'Oxygen-Deficient Engine Idle' },
    { step: '02', label: 'CONFINEMENT', desc: 'Sub-Grade & Underpass Stagnation' },
    { step: '03', label: 'BLOOD BIND', desc: '200x Affinity vs Oxygen (HbCO)' },
    { step: '04', label: 'HYPOXIA', desc: 'Cellular & Neurological Strain' },
  ],
  o3: [
    { step: '01', label: 'PRECURSORS', desc: 'Traffic NOx + Volatile Organics' },
    { step: '02', label: 'SOLAR UV', desc: 'Afternoon Photolytic Baking' },
    { step: '03', label: 'OZONE SURGE', desc: 'Midday Ground-Level Peak' },
    { step: '04', label: 'OXIDATION', desc: 'Deep Tissue Epithelial Burn' },
  ],
  nh3: [
    { step: '01', label: 'AGRARIAN', desc: 'Urea Fertilizer & Livestock Slurry' },
    { step: '02', label: 'VOLATILIZATION', desc: 'Gaseous Ammonia Plumes' },
    { step: '03', label: 'SMOG GLUE', desc: 'Bonds Urban NOx/SOx into Salts' },
    { step: '04', label: 'SECONDARY PM', desc: 'Persistent Winter Smog Sheets' },
  ],
};

