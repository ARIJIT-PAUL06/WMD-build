# 🌿 VayuVitals 3D — Session Handover & Context Dossier

> **Created For:** Cross-Account / Cross-Session Context Continuity  
> **Repository:** `WMD` (WeMakeDevs — Bharat Builds Tour Event 02: Environmental Hacks — Track 01: Air)  
> **Status:** All core modules + Section 10 Petition & Action Module fully implemented and verified (`npm run build` passing).

---

## 1. Quick Resumption Prompt (Copy & Paste to New AI Session)

When you open a new chat session with your new account, simply paste this snippet:

```text
I am continuing development on "VayuVitals 3D" (WMD hackathon project). 
Please read HANDOVER_CONTEXT.md in the root directory to get full context on the architecture, current implementation state, and roadmap. 
Let me know when you have read it and are ready to proceed.
```

---

## 2. Project Architecture & Tech Stack

* **Frontend:**
  * React 19 + Vite (`src/App.jsx`, `src/main.jsx`).
  * Mapbox GL JS (`src/components/Heatmap/DelhiAqiHeatmap.jsx`) with custom continuous IDW spatial raster heatmap, zoom-adaptive contrast, and 3D buildings.
  * React Three Fiber / Three.js (`src/components/ThreeScene/`, `src/components/MotionHero/PanoramicScrollHero.jsx`).
  * PDF Generation: `jspdf` + `jspdf-autotable` (`src/components/Petition/pdfGenerator.js`).
  * Styling: Pure Vanilla CSS + Glassmorphism (`src/index.css`, `src/App.css`), Lucide icons.
* **Backend:**
  * Node.js / Express (`server/index.js`) running on port `3001`.
  * Telemetry Provider: Open-Meteo + CAAQMS 108 ground monitoring stations (`server/environmentalService.js`, `server/fusionAqiService.js`).
  * AI Layer: Dual-engine support:
    * Amazon Bedrock Claude 3 Haiku (`server/awsServices.js`).
    * Google Gemini 2.5/3.8 Flash (`server/geminiService.js`).
    * Deterministic offline rule fallback engine.
  * Database: AWS DynamoDB `AirQualityReadings` table (`server/awsServices.js`) with in-memory fallback.
* **Dev Scripts:**
  * `npm run dev`: Runs both API server (port 3001) and Vite (port 5173) concurrently.
  * `npm run dev:frontend`: Vite frontend only.
  * `npm run dev:server`: Express server only.
  * `npm run build`: Production bundle verification.

---

## 3. What Was Just Implemented: Section 10 "Petition & Action Module"

The app turns real-time and historical air quality data into an audit-grade, formal complaint/petition for schools, RWAs, and citizens without hunting for templates.

### Implemented Files:
1. **`src/data/authoritiesConfig.json`**:
   * Verified directory of 5 regulatory bodies: Directorate of Education (DoE Delhi), Delhi Pollution Control Committee (DPCC), Municipal Corporation of Delhi (MCD), Central Pollution Control Board (CPCB), CPGRAMS Central Portal.
   * Standard administrative mitigation demands + India DPDP Act 2023 legal notice.
2. **`server/evidenceService.js` & `src/components/Petition/petitionHelpers.js`**:
   * Computes $N$-day exceedance counts ($N/D$ school days crossing threshold).
   * Analyzes morning school hours window (07:00 – 13:00).
   * Identifies peak PM2.5, peak date, station distance, and model MAE error.
   * Client-side fallback guarantees 100% offline and instant execution.
3. **`src/components/Petition/pdfGenerator.js`**:
   * Generates a 2-page formal grievance dossier using `jspdf` and `jspdf-autotable`.
   * Page 1: Institutional header, reference ID, "Draft for Citizen Submission" banner, addressed authority, formal text, signatory block, and cryptographic provenance attestation.
   * Page 2: Annexure A empirical evidence appendix with KPI cards and day-by-day table of morning readings, peak concentrations, NAQI levels, and campus disruptions.
4. **`src/components/Petition/PetitionModal.jsx`**:
   * Full glassmorphic dual-pane workspace.
   * Guardrail banner: *"No automatic filing: The app prepares the draft; user reviews and submits via official portal/email."*
   * Interactive sliders (Days: 7–30, Threshold: 30–150 µg/m³), authority selector, demands checklist, sender credentials with DPDP Act consent.
   * Bilingual drafts: **English** and **Hindi (राजकीय/प्रशासनिक प्रारूप)**.
   * AI Tone Polish: Formal, Urgent Health Alert, or Collaborative Civic.
   * Multi-Channel Outputs:
     * 📥 **Download PDF Dossier**
     * 📋 **Copy Portal Text** (with real-time CPGRAMS 4,000-character counter)
     * ✉️ **Email Authority Draft** (auto-fills `mailto:` link)
     * 🌐 **Open Portal** (`pgportal.gov.in`, `edudel.nic.in`, `dpcc.delhigovt.nic.in`)
5. **`server/index.js`**:
   * `GET /api/petition/evidence`
   * `POST /api/petition/generate-draft`
   * `POST /api/petition/polish-draft` (Bedrock / Gemini / Rules)
6. **`src/components/Heatmap/DelhiAqiHeatmap.jsx`**:
   * Persistent **"Petition & Action"** button in the top action deck.
   * **"Draft Civic Petition for this Station"** button inside the selected station card in the Telemetry HUD.
   * Auto-prefills station name, locality, and PM2.5 values into the modal.

---

## 4. Machine Learning & AWS SageMaker Predictive Forecasting Pipeline

We implemented an end-to-end Machine Learning pipeline that monitors educational institutions across Delhi-NCR (schools, universities) for $X$ days, predicts upcoming 24–48h PM2.5 spikes (focusing on the vulnerable 07:00–13:00 arrival and school hours window), and injects advance predictive foresight directly into civic petitions.

### Key Components Built:
1. **Campus Network Directory (`src/data/schoolsDirectory.json`)**:
   * 8 vulnerable campuses across Delhi (DPS Rohini, Modern School Barakhamba, DAV Shreshtha Vihar, IIT Delhi, DU North Campus, Jamia Millia Islamia, Sardar Patel Vidyalaya, DPS R.K. Puram) mapped to CAAQMS ground stations and student populations.
2. **Telemetry Ingestion & Dataset Generator (`ml/collect_training_data.py`)**:
   * Collects multi-week hourly telemetry across institutions.
   * Stored in `ml/data/schools_telemetry_train.csv` (3,264 hourly records of PM2.5, PM10, temperature, humidity, wind speed, boundary layer height).
3. **AWS SageMaker Model Training (`ml/train_sagemaker_xgboost.py`)**:
   * Feature engineering: Autoregressive lags ($t-1, t-2, t-24$), 24h rolling stats, solar trigonometry ($\sin, \cos$ hour), planetary boundary layer height, and thermal inversion stagnation index.
   * Trained model evaluation: **MAE: 13.60 µg/m³, RMSE: 16.89 µg/m³**.
   * Saved artifacts: `ml/model/sagemaker_model_metadata.json`, `ml/model/xgboost_model.bin`, and packaged `ml/model/model.tar.gz`.
4. **AWS SageMaker Serverless Deployment Script (`ml/deploy_sagemaker_endpoint.py`)**:
   * Prepares S3 upload, creates SageMaker Model and Serverless Endpoint Config (`MemorySizeInMB: 2048`, `MaxConcurrency: 10`), and deploys/updates endpoint `vayuvitals-delhi-schools-xgboost`.
5. **Jupyter Demonstration Notebook (`ml/sagemaker_air_quality_forecasting.ipynb`)**:
   * Complete end-to-end notebook for hackathon judges covering problem definition, data ingestion, feature engineering, SageMaker training, evaluation, and live inference.
6. **Backend Predictive Service (`server/sagemakerService.js` & `server/index.js`)**:
   * Endpoint: `GET /api/petition/forecast?schoolId=...&lat=...&lon=...&threshold=...`
   * In live AWS mode: invokes AWS SageMaker Runtime via `@aws-sdk/client-sagemaker-runtime`.
   * In offline/local mode: executes physics-based forward diurnal inversion simulation with Open-Meteo forward weather.
7. **Predictive UI in `PetitionModal.jsx`**:
   * Campus Quick-Picker with 8 curated institutions.
   * "Step 1b: AWS SageMaker ML Forecast" card showing tomorrow morning arrival risk alert (07:00–09:00 AM), 48h school window predictions, and pre-emptive misting directives.
   * Toggle: "Include in Dossier (Annexure B)".
8. **Dossier Annexure B in `src/components/Petition/pdfGenerator.js`**:
   * 3-page PDF with Page 3 dedicated to Annexure B: Advance 48-Hour Sensor & ML Forecast, KPI cards, table of school operating windows, and SageMaker verification hash.

---

## 5. Environment Variables Checklist (`.env`)

The project is engineered with smart fallbacks and runs 100% out of the box locally even with empty keys. When connecting real cloud services, configure `.env`:

```env
PORT=3001
VITE_MAPBOX_TOKEN=your_mapbox_public_token_here

# Optional: Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Real AWS Services (DynamoDB, Bedrock, SageMaker)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
DYNAMODB_TABLE_NAME=AirQualityReadings
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
SAGEMAKER_ENDPOINT_NAME=vayuvitals-delhi-schools-xgboost
```

---

## 6. Potential Next Steps / Roadmap

1. **Live AWS Deployment**:
   * Run `python ml/deploy_sagemaker_endpoint.py` with AWS credentials to provision the live serverless endpoint on AWS SageMaker.
2. **Section 10 Step 5: Co-Sign & Signatures**:
   * Public petition campaign landing page with live signature counter.
   * Email OTP verification using AWS SES and DynamoDB `PetitionSignatures` table.
3. **AWS SAM / Cloud Deployment**:
   * Backend: Deploy via `aws/template.yaml` (`sam build && sam deploy --guided`).
   * Frontend: Deploy static bundle to S3 + CloudFront using `aws/deploy-s3-cloudfront.ps1`.
