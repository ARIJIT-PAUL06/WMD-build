/**
 * tests/lambdaBundle.test.js
 * Verifies that scripts/build_lambda.mjs produces a complete, compliant Lambda package
 * including all model/data dependencies and the createRequire banner.
 * Part of Cognito Fix Plan v2 (A3).
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('A3: Lambda Bundle Verification', () => {
  it('build_lambda.mjs creates lambda-dist/index.mjs and packages all 5 required data files', () => {
    // Run the build script
    execSync('node scripts/build_lambda.mjs', {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    const distDir = path.join(projectRoot, 'lambda-dist');
    const indexMjsPath = path.join(distDir, 'index.mjs');

    // 1. Assert index.mjs exists and starts with the createRequire banner
    assert.ok(fs.existsSync(indexMjsPath), 'lambda-dist/index.mjs must exist');
    const indexContent = fs.readFileSync(indexMjsPath, 'utf8');
    assert.ok(
      indexContent.startsWith("import { createRequire } from 'module'; const require = createRequire(import.meta.url);") ||
      indexContent.includes("import { createRequire } from 'module'; const require = createRequire(import.meta.url);"),
      'index.mjs must contain the createRequire banner'
    );

    // 2. Assert all 5 required data/model files exist
    const requiredFiles = [
      'ml/data/spatial_grids.json',
      'src/data/schoolsDirectory.json',
      'src/data/authoritiesConfig.json',
      'ml/model/sagemaker_forecast_metadata.json',
      'ml/model/xgboost_forecast_model.json'
    ];

    for (const rel of requiredFiles) {
      const fullPath = path.join(distDir, rel);
      assert.ok(fs.existsSync(fullPath), `lambda-dist/${rel} must exist`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 0, `lambda-dist/${rel} must not be empty`);
    }
  });
});
