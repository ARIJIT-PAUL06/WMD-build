import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ParticleTerrainCanvas from './ParticleTerrainCanvas';
import ParticleWaveCanvas from './ParticleWaveCanvas';
import StatsEvaluationPlots from './StatsEvaluationPlots';
import statsData from '../../data/statsModelMetrics.json';
import './StatsPage.css';

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
  const [activeDatasetSubset, setActiveDatasetSubset] = useState('ALL');
  const [activeSeason, setActiveSeason] = useState('ALL');

  // Enforce scroll reset when mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  // GSAP ScrollTrigger Choreography
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        // Hero typography reveal
        gsap.from('.stats-instrument-header', {
          opacity: 0,
          y: 28,
          duration: 1.1,
          ease: 'power3.out',
        });

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
    sample_observations,
  } = statsData;

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
      <div className="stats-laboratory-grid-bg" aria-hidden="true" />

      {/* TOP-LEFT CIRCULAR BACK BUTTON (Framer Motion Enhanced) */}
      <div className="stats-back-button-root">
        <motion.button
          type="button"
          className="stats-back-button"
          onClick={handleGoBack}
          aria-label="Go back to dashboard"
          id="stats-back-btn"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
        >
          <ArrowLeft className="stats-back-icon" aria-hidden="true" />
        </motion.button>
        <span className="stats-back-tooltip" role="tooltip">Return to Dashboard</span>
      </div>

      {/* TOP HUD / TELEMETRY STAMP */}
      <header className="stats-top-hud" aria-label="Instrumentation Telemetry">
        <span className="stats-hud-code">SYS-REF: 8:010:008</span>
        <span className="stats-hud-badge">ML INSTRUMENTATION</span>
      </header>

      <main className="stats-content-wrapper">
        {/* ================================================================= */}
        {/* 01. HERO — MODEL PERFORMANCE                                      */}
        {/* ================================================================= */}
        <section className="stats-hero-section" id="hero-performance" aria-label="Model Performance">
          <div className="stats-instrument-header">
            <div className="stats-telemetry-meta">
              <span className="stats-inst-id">SYS-ID: 3111 001 · PROD-SAGEMAKER</span>
              <h1 className="stats-inst-name">
                {`${model_metadata.model_framework.toUpperCase()} v${model_metadata.framework_version} — 48H SERVERLESS LEAD TIME REGRESSOR`}
              </h1>
            </div>
            <span className="stats-inst-ref-tag" aria-hidden="true">-8/7C6</span>
          </div>

          {/* Large 3D Particle Mountain Landscape */}
          <div className="stats-terrain-frame">
            <span className="stats-frame-crosshair crosshair-tl">+</span>
            <span className="stats-frame-crosshair crosshair-tr">+</span>
            <span className="stats-frame-crosshair crosshair-bl">+</span>
            <span className="stats-frame-crosshair crosshair-br">+</span>
            <ParticleTerrainCanvas height={480} />
          </div>

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
              <span className="stats-metric-value">{(model_metadata.r2_explained_variance * 100).toFixed(1)}%</span>
              <span className="stats-metric-sub">{`R² = ${model_metadata.r2_explained_variance}`}</span>
            </motion.div>

            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">TEST ACCURACY (±20 µg/m³)</span>
              <span className="stats-metric-value">{model_metadata.accuracy_within_20}%</span>
              <span className="stats-metric-sub">Within ±20 µg/m³ of truth</span>
            </motion.div>

            <motion.div className="stats-metric-cell" variants={metricItemVariants}>
              <span className="stats-metric-label">TEST ACCURACY (±40 µg/m³)</span>
              <span className="stats-metric-value">{model_metadata.accuracy_within_40}%</span>
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
        <section className="stats-section" id="dataset-structure" aria-label="Dataset Architecture">
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">02 / ARCHIVE DISTRIBUTION</span>
              <h2 className="stats-section-headline">Training Dataset Structure</h2>
            </div>
            <span className="stats-section-coord">LAT: 28.40N–28.85N / LON: 76.90E–77.40E</span>
          </div>

          {/* Interactive Subset Filter Controls */}
          <div className="stats-filter-controls-row">
            <div className="stats-filter-pill-group" role="tablist" aria-label="Dataset perspective filter">
              {[
                { key: 'ALL', label: 'Full Archive Lattice (332k Pairs)' },
                { key: 'TRAIN', label: '80% Train Subset' },
                { key: 'TEST', label: '20% Held-Out Horizon' },
              ].map((btn) => {
                const isActive = activeDatasetSubset === btn.key;
                return (
                  <button
                    key={btn.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`stats-filter-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveDatasetSubset(btn.key)}
                  >
                    {isActive && (
                      <motion.div
                        className="stats-filter-pill-bg"
                        layoutId="datasetFilterPillBg"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="stats-filter-caption">CPCB REGULATORY ARCHIVE TELEMETRY</span>
          </div>

          {/* Secondary Particle Wave Visualization */}
          <div className="stats-dataset-canvas-wrap">
            <span className="stats-frame-crosshair crosshair-tl">+</span>
            <span className="stats-frame-crosshair crosshair-tr">+</span>
            <span className="stats-frame-crosshair crosshair-bl">+</span>
            <span className="stats-frame-crosshair crosshair-br">+</span>
            <ParticleWaveCanvas
              height={360}
              mode="dataset"
              activeSubset={activeDatasetSubset}
            />
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
              <span className="stats-dset-val">{dataset_info.total_training_pairs.toLocaleString()}</span>
              <span className="stats-dset-detail">{`${dataset_info.total_hourly_records.toLocaleString()} Base Hourly Timestamps`}</span>
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
        <section className="stats-section" id="model-evaluation" aria-label="Model Evaluation">
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">03 / EMPIRICAL EVALUATION</span>
              <h2 className="stats-section-headline">Verified Test-Set Diagnostics</h2>
            </div>
            <span className="stats-section-coord">N = 66,484 TEST INTERVALS</span>
          </div>

          <StatsEvaluationPlots
            errorDistribution={error_distribution}
            featureImportance={feature_importance}
            cascadingHorizons={cascading_horizons}
          />
        </section>

        {/* ================================================================= */}
        {/* 04. DATA DISTRIBUTION                                             */}
        {/* ================================================================= */}
        <section className="stats-section" id="data-distribution" aria-label="Data Distribution">
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">04 / TIME-SERIES LANDSCAPE</span>
              <h2 className="stats-section-headline">Historical Observation Distribution</h2>
            </div>
            <span className="stats-section-coord">DELHI NCR CAAQMS STATIONS</span>
          </div>

          {/* Seasonal Observation Selector */}
          <div className="stats-filter-controls-row">
            <div className="stats-filter-pill-group" role="tablist" aria-label="Seasonal envelope filter">
              {[
                { key: 'ALL', label: 'Continuous Archive' },
                { key: 'WINTER', label: 'Winter Inversions (Peak 350+)' },
                { key: 'SUMMER', label: 'Summer Dust Convection' },
                { key: 'MONSOON', label: 'Monsoon Washout (Low 30)' },
                { key: 'POST_MONSOON', label: 'Post-Monsoon Fires' },
              ].map((btn) => {
                const isActive = activeSeason === btn.key;
                return (
                  <button
                    key={btn.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`stats-filter-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSeason(btn.key)}
                  >
                    {isActive && (
                      <motion.div
                        className="stats-filter-pill-bg"
                        layoutId="seasonFilterPillBg"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="stats-filter-caption">GROUND OBSERVATION PROFILES</span>
          </div>

          <div className="stats-dist-canvas-wrap">
            <span className="stats-frame-crosshair crosshair-tl">+</span>
            <span className="stats-frame-crosshair crosshair-tr">+</span>
            <span className="stats-frame-crosshair crosshair-bl">+</span>
            <span className="stats-frame-crosshair crosshair-br">+</span>
            <ParticleWaveCanvas
              height={380}
              mode="distribution"
              observations={sample_observations}
              activeSeason={activeSeason}
            />
          </div>

          <div className="stats-dist-legend">
            <span>OBSERVATION TOPOGRAPHY: MULTI-YEAR AMBIENT PARTICULATE DYNAMICS (OCTOBER WINTER INVERSION PEAKS VS SUMMER MONSOON VALLEYS)</span>
            <span>2021-10-15 → 2023-08-15</span>
          </div>
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
                Degradation curve exhibits highest accuracy within +24h (MAE 24.3 µg/m³). Beyond +36h, uncertainty bands widen as weather advection predictions drift.
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
              <span className="stats-footer-meta-val">2026-10-08</span>
              <span className="stats-footer-meta-sub">04:07:52 UTC</span>
            </div>
          </div>

          <div className="stats-footer-bottom">
            <span className="stats-footer-brand">VAYUVITALS · ATMOSPHERIC RESEARCH INSTRUMENT</span>
            <span>Zero-Faking Directive · Verified Model Telemetry & Data Integrity</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
