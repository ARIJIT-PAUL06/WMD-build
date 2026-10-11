/**
 * statsPageVerification.test.js
 * Verification Test for Monochromatic Scientific Visualization Stats Page
 * Atmospheric Research Instrument & Machine Learning Evaluation System
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

describe('VayuVitals Monochromatic Scientific Stats Page Verification', () => {
  let viteServer;
  let StatsPage;
  let StatsPredictionHero;
  let StatsEvaluationPlots;
  let evaluation;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const statsMod = await viteServer.ssrLoadModule(
      './src/components/Stats/StatsPage.jsx'
    );
    StatsPage = statsMod.default;

    const heroMod = await viteServer.ssrLoadModule(
      './src/components/Stats/StatsPredictionHero.jsx'
    );
    StatsPredictionHero = heroMod.default;

    const plotsMod = await viteServer.ssrLoadModule(
      './src/components/Stats/StatsEvaluationPlots.jsx'
    );
    StatsEvaluationPlots = plotsMod.default;

    // Real held-out diagnostics, computed from the deployed model + its test partition
    const { computeModelEvaluation } = await import('../server/modelEvaluationService.js');
    evaluation = computeModelEvaluation();
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. StatsPage renders successfully without throwing errors', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('stats-page'), 'Should render root stats-page container');
    assert.ok(html.includes('stats-laboratory-grid-bg'), 'Should render laboratory grid background');
  });

  it('2. Section 01 (Hero — Model Performance) displays real model name, verified accuracy, and 48-Hour Prediction Hero', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('XGBOOST v1.7-1'), 'Hero must display actual XGBoost 1.7-1 model name');
    assert.ok(html.includes('48H SERVERLESS LEAD TIME REGRESSOR'), 'Must display 48h lead time regressor designation');
    assert.ok(html.includes('81.6%') || html.includes('0.8156'), 'Must display verified test R² explained variance (81.6%)');
    assert.ok(html.includes('54.3%'), 'Must display verified test accuracy within ±20 µg/m³ (54.3%)');
    assert.ok(html.includes('76.8%'), 'Must display verified test accuracy within ±40 µg/m³ (76.8%)');
    assert.ok(html.includes('27.92'), 'Must display verified test MAE (27.92 µg/m³)');
    assert.ok(html.includes('42.92'), 'Must display verified test RMSE (42.92 µg/m³)');
    assert.ok(!html.includes('-8/7C6'), 'Must remove synthetic decorator code -8/7C6');
    assert.ok(html.includes('AWS SAGEMAKER SERVERLESS · AP-SOUTH-1'), 'Must include authentic cloud telemetry AWS SageMaker Serverless');
    assert.ok(html.includes('stats-back-button'), 'Must include top-left circular back button');
    assert.ok(html.includes('prediction-hero-showcase'), 'Must render 48-hour prediction hero showcase');
    assert.ok(html.includes('48-Hour Forward PM2.5 Trajectory'), 'Must display 48-Hour Forward PM2.5 Trajectory USP');
    assert.ok(
      html.includes('Classification metrics (F1-Score / Precision / Recall / ROC) are not applicable'),
      'Must clearly label non-applicable metrics per Zero-Faking Directive'
    );
  });

  it('3. Section 02 (Dataset Visualization) displays authentic archive structure and split metadata', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('Training Dataset Structure'), 'Section 2 headline must be "Training Dataset Structure"');
    assert.ok(html.includes('xKDR &amp; Open-Meteo') || html.includes('xKDR & Open-Meteo'), 'Must reference xKDR and Open-Meteo');
    assert.ok(html.includes('332,416'), 'Must display verified 332,416 training pairs');
    assert.ok(html.includes('71,617'), 'Must display verified 71,617 base hourly records');
    assert.ok(html.includes('14 Variables'), 'Must display verified 14 engineered variables');
    assert.ok(html.includes('80% (265,932 pairs)'), 'Must display 80% train split');
    assert.ok(html.includes('20% (66,484 held-out pairs)'), 'Must display 20% test split');
    assert.ok(!html.includes('stats-dataset-canvas-wrap'), 'Must eliminate synthetic dataset particle wave canvas');
  });

  it('4. Section 03 (Model Evaluation) renders residual histogram, live calibration scatter, feature splits and horizons', () => {
    const pageHtml = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(pageHtml.includes('FIG. 01 / REGRESSION RESIDUALS'), 'Must render Fig 01 Residuals');
    assert.ok(pageHtml.includes('Absolute Error Distribution'), 'Must render absolute error distribution');
    assert.ok(pageHtml.includes('FIG. 02 / CALIBRATION SCATTER'), 'Must render Fig 02 Calibration Scatter');
    assert.ok(pageHtml.includes('FIG. 03 / FEATURE IMPORTANCE'), 'Must render Fig 03 Feature Importance');
    assert.ok(pageHtml.includes('FIG. 04 / TEMPORAL DEGRADATION'), 'Must render Fig 04 Temporal Horizon Table');
    assert.ok(pageHtml.includes('Loading held-out evaluation'), 'Before the evaluation API responds, plots show a loading state');
    assert.ok(!pageHtml.includes('8,248 splits'), 'Must not render the old hard-coded split count');

    const tableHorizons = evaluation.horizons.filter((h) => [1, 3, 6, 12, 24, 48].includes(h.lead_hours));
    const html = renderToString(
      React.createElement(StatsEvaluationPlots, {
        errorDistribution: [],
        featureImportance: evaluation.featureImportance,
        cascadingHorizons: tableHorizons,
        evaluation,
      })
    );

    assert.ok(html.includes(`R = ${evaluation.overall.pearson_r.toFixed(4)}`), 'Must display the measured Pearson R');
    assert.ok(html.includes(`N = ${evaluation.scatterSample.length} HELD-OUT OBS`), 'Scatter N must equal the plotted sample size');
    assert.ok(html.includes('PM25 NOW'), 'Must display PM25 NOW feature');
    assert.ok(html.includes('(890 splits)'), 'Must display the split count read from the model file');
    assert.ok(html.includes('+1h') && html.includes('+24h') && html.includes('+48h'), 'Must display evaluated horizons');
    const h24 = evaluation.horizons.find((h) => h.lead_hours === 24);
    assert.ok(html.includes(h24.mae.toFixed(2)), 'Horizon table must show the measured +24h MAE');
  });

  it('5. Prediction Hero & Zero-Synthetic Layout eliminates synthetic WebGL canvases and emphasizes USP', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(!html.includes('stats-terrain-frame'), 'Must eliminate synthetic mountain particle terrain');
    assert.ok(!html.includes('stats-dist-canvas-wrap'), 'Must eliminate Section 04 synthetic particle wave');
    assert.ok(html.includes('Calibration Scatter (R = '), 'Must include calibration scatter USP toggle');
    assert.ok(html.includes('CORE PREDICTIVE ENGINE (USP)'), 'Must highlight core predictive engine USP');
  });

  it('6. Section 05 (Technical Footer) provides lineage, AWS SageMaker architecture, and Zero-Faking declaration', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('XGBoost 1.7-1'), 'Footer must state XGBoost 1.7-1 architecture');
    assert.ok(html.includes('AWS SageMaker'), 'Footer must state AWS SageMaker');
    assert.ok(html.includes('Serverless Endpoint (ap-south-1)'), 'Footer must state serverless endpoint');
    assert.ok(html.includes('80/20 Chronological'), 'Footer must state chronological evaluation protocol');
    assert.ok(html.includes('2026-10-08'), 'Footer must state verified training date');
    assert.ok(html.includes('Zero-Faking Directive'), 'Footer must uphold Zero-Faking Directive');
  });

  it('7. StatsPredictionHero faithfully renders exact 48-hour continuous trajectory SVG, 4-tier legend, atmospheric pins, and calibration tab', () => {
    const html = renderToString(
      React.createElement(StatsPredictionHero, {
        forecastData: null,
        liveBaseline: 82,
        isLoading: false,
        onRefresh: () => {},
        lastRefreshedTime: '04:15:30 PM',
      })
    );

    assert.ok(html.includes('48-Hour Forward PM2.5 Trajectory'), 'Must render headline title');
    assert.ok(html.includes('Median Forecast Trajectory'), 'Must render Median Forecast Trajectory legend');
    assert.ok(!html.includes('Empirical Error Band'), 'Without evaluation data no error band is drawn');
    assert.ok(html.includes('Severe Smog Alert (250 µg/m³)'), 'Must render Severe Smog Alert (250 µg/m³)');
    assert.ok(html.includes('CPCB Clean Standard (60 µg/m³)'), 'Must render CPCB Clean Standard (60 µg/m³)');
    assert.ok(html.includes('DAY 1: NEXT 24 HOURS (PRIMARY WARNING WINDOW)'), 'Must render Day 1 operational header');
    assert.ok(html.includes('DAY 2: 24H TO 48H FORWARD LEAD HORIZON'), 'Must render Day 2 operational header');
    assert.ok(html.includes('+8h: INVERSION SPIKE 248'), 'Must render +8h Inversion Spike pin');
    assert.ok(html.includes('+18h: SOLAR VENTING 88'), 'Must render +18h Solar Venting pin');
    assert.ok(html.includes('+32h: DAY 2 CREST 195'), 'Must render +32h Day 2 Crest pin');
    assert.ok(html.includes('Calibration Scatter (R = …)'), 'Calibration tab shows a placeholder until evaluation loads');
    assert.ok(html.includes('NOW') && html.includes('+48h'), 'Must render X-axis time horizons NOW and +48h');
    assert.ok(html.includes('LIVE REFRESH'), 'Must render LIVE REFRESH button');
    assert.ok(html.includes('SYNCED 04:15:30 PM'), 'Must render SYNCED timestamp');
  });

  it('8. StatsPredictionHero draws the empirical P10–P90 band and measured R once evaluation data is present', () => {
    const html = renderToString(
      React.createElement(StatsPredictionHero, {
        forecastData: null,
        evaluation,
        isLoading: false,
      })
    );

    const coverage = (evaluation.horizons.reduce((s, h) => s + h.band_coverage_pct, 0) / evaluation.horizons.length).toFixed(0);
    assert.ok(html.includes(`P10–P90 Empirical Error Band (${coverage}% Held-Out Coverage)`), 'Must render empirical band legend');
    assert.ok(html.includes(`Calibration Scatter (R = ${evaluation.overall.pearson_r.toFixed(4)})`), 'Must render measured R in tab');
  });
});
