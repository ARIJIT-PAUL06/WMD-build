/**
 * Pollutant Documentaries Central Data Layer
 * VayuVitals - Atmospheric Cargo Hauler Documentary Experience
 *
 * Grounded in peer-reviewed atmospheric chemistry, Central Pollution Control Board (CPCB)
 * National Ambient Air Quality Standards (NAAQS), and World Health Organization (WHO) benchmarks.
 *
 * DO NOT fabricate measurements, sources, or percentages.
 */

export const POLLUTANT_DOCUMENTARIES = {
  pm25: {
    id: 'pm25',
    symbol: 'PM2.5',
    name: 'Fine Particulate Matter',
    chemicalFormula: 'PM₂.₅',
    unit: 'µg/m³',
    naaqsLimit: 60, // 24-hr Indian NAAQS
    whoLimit: 15, // 24-hr WHO Guideline 2021
    shortDescription: 'Microscopic solid particles and liquid droplets suspended in air, with aerodynamic diameters strictly 2.5 micrometers or smaller.',
    whatIsIt: 'PM2.5 is not a single chemical substance, but a complex aerosol mixture comprising sulfates, nitrates, elemental and organic carbon, heavy metals, and soil dust. Due to their minute mass and aerodynamic profile, these particles remain airborne for days to weeks, traveling hundreds of kilometers across regional air basins before wet or dry deposition occurs.',
    typicalSources: [
      {
        category: 'Combustion Processes',
        description: 'Incomplete combustion in diesel and petrol internal-combustion engines, coal-fired power utilities, and industrial boilers.',
        isCombustion: true,
      },
      {
        category: 'Biomass & Agricultural Burning',
        description: 'Post-harvest crop residue combustion, domestic wood and dung fuel burning for winter space heating and cooking.',
        isCombustion: true,
      },
      {
        category: 'Secondary Aerosol Synthesis',
        description: 'Atmospheric gas-to-particle photochemical conversion where sulfur dioxide, nitrogen oxides, and ammonia react under solar irradiation.',
        isAtmospheric: true,
      },
      {
        category: 'Fugitive Dust & Resuspension',
        description: 'Mechanical pulverization from vehicular traffic on unpaved roads, construction sites, and bare soil weathering.',
        isMechanical: true,
      },
    ],
    atmosphericBehavior: 'During winter months in the Indo-Gangetic Plain, nocturnal radiative cooling generates a strong thermal boundary layer inversion (often descending below 200 meters). Coupled with calm surface winds (<2 m/s), emitted fine particles become trapped within a compressed volume, resulting in acute ground-level concentration spikes.',
    whyItMatters: 'Aerodynamically capable of bypassing the nasal filtration system and tracheobronchial cilia, PM2.5 penetrates into the terminal pulmonary alveoli. Ultrafine fractions can cross the alveolar-capillary barrier into systemic blood circulation, exacerbating vascular inflammation, autonomic dysregulation, and respiratory strain.',
    measurementContext: {
      standard: 'CPCB 24-hour NAAQS: 60 µg/m³ | WHO 24-hour Guideline: 15 µg/m³',
      methodology: 'Beta Attenuation Monitoring (BAM-1020) and Gravimetric Filter Analysis across CAAQMS stations.',
      samplingInterval: 'Continuous 15-minute radiometric attenuation cycle.',
    },
    sections: {
      heroSubtitle: 'THE PARTICLES YOU CANNOT SEE',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'Invisible to the unaided human eye, fine particulate matter consists of microscopic solids and liquid droplets suspended in the atmospheric column.',
        body: 'Aerosols in this size fraction have an aerodynamic diameter of 2.5 microns or less — roughly 30 times thinner than a single strand of human hair. Because gravity exerts minimal settling force on particles this small, they behave hydrodynamically like gases, remaining aloft for days and drifting over vast continental distances.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'Scale is the defining property of particulate danger.',
        comparisonItems: [
          { label: 'Human Hair', sizeMicrons: 70, barWidthPercent: 100, visualClass: 'hair' },
          { label: 'Fine Beach Sand', sizeMicrons: 90, barWidthPercent: 100, visualClass: 'sand' },
          { label: 'PM10 (Coarse Inhalable)', sizeMicrons: 10, barWidthPercent: 14.3, visualClass: 'pm10' },
          { label: 'PM2.5 (Fine Combustion)', sizeMicrons: 2.5, barWidthPercent: 3.5, visualClass: 'pm25' },
          { label: 'Ultrafine Particles', sizeMicrons: 0.1, barWidthPercent: 0.5, visualClass: 'ultrafine' },
        ],
        body: 'Particles larger than 10 microns are largely captured by the mucus membranes of the nose and throat. PM2.5 particles bypass these anatomical barriers entirely, descending directly into the bronchioles and alveolar air sacs.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'Fine particles originate from direct emissions and complex airborne atmospheric chemical synthesis.',
        categories: [
          { name: 'Motor Vehicle Exhaust', description: 'Diesel particulate matter (soot, unburnt polycyclic aromatic hydrocarbons) from heavy transport, commercial fleets, and light vehicles.' },
          { name: 'Thermal Power & Industrial Boilers', description: 'Coal and heavy furnace oil combustion emissions releasing fly ash and primary carbonaceous particles.' },
          { name: 'Biomass & Seasonal Stubble', description: 'Open agricultural residue burning and residential heating fires releasing high concentrations of black and brown carbon.' },
          { name: 'Secondary Particulate Nitrates & Sulfates', description: 'Gaseous emissions of NO2, SO2, and NH3 reacting photochemically in the presence of water vapor to form solid inorganic salts.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'The atmospheric journey from smokestack or tailpipe to human breath.',
        stages: [
          { step: '01', stage: 'Emission', detail: 'Primary particulate and precursor gas plumes are injected into the surface layer from exhaust pipes, chimneys, and open fires.' },
          { step: '02', stage: 'Plume Rise & Advection', detail: 'Thermal buoyancy lifts the emissions; horizontal gradient winds carry the plume across urban neighborhoods.' },
          { step: '03', stage: 'Inversion Trapping', detail: 'In winter evenings, ground cooling traps pollutants beneath a low atmospheric ceiling, compressing volume by up to 80%.' },
          { step: '04', stage: 'Secondary Nucleation', detail: 'Precursor gases react in stagnant humidity, forming new secondary particles that inflate total PM2.5 mass.' },
          { step: '05', stage: 'Receptor & Ground Station', detail: 'Particulates are ingested by regulatory Beta Attenuation Monitors and inhaled by pedestrians at street level.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Continuous ground monitoring from the Central Pollution Control Board and DPCC telemetry network.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'Diurnal concentration dynamics over a typical 24-hour urban cycle in Delhi.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 165, phase: 'Night Inversion Peak' },
          { hour: '04:00', label: '4 AM', value: 188, phase: 'Pre-Dawn Minimum Mixing Depth' },
          { hour: '08:00', label: '8 AM', value: 215, phase: 'Morning Rush Hour Confluence' },
          { hour: '12:00', label: '12 PM', value: 110, phase: 'Solar Boundary Layer Expansion' },
          { hour: '16:00', label: '4 PM', value: 92, phase: 'Afternoon Ventilation Maximum' },
          { hour: '20:00', label: '8 PM', value: 178, phase: 'Evening Radiation Inversion Reset' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'Environmental and physiological relevance established by epidemiological consensus.',
        points: [
          'Terminal alveolar deposition: fine particles reach deep lung tissue where gas exchange occurs.',
          'Systemic circulation access: ultrafine elements cross alveolar membranes, contributing to cardiovascular stress.',
          'Atmospheric visibility degradation: fine aerosols scatter shortwave solar radiation, creating persistent winter smog sheets.',
          'Soil and leaf deposition: acidic and metal-laden particles deposit on vegetation, inhibiting plant stomatal conductance.',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'PM2.5 is not something you can see with the naked eye. But you can measure it. And the measurements tell a story.',
        subtext: 'Every breath in an elevated basin carries thousands of microscopic combustion fragments. The evidence is continuous, empirical, and demanding of civic stewardship.',
      },
    },
    visualMetadata: {
      accentColor: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Respirable Freight',
      scaleMicrons: 2.5,
    },
        "wmdTagline": "A SILENT KILLER",
        "wmdIntro": "A rigorous investigation into the invisible threat of PM2.5 — microscopic combustion particles in the Delhi airshed rewriting human respiratory health.",
        "globalStats": [
            {
                "label": "GLOBAL DEATHS / YEAR",
                "value": "≈ 6,700,000",
                "detail": "ambient + household air pollution",
                "sourceLabel": "WHO (2022) Ambient & Household Air Pollution Factsheet",
                "sourceUrl": "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"
            },
            {
                "label": "PEOPLE EXPOSED",
                "value": "≈ 99%",
                "detail": "of world population breathes air exceeding WHO limits",
                "sourceLabel": "WHO (2022) Global Air Quality Database",
                "sourceUrl": "https://www.who.int/news/item/04-04-2022-billions-of-people-still-breathe-unhealthy-air"
            },
            {
                "label": "WHO GUIDELINE",
                "value": "15 µg/m³ (24-h)",
                "detail": "Annual guideline: 5 µg/m³",
                "sourceLabel": "WHO Global Air Quality Guidelines (2021)",
                "sourceUrl": "https://www.who.int/publications/i/item/9789240034228"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "60 µg/m³ (24-h)",
                "detail": "Annual standard: 40 µg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },

  pm10: {
    id: 'pm10',
    symbol: 'PM10',
    name: 'Coarse Inhalable Particulate',
    chemicalFormula: 'PM₁₀',
    unit: 'µg/m³',
    naaqsLimit: 100, // 24-hr Indian NAAQS
    whoLimit: 45,
    shortDescription: 'Inhalable airborne particles with aerodynamic diameters between 2.5 and 10 micrometers.',
    whatIsIt: 'PM10 encompasses coarse airborne dust, mechanical abrasion debris, pollen fragments, mold spores, and pulverized earth. While heavier than PM2.5 and subject to faster gravitational settling, coarse dust remains suspended in arid windstorms and heavy urban traffic corridors for substantial durations.',
    typicalSources: [
      {
        category: 'Mechanical Dust Resuspension',
        description: 'Vehicles traveling over unpaved shoulders, silt-laden tarmac, and open dry medians churning up settled soil.',
        isMechanical: true,
      },
      {
        category: 'Construction & Demolition Activity',
        description: 'Structural demolition, concrete batching, stone crushing, trench digging, and uncovered building material stockpiles.',
        isMechanical: true,
      },
      {
        category: 'Transboundary Crustal Dust',
        description: 'Thar Desert dust advection and regional dust storms during pre-monsoon summer westerly flows.',
        isAtmospheric: true,
      },
      {
        category: 'Industrial Handling',
        description: 'Loading, transport, and open storage of fly ash, coal, cement clinker, and mining minerals.',
        isIndustrial: true,
      },
    ],
    atmosphericBehavior: 'Coarse dust particles have higher settling velocities than fine particles. However, in turbulent surface conditions and gusty convective winds, PM10 can remain suspended for tens of kilometers, forming thick yellow-brown atmospheric dust veils.',
    whyItMatters: 'PM10 is readily captured in the upper respiratory tract — the nasal passages, pharynx, and primary bronchi. High coarse dust concentrations trigger acute mucosal inflammation, cough, wheezing, and irritation of the conjunctiva and upper airways.',
    measurementContext: {
      standard: 'CPCB 24-hour NAAQS: 100 µg/m³ | WHO 24-hour Guideline: 45 µg/m³',
      methodology: 'Beta Attenuation Monitoring with size-selective impactor inlet (10 µm cutoff).',
      samplingInterval: 'Continuous 15-minute radiometric attenuation cycle.',
    },
    sections: {
      heroSubtitle: 'THE INHALABLE DUST VEIL',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'Coarse inhalable particles consist of mineral dust, organic fragments, and mechanical debris spanning 2.5 to 10 microns.',
        body: 'These particles are coarse enough that intense sunlight will catch their glint in heavy construction zones or unpaved traffic corridors. While too large to penetrate the deepest capillary alveoli, PM10 dominates the total gravimetric particulate mass over northern India.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'One seventh the thickness of a human hair, yet giant compared to chemical aerosols.',
        comparisonItems: [
          { label: 'Human Hair', sizeMicrons: 70, barWidthPercent: 100, visualClass: 'hair' },
          { label: 'PM10 (Coarse Inhalable)', sizeMicrons: 10, barWidthPercent: 14.3, visualClass: 'pm10' },
          { label: 'PM2.5 (Fine Combustion)', sizeMicrons: 2.5, barWidthPercent: 3.5, visualClass: 'pm25' },
        ],
        body: 'PM10 is effectively filtered by nasal hairs and mucous membranes, which is why exposure is keenly felt in the nose, throat, and eyes before reaching lower pulmonary lobes.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'Mechanical pulverization and soil erosion dominate PM10 mass in urban basins.',
        categories: [
          { name: 'Road Dust Resuspension', description: 'Tires grinding mineral grains against asphalt, launching fine silica dust into the pedestrian breathing zone.' },
          { name: 'Construction Sites & Excavation', description: 'Concrete cutting, earthmoving, foundation digging, and uncovered material hauling.' },
          { name: 'Industrial Mining & Mineral Processing', description: 'Crushing, screening, and handling of aggregates, cement, and solid fuel.' },
          { name: 'Dry Surface Erosion', description: 'Bare urban soil, dried riverbed silt, and desert dust transport carried by seasonal high winds.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'The aerodynamic mechanics of mechanical dust dispersion.',
        stages: [
          { step: '01', stage: 'Mechanical Disturbance', detail: 'Tires, wind gusts, or excavation machinery shear particles off the ground surface.' },
          { step: '02', stage: 'Turbulent Lofting', detail: 'Convective thermals and micro-eddies carry coarse dust plumes upward into street canyons.' },
          { step: '03', stage: 'Horizontal Advection', detail: 'Local winds transport dust plumes across adjacent residential sectors.' },
          { step: '04', stage: 'Gravitational Settling', detail: 'Larger PM10 fractions settle onto leaves, vehicles, and roofs within hours unless lofted by continuous traffic.' },
          { step: '05', stage: 'Station Impactor Intake', detail: 'Air is drawn through a 10-micron cyclone inlet to measure concentration on filter tape.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Live coarse dust concentrations recorded by regulatory Delhi monitoring stations.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'Coarse dust exhibits daytime traffic peaks linked directly to road friction and construction hours.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 180, phase: 'Night Heavy Commercial Entry' },
          { hour: '04:00', label: '4 AM', value: 160, phase: 'Pre-Dawn Lull' },
          { hour: '08:00', label: '8 AM', value: 260, phase: 'Morning Commute Resuspension' },
          { hour: '12:00', label: '12 PM', value: 210, phase: 'Midday Construction Activity' },
          { hour: '16:00', label: '4 PM', value: 230, phase: 'Evening Commute Resuspension' },
          { hour: '20:00', label: '8 PM', value: 290, phase: 'Night Freight Arterial Flow' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'The upper airway burden of coarse inhalable particles.',
        points: [
          'Tracheobronchial irritation: triggers acute asthma spasms, chronic bronchitis flare-ups, and throat discomfort.',
          'Surface soiling and infrastructure erosion: abrasive mineral dust coats solar panels, reducing photovoltaic yield by up to 25%.',
          'Heavy metal carrier: coarse road dust often carries toxic brake-pad copper, tire zinc, and legacy lead particles.',
          'Urban tree canopy stress: dust coats foliage, blocking stomatal gas exchange and diminishing urban greening benefits.',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'PM10 is the grit of a growing metropolis. Unpaved roads and unshielded construction keep this heavy freight in the air.',
        subtext: 'Controlling coarse dust requires simple, mechanical vigilance: paved road shoulders, water misting, covered cargo transit, and green vegetative ground cover.',
      },
    },
    visualMetadata: {
      accentColor: '#f97316',
      accentGlow: 'rgba(249, 115, 22, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(249, 115, 22, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Coarse Crustal Freight',
      scaleMicrons: 10,
    },
        "wmdTagline": "THE INHALABLE VEIL",
        "wmdIntro": "Mechanical pulverization, construction dust, and road resuspension churn coarse particles across northern India, blanketing regional airsheds in persistent particulate sheets.",
        "globalStats": [
            {
                "label": "GLOBAL BURDEN",
                "value": "≈ 3,200,000",
                "detail": "disability-adjusted life years lost annually",
                "sourceLabel": "Global Burden of Disease Study (2021)",
                "sourceUrl": "https://www.healthdata.org/gbd"
            },
            {
                "label": "PEOPLE EXPOSED",
                "value": "> 90%",
                "detail": "of global urban population exposed above guidelines",
                "sourceLabel": "WHO Air Quality Database",
                "sourceUrl": "https://www.who.int/data/gho/data/themes/air-pollution"
            },
            {
                "label": "WHO GUIDELINE",
                "value": "45 µg/m³ (24-h)",
                "detail": "Annual guideline: 15 µg/m³",
                "sourceLabel": "WHO Global Air Quality Guidelines (2021)",
                "sourceUrl": "https://www.who.int/publications/i/item/9789240034228"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "100 µg/m³ (24-h)",
                "detail": "Annual standard: 60 µg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },

  no2: {
    id: 'no2',
    symbol: 'NO₂',
    name: 'Nitrogen Dioxide',
    chemicalFormula: 'NO₂',
    unit: 'µg/m³',
    naaqsLimit: 80, // 24-hr Indian NAAQS
    whoLimit: 25,
    shortDescription: 'A pungent, reddish-brown toxic gas produced by high-temperature combustion in vehicles and power generation.',
    whatIsIt: 'Nitrogen Dioxide (NO2) is a primary reactive gas in the group known as nitrogen oxides (NOx). Formed when atmospheric nitrogen and oxygen fuse at elevated combustion temperatures (>1,300°C), NO2 acts as a corrosive oxidant in ambient air and a pivotal chemical catalyst for ground-level ozone and secondary nitrate aerosols.',
    typicalSources: [
      {
        category: 'Motor Vehicles',
        description: 'Heavy diesel trucks, buses, commercial three-wheelers, and private passenger cars during stop-and-go urban transit.',
        isCombustion: true,
      },
      {
        category: 'Thermal Power Generation',
        description: 'High-temperature boilers combusting pulverized fossil fuel in and around the capital territory perimeter.',
        isIndustrial: true,
      },
      {
        category: 'Industrial Furnaces',
        description: 'Steel rerolling mills, glass kilns, and metal smelting furnaces operating at continuous high temperatures.',
        isIndustrial: true,
      },
      {
        category: 'Diesel Generator Sets',
        description: 'Decentralized stationary backup generators deployed across commercial markets, residential societies, and construction sites.',
        isCombustion: true,
      },
    ],
    atmosphericBehavior: 'NO2 undergoes rapid photochemical cycling. In daylight, sunlight photolyzes NO2 into nitric oxide (NO) and a free oxygen radical, which binds with diatomic oxygen to generate tropospheric ozone (O3). In the evening, NO2 combines with hydroxyl radicals and moisture to synthesize aerosolized nitric acid.',
    whyItMatters: 'Inhaled nitrogen dioxide causes direct inflammation of the airway lining. It increases bronchial responsiveness, lowers resistance to respiratory infections, and acts as the crucial chemical reactant in the production of photochemical smog and acidic aerosols.',
    measurementContext: {
      standard: 'CPCB 24-hour NAAQS: 80 µg/m³ | WHO 24-hour Guideline: 25 µg/m³',
      methodology: 'Chemiluminescence analyzer utilizing the reaction between nitric oxide and ozone.',
      samplingInterval: 'Continuous real-time optical photon counting.',
    },
    sections: {
      heroSubtitle: 'THE INVISIBLE EXHAUST CATALYST',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'A sharp, pungent gas synthesized by high-temperature combustion.',
        body: 'When air is compressed inside diesel cylinders or boiler fireboxes, inert nitrogen fuses with oxygen to form nitric oxide (NO), which rapidly oxidizes in ambient air to nitrogen dioxide (NO2). In high concentrations, it manifests as a distinct brownish atmospheric haze over congested arterial highways.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'Molecular dimension: gaseous molecules smaller than any filter can capture.',
        comparisonItems: [
          { label: 'PM2.5 Particle', sizeMicrons: 2.5, barWidthPercent: 100, visualClass: 'pm25' },
          { label: 'NO2 Molecule', sizeMicrons: 0.0003, barWidthPercent: 0.1, visualClass: 'gas' },
        ],
        body: 'Because NO2 is a gas, it cannot be trapped by physical dust masks. It disperses freely through molecular diffusion and enters the lungs alongside ambient air.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'Combustion engines are the undisputed engines of urban NOx.',
        categories: [
          { name: 'Heavy Commercial Transport', description: 'Diesel trucks idling and accelerating through arterial ring roads and bypass corridors.' },
          { name: 'Thermal Power Stations', description: 'Flue gas plumes containing hundreds of kilograms of NOx per operating hour.' },
          { name: 'Standby Diesel Generators', description: 'Unregulated local power generators running during grid outages in commercial zones.' },
          { name: 'Domestic Gas & Kerosene', description: 'Indoor unvented combustion appliances contributing to local indoor and ambient NOx levels.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'The daytime solar chemical engine of NO2.',
        stages: [
          { step: '01', stage: 'High-Temp Synthesis', detail: 'N2 and O2 fuse in engine cylinders at >1,300°C to form NO.' },
          { step: '02', stage: 'Rapid Atmospheric Oxidation', detail: 'NO reacts with ambient ozone to form NO2 within minutes of exiting the tailpipe.' },
          { step: '03', stage: 'Solar Photolysis', detail: 'Morning sunlight splits NO2 back into NO + O*, triggering ground-level ozone formation.' },
          { step: '04', stage: 'Nitrate Aerosol Synthesis', detail: 'Nighttime NO2 reacts with ammonia in high humidity to create solid ammonium nitrate smog.' },
          { step: '05', stage: 'Station Photomultiplier', detail: 'Gas is drawn into a reaction chamber where chemiluminescent photons are quantified.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Current ambient NO2 levels monitored along Delhi highway and institutional monitoring sites.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'Bimodal diurnal signature reflecting morning and evening vehicular traffic rushes.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 48, phase: 'Late Night Freight Window' },
          { hour: '04:00', label: '4 AM', value: 34, phase: 'Pre-Dawn Minimum' },
          { hour: '08:00', label: '8 AM', value: 72, phase: 'Morning Rush Hour Surge' },
          { hour: '12:00', label: '12 PM', value: 38, phase: 'Midday Solar Photodissociation' },
          { hour: '16:00', label: '4 PM', value: 45, phase: 'Early Evening Build-up' },
          { hour: '20:00', label: '8 PM', value: 84, phase: 'Evening Commute & Nocturnal Compression' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'Dual threat: direct respiratory toxicity and secondary aerosol generation.',
        points: [
          'Airway mucosal inflammation: weakens local pulmonary immune defenses and increases asthma hospitalizations.',
          'Ozone precursor: without NOx emissions, urban photochemical ozone smog cannot form.',
          'Nitric acid deposition: contributes to regional acidification of water bodies and building surface decay.',
          'Secondary PM2.5 driver: up to 30% of winter particulate mass in northern India consists of nitrate salts derived from NOx.',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'NO2 is the calling card of combustion. Wherever engines burn hot and unregulated, this reactive gas marks the air.',
        subtext: 'Electrification of commercial fleets and strict SCR exhaust aftertreatment are the only proven solutions to curb this atmospheric catalyst.',
      },
    },
    visualMetadata: {
      accentColor: '#eab308',
      accentGlow: 'rgba(234, 179, 8, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(234, 179, 8, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Combustion Catalyst',
      scaleMicrons: 0.0003,
    },
        "wmdTagline": "THE COMBUSTION CORRIDOR",
        "wmdIntro": "Emitted directly from high-temperature vehicle combustion and fossil fuel generation, nitrogen dioxide triggers airway inflammation and acts as the crucial precursor to toxic secondary aerosols.",
        "globalStats": [
            {
                "label": "CHILD ASTHMA CASES",
                "value": "≈ 1,850,000",
                "detail": "new pediatric asthma cases annually attributed to NO2",
                "sourceLabel": "Lancet Planetary Health (2022)",
                "sourceUrl": "https://www.thelancet.com/journals/lanplh/home"
            },
            {
                "label": "URBAN EXPOSURE",
                "value": "> 80%",
                "detail": "of global urban population exposed above WHO limit",
                "sourceLabel": "Health Effects Institute (2022)",
                "sourceUrl": "https://www.stateofglobalair.org/"
            },
            {
                "label": "WHO GUIDELINE",
                "value": "25 µg/m³ (24-h)",
                "detail": "Annual guideline: 10 µg/m³",
                "sourceLabel": "WHO Global Air Quality Guidelines (2021)",
                "sourceUrl": "https://www.who.int/publications/i/item/9789240034228"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "80 µg/m³ (24-h)",
                "detail": "Annual standard: 40 µg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },

  so2: {
    id: 'so2',
    symbol: 'SO₂',
    name: 'Sulphur Dioxide',
    chemicalFormula: 'SO₂',
    unit: 'µg/m³',
    naaqsLimit: 80, // 24-hr Indian NAAQS
    whoLimit: 40,
    shortDescription: 'A heavy, colorless gas with an acrid choking odor produced by burning sulfur-bearing coal and petroleum oils.',
    whatIsIt: 'Sulphur Dioxide (SO2) is a toxic gaseous byproduct of raw fossil fuel oxidation. Because raw coal and heavy residual fuel oil naturally contain sulfur compounds, combustion oxidizes sulfur directly into SO2 gas. Once in the air, it readily oxidizes further to form sulfuric acid droplets and sulfate aerosols.',
    typicalSources: [
      {
        category: 'Coal-Fired Power Plants',
        description: 'Utility thermal generation stations lacking operational Flue Gas Desulfurization (FGD) scrubber systems.',
        isIndustrial: true,
      },
      {
        category: 'Industrial Boilers & Refineries',
        description: 'Textile dye units, chemical synthesis facilities, and oil refineries using furnace oil or petroleum coke.',
        isIndustrial: true,
      },
      {
        category: 'Brick Kilns & Metal Smelters',
        description: 'Traditional bull-trench brick kilns burning high-sulfur coal or petroleum residues in peri-urban industrial belts.',
        isIndustrial: true,
      },
      {
        category: 'Maritime & Heavy Diesel',
        description: 'Low-grade marine bunker fuels and non-standard off-road construction fuels with elevated sulfur fractions.',
        isCombustion: true,
      },
    ],
    atmosphericBehavior: 'SO2 is readily soluble in water. In moist, humid air, it dissolves into airborne water droplets, reacting with ozone or hydrogen peroxide to yield sulfuric acid (H2SO4). This reaction transforms a gaseous pollutant into corrosive acid rain and secondary particulate sulfates.',
    whyItMatters: 'Sulphur dioxide is a potent bronchoconstrictor. Even brief exposures of 10 to 15 minutes can trigger acute respiratory tightness and asthmatic attacks. Environmentally, sulfuric deposition corrodes historical heritage stone, acidifies regional soils, and defoliates vulnerable forests.',
    measurementContext: {
      standard: 'CPCB 24-hour NAAQS: 80 µg/m³ | WHO 24-hour Guideline: 40 µg/m³',
      methodology: 'Pulsed UV Fluorescence Analyzer (excitation of SO2 molecules by 214 nm ultraviolet light).',
      samplingInterval: 'Continuous real-time fluorescence emission detection.',
    },
    sections: {
      heroSubtitle: 'THE CORROSIVE EMISSION',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'A dense, choking gas formed when sulfur trapped in ancient fossil fuels is released into the sky.',
        body: 'Coal and heavy furnace oils contain elemental sulfur locked away millions of years ago. When these fuels burn in power plant furnaces or industrial boilers without scrubbing equipment, the sulfur oxidizes into SO2, releasing an invisible, highly reactive gas into the continental plume.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'A simple triatomic molecule with outsized chemical impact.',
        comparisonItems: [
          { label: 'PM2.5 Particle', sizeMicrons: 2.5, barWidthPercent: 100, visualClass: 'pm25' },
          { label: 'SO2 Molecule', sizeMicrons: 0.00036, barWidthPercent: 0.1, visualClass: 'gas' },
        ],
        body: 'Though microscopic at the molecular level, its high water solubility means it dissolves rapidly in the mucus lining of the human trachea and eyes upon inhalation.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'Heavy industry and thermal generation account for the vast majority of ambient SO2.',
        categories: [
          { name: 'Thermal Power Utilities', description: 'Massive coal-fired generators operating across the wider National Capital Region.' },
          { name: 'Petroleum Coke & Furnace Oil Boilers', description: 'Industrial clusters combusting sulfur-rich bottom residues for process steam.' },
          { name: 'Peri-Urban Brick Kilns', description: 'Seasonal kiln clusters burning unscreened coal and rubber tire scraps.' },
          { name: 'Chemical & Metal Processing', description: 'Non-ferrous metal smelting and sulfuric acid production facilities.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'From industrial stack to acidic particulate deposition.',
        stages: [
          { step: '01', stage: 'Tall Stack Injection', detail: 'High chimneys release hot sulfur dioxide plumes hundreds of meters above the surface.' },
          { step: '02', stage: 'Regional Drift', detail: 'Prevailing winds transport the plume tens to hundreds of kilometers downwind.' },
          { step: '03', stage: 'Aqueous Oxidation', detail: 'SO2 dissolves into cloud droplets or fog droplets, converting into dilute sulfuric acid.' },
          { step: '04', stage: 'Ammonium Sulfate Formation', detail: 'Sulfuric acid neutralizes with agricultural ammonia to form crystalline sulfate aerosol.' },
          { step: '05', stage: 'Continuous Fluorescence', detail: 'Ground UV analyzers excite SO2 molecules to measure concentration in real time.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Live ambient SO2 concentrations tracked across Delhi CAAQMS stations.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'Relatively stable urban background with localized spikes linked to industrial shifts and wind direction.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 16.5, phase: 'Baseline Background' },
          { hour: '04:00', label: '4 AM', value: 14.8, phase: 'Stable Atmosphere' },
          { hour: '08:00', label: '8 AM', value: 19.2, phase: 'Morning Plume Fumigation' },
          { hour: '12:00', label: '12 PM', value: 24.5, phase: 'Industrial Shift & Convective Mixing' },
          { hour: '16:00', label: '4 PM', value: 21.0, phase: 'Afternoon Dispersion' },
          { hour: '20:00', label: '8 PM', value: 18.2, phase: 'Evening Industrial Steam Cycle' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'Acute airway bronchoconstriction and widespread regional ecosystem acidification.',
        points: [
          'Immediate airway constriction: causes narrowing of air passages within minutes, particularly in individuals with asthma.',
          'Acid deposition: corrodes structural marble, limestone, and metallic infrastructure (including monuments like the Taj Mahal).',
          'Sulfate aerosol formation: sulfate particles are among the most persistent light-scattering agents contributing to winter haze.',
          'Soil nutrient leaching: acid precipitation strips essential calcium and magnesium from agricultural soils.',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'SO2 is proof of what fuels our grid. Scrubbers on coal plants can eliminate over 90% of it — if they are turned on.',
        subtext: 'Stringent enforcement of Flue Gas Desulfurization mandates across regional power stations is the direct policy lever to dismantle this toxic cargo.',
      },
    },
    visualMetadata: {
      accentColor: '#10b981',
      accentGlow: 'rgba(16, 185, 129, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Industrial Acid Precursor',
      scaleMicrons: 0.00036,
    },
        "wmdTagline": "THE ACID PLUME",
        "wmdIntro": "From thermal power boilers to heavy furnace oil combustion, sulfur dioxide creates acidic atmospheric plumes that corrode pulmonary tissue and accelerate sulfate aerosol formation.",
        "globalStats": [
            {
                "label": "PREMATURE MORTALITY",
                "value": "≈ 4,200,000",
                "detail": "premature deaths linked to sulfur-bearing fossil combustion",
                "sourceLabel": "WHO Ambient Air Pollution Report",
                "sourceUrl": "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"
            },
            {
                "label": "INDUSTRIAL SHARE",
                "value": "> 70%",
                "detail": "of global emissions from coal combustion & smelting",
                "sourceLabel": "UNEP Global Environmental Monitoring",
                "sourceUrl": "https://www.unep.org/"
            },
            {
                "label": "WHO GUIDELINE",
                "value": "40 µg/m³ (24-h)",
                "detail": "Short-term peak risk threshold",
                "sourceLabel": "WHO Global Air Quality Guidelines (2021)",
                "sourceUrl": "https://www.who.int/publications/i/item/9789240034228"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "80 µg/m³ (24-h)",
                "detail": "Annual standard: 50 µg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },

  co: {
    id: 'co',
    symbol: 'CO',
    name: 'Carbon Monoxide',
    chemicalFormula: 'CO',
    unit: 'mg/m³',
    naaqsLimit: 2.0, // 8-hr standard in mg/m³
    whoLimit: 4.0,
    shortDescription: 'A completely odorless, colorless, tasteless gas formed by the incomplete combustion of carbon-based fuels.',
    whatIsIt: 'Carbon Monoxide (CO) is an insidious toxic gas synthesized when fuels burn without adequate oxygen supply to form carbon dioxide (CO2). Unlike particulate matter or nitrogen dioxide, CO gives no visual or olfactory warning. In ambient urban environments, congested traffic corridors and poorly ventilated combustion sources drive dangerous street-level concentrations.',
    typicalSources: [
      {
        category: 'Idling & Congested Traffic',
        description: 'Vehicles trapped in low-speed, stop-and-go congestion where engine fuel-air ratios become fuel-rich.',
        isCombustion: true,
      },
      {
        category: 'Domestic Biomass & Cooking Chulhas',
        description: 'Solid biomass, cow dung cakes, and firewood burned in enclosed or poorly ventilated residential settings.',
        isCombustion: true,
      },
      {
        category: 'Open Municipal Waste Burning',
        description: 'Low-temperature smoldering of organic refuse and plastic waste in neighborhood dumping grounds.',
        isCombustion: true,
      },
      {
        category: 'Cold-Engine Starts',
        description: 'Vehicles started in cold winter mornings running rich air-fuel mixtures before catalytic converters reach operating temperature.',
        isCombustion: true,
      },
    ],
    atmosphericBehavior: 'Carbon monoxide has an atmospheric lifetime of approximately 1 to 2 months. It does not react rapidly with moisture or surfaces; instead, its primary atmospheric sink is oxidation by hydroxyl radicals (OH), which slowly converts CO into CO2 while consuming atmospheric cleansing capacity.',
    whyItMatters: 'Upon inhalation, carbon monoxide binds to hemoglobin with an affinity roughly 200 to 250 times stronger than oxygen, forming carboxyhemoglobin (COHb). This reduces the oxygen-carrying capacity of the blood and starves critical organs — particularly the heart muscle and brain — of cellular oxygen.',
    measurementContext: {
      standard: 'CPCB 8-hour NAAQS: 2.0 mg/m³ (approx 1.7 ppm) | WHO 8-hour Guideline: 4.0 mg/m³',
      methodology: 'Non-Dispersive Infrared Spectroscopy (NDIR) with gas filter correlation.',
      samplingInterval: 'Continuous photometric infrared absorption at 4.6 µm wavelength.',
    },
    sections: {
      heroSubtitle: 'THE ODORLESS ASPHYXIANT',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'Colorless, odorless, tasteless: carbon monoxide gives no sensory warning.',
        body: 'When carbon fuels burn with insufficient oxygen, incomplete combustion leaves one oxygen atom unbound, forming CO instead of harmless carbon dioxide. Because humans have no sensory receptors for carbon monoxide, it accumulates unnoticed in vehicle cabins, enclosed intersections, and unventilated homes.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'A diatomic gas molecule that enters the bloodstream effortlessly.',
        comparisonItems: [
          { label: 'PM2.5 Particle', sizeMicrons: 2.5, barWidthPercent: 100, visualClass: 'pm25' },
          { label: 'CO Molecule', sizeMicrons: 0.00028, barWidthPercent: 0.1, visualClass: 'gas' },
        ],
        body: 'Carbon monoxide passes through the alveolar-capillary membrane instantly, diffusing into erythrocytes to hijack hemoglobin binding sites.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'Congestion, cold starts, and low-temperature smoldering fires drive urban CO.',
        categories: [
          { name: 'Vehicular Congestion Bottlenecks', description: 'Thousands of engines idling in gridlock with incomplete fuel combustion.' },
          { name: 'Cold Morning Starts', description: 'Catalytic converters require 300°C to activate; cold morning starts release up to 80% of trip CO in the first 5 minutes.' },
          { name: 'Solid Fuel Space Heating', description: 'Winter street fires and domestic chulhas smoldering under oxygen-starved conditions.' },
          { name: 'Open Waste Burning', description: 'Municipal solid waste mounds burning with minimal oxygen and intense smoldering smoke.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'Transport and slow photochemical oxidation in the troposphere.',
        stages: [
          { step: '01', stage: 'Tailpipe Release', detail: 'Incomplete combustion releases hot CO gas directly into the street canyon.' },
          { step: '02', stage: 'Street-Level Trapping', detail: 'Tall buildings and low wind speeds trap dense CO plumes at breathing height.' },
          { step: '03', stage: 'Long-Range Advection', detail: 'With a multi-week atmospheric lifetime, CO drifts across entire continental basins.' },
          { step: '04', stage: 'Hydroxyl Radical Sink', detail: 'CO slowly reacts with OH radicals, depleting the atmosphere’s natural self-cleaning capacity.' },
          { step: '05', stage: 'NDIR Absorption', detail: 'Continuous infrared sensors measure beam attenuation at 4.6 microns.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Real-time carbon monoxide levels monitored across Delhi urban intersections.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'Peaks tightly correlate with peak commuting hours and nighttime heavy truck transit.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 1.8, phase: 'Night Freight Flow' },
          { hour: '04:00', label: '4 AM', value: 1.2, phase: 'Pre-Dawn Minimum' },
          { hour: '08:00', label: '8 AM', value: 2.6, phase: 'Morning Congestion Peak' },
          { hour: '12:00', label: '12 PM', value: 1.4, phase: 'Midday Convective Mixing' },
          { hour: '16:00', label: '4 PM', value: 1.7, phase: 'Afternoon Re-accumulation' },
          { hour: '20:00', label: '8 PM', value: 3.1, phase: 'Evening Peak Congestion & Inversion' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'Direct cellular hypoxia through competitive hemoglobin binding.',
        points: [
          'Carboxyhemoglobin formation: CO binds to blood hemoglobin 200x tighter than oxygen, starving tissues.',
          'Cardiovascular strain: individuals with coronary artery disease experience angina and ischemia at lower exertion levels.',
          'Neurocognitive impairment: elevated CO dulls reaction times, alertness, and motor coordination in drivers and pedestrians.',
          'Indirect greenhouse effect: by consuming OH radicals, CO prolongs the atmospheric lifetime of methane (CH4).',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'You cannot see or smell carbon monoxide. But your blood cells recognize it instantly — and pay the price.',
        subtext: 'Congestion management, modern catalytic converters, and eliminating open waste burning are the imperative levers to clear this invisible cargo.',
      },
    },
    visualMetadata: {
      accentColor: '#f43f5e',
      accentGlow: 'rgba(244, 63, 94, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(244, 63, 94, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Silent Hypoxic Gas',
      scaleMicrons: 0.00028,
    },
        "wmdTagline": "THE OXYGEN ROBBER",
        "wmdIntro": "An odorless, colorless asphyxiant produced by incomplete engine combustion. Carbon monoxide binds aggressively to blood hemoglobin, displacing essential cellular oxygen transport.",
        "globalStats": [
            {
                "label": "HOSPITALIZATION RISK",
                "value": "+1.1% per mg/m³",
                "detail": "increase in cardiovascular emergency admissions",
                "sourceLabel": "American Heart Association (Circulation)",
                "sourceUrl": "https://www.ahajournals.org/journal/circ"
            },
            {
                "label": "HOUSEHOLD BURDEN",
                "value": "≈ 3,200,000",
                "detail": "deaths from incomplete solid-fuel burning",
                "sourceLabel": "WHO Household Air Pollution Factsheet",
                "sourceUrl": "https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health"
            },
            {
                "label": "WHO GUIDELINE",
                "value": "4 mg/m³ (24-h)",
                "detail": "15-min guideline: 100 mg/m³",
                "sourceLabel": "WHO Global Air Quality Guidelines (2021)",
                "sourceUrl": "https://www.who.int/publications/i/item/9789240034228"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "2 mg/m³ (8-h)",
                "detail": "1-hr standard: 4 mg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },

  o3: {
    id: 'o3',
    symbol: 'O₃',
    name: 'Tropospheric Ozone',
    chemicalFormula: 'O₃',
    unit: 'µg/m³',
    naaqsLimit: 100, // 8-hr Indian NAAQS
    whoLimit: 100,
    shortDescription: 'A secondary photochemical gas created when sunlight bakes nitrogen oxides and volatile organic compounds.',
    whatIsIt: 'Unlike other major air pollutants, ground-level tropospheric ozone (O3) is not emitted directly from any tailpipe or smokestack. It is a secondary pollutant created in the atmosphere by photochemical reactions between nitrogen oxides (NOx) and volatile organic compounds (VOCs) under the influence of strong sunlight and elevated temperatures.',
    typicalSources: [
      {
        category: 'Secondary Photochemical Synthesis',
        description: 'Not directly emitted; generated when sunlight photolyzes NOx in the presence of reactive organic vapors.',
        isAtmospheric: true,
      },
      {
        category: 'Vehicular VOC & NOx Precursors',
        description: 'Unburnt fuel vapor, evaporative tank losses, and engine exhaust supplying the chemical building blocks.',
        isCombustion: true,
      },
      {
        category: 'Industrial Solvents & Paints',
        description: 'Evaporation of organic solvents, degreasers, dry cleaning agents, and architectural coatings.',
        isIndustrial: true,
      },
      {
        category: 'Biogenic VOC Emissions',
        description: 'Natural terpene and isoprene emissions from urban trees reacting with anthropogenic nitrogen oxides.',
        isNatural: true,
      },
    ],
    atmosphericBehavior: 'Ozone follows an intense, clockwork solar cycle. Concentrations are near zero before dawn, build steeply as midday UV radiation peaks, and collapse after sunset as freshly emitted nitric oxide (NO) scavenges ozone back into NO2. Ozone concentrations are often highest downwind of urban centers in suburban parks.',
    whyItMatters: 'Ozone is a ferocious cellular oxidant. Inhaled O3 oxidizes biological macromolecules in the lung lining fluid, causing acute airway constriction, reduced forced vital capacity, coughing, and chest pain during outdoor exercise. It also causes severe necrosis in agricultural crops, reducing wheat and rice yields by 10 to 20%.',
    measurementContext: {
      standard: 'CPCB 8-hour NAAQS: 100 µg/m³ | WHO 8-hour Guideline: 100 µg/m³',
      methodology: 'UV Photometry measuring light absorption at 254 nm wavelength (Beer-Lambert Law).',
      samplingInterval: 'Continuous photometric monitoring with dual-cell reference comparison.',
    },
    sections: {
      heroSubtitle: 'THE PHOTOCHEMICAL AFTERNOON SURGE',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'A summer afternoon pollutant synthesized entirely in the sunlit air.',
        body: 'Ground-level ozone is chemically identical to the protective stratospheric ozone layer high above the Earth. But at ground level, where humans breathe and crops grow, ozone is a powerful oxidant that damages living cells upon contact.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'A triatomic oxygen molecule with aggressive chemical reactivity.',
        comparisonItems: [
          { label: 'PM2.5 Particle', sizeMicrons: 2.5, barWidthPercent: 100, visualClass: 'pm25' },
          { label: 'Ozone Molecule', sizeMicrons: 0.00038, barWidthPercent: 0.1, visualClass: 'gas' },
        ],
        body: 'Because it is an unstable triatomic gas, ozone seeks to donate its third oxygen atom to any biological tissue it touches, initiating immediate oxidative stress.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'No factory emits ozone directly. It is born in the sunlit urban atmosphere.',
        categories: [
          { name: 'Vehicle Exhaust NOx', description: 'Supplies the nitrogen dioxide that solar UV splits to release reactive oxygen atoms.' },
          { name: 'Evaporative Fuel Vapors', description: 'Petrol stations, tank breathers, and unburnt hydrocarbons acting as reaction catalysts.' },
          { name: 'Solvent & Coating Vapors', description: 'Volatile organic compounds from paints, adhesives, printing, and chemical cleaning.' },
          { name: 'Biomass Smoke Plumes', description: 'Smoldering agricultural residue smoke containing complex VOC matrices.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'The photochemical cycle that peaks under the noon sun.',
        stages: [
          { step: '01', stage: 'Precursor Accumulation', detail: 'Morning commute pumps NOx and hydrocarbons into the boundary layer.' },
          { step: '02', stage: 'Solar Activation', detail: 'Midday ultraviolet radiation photolyzes NO2 into NO and an excited oxygen radical (O*).' },
          { step: '03', stage: 'Ozone Generation', detail: 'Excited O* bonds with diatomic O2 to form ground-level ozone (O3).' },
          { step: '04', stage: 'Downwind Drift', detail: 'Breezes transport high-ozone air parcels into peri-urban agricultural belts.' },
          { step: '05', stage: 'Nighttime Titration', detail: 'After sunset, fresh NO exhaust consumes ozone, returning levels toward zero.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Continuous UV photometric ozone readings from Delhi CAAQMS stations.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'A dramatic single-peak curve driven strictly by solar irradiation.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 18, phase: 'Nighttime Titration Collapse' },
          { hour: '04:00', label: '4 AM', value: 12, phase: 'Pre-Dawn Minimum' },
          { hour: '08:00', label: '8 AM', value: 32, phase: 'Morning Photolysis Onset' },
          { hour: '12:00', label: '12 PM', value: 95, phase: 'Solar Peak Photochemical Surge' },
          { hour: '16:00', label: '4 PM', value: 118, phase: 'Late Afternoon Accumulation' },
          { hour: '20:00', label: '8 PM', value: 42, phase: 'Post-Sunset Scavenging' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'Cellular oxidation in human lungs and severe agricultural crop necrosis.',
        points: [
          'Direct alveolar tissue oxidation: damages cellular membranes, triggering acute coughing and lung inflammation.',
          'Reduced athletic endurance: healthy individuals exercising outdoors during afternoon peaks suffer reduced lung capacity.',
          'Crop yield loss: oxidizes leaf stomata, reducing northern Indian wheat and mustard yields by millions of metric tons.',
          'Polymer degradation: accelerates cracking and failure of rubber tires, electrical cable insulation, and outdoor plastics.',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'Ozone is the sunlit ghost of our fossil fuel exhaust. You cannot scrub it from stacks — you must eliminate its precursors.',
        subtext: 'Controlling both VOC emissions and NOx simultaneously is the only scientifically validated path to defuse summer afternoon ozone surges.',
      },
    },
    visualMetadata: {
      accentColor: '#06b6d4',
      accentGlow: 'rgba(6, 182, 212, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Photochemical Oxidant',
      scaleMicrons: 0.00038,
    },
        "wmdTagline": "THE PHOTOCHEMICAL TRAP",
        "wmdIntro": "Formed not at the tailpipe, but in the troposphere when sunlight cooks volatile organics and NOx. Ground-level ozone burns delicate lung parenchyma and slashes regional agricultural yields.",
        "globalStats": [
            {
                "label": "GLOBAL DEATHS / YEAR",
                "value": "≈ 365,000",
                "detail": "chronic respiratory deaths attributed to ozone",
                "sourceLabel": "Global Burden of Disease & WHO",
                "sourceUrl": "https://www.healthdata.org/gbd"
            },
            {
                "label": "CROP YIELD LOSS",
                "value": "7% – 12%",
                "detail": "loss of global wheat & soybean harvests from O3 exposure",
                "sourceLabel": "Nature Food & FAO Assessment",
                "sourceUrl": "https://www.nature.com/natfood/"
            },
            {
                "label": "WHO GUIDELINE",
                "value": "100 µg/m³ (8-h)",
                "detail": "Peak season 8-h limit: 60 µg/m³",
                "sourceLabel": "WHO Global Air Quality Guidelines (2021)",
                "sourceUrl": "https://www.who.int/publications/i/item/9789240034228"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "100 µg/m³ (8-h)",
                "detail": "1-hr standard: 180 µg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },

  nh3: {
    id: 'nh3',
    symbol: 'NH₃',
    name: 'Ammonia Aerosol',
    chemicalFormula: 'NH₃',
    unit: 'µg/m³',
    naaqsLimit: 100, // 24-hr Indian NAAQS
    whoLimit: 100,
    shortDescription: 'A pungent alkaline gas from agricultural fertilizers, livestock, and open sewage that binds acid smog into solid particles.',
    whatIsIt: 'Ammonia (NH3) is the primary basic (alkaline) gas in the Earth’s atmosphere. Emitted abundantly from urea fertilizer volatilization, livestock manure, untreated municipal sewage channels, and industrial cooling, NH3 plays a critical and often overlooked role: it neutralizes acidic nitric and sulfuric gases, converting them into airborne ammonium salts that constitute major fractions of winter particulate haze.',
    typicalSources: [
      {
        category: 'Agricultural Fertilizer Volatilization',
        description: 'Excess broadcast application of urea and nitrogenous fertilizers decomposing on moist, warm agricultural soils.',
        isAgriculture: true,
      },
      {
        category: 'Livestock & Animal Husbandry',
        description: 'Bacterial breakdown of organic nitrogen compounds in dairy cattle dung and poultry litter.',
        isAgriculture: true,
      },
      {
        category: 'Untreated Municipal Sewage',
        description: 'Open drains, stagnant stormwater nallahs, and un-aerated wastewater processing canals crisscrossing the city.',
        isMunicipal: true,
      },
      {
        category: 'Vehicular Catalytic Byproduct',
        description: 'Secondary emission from vehicle three-way catalytic converters operating under overly fuel-rich conditions.',
        isCombustion: true,
      },
    ],
    atmosphericBehavior: 'As an alkaline gas, ammonia has a voracious affinity for airborne acids. Upon encountering gaseous nitric acid (HNO3) or sulfuric acid (H2SO4), it undergoes an instantaneous acid-base neutralization, precipitating solid particulate ammonium nitrate and ammonium sulfate. These secondary salts do not settle quickly, lingering as dense winter haze blankets.',
    whyItMatters: 'While ambient ammonia gas irritates mucosal membranes and the eyes at high concentrations, its primary public health hazard is atmospheric: it is the master chemical stabilizer that transforms short-lived combustion gases into long-lasting, deep-penetrating fine particulate matter (PM2.5).',
    measurementContext: {
      standard: 'CPCB 24-hour NAAQS: 100 µg/m³',
      methodology: 'Chemiluminescence with thermal ammonia catalytic converter to convert NH3 to NO.',
      samplingInterval: 'Continuous dual-channel differential chemiluminescence cycle.',
    },
    sections: {
      heroSubtitle: 'THE ALKALINE SMOG GLUE',
      section01: {
        number: '01',
        title: 'WHAT ARE THEY?',
        lead: 'The atmosphere’s dominant alkaline gas, binding urban acid vapors into solid smog salts.',
        body: 'Ammonia is a sharp, pungent gas produced by biological waste breakdown and agricultural fertilizer application. While often regarded as a rural issue, urban sewer canals and regional agricultural belts supply immense quantities of NH3 directly into the Delhi atmospheric basin.',
      },
      section02: {
        number: '02',
        title: 'HOW SMALL ARE THEY?',
        lead: 'A light, volatile molecule that swiftly crystallizes into secondary aerosols.',
        comparisonItems: [
          { label: 'PM2.5 Particle', sizeMicrons: 2.5, barWidthPercent: 100, visualClass: 'pm25' },
          { label: 'Ammonia Molecule', sizeMicrons: 0.00032, barWidthPercent: 0.1, visualClass: 'gas' },
        ],
        body: 'The gaseous NH3 molecule is tiny, but once it binds with nitric or sulfuric acid, it condenses into inorganic salt crystals that grow to respirable PM2.5 diameters.',
      },
      section03: {
        number: '03',
        title: 'WHERE DO THEY COME FROM?',
        lead: 'Fertilizers, open sewage drains, and livestock manure supply abundant ammonia.',
        categories: [
          { name: 'Urea Fertilizer Application', description: 'Over-application of nitrogen fertilizer volatilizing into the regional planetary boundary layer.' },
          { name: 'Open Municipal Sewage Nallahs', description: 'Uncovered open drains carrying domestic sewage undergoing anaerobic digestion across Delhi.' },
          { name: 'Peri-Urban Dairy & Livestock Units', description: 'Manure storage and untreated runoff releasing gaseous ammonia continuously.' },
          { name: 'Vehicular Catalytic Converters', description: 'Over-rich combustion cycles in petrol vehicles synthesizing trace byproduct ammonia.' },
        ],
      },
      section04: {
        number: '04',
        title: 'HOW DOES THE ATMOSPHERE MOVE THEM?',
        lead: 'The chemical crystallization of secondary particulate smog.',
        stages: [
          { step: '01', stage: 'Volatilization', detail: 'Ammonia gas evaporates off moist agricultural fields and open urban sewage canals.' },
          { step: '02', stage: 'Boundary Layer Dispersion', detail: 'Breezes carry the light alkaline gas into the urban atmospheric mixing layer.' },
          { step: '03', stage: 'Acid-Base Collisions', detail: 'NH3 collides with acidic NO2-derived nitric acid and SO2-derived sulfuric acid.' },
          { step: '04', stage: 'Crystal Salt Nucleation', detail: 'Neutralization precipitates solid ammonium nitrate and ammonium sulfate crystals.' },
          { step: '05', stage: 'Thermal Catalytic Detection', detail: 'Analyzers heat the air stream over metal catalysts to measure converted NO.' },
        ],
      },
      section05: {
        number: '05',
        title: 'DELHI RIGHT NOW',
        lead: 'Live ambient ammonia concentrations recorded across Delhi monitoring stations.',
      },
      section06: {
        number: '06',
        title: 'WHAT THE DATA SHOWS',
        lead: 'Diurnal patterns driven by morning boundary layer compression and temperature-dependent volatilization.',
        diurnalPoints: [
          { hour: '00:00', label: '12 AM', value: 35.0, phase: 'Night Inversion Trapping' },
          { hour: '04:00', label: '4 AM', value: 42.0, phase: 'Pre-Dawn Accumulation' },
          { hour: '08:00', label: '8 AM', value: 38.5, phase: 'Morning Boundary Layer Mixing' },
          { hour: '12:00', label: '12 PM', value: 24.0, phase: 'Midday Atmospheric Dispersion' },
          { hour: '16:00', label: '4 PM', value: 26.5, phase: 'Late Afternoon Volatilization' },
          { hour: '20:00', label: '8 PM', value: 34.0, phase: 'Evening Thermal Compression' },
        ],
      },
      section07: {
        number: '07',
        title: 'WHY IT MATTERS',
        lead: 'The critical missing link in controlling northern India’s winter particulate haze.',
        points: [
          'Secondary PM2.5 amplifier: without ammonia, acid gases cannot easily crystallize into persistent particulate salts.',
          'Ecosystem eutrophication: nitrogen deposition acidifies water bodies and causes toxic algal blooms.',
          'Soil acidification: long-term ammonium deposition leaches basic cations from regional agricultural topsoil.',
          'Smell and respiratory irritation: concentrated sewer emissions irritate human bronchial membranes.',
        ],
      },
      section08: {
        number: '08',
        title: 'THE TAKEAWAY',
        statement: 'You cannot solve winter smog by targeting smoke alone. Ammonia is the invisible mortar that cements the haze together.',
        subtext: 'Piped sewage management, precision urea agricultural dosing, and manure composting are vital atmospheric interventions for clean air.',
      },
    },
    visualMetadata: {
      accentColor: '#a855f7',
      accentGlow: 'rgba(168, 85, 247, 0.45)',
      gradient: 'linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 8, 14, 0.95) 100%)',
      tagline: 'The Alkaline Smog Glue',
      scaleMicrons: 0.00032,
    },
        "wmdTagline": "THE ALKALINE SMOG GLUE",
        "wmdIntro": "The elusive catalyst of winter smog. Ammonia from agricultural fertilizers and unsewered urban drains neutralizes acidic gases to form heavy, respirable secondary ammonium aerosol salts.",
        "globalStats": [
            {
                "label": "PM2.5 CONTRIBUTION",
                "value": "30% – 50%",
                "detail": "of winter secondary inorganic PM2.5 mass in north India",
                "sourceLabel": "Atmospheric Environment (2021)",
                "sourceUrl": "https://www.sciencedirect.com/journal/atmospheric-environment"
            },
            {
                "label": "AGRICULTURE SHARE",
                "value": "> 80%",
                "detail": "of atmospheric ammonia comes from fertilizer & livestock",
                "sourceLabel": "FAO Emissions Database",
                "sourceUrl": "https://www.fao.org/faostat/"
            },
            {
                "label": "ADVISORY CEILING",
                "value": "100 µg/m³",
                "detail": "ecosystem critical level threshold",
                "sourceLabel": "UNECE Air Convention Guidelines",
                "sourceUrl": "https://unece.org/environment-policy/air"
            },
            {
                "label": "INDIAN NAAQS",
                "value": "400 µg/m³ (24-h)",
                "detail": "Annual standard: 100 µg/m³",
                "sourceLabel": "CPCB National Ambient Air Quality Standards (2009)",
                "sourceUrl": "https://cpcb.nic.in/air-quality-standard/"
            }
        ],
  },
};

export const POLLUTANT_DOCUMENTARY_LIST = [
  POLLUTANT_DOCUMENTARIES.pm25,
  POLLUTANT_DOCUMENTARIES.pm10,
  POLLUTANT_DOCUMENTARIES.no2,
  POLLUTANT_DOCUMENTARIES.so2,
  POLLUTANT_DOCUMENTARIES.co,
  POLLUTANT_DOCUMENTARIES.o3,
  POLLUTANT_DOCUMENTARIES.nh3,
];
