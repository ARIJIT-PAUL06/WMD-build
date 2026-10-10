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

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const statsMod = await viteServer.ssrLoadModule(
      './src/components/Stats/StatsPage.jsx'
    );
    StatsPage = statsMod.default;
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

  it('2. Section 01 (Hero — Model Performance) displays real model name, verified accuracy, and technical annotations', () => {
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
    assert.ok(html.includes('-8/7C6'), 'Must include technical reference annotation -8/7C6 from reference design');
    assert.ok(html.includes('8:010:008'), 'Must include technical coordinate code 8:010:008');
    assert.ok(html.includes('stats-back-button'), 'Must include top-left circular back button');
    assert.ok(html.includes('stats-terrain-frame'), 'Must render 3D particle terrain frame');
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
    assert.ok(html.includes('stats-dataset-canvas-wrap'), 'Must render particle wave canvas container');
  });

  it('4. Section 03 (Model Evaluation) renders real regression residual histogram, calibration scatter, and feature splits', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('FIG. 01 / REGRESSION RESIDUALS'), 'Must render Fig 01 Residuals');
    assert.ok(html.includes('Absolute Error Distribution'), 'Must render absolute error distribution');
    assert.ok(html.includes('FIG. 02 / CALIBRATION SCATTER'), 'Must render Fig 02 Calibration Scatter');
    assert.ok(html.includes('R = 0.9031') || html.includes('0.903'), 'Must display Pearson R correlation');
    assert.ok(html.includes('FIG. 03 / FEATURE IMPORTANCE'), 'Must render Fig 03 Feature Importance');
    assert.ok(html.includes('PM25 NOW'), 'Must display top feature PM25 NOW');
    assert.ok(html.includes('8,248 splits'), 'Must display actual split count 8,248 splits');
    assert.ok(html.includes('FIG. 04 / TEMPORAL DEGRADATION'), 'Must render Fig 04 Temporal Horizon Table');
    assert.ok(html.includes('+1h') && html.includes('+24h') && html.includes('+48h'), 'Must display cascading horizons');
  });

  it('5. Section 04 (Data Distribution) displays observation topography and multi-year temporal span', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('Historical Observation Distribution'), 'Must display historical distribution headline');
    assert.ok(html.includes('stats-dist-canvas-wrap'), 'Must render distribution particle canvas wrap');
    assert.ok(html.includes('2021-10-15 → 2023-08-15'), 'Must display observation time span');
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
});
