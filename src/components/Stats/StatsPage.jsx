import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import StatsPredictionHero from './StatsPredictionHero';
import StatsEvaluationPlots from './StatsEvaluationPlots';
import StatsGrain from './StatsGrain';
import statsData from '../../data/statsModelMetrics.json';
import { apiFetch } from '../../utils/apiFetch';
import './StatsPage.css';
import AppFooter from '../Footer/AppFooter';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * StatsPage
 * Cinematic, Interactive Scientific Visualization Experience
 * Atmospheric Research Instrument & Machine Learning Evaluation Architecture
 *
 * Tech Stack:
 * 1. WebGL + Three.js: Real-time 3D particle terrain, harmonic wave landscapes, mouse reactivity.
 * 2. GSAP + ScrollTrigger: Coordinated scroll choreography, camera perspective cues, section reveals.
 * 3. Framer Motion: React UI micro-interactions, metric entrances, filter pill toggles.
 */
export default function StatsPage({ onBack, onOpenDashboard }) {
  const pageRef = useRef(null);
  const [forecastData, setForecastData] = useState(null);
  const [liveDelhiTelemetry, setLiveDelhiTelemetry] = useState(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [lastRefreshedTime, setLastRefreshedTime] = useState(null);
  const [modelEvaluation, setModelEvaluation] = useState(null);
  const [evaluationError, setEvaluationError] = useState(null);

  // Enforce scroll reset when mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  // Fetch live Delhi telemetry and SageMaker/Local 48h ML forecast
  const fetchRealTimeStats = useCallback(async () => {
    setIsLoadingForecast(true);
    setForecastError(null);
    try {
      // 1. Ground baseline in empirical Delhi station readings
      let baselinePm25 = undefined;
      try {
        const heatmapRes = await apiFetch('/api/delhi-heatmap');
        if (heatmapRes.ok) {
          const heatmapJson = await heatmapRes.json();
          if (heatmapJson?.stations?.length > 0) {
            const valid = heatmapJson.stations.filter(
              (s) => typeof s.pm25 === 'number' && !isNaN(s.pm25)
            );
            if (valid.length > 0) {
              const avg = Math.round(
                valid.reduce((acc, s) => acc + s.pm25, 0) / valid.length
              );
              baselinePm25 = avg;
              setLiveDelhiTelemetry({
                meanPm25: avg,
                stationCount: valid.length,
                lastUpdated: heatmapJson.lastUpdated || new Date().toISOString(),
              });
            }
          }
        }
      } catch (e) {
        console.warn('[StatsPage] Live heatmap baseline fetch warning:', e);
      }

      // 2. Fetch 48-Hour multi-horizon forecast from SageMaker / Local native XGBoost
      const forecastUrl = baselinePm25 !== undefined
        ? `/api/sagemaker/forecast?basePm25=${baselinePm25}&lat=28.6139&lon=77.2090`
        : '/api/sagemaker/forecast?lat=28.6139&lon=77.2090';

      const forecastRes = await apiFetch(forecastUrl);
      if (!forecastRes.ok) {
        throw new Error(`Forecast service status: ${forecastRes.status}`);
      }
      const forecastJson = await forecastRes.json();
      if (forecastJson?.success) {
        setForecastData(forecastJson);
        const now = new Date();
        setLastRefreshedTime(
          now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } else {
        throw new Error(forecastJson?.error || 'Forecast retrieval failure');
      }
    } catch (err) {
      console.error('[StatsPage] Real-time forecast error:', err);
      setForecastError(err.message || 'Service offline');
    } finally {
      setIsLoadingForecast(false);
    }
  }, []);

  // Client-side auto-fetch on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchRealTimeStats();
    }
  }, [fetchRealTimeStats]);

  // Held-out test-set diagnostics computed server-side from the deployed model + its test partition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/model-evaluation');
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error || `Evaluation service status: ${res.status}`);
        if (!cancelled) setModelEvaluation(json);
      } catch (err) {
        console.error('[StatsPage] Model evaluation fetch error:', err);
        if (!cancelled) setEvaluationError(err.message || 'Evaluation service offline');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // GSAP ScrollTrigger Choreography
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        // Section header reveals on scroll
        const sections = gsap.utils.toArray('.stats-section');
        sections.forEach((sec) => {
          const header = sec.querySelector('.stats-section-header');
          if (header) {
            gsap.from(header, {
              scrollTrigger: {
                trigger: sec,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
              opacity: 0,
              y: 22,
              duration: 0.85,
              ease: 'power2.out',
            });
          }
        });
      }
    }, pageRef);

    return () => {
      ctx.revert();
    };
  }, []);

  // Async data changes section heights; recompute trigger offsets so reveals fire at the right scroll position
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(id);
  }, [modelEvaluation, forecastData, evaluationError, forecastError]);

  // Safe navigation back to previous route or default dashboard fallback
  const handleGoBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      const hasHistory = window.history.length > 1;
      if (hasHistory) {
        window.history.back();
        setTimeout(() => {
          const currentUrl = new URL(window.location);
          if (
            currentUrl.searchParams.get('page') === 'stats' ||
            currentUrl.searchParams.get('view') === 'stats' ||
            currentUrl.hash === '#stats'
          ) {
            if (onBack) {
              onBack();
            } else {
              currentUrl.searchParams.delete('page');
              currentUrl.searchParams.delete('view');
              currentUrl.hash = '';
              window.history.pushState({}, '', currentUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }
        }, 120);
        return;
      }
    }

    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('page');
      url.searchParams.delete('view');
      url.hash = '';
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onBack]);

  const {
    model_metadata,
    dataset_info,
    feature_importance,
    cascading_horizons,
    error_distribution,
  } = statsData;

  // Training timestamp of the deployed model (ISO, UTC)
  const [trainedDate, trainedClock = ''] = model_metadata.trained_at.split('T');
  const trainedTime = trainedClock.slice(0, 8);

  // Horizons shown in the FIG. 04 table, measured on the held-out test set
  const TABLE_HORIZONS = [1, 3, 6, 12, 24, 48];
  const evaluatedHorizons = (modelEvaluation?.horizons || []).filter((h) => TABLE_HORIZONS.includes(h.lead_hours));
  const horizon24h = modelEvaluation?.horizons?.find((h) => h.lead_hours === 24);

  // Staggered animation variants for Framer Motion metric cells
  const metricContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const metricItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className="stats-page" id="stats-page-root" ref={pageRef}>
      {/* Fine Laboratory Coordinate Grid Background */}
      <div className="stats-laboratory-grid-bg" aria-hidden="true">
        <StatsGrain />
      </div>

      <main className="stats-content-wrapper">
        {/* ================================================================= */}
        {/* 01. HERO — MODEL PERFORMANCE                                      */}
        {/* ================================================================= */}
        <section className="stats-hero-section" id="hero-performance" aria-label="Model Performance">
          {/* Top Integrated Navigation & Telemetry Row */}
          <div className="stats-hero-top-nav">
            <div className="stats-hero-nav-left">
              <button
                type="button"
                className="stats-back-button"
                onClick={handleGoBack}
                aria-label="Go back to dashboard"
                id="stats-back-btn"
              >
                <ArrowLeft className="stats-back-icon" aria-hidden="true" size={16} />
              </button>
              <span className="stats-inst-tag-line">
                CORE PREDICTIVE ENGINE (USP) · XGBOOST v1.7-1 · 48H SERVERLESS LEAD TIME REGRESSOR
              </span>
            </div>
            <div className="stats-hero-nav-right">
              <span className="stats-hud-code">AWS SAGEMAKER SERVERLESS · AP-SOUTH-1</span>
              <span className="stats-hud-badge">ML INSTRUMENTATION</span>
            </div>
          </div>

          {/* 48-Hour Forward Trajectory & Ground-Truth Calibration Showcase (Core USP) */}
          <StatsPredictionHero
            modelMetadata={model_metadata}
            cascadingHorizons={evaluatedHorizons.length > 0 ? evaluatedHorizons : cascading_horizons}
            evaluation={modelEvaluation}
            evaluationError={evaluationError}
            forecastData={forecastData}
            liveBaseline={liveDelhiTelemetry?.meanPm25}
            isLoading={isLoadingForecast}
            error={forecastError}
            onRefresh={fetchRealTimeStats}
            lastRefreshedTime={lastRefreshedTime}
          />

          {/* Model Performance Metrics Strip (Framer Motion Staggered Entrance) */}
          <motion.div
            className="stats-hero-metrics-strip"
            variants={metricContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">EXPLAINED VARIANCE (R²)</span>
              <span className="stats-metric-value">{`${(model_metadata.r2_explained_variance * 100).toFixed(1)}%`}</span>
              <span className="stats-metric-sub">{`R² = ${model_metadata.r2_explained_variance}`}</span>
            </motion.div>

            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">TEST ACCURACY (±20 µg/m³)</span>
              <span className="stats-metric-value">{`${model_metadata.accuracy_within_20}%`}</span>
              <span className="stats-metric-sub">Within ±20 µg/m³ of truth</span>
            </motion.div>

            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">TEST ACCURACY (±40 µg/m³)</span>
              <span className="stats-metric-value">{`${model_metadata.accuracy_within_40}%`}</span>
              <span className="stats-metric-sub">Wide industrial corridor</span>
            </motion.div>

            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">MEAN ABSOLUTE ERROR</span>
              <span className="stats-metric-value">{model_metadata.test_mae_ug_m3}</span>
              <span className="stats-metric-sub">µg/m³ (Held-out test set)</span>
            </motion.div>

            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">ROOT MEAN SQUARE (RMSE)</span>
              <span className="stats-metric-value">{model_metadata.test_rmse_ug_m3}</span>
              <span className="stats-metric-sub">µg/m³ (Held-out test set)</span>
            </motion.div>

            <div className="stats-regression-note">
              <span>Task: Continuous Regression (Objective: {model_metadata.objective} on {model_metadata.target_transform}) · Classification metrics (F1-Score / Precision / Recall / ROC) are not applicable to continuous real-valued PM2.5 forecasting.</span>
            </div>
          </motion.div>
        </section>

        {/* ================================================================= */}
        {/* 02. DATASET VISUALIZATION                                         */}
        {/* ================================================================= */}
        <section className="stats-section stats-section--parchment" id="dataset-structure" aria-label="Dataset Architecture">
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">02 / ARCHIVE DISTRIBUTION</span>
              <h2 className="stats-section-headline">Training Dataset Structure</h2>
            </div>
            <span className="stats-section-coord">LAT: 28.40N–28.85N / LON: 76.90E–77.40E</span>
          </div>

          {/* Dataset Archive Scope */}
          <div className="stats-filter-controls-row">
            <div className="stats-filter-pill-group">
              <div className="stats-filter-pill active">
                <span>Full Archive Lattice (332k Pairs)</span>
              </div>
            </div>
            <span className="stats-filter-caption">CPCB REGULATORY ARCHIVE TELEMETRY</span>
          </div>



          {/* Dataset Metadata Annotations */}
          <div className="stats-dataset-meta-grid">
            <div className="stats-dset-cell">
              <span className="stats-dset-label">DATASET SOURCE</span>
              <span className="stats-dset-val">xKDR & Open-Meteo</span>
              <span className="stats-dset-detail">CPCB Regulatory Network + Physics Reanalysis</span>
            </div>

            <div className="stats-dset-cell">
              <span className="stats-dset-label">TOTAL TRAINING PAIRS</span>
              <span className="stats-dset-val">{dataset_info.total_training_pairs.toLocaleString('en-US')}</span>
              <span className="stats-dset-detail">{`${dataset_info.total_hourly_records.toLocaleString('en-US')} Base Hourly Timestamps`}</span>
            </div>

            <div className="stats-dset-cell">
              <span className="stats-dset-label">ENGINEERED FEATURES</span>
              <span className="stats-dset-val">{`${dataset_info.feature_count} Variables`}</span>
              <span className="stats-dset-detail">Temporal, Solar, Boundary, Advection</span>
            </div>

            <div className="stats-dset-cell">
              <span className="stats-dset-label">DATE RANGE & SPLIT</span>
              <span className="stats-dset-val">2021 – 2023</span>
              <span className="stats-dset-detail">{`${dataset_info.train_split} / ${dataset_info.test_split}`}</span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 03. MODEL EVALUATION                                              */}
        {/* ================================================================= */}
        <section className="stats-section stats-section--deep" id="model-evaluation" aria-label="Model Evaluation">
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">03 / EMPIRICAL EVALUATION</span>
              <h2 className="stats-section-headline">Verified Test-Set Diagnostics</h2>
            </div>
            <span className="stats-section-coord">{`N = ${(modelEvaluation?.testPairs ?? 66484).toLocaleString('en-US')} TEST INTERVALS`}</span>
          </div>

          <StatsEvaluationPlots
            errorDistribution={error_distribution}
            featureImportance={modelEvaluation?.featureImportance || feature_importance}
            cascadingHorizons={evaluatedHorizons.length > 0 ? evaluatedHorizons : cascading_horizons}
            evaluation={modelEvaluation}
            evaluationError={evaluationError}
          />
        </section>



        {/* ================================================================= */}
        {/* 05. TECHNICAL TRANSPARENCY & FOOTER                               */}
        {/* ================================================================= */}
        <section className="stats-footer-section" id="technical-lineage" aria-label="Technical Metadata">
          {/* Editorial Technical Transparency Cards */}
          <div className="stats-transparency-grid">
            <div className="stats-transparency-card">
              <span className="stats-transparency-tag">PREPROCESSING & TRANSFORMS</span>
              <h3 className="stats-transparency-title">Target Log Scaling</h3>
              <p className="stats-transparency-body">
                Log1p target transform stabilizes variance across extreme winter spikes, ensuring model predictions remain physically non-negative.
              </p>
            </div>

            <div className="stats-transparency-card">
              <span className="stats-transparency-tag">CYCLIC ENCODING</span>
              <h3 className="stats-transparency-title">Solar & Diurnal Waves</h3>
              <p className="stats-transparency-body">
                Trigonometric sine/cosine projections encode diurnal boundary layer dynamics and annual meteorological seasonality without artificial discontinuities.
              </p>
            </div>

            <div className="stats-transparency-card">
              <span className="stats-transparency-tag">OPERATIONAL LIMITS</span>
              <h3 className="stats-transparency-title">Known Horizon Boundary</h3>
              <p className="stats-transparency-body">
                {`Degradation curve exhibits highest accuracy within +24h (MAE ${horizon24h ? horizon24h.mae.toFixed(1) : '24.3'} µg/m³). Beyond +36h, uncertainty bands widen as weather advection predictions drift.`}
              </p>
            </div>
          </div>

          {/* Footer Metadata Grid */}
          <div className="stats-footer-metadata-grid">
            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">ALGORITHM / ARCHITECTURE</span>
              <span className="stats-footer-meta-val">XGBoost 1.7-1</span>
              <span className="stats-footer-meta-sub">Tree Ensemble (120 Rounds, Depth 6)</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">TRAINING & SERVING</span>
              <span className="stats-footer-meta-val">AWS SageMaker</span>
              <span className="stats-footer-meta-sub">Serverless Endpoint (ap-south-1)</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">DATASET SOURCE</span>
              <span className="stats-footer-meta-val">CPCB & Open-Meteo</span>
              <span className="stats-footer-meta-sub">CAAQMS Telemetry + Reanalysis</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">EVALUATION PROTOCOL</span>
              <span className="stats-footer-meta-val">80/20 Chronological</span>
              <span className="stats-footer-meta-sub">Forward Multi-Horizon Log-Space</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">LAST VERIFIED TRAINING</span>
              <span className="stats-footer-meta-val">{trainedDate}</span>
              <span className="stats-footer-meta-sub">{`${trainedTime} UTC`}</span>
            </div>
          </div>

          <div className="stats-footer-bottom">
            <span className="stats-footer-brand">VAYUVITALS · ATMOSPHERIC RESEARCH INSTRUMENT</span>
            <span>Zero-Faking Directive · Verified Model Telemetry & Data Integrity</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </section>
      </main>

      {/* Shared VayuVitals Environmental Intelligence Footer */}
      <AppFooter
        currentRoute="statistics"
        onHome={onBack}
        onMap={onOpenDashboard}
        onStats={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onAbout={() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.set('page', 'about');
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }}
        onBackToCargo={() => {
          if (onBack) onBack();
          if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.delete('page');
            url.hash = '#pollutants';
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
            setTimeout(() => {
              const el = document.getElementById('atmospheric-cargo-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }
        }}
      />
    </div>
  );
}
