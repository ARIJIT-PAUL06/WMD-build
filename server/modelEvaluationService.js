/**
 * Model Evaluation Service
 * Recomputes held-out test-set diagnostics for the deployed 48h XGBoost forecast model.
 *
 * - Rebuilds the exact held-out test partition used by ml/train_and_deploy_48h_model.py
 *   (same source CSV, school grouping, timestamp sort, 3h stride, horizon list and 80/20 index split).
 * - Runs the saved model (ml/model/xgboost_forecast_model.json) over every test row.
 * - Derives calibration pairs, per-horizon error metrics, empirical residual quantiles and
 *   split-frequency feature importance directly from those artifacts. Nothing is hand-entered.
 *
 * Computed once per process and cached in memory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_REL = 'ml/data/multi_year_seasonal_train.csv';
const MODEL_REL = 'ml/model/xgboost_forecast_model.json';
const META_REL = 'ml/model/sagemaker_forecast_metadata.json';

// Must match ml/train_and_deploy_48h_model.py
const HORIZONS = [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 30, 36, 42, 48];
const STRIDE = 3;
const TRAIN_FRACTION = 0.8;
const FEATURE_COLUMNS = [
  'temperature', 'humidity', 'wind_speed', 'hour_sin', 'hour_cos',
  'doy_sin', 'doy_cos', 'is_winter', 'is_stubble_burning', 'is_school_rush'
];

const SCATTER_SAMPLE_SIZE = 250;
const SCATTER_SEED = 20261008; // fixed so the published sample is stable between requests

function resolveDataPath(relPath) {
  const localPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(localPath)) return localPath;
  const lambdaPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(lambdaPath)) return lambdaPath;
  return localPath;
}

// Minimal RFC 4180 line parser (school_name contains quoted commas)
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadRowsBySchool(csvPath) {
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const bySchool = new Map(); // insertion order mirrors Python dict order
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const sid = cells[col.school_id];
    if (!bySchool.has(sid)) bySchool.set(sid, []);
    bySchool.get(sid).push(cells);
  }
  return { bySchool, col };
}

// Rebuilds features exactly as the training script does (float32, log1p target)
function buildSamples(bySchool, col) {
  const features = [];
  const horizons = [];
  const targetsLog = [];
  const f32 = Math.fround;

  for (const rows of bySchool.values()) {
    rows.sort((a, b) => (a[col.timestamp] < b[col.timestamp] ? -1 : a[col.timestamp] > b[col.timestamp] ? 1 : 0));
    const n = rows.length;
    for (let t = 0; t < n - 48; t += STRIDE) {
      const nowRow = rows[t];
      const pm25Now = parseFloat(nowRow[col.pm2_5]);
      if (!(pm25Now > 0)) continue;
      const lat = parseFloat(nowRow[col.latitude]);
      const lon = parseFloat(nowRow[col.longitude]);

      for (const h of HORIZONS) {
        if (t + h >= n) break;
        const futureRow = rows[t + h];
        const futurePm25 = parseFloat(futureRow[col.pm2_5]);
        if (!(futurePm25 > 0)) continue;

        features.push([
          f32(pm25Now),
          f32(h),
          ...FEATURE_COLUMNS.map((c) => f32(parseFloat(futureRow[col[c]]))),
          f32(lat),
          f32(lon),
        ]);
        horizons.push(h);
        targetsLog.push(f32(Math.log1p(futurePm25)));
      }
    }
  }
  return { features, horizons, targetsLog };
}

function predictLog(model, row) {
  const trees = model.learner.gradient_booster.model.trees;
  let score = parseFloat(String(model.learner.learner_model_param.base_score).replace(/[[\]]/g, ''));
  for (const t of trees) {
    let node = 0;
    while (t.left_children[node] !== -1) {
      const val = row[t.split_indices[node]];
      if (Number.isNaN(val)) node = t.default_left[node] ? t.left_children[node] : t.right_children[node];
      // XGBoost compares in float32: rounding the stored threshold matters when a feature sits exactly on it
      else node = val < Math.fround(t.split_conditions[node]) ? t.left_children[node] : t.right_children[node];
    }
    score += t.split_conditions[node]; // leaf value
  }
  return score;
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function regressionMetrics(actual, predicted) {
  const n = actual.length;
  let absSum = 0, sqSum = 0, w20 = 0, w40 = 0, sa = 0, sp = 0;
  for (let i = 0; i < n; i++) {
    const err = Math.abs(actual[i] - predicted[i]);
    absSum += err;
    sqSum += err * err;
    if (err <= 20) w20++;
    if (err <= 40) w40++;
    sa += actual[i];
    sp += predicted[i];
  }
  const ma = sa / n, mp = sp / n;
  let cov = 0, va = 0, vp = 0;
  for (let i = 0; i < n; i++) {
    cov += (actual[i] - ma) * (predicted[i] - mp);
    va += (actual[i] - ma) ** 2;
    vp += (predicted[i] - mp) ** 2;
  }
  const r = cov / Math.sqrt(va * vp);
  return {
    n,
    mae: absSum / n,
    rmse: Math.sqrt(sqSum / n),
    pearson_r: r,
    r2: r * r, // squared Pearson r, same definition the training script reports as r2_explained_variance
    acc_20: (w20 / n) * 100,
    acc_40: (w40 / n) * 100,
  };
}

// Deterministic PRNG (mulberry32) for a reproducible scatter sample
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function featureSplitImportance(model, featureNames) {
  const counts = new Array(featureNames.length).fill(0);
  for (const t of model.learner.gradient_booster.model.trees) {
    for (let i = 0; i < t.left_children.length; i++) {
      if (t.left_children[i] !== -1) counts[t.split_indices[i]]++;
    }
  }
  const total = counts.reduce((a, b) => a + b, 0);
  return featureNames
    .map((feature, i) => ({
      feature,
      label: feature.replace(/_/g, ' ').toUpperCase(),
      splits: counts[i],
      importance: total > 0 ? counts[i] / total : 0,
    }))
    .sort((a, b) => b.splits - a.splits);
}

function round(v, d) {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

export function computeModelEvaluation() {
  const csvPath = resolveDataPath(DATA_REL);
  const modelPath = resolveDataPath(MODEL_REL);
  const metaPath = resolveDataPath(META_REL);
  for (const [label, p] of [['held-out source data', csvPath], ['model', modelPath], ['model metadata', metaPath]]) {
    if (!fs.existsSync(p)) throw new Error(`Missing ${label}: ${p}`);
  }

  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const featureNames = metadata.features;

  const { bySchool, col } = loadRowsBySchool(csvPath);
  const { features, horizons, targetsLog } = buildSamples(bySchool, col);
  const split = Math.floor(features.length * TRAIN_FRACTION);

  const actual = [];
  const predicted = [];
  const testHorizons = [];
  const logResiduals = [];
  for (let i = split; i < features.length; i++) {
    const predLog = predictLog(model, features[i]);
    actual.push(Math.expm1(targetsLog[i]));
    predicted.push(Math.expm1(predLog));
    testHorizons.push(horizons[i]);
    logResiduals.push(targetsLog[i] - predLog);
  }

  const overall = regressionMetrics(actual, predicted);

  const perHorizon = HORIZONS.map((h) => {
    const a = [], p = [], res = [];
    for (let i = 0; i < testHorizons.length; i++) {
      if (testHorizons[i] === h) {
        a.push(actual[i]);
        p.push(predicted[i]);
        res.push(logResiduals[i]);
      }
    }
    const m = regressionMetrics(a, p);
    res.sort((x, y) => x - y);
    const q10 = quantile(res, 0.1);
    const q90 = quantile(res, 0.9);
    let inside = 0;
    for (const r of res) if (r >= q10 && r <= q90) inside++;
    return {
      horizon: `${h}h`,
      lead_hours: h,
      n: m.n,
      mae: round(m.mae, 2),
      rmse: round(m.rmse, 2),
      pearson_r: round(m.pearson_r, 4),
      r2: round(m.r2, 4),
      acc_20: round(m.acc_20, 1),
      acc_40: round(m.acc_40, 1),
      // Empirical log-space residual quantiles: band = expm1(log1p(pred) + q)
      log_residual_p10: round(q10, 5),
      log_residual_p50: round(quantile(res, 0.5), 5),
      log_residual_p90: round(q90, 5),
      band_coverage_pct: round((inside / res.length) * 100, 1),
    };
  });

  // Reproducible uniform sample of real held-out (observed, predicted) pairs
  const rand = mulberry32(SCATTER_SEED);
  const pool = actual.map((_, i) => i);
  const take = Math.min(SCATTER_SAMPLE_SIZE, pool.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const scatterSample = pool.slice(0, take).map((idx, k) => ({
    id: k + 1,
    actual: round(actual[idx], 1),
    pred: round(predicted[idx], 1),
    horizon_hours: testHorizons[idx],
  }));

  const metadataMae = metadata.test_mae_ug_m3;
  return {
    success: true,
    computedAt: new Date().toISOString(),
    modelTrainedAt: metadata.trained_at || null,
    sources: { data: DATA_REL, model: MODEL_REL, metadata: META_REL },
    totalPairs: features.length,
    trainPairs: split,
    testPairs: actual.length,
    treeCount: model.learner.gradient_booster.model.trees.length,
    overall: {
      mae: round(overall.mae, 2),
      rmse: round(overall.rmse, 2),
      pearson_r: round(overall.pearson_r, 4),
      r2: round(overall.r2, 4),
      acc_20: round(overall.acc_20, 1),
      acc_40: round(overall.acc_40, 1),
    },
    // Integrity check against the metrics written at training time
    reproducesTrainingMetrics: typeof metadataMae === 'number' && Math.abs(round(overall.mae, 2) - metadataMae) < 0.01,
    horizons: perHorizon,
    featureImportance: featureSplitImportance(model, featureNames),
    scatterSample,
  };
}

let cached = null;
export function getModelEvaluation() {
  if (!cached) {
    cached = Promise.resolve()
      .then(computeModelEvaluation)
      .catch((err) => {
        cached = null; // allow retry on the next request
        throw err;
      });
  }
  return cached;
}
