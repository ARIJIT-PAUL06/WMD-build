/**
 * modelEvaluationService.test.js
 * The Stats page's held-out diagnostics must be recomputed from the real model + test partition
 * and must reproduce the metrics recorded at training time.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { computeModelEvaluation } from '../server/modelEvaluationService.js';

describe('Model evaluation service (held-out test set)', () => {
  let evaluation;
  let metadata;

  before(() => {
    evaluation = computeModelEvaluation();
    metadata = JSON.parse(fs.readFileSync('ml/model/sagemaker_forecast_metadata.json', 'utf8'));
  });

  it('1. Rebuilds the same 80/20 partition as ml/train_and_deploy_48h_model.py', () => {
    assert.equal(evaluation.totalPairs, metadata.sample_count);
    assert.equal(evaluation.trainPairs, Math.floor(metadata.sample_count * 0.8));
    assert.equal(evaluation.testPairs, metadata.sample_count - evaluation.trainPairs);
    assert.equal(evaluation.treeCount, 120);
  });

  it('2. Reproduces the training-time test metrics exactly', () => {
    assert.equal(evaluation.reproducesTrainingMetrics, true);
    assert.equal(evaluation.overall.mae, metadata.test_mae_ug_m3);
    assert.equal(evaluation.overall.rmse, metadata.test_rmse_ug_m3);
    assert.equal(evaluation.overall.r2, metadata.r2_explained_variance);
    assert.equal(evaluation.overall.acc_20, metadata.accuracy_within_20);
    assert.equal(evaluation.overall.acc_40, metadata.accuracy_within_40);
  });

  it('3. Feature importance is split frequency read from the model file', () => {
    const fi = evaluation.featureImportance;
    assert.equal(fi.length, metadata.features.length);
    assert.equal(fi.find((f) => f.feature === 'pm25_now').splits, 890);
    const total = fi.reduce((s, f) => s + f.importance, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, 'importances must sum to 1');
  });

  it('4. Per-horizon metrics and P10–P90 residual bands cover every trained horizon', () => {
    assert.deepEqual(evaluation.horizons.map((h) => h.lead_hours), [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 30, 36, 42, 48]);
    const n = evaluation.horizons.reduce((s, h) => s + h.n, 0);
    assert.equal(n, evaluation.testPairs);
    for (const h of evaluation.horizons) {
      assert.ok(h.log_residual_p10 < h.log_residual_p50 && h.log_residual_p50 < h.log_residual_p90);
      assert.ok(Math.abs(h.band_coverage_pct - 80) <= 1, `+${h.lead_hours}h band coverage ~80%`);
    }
  });

  it('5. Scatter sample is a stable set of 250 real held-out pairs', () => {
    assert.equal(evaluation.scatterSample.length, 250);
    const again = computeModelEvaluation();
    assert.deepEqual(again.scatterSample, evaluation.scatterSample);
    for (const p of evaluation.scatterSample) {
      assert.ok(p.actual > 0 && p.pred > 0);
    }
  });
});
