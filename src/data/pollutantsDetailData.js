// Comprehensive Scientific & Telemetry Specification for all 7 Indian NAAQS Air Pollutants
export const POLLUTANTS_DATA = {
  pm25: {
    id: 'pm25',
    symbol: 'PM 2.5',
    name: 'Fine Particulate Matter',
    tagline: 'The Silent Alveolar Invader & Systemic Cardiovascular Toxin',
    classification: 'Class 1 Known Human Carcinogen (IARC / WHO)',
    sizeMicrons: 2.5,
    sizeComparison: '1/30th the diameter of a single strand of human hair (approx. 70 µm)',
    naaqs24h: 60,
    whoGuideline: 15,
    delhiPeakSmog: 486,
    unit: 'µg/m³',
    theme: {
      primary: '#ef4444',
      primaryRgb: '239, 68, 68',
      secondary: '#b91c1c',
      accentGlow: 'rgba(239, 68, 68, 0.45)',
      cardBg: 'rgba(239, 68, 68, 0.06)',
      cardBorder: 'rgba(239, 68, 68, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#fca5a5'
    },
    lungsImpact: {
      pulmonaryRegion: 'Deep Pulmonary Alveoli & Systemic Capillaries',
      pathology: 'Microscopic particles evade the mucociliary escalator of the trachea, penetrating past terminal bronchioles into gas-exchanging alveolar sacs. From there, ultra-fine particulates translocate directly into the bloodstream, triggering systemic endothelial dysfunction, microvascular thrombosis, and irreversible reduction in forced vital capacity (FVC).',
      symptoms: ['Persistent dry chest rattle', 'Alveolar capillary micro-bleeding', 'Stabbing chest tightness during morning exertion', 'Accelerated atherosclerosis & myocardial infarction'],
      lungAqi: 280, // Simulation parameter for LungsCanvas
      severityTag: 'Extremely Hazardous',
    },
    sources: [
      { name: 'Diesel Vehicle Exhaust', pct: 36, desc: 'Heavy commercial transit and older diesel utility engines running within urban rings.' },
      { name: 'Crop Residue / Stubble Burning', pct: 28, desc: 'Post-monsoon seasonal paddy straw pyrolysis across Punjab, Haryana, and Western UP.' },
      { name: 'Thermal Power Generation', pct: 18, desc: 'Fly ash and uncombusted pulverized carbon from coal-fired power stations.' },
      { name: 'Biomass Cooking & Heating', pct: 18, desc: 'Wood, cow dung cakes, and low-grade coal in unventilated peri-urban settings.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 240, label: 'Night Inversion' },
      { time: '04:00', value: 310, label: 'Cold Valley Trap' },
      { time: '08:00', value: 430, label: 'Morning Rush & Inversion Peak' },
      { time: '12:00', value: 160, label: 'Solar Boundary Mixing' },
      { time: '16:00', value: 110, label: 'Convective Dilution' },
      { time: '20:00', value: 290, label: 'Evening Commute Surge' },
      { time: '23:00', value: 380, label: 'Atmospheric Inversion Return' },
    ],
    sizeScale: [
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Fine Beach Sand', size: '90 µm', color: '#64748b', pct: 128 },
      { label: 'Dust / Pollen (PM10)', size: '10 µm', color: '#f97316', pct: 14.3 },
      { label: 'Red Blood Cell', size: '7 µm', color: '#f43f5e', pct: 10 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
      { label: 'Combustion Soot Core', size: '0.1 µm', color: '#fb7185', pct: 0.14 },
    ],
    documentaries: [
      {
        id: 'doc-pm25-1',
        title: 'The Great Winter Inversion: Delhi’s Stubble Smoke Corridor',
        duration: '18 min investigative case',
        producer: 'Atmospheric Earth Science Collective',
        summary: 'High-altitude LiDAR cross-sections tracing seasonal smoke plumes descending into the low-pressure Gangetic basin, turning the national capital region into a closed thermal gas chamber.',
        keyTakeaway: 'Boundary layer drops from 1,200m down to under 120m at night, compressing ground pollutants to 15x safe levels.',
        accent: '#ef4444'
      },
      {
        id: 'doc-pm25-2',
        title: 'Alveoli to Artery: Translocation of Carbon Nanoparticles',
        duration: '14 min clinical visualization',
        producer: 'Pulmonary Research Institute & AIIMS Cohort',
        summary: 'Electron micrograph tracking of carbonaceous diesel soot crossing human alveolar epithelial membranes directly into capillary microcirculation within 60 minutes of heavy road exposure.',
        keyTakeaway: 'Fine particles do not remain in the respiratory tract; they induce systemic vascular inflammation.',
        accent: '#f87171'
      }
    ],
    countermeasures: [
      { title: 'Air Filtration', rule: 'True HEPA H13/H14 with sealed gaskets. Must possess CADR rating > 350 m³/h per 350 sq ft room.' },
      { title: 'Personal Protective Equipment', rule: 'NIOSH-approved N95 or N99 valveless respirator with continuous perimeter seal. Cloth masks filter < 18% of PM2.5.' },
      { title: 'Commute Protocol', rule: 'Keep vehicle ventilation on internal recirculation loop. Avoid open two-wheeler commutes between 06:00 and 09:30 AM.' }
    ]
  },

  pm10: {
    id: 'pm10',
    symbol: 'PM 10',
    name: 'Coarse Inhalable Particulate Matter',
    tagline: 'The Mechanical Airway Abrader & Mucosal Inflammatory Agent',
    classification: 'Respirable Particulate Fraction (CPCB Class A Air Toxic)',
    sizeMicrons: 10.0,
    sizeComparison: 'Roughly 1/7th the width of human hair; visible as suspended gritty haze',
    naaqs24h: 100,
    whoGuideline: 45,
    delhiPeakSmog: 620,
    unit: 'µg/m³',
    theme: {
      primary: '#f97316',
      primaryRgb: '249, 115, 22',
      secondary: '#c2410c',
      accentGlow: 'rgba(249, 115, 22, 0.45)',
      cardBg: 'rgba(249, 115, 22, 0.06)',
      cardBorder: 'rgba(249, 115, 22, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.22) 0%, rgba(194, 65, 12, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#fed7aa'
    },
    lungsImpact: {
      pulmonaryRegion: 'Upper Tracheobronchial Tree & Larynx',
      pathology: 'Heavy coarse particles deposit mechanically on the mucous layer lining the trachea and large bronchi. This causes direct physical micro-abrasion of epithelial cilia, paralyzing the self-cleaning mechanism and driving severe chronic bronchitis, asthmatic wheezing, and recurrent tracheitis.',
      symptoms: ['Violent hacking morning cough', 'Burning pharyngeal irritation', 'Excessive viscid phlegm production', 'Secondary bacterial bronchial infections'],
      lungAqi: 210,
      severityTag: 'Severe Respiratory Hazard',
    },
    sources: [
      { name: 'Road Dust Resuspension', pct: 45, desc: 'Mechanical tires grinding unpaved road shoulders and soil embankments.' },
      { name: 'Construction & Demolition Debris', pct: 25, desc: 'Uncovered aggregate mixing, stone cutting, and demolition particulate plumes.' },
      { name: 'Agricultural Tillage & Soil Drift', pct: 18, desc: 'Dry seasonal farm field preparation and loose topsoil erosion.' },
      { name: 'Industrial Material Handling', pct: 12, desc: 'Cement plants, fly-ash storage silos, and open coal freight handling.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 290, label: 'Heavy Night Trucks' },
      { time: '04:00', value: 260, label: 'Early Commercial Drift' },
      { time: '08:00', value: 520, label: 'Peak Morning Traffic Surge' },
      { time: '12:00', value: 390, label: 'High Thermal Wind Resuspension' },
      { time: '16:00', value: 340, label: 'Afternoon Construction Peak' },
      { time: '20:00', value: 480, label: 'Evening Transit & Soil Lift' },
      { time: '23:00', value: 350, label: 'Overnight Transit Steady' },
    ],
    sizeScale: [
      { label: 'Fine Beach Sand', size: '90 µm', color: '#64748b', pct: 128 },
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Coarse Dust (PM10)', size: '10 µm', color: '#f97316', pct: 14.3 },
      { label: 'Red Blood Cell', size: '7 µm', color: '#f43f5e', pct: 10 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
    ],
    documentaries: [
      {
        id: 'doc-pm10-1',
        title: 'The Dust Bowl of NCR: Highway Shoulders and Concrete Dust',
        duration: '16 min urban study',
        producer: 'Center for Environmental Infrastructure',
        summary: 'Field audit analyzing how unpaved arterial road shoulders in Delhi-NCR resuspend over 120 metric tons of coarse mineral dust daily into pedestrian breathing height.',
        keyTakeaway: 'Continuous vehicular tire shear lifts coarse particles repeatedly, multiplying exposure 8-fold at street level.',
        accent: '#f97316'
      },
      {
        id: 'doc-pm10-2',
        title: 'Anti-Smog Guns vs Atmospheric Reality: The Engineering Audit',
        duration: '12 min municipal evaluation',
        producer: 'Urban Technology Review',
        summary: 'High-speed camera telemetry evaluating the localized micro-droplet settling rate of municipal anti-smog misting cannons versus ambient dry particulate flux.',
        keyTakeaway: 'Misting cannons settle local PM10 for only 40–90 minutes before surface evaporation allows resuspension.',
        accent: '#fb923c'
      }
    ],
    countermeasures: [
      { title: 'Physical Barriers', rule: 'N95 masks effectively capture 99.4% of PM10 coarse matter due to strong inertial impaction.' },
      { title: 'Indoor Defense', rule: 'Washable nylon pre-filters in air purifiers catch PM10 to preserve expensive HEPA filtration life.' },
      { title: 'Nasal Hygiene', rule: 'Saline nasal irrigation clears coarse trapped deposits from upper turbinate membranes after commute.' }
    ]
  },

  no2: {
    id: 'no2',
    symbol: 'NO2',
    name: 'Nitrogen Dioxide',
    tagline: 'The Corrosive Traffic Gas & Ground Ozone Precursor',
    classification: 'Toxic Reactive Nitrogen Oxide Gas',
    sizeMicrons: 0.0004,
    sizeComparison: 'Gaseous molecular dispersion (0.4 nanometers molecular scale)',
    naaqs24h: 80,
    whoGuideline: 25,
    delhiPeakSmog: 185,
    unit: 'µg/m³',
    theme: {
      primary: '#eab308',
      primaryRgb: '234, 179, 8',
      secondary: '#a16207',
      accentGlow: 'rgba(234, 179, 8, 0.45)',
      cardBg: 'rgba(234, 179, 8, 0.06)',
      cardBorder: 'rgba(234, 179, 8, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.22) 0%, rgba(161, 98, 7, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#fef08a'
    },
    lungsImpact: {
      pulmonaryRegion: 'Deep Bronchiolar Epithelium & Terminal Airways',
      pathology: 'Inhaled NO2 gas reacts with moisture in the respiratory mucous lining to form corrosive nitrous and nitric acid. This degrades the surfactant lipid layer, triggers intense airway hyper-reactivity, and significantly diminishes host pulmonary immunity against viral and streptococcal lung infections.',
      symptoms: ['Acute shortness of breath during light walks', 'Sensory burning in posterior pharynx', 'Substernal chest tightness', 'Substantial reduction in FEV1 air capacity'],
      lungAqi: 175,
      severityTag: 'High Chemical Corrosive Hazard',
    },
    sources: [
      { name: 'Heavy Commercial Diesel Transport', pct: 52, desc: 'High-temperature diesel combustion in heavy interstate highway trucks and buses.' },
      { name: 'Thermal Power Stations', pct: 24, desc: 'High-temperature fossil fuel boilers generating nitric oxide oxidized in ambient air.' },
      { name: 'Commercial Diesel Generator (DG) Sets', pct: 14, desc: 'Unregulated captive backup generators deployed during grid power disruptions.' },
      { name: 'Industrial Furnaces & Boilers', pct: 10, desc: 'High-temperature metallurgical and chemical manufacturing heating chambers.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 95, label: 'Night Highway Freight' },
      { time: '04:00', value: 80, label: 'Early Morning Transit' },
      { time: '08:00', value: 165, label: 'Morning Commute Spike' },
      { time: '12:00', value: 65, label: 'Photochemical Photolysis (NO2 -> O3)' },
      { time: '16:00', value: 85, label: 'Late Afternoon Buildup' },
      { time: '20:00', value: 175, label: 'Evening Peak Congestion' },
      { time: '23:00', value: 120, label: 'Night Interstate Bypass' },
    ],
    sizeScale: [
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
      { label: 'Ultrafine Soot', size: '0.1 µm', color: '#fb7185', pct: 0.14 },
      { label: 'NO2 Molecule', size: '0.0004 µm', color: '#eab308', pct: 0.0005 },
    ],
    documentaries: [
      {
        id: 'doc-no2-1',
        title: 'The Midnight Diesel Surge: Delhi Ring Road Telemetry',
        duration: '15 min sensor documentary',
        producer: 'Clean Air Network India',
        summary: 'Mobile optical absorption sensors tracking extreme nitrogen dioxide plume spikes along the outer Ring Road as 80,000 diesel freight vehicles cross border toll points after midnight.',
        keyTakeaway: 'NO2 concentration at expressway road borders exceeds WHO safety limits by 650% during midnight hours.',
        accent: '#eab308'
      },
      {
        id: 'doc-no2-2',
        title: 'Photochemical Smog Cycle: The NO2 to Ozone Mechanism',
        duration: '11 min molecular animation',
        producer: 'Atmospheric Chemistry Laboratories',
        summary: 'Visualizing how solar ultraviolet photons split NO2 molecules at midday, releasing nascent oxygen atoms that rapidly bind with diatomic oxygen to generate toxic ground-level ozone.',
        keyTakeaway: 'Lower midday NO2 does not mean clean air; it has converted directly into ground-level ozone.',
        accent: '#facc15'
      }
    ],
    countermeasures: [
      { title: 'Air Purifier Spec', rule: 'Must feature at least 1.2 kg of activated carbon impregnated with potassium permanganate (KMnO4) to adsorb gaseous NO2.' },
      { title: 'Transit Strategy', rule: 'Keep a 20-meter gap behind heavy diesel trucks; vehicle tailpipes emit raw NO plumes that oxidize immediately.' },
      { title: 'Vulnerable Groups', rule: 'Asthmatic patients must keep rescue bronchodilators accessible during morning travel hours.' }
    ]
  },

  so2: {
    id: 'so2',
    symbol: 'SO2',
    name: 'Sulphur Dioxide',
    tagline: 'The Heavy Industrial Acid Precursor & Acute Bronchoconstrictor',
    classification: 'Primary Acidic Combustion Gas',
    sizeMicrons: 0.0005,
    sizeComparison: 'Gaseous molecular scale (0.5 nanometers)',
    naaqs24h: 80,
    whoGuideline: 40,
    delhiPeakSmog: 72,
    unit: 'µg/m³',
    theme: {
      primary: '#10b981',
      primaryRgb: '16, 185, 129',
      secondary: '#047857',
      accentGlow: 'rgba(16, 185, 129, 0.45)',
      cardBg: 'rgba(16, 185, 129, 0.06)',
      cardBorder: 'rgba(16, 185, 129, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(4, 120, 87, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#a7f3d0'
    },
    lungsImpact: {
      pulmonaryRegion: 'Primary & Secondary Bronchial Passages',
      pathology: 'Extremely soluble gas that dissolves instantaneously upon contact with bronchial mucosa, synthesizing sulfurous and sulfuric acid. This activates parasympathetic cholinergic reflex loops, triggering instantaneous smooth-muscle contraction (bronchospasm) within 2 minutes of exposure.',
      symptoms: ['Sudden choking sensation in cold weather', 'Reflex bronchial spasm in asthmatics', 'Intense lacrimation (eye watering)', 'Persistent dry laryngeal soreness'],
      lungAqi: 120,
      severityTag: 'Acute Bronchospasmodic Hazard',
    },
    sources: [
      { name: 'Coal Thermal Power Stations', pct: 58, desc: 'Coal combustion lacking Flue Gas Desulfurization (FGD) scrubbers.' },
      { name: 'Petroleum Refineries & Petrochemicals', pct: 20, desc: 'Sulfur recovery units and catalyst regeneration furnaces.' },
      { name: 'Industrial Heavy Furnace Oil (HFO)', pct: 14, desc: 'Combustion of high-sulfur residual oils in industrial boilers.' },
      { name: 'Brick Kilns & Smelters', pct: 8, desc: 'Low-grade petcoke and coal firing in unorganized manufacturing clusters.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 45, label: 'Baseline Thermal Output' },
      { time: '04:00', value: 50, label: 'Industrial Base Load' },
      { time: '08:00', value: 68, label: 'Morning Power Ramp' },
      { time: '12:00', value: 42, label: 'Atmospheric Dispersion' },
      { time: '16:00', value: 38, label: 'Daytime Inversion Break' },
      { time: '20:00', value: 62, label: 'Evening Peak Demand' },
      { time: '23:00', value: 54, label: 'Night Industrial Shift' },
    ],
    sizeScale: [
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
      { label: 'SO2 Molecule', size: '0.0005 µm', color: '#10b981', pct: 0.0007 },
    ],
    documentaries: [
      {
        id: 'doc-so2-1',
        title: 'The FGD Mandate: India’s Coal Power Scrubbing Race',
        duration: '21 min investigative policy report',
        producer: 'National Energy & Environment Bureau',
        summary: 'Inside the engineering and supply chain bottlenecks of installing multi-million dollar limestone Flue Gas Desulfurization towers on 100+ gigawatts of thermal coal units across the Indo-Gangetic belt.',
        keyTakeaway: 'FGD technology captures up to 98% of flue SO2, preventing massive secondary sulfate formation.',
        accent: '#10b981'
      },
      {
        id: 'doc-so2-2',
        title: 'Acid Rain & Secondary Sulfates: Regional Environmental Footprint',
        duration: '13 min chemical documentary',
        producer: 'Soil & Aquatic Chemistry Institute',
        summary: 'Tracking how atmospheric SO2 reacts with ammonia and water vapor to form ammonium sulfate, the dense white haze constituent that blankets Northern India for 90 winter days.',
        keyTakeaway: 'SO2 is the chief chemical precursor for secondary inorganic fine aerosols.',
        accent: '#34d399'
      }
    ],
    countermeasures: [
      { title: 'Air Filtration', rule: 'Standard HEPA does not capture gases; chemically impregnated chemisorption carbon filters are mandatory.' },
      { title: 'Immediate Relief', rule: 'Inhale warm saline steam to soothe irritated upper airway mucosal membranes after outdoor exposure.' },
      { title: 'Industrial Monitoring', rule: 'Check continuous emission monitoring (CEMS) public portals for localized industrial stack excursions.' }
    ]
  },

  co: {
    id: 'co',
    symbol: 'CO',
    name: 'Carbon Monoxide',
    tagline: 'The Odorless Cellular Hypoxia Inducer & Cardiovascular Stressor',
    classification: 'Chemical Asphyxiant & Tissue Hypoxia Gas',
    sizeMicrons: 0.0003,
    sizeComparison: 'Molecular gas (0.3 nanometers; diatomic molecule)',
    naaqs24h: 2.0, // 8-hr standard in mg/m³
    whoGuideline: 4.0,
    delhiPeakSmog: 6.8,
    unit: 'mg/m³',
    theme: {
      primary: '#f43f5e',
      primaryRgb: '244, 63, 94',
      secondary: '#9f1239',
      accentGlow: 'rgba(244, 63, 94, 0.45)',
      cardBg: 'rgba(244, 63, 94, 0.06)',
      cardBorder: 'rgba(244, 63, 94, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.22) 0%, rgba(159, 18, 57, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#fecdd3'
    },
    lungsImpact: {
      pulmonaryRegion: 'Alveolar-Capillary Interface & Circulating Blood Stream',
      pathology: 'Crosses pulmonary alveolar membrane effortlessly into erythrocytes. Has 210 times higher chemical binding affinity for hemoglobin than oxygen, binding tightly to synthesize carboxyhemoglobin (COHb). This shifts the oxygen-dissociation curve to the left, drastically impeding oxygen offloading to the myocardium and cerebral cortex.',
      symptoms: ['Throbbing frontal headache', 'Subtle dizziness & delayed motor reaction time', 'Ischemic myocardial angina during physical exertion', 'Severe confusion & nausea at high doses'],
      lungAqi: 190,
      severityTag: 'Silent Systemic Asphyxiant',
    },
    sources: [
      { name: 'Incomplete Combustion in Stop-and-Go Traffic', pct: 48, desc: 'Idling engines, cold-start vehicular loops, and congested intersections.' },
      { name: 'Biomass Chulha Cooking', pct: 28, desc: 'Indoor firewood, crop waste, and dung stoves with insufficient draft air.' },
      { name: 'Municipal Solid Waste Burning', pct: 16, desc: 'Smoldering refuse fires and landfill fires with deficient oxygen supply.' },
      { name: 'Small-Scale Metal Casting & Forges', pct: 8, desc: 'Coal-fired foundry crucibles operating in unorganized zones.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 2.2, label: 'Night Road Baseline' },
      { time: '04:00', value: 1.8, label: 'Minimum Fleet Load' },
      { time: '08:00', value: 5.6, label: 'Morning Chokepoints' },
      { time: '12:00', value: 2.8, label: 'Midday Moving Traffic' },
      { time: '16:00', value: 3.4, label: 'School & Market Transit' },
      { time: '20:00', value: 6.2, label: 'Peak Gridlock & Idling' },
      { time: '23:00', value: 3.5, label: 'Late Night Taper' },
    ],
    sizeScale: [
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
      { label: 'CO Molecule', size: '0.0003 µm', color: '#f43f5e', pct: 0.0004 },
    ],
    documentaries: [
      {
        id: 'doc-co-1',
        title: 'The Silent Gridlock: Carbon Monoxide Ingress in Cabins',
        duration: '14 min vehicle telematics study',
        producer: 'Automotive Safety & Air Quality Research',
        summary: 'Sensor probes measuring in-cabin carboxyhemoglobin buildup for auto-rickshaw commuters and enclosed vehicle drivers stalled in Delhi ring-road tunnels and flyover jams.',
        keyTakeaway: 'Vehicle interior CO levels can reach 18 mg/m³ within 15 minutes of stop-and-go tunnel transit.',
        accent: '#f43f5e'
      },
      {
        id: 'doc-co-2',
        title: 'Chulhas & Chronic Hypoxia: The Silent Burden on Rural Women',
        duration: '19 min public health case study',
        producer: 'Global Health & Clean Cooking Alliance',
        summary: 'Documenting the cardiovascular impact of unventilated indoor biomass combustion on rural maternal health, showing blood COHb levels rivaling those of heavy chain-smokers.',
        keyTakeaway: 'Indoor biomass combustion produces dangerous systemic hypoxia without any visible flame smoke warning.',
        accent: '#fb7185'
      }
    ],
    countermeasures: [
      { title: 'Detector Installation', rule: 'Equip kitchens and furnace areas with certified electrochemical Carbon Monoxide alarms.' },
      { title: 'Cabin Hygiene', rule: 'Ensure car windows are opened periodically outside congested corridors to flush accumulated cabin CO.' },
      { title: 'Medical Response', rule: 'Acute CO exposure requires prompt 100% normobaric or hyperbaric oxygen therapy to rapidly decouple COHb.' }
    ]
  },

  o3: {
    id: 'o3',
    symbol: 'O3',
    name: 'Tropospheric Ground-Level Ozone',
    tagline: 'The Photochemical Afternoon Oxidant & Lung Tissue Sunburn',
    classification: 'Secondary Photochemical Oxidant Gas',
    sizeMicrons: 0.0004,
    sizeComparison: 'Triatomic oxygen molecule (0.4 nanometers)',
    naaqs24h: 100, // 8-hr standard
    whoGuideline: 100,
    delhiPeakSmog: 198,
    unit: 'µg/m³',
    theme: {
      primary: '#06b6d4',
      primaryRgb: '6, 182, 212',
      secondary: '#0e7490',
      accentGlow: 'rgba(6, 182, 212, 0.45)',
      cardBg: 'rgba(6, 182, 212, 0.06)',
      cardBorder: 'rgba(6, 182, 212, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22) 0%, rgba(14, 116, 144, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#a5f3fc'
    },
    lungsImpact: {
      pulmonaryRegion: 'Terminal Bronchioles & Alveolar Epithelial Lining',
      pathology: 'A ferocious free-radical oxidant that chemically "sunburns" internal respiratory tissues. Inhaled ozone initiates free-radical peroxidation of the polyunsaturated fatty acids in the alveolar lining, fracturing cellular cell membranes, inducing deep substernal chest pain on deep inspiration, and causing irreversible fibrotic lung scarring.',
      symptoms: ['Stabbing pain on taking a deep breath', 'Sudden intractable coughing fits on sunny days', 'Aggravated emphysema & acute asthma flare-ups', 'Severe throat dryness and chest tightness'],
      lungAqi: 220,
      severityTag: 'Severe Cellular Oxidative Hazard',
    },
    sources: [
      { name: 'Photochemical Reaction: Sunlight + NOx', pct: 45, desc: 'Solar UV radiation splitting traffic NOx into nascent oxygen to bind with O2.' },
      { name: 'Volatile Organic Compounds (VOCs)', pct: 32, desc: 'Evaporating petrol from fuel stations, paints, industrial solvents, and chemical wash.' },
      { name: 'Industrial Stack Vapors', pct: 15, desc: 'Hydrocarbon emissions from chemical estates in neighboring industrial belts.' },
      { name: 'Regional High-Solar Flux Transport', pct: 8, desc: 'Transboundary ozone plumes drifting over open agricultural fields during heatwaves.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 12, label: 'Night Photolytic Absence' },
      { time: '04:00', value: 8, label: 'Pre-Dawn Lowest' },
      { time: '08:00', value: 45, label: 'Early Sunlight Initiation' },
      { time: '12:00', value: 165, label: 'Midday Intense Solar Generation' },
      { time: '15:00', value: 198, label: 'Peak Solar Temperature Hazard' },
      { time: '18:00', value: 95, label: 'Sunset Decomposition' },
      { time: '23:00', value: 20, label: 'Night Scavenging by NO' },
    ],
    sizeScale: [
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
      { label: 'Ozone (O3) Molecule', size: '0.0004 µm', color: '#06b6d4', pct: 0.0005 },
    ],
    documentaries: [
      {
        id: 'doc-o3-1',
        title: 'The Sunny Day Poison: Summer Ozone Smog Across Delhi',
        duration: '17 min field documentary',
        producer: 'Solar Chemistry & Atmospheric Monitoring Group',
        summary: 'Investigating how Delhi skies that appear crystal-clear in May and June conceal lethal tropospheric ozone spikes driven by 44°C heat and intense solar ultraviolet flux.',
        keyTakeaway: 'Clear sunny summer skies can carry higher oxidative respiratory toxicity than visible winter dust.',
        accent: '#06b6d4'
      },
      {
        id: 'doc-o3-2',
        title: 'Cellular Oxidation: How Ozone Strips Lung Lipids',
        duration: '12 min cellular microscopy study',
        producer: 'Biomedical Imaging Institute',
        summary: 'Fluorescent dye microscopy revealing the instantaneous rupture of pulmonary surfactant lipid bilayers when exposed to 180 µg/m³ ground-level ozone concentrations.',
        keyTakeaway: 'Ozone is a direct oxidizing agent that chemically strips the protective moisture from human lung tissue.',
        accent: '#22d3ee'
      }
    ],
    countermeasures: [
      { title: 'Time Shift Outdoor Work', rule: 'Strictly avoid outdoor jogging, athletics, or heavy labor between 12:00 PM and 05:00 PM during summer.' },
      { title: 'Avoid Ozone Generators', rule: 'Never use "ionizing" air purifiers that claim to sterilize air; ionic generators emit hazardous secondary ozone.' },
      { title: 'Antioxidant Defense', rule: 'Nutritional supplementation with Vitamin C and E helps scavenge free radicals generated by mild ozone inhalation.' }
    ]
  },

  nh3: {
    id: 'nh3',
    symbol: 'NH3',
    name: 'Ammonia Aerosol',
    tagline: 'The Agricultural Alkaline Gas & Master Precursor to Secondary Haze',
    classification: 'Caustic Alkaline Gas & Secondary Aerosol Driver',
    sizeMicrons: 0.0003,
    sizeComparison: 'Molecular gas (0.3 nanometers; pyramidal geometry)',
    naaqs24h: 400,
    whoGuideline: 200,
    delhiPeakSmog: 142,
    unit: 'µg/m³',
    theme: {
      primary: '#a855f7',
      primaryRgb: '168, 85, 247',
      secondary: '#7e22ce',
      accentGlow: 'rgba(168, 85, 247, 0.45)',
      cardBg: 'rgba(168, 85, 247, 0.06)',
      cardBorder: 'rgba(168, 85, 247, 0.25)',
      heroGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(126, 34, 206, 0.08) 50%, rgba(7, 10, 18, 0.95) 100%)',
      badgeColor: '#e9d5ff'
    },
    lungsImpact: {
      pulmonaryRegion: 'Upper Respiratory Mucosa & Bronchial Tracts',
      pathology: 'Caustic alkaline gas that converts on wet tissue to ammonium hydroxide, triggering liquefactive necrosis of epithelial cells. More critically, gaseous ammonia neutralizes acidic sulfate and nitrate combustion vapors in ambient air, spawning dense clouds of ammonium nitrate ($NH_4NO_3$) and ammonium sulfate ($ (NH_4)_2SO_4 $) fine aerosols.',
      symptoms: ['Pungent stinging nasal irritation', 'Profuse reflex lacrimation and corneal stinging', 'Epiglottic swelling and hoarseness', 'Severe chemical tracheobronchitis at elevated levels'],
      lungAqi: 155,
      severityTag: 'Caustic Alkaline Precursor Hazard',
    },
    sources: [
      { name: 'Agricultural Urea & Fertilizer Application', pct: 54, desc: 'Excessive broadcast nitrogenous fertilization in agricultural plains of Punjab, Haryana, UP.' },
      { name: 'Livestock Manure & Waste Lagoons', pct: 24, desc: 'Uric acid and urea decomposition in peri-urban dairy and poultry operations.' },
      { name: 'Untreated Municipal Open Drains (Najafgarh Drain)', pct: 14, desc: 'Anaerobic decomposition of domestic sewage in open metropolitan stormwater canals.' },
      { name: 'Industrial Chemical Synthesis & Fertilizer Units', pct: 8, desc: 'Ammonia synthesis, cold storage refrigeration leaks, and chemical plants.' },
    ],
    diurnalTrend: [
      { time: '00:00', value: 78, label: 'Night Open Drain Outgassing' },
      { time: '04:00', value: 65, label: 'Pre-Dawn Cold Condensation' },
      { time: '08:00', value: 110, label: 'Morning Thermal Evaporation' },
      { time: '12:00', value: 135, label: 'Midday Fertilizer Volatilization' },
      { time: '16:00', value: 120, label: 'Agricultural Soil Drift' },
      { time: '20:00', value: 95, label: 'Evening Canal Cooling' },
      { time: '23:00', value: 85, label: 'Night Ammonia Trapping' },
    ],
    sizeScale: [
      { label: 'Human Hair', size: '70 µm', color: '#94a3b8', pct: 100 },
      { label: 'Fine Particulate (PM2.5)', size: '2.5 µm', color: '#ef4444', pct: 3.57 },
      { label: 'Ammonia (NH3) Molecule', size: '0.0003 µm', color: '#a855f7', pct: 0.0004 },
    ],
    documentaries: [
      {
        id: 'doc-nh3-1',
        title: 'The Invisible Fertilizer Chain: How Rural Ammonia Fuels Urban Smog',
        duration: '16 min agricultural investigation',
        producer: 'Agronomy & Air Chemistry Collaborative',
        summary: 'Mapping satellite Infrared Atmospheric Sounding Interferometer (IASI) data tracking ammonia evaporation plumes rising from subsidized urea-treated wheat fields and drifting over Delhi to bind with vehicle NOx.',
        keyTakeaway: 'Over 60% of Delhi’s winter PM2.5 mass is composed of secondary ammonium salts originating from agricultural fields.',
        accent: '#a855f7'
      },
      {
        id: 'doc-nh3-2',
        title: 'Najafgarh Drain: The Urban Ammonia Emission Highway',
        duration: '11 min metropolitan audit',
        producer: 'Urban Ecological Waterways Consortium',
        summary: 'Sensor traverses along the 51 km open Najafgarh drain capturing continuous ammonia vaporization that saturates southwest Delhi residential colonies with alkaline micro-aerosols.',
        keyTakeaway: 'Open sewage canals serve as continuous metropolitan ammonia generators year-round.',
        accent: '#c084fc'
      }
    ],
    countermeasures: [
      { title: 'Fertilizer Management', rule: 'Promote neem-coated urea and deep-placement fertilization to prevent atmospheric volatilization.' },
      { title: 'Urban Sanitation', rule: 'Cover open stormwater and sewage drains to curb biological anaerobic ammonia evaporation.' },
      { title: 'Respiratory Defense', rule: 'Acid-gas respiratory cartridges neutralize alkaline ammonia vapor during industrial or sewer exposure.' }
    ]
  }
};
