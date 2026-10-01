# 🌿 VayuVitals 3D — Real-Time Environmental Digital Twin on AWS

> **Built for WeMakeDevs — Bharat Builds Tour (Event 02: Environmental Hacks)**  
> **Track:** Track 01 — Air  
> **AWS Stack:** S3 · CloudFront · API Gateway · AWS Lambda · Amazon DynamoDB · Amazon Bedrock · AWS IoT Core Ready

---

## 🌟 Overview

**VayuVitals 3D** is an interactive 3D pulmonary digital twin that visually and dynamically reacts to live environmental telemetry:
* **Interactive 3D Anatomical Bio-Lungs & Bronchial Tree:**
  * **Good AQI (0–50):** Healthy glowing cyan/emerald appearance, clear translucent tissue, serene respiration rhythm.
  * **Moderate AQI (51–150):** Amber/ochre appearance, mild dust/pollen particles, elevated breathing frequency.
  * **Unhealthy to Severe Smog (151–500+):** Ashen soot charcoal with inflamed pulsating scarlet/crimson vascular filaments, distressed tachypnea, coughing spasms, and dense airborne particulate swarms (PM2.5 / PM10).
* **Interactive Controls:** Orbit rotation, mouse parallax tilt, scroll zoom, and a real-time **AQI Simulation Slider** for judges to test across all AQI zones instantly.
* **Amazon Bedrock AI Synthesis Layer:** Translates raw chemical sensor data into concise, human-readable respiratory impact explanations and student school commute safety advisories.
* **Amazon DynamoDB 24-Hour Synced History:** Stores historical readings and provides a 24-hour diurnal exposure arc.

---

## 🏗️ Architecture & Data Flow

```
[Hardware Sensor / Open-Meteo CPCB]
               │
               ▼ (REST or MQTT)
     [Amazon API Gateway / AWS IoT Core]
               │
               ▼
       [AWS Lambda Function] (Node.js 20.x)
          ├── 1. Fetches/Normalizes environmental pollutants (PM2.5, PM10, NO2, SO2, O3, CO)
          ├── 2. Persists reading to [Amazon DynamoDB] (AirQualityReadings table)
          └── 3. Invokes [Amazon Bedrock] (Claude 3 Haiku / Titan) for human-readable advisory
               │
               ▼ (JSON Telemetry Payload)
       [React Three Fiber 3D Frontend]
               ▲
               │
       [Amazon S3 + CloudFront CDN] (Global Edge Hosting)
```

---

## 🚀 Quick Start (Local Run)

The application includes an integrated AWS simulation engine, so it runs **100% out of the box** even without an AWS account:

```bash
# 1. Install dependencies (already completed)
npm install

# 2. Run both the API Server (port 3001) and Vite Frontend (port 5173) concurrently
npm run dev

# 3. Open in your browser:
# http://localhost:5173/
```

---

## ☁️ Connecting Your Live AWS Account (Optional)

When you're ready to connect to real AWS services, simply create/edit `.env`:

```env
PORT=3001
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
DYNAMODB_TABLE_NAME=AirQualityReadings
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

Once credentials are provided, the backend automatically connects to **real AWS DynamoDB** and **real Amazon Bedrock**!

---

## 📦 Production Deployment to AWS

### 1. Frontend: Deploy to Amazon S3 + CloudFront
```powershell
# Run the deployment script
.\aws\deploy-s3-cloudfront.ps1 -BucketName "your-s3-bucket-name" -DistributionId "YOUR_CF_DIST_ID"
```

### 2. Backend: Deploy via AWS SAM (API Gateway + Lambda + DynamoDB + Bedrock Policy)
```bash
cd aws
sam build
sam deploy --guided
```

---

## 🏆 Hackathon Rubric Alignment

| Judging Criteria | Implementation in VayuVitals 3D |
| :--- | :--- |
| **01. Idea and Impact** | Directly targets hyper-local pollution exposure, school commute warnings, and biological consequences of air pollution in Delhi and Indian cities. |
| **02. Built on AWS** | Employs AWS S3, CloudFront, API Gateway, Lambda, DynamoDB, Amazon Bedrock, and IoT Core sensor architecture. |
| **03. Design & Usability** | Ultra-responsive 3D WebGL hero, live slider for instant judge testing, glassmorphism UI, accessible typography, and intuitive city switching. |
| **04. Execution** | 100% working full-stack implementation with live CPCB Open-Meteo feeds, DynamoDB historical tracking, and Bedrock AI layer. |
| **05. Demo Video** | Live 3D lungs reaction, slider demo, and transparent AWS Architecture Inspector modal ready for a 3-minute pitch. |
