#!/usr/bin/env node

/**
 * scripts/build_lambda.mjs
 * Bundles the Lambda backend via esbuild and packages all model/data dependencies.
 * Part of Cognito Fix Plan v2 (A3).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'lambda-dist');

console.log('🧹 Cleaning lambda-dist directory...');
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

console.log('📦 Bundling server/lambda.js via esbuild API (Node 22, ESM)...');
try {
  await build({
    entryPoints: [path.join(projectRoot, 'server/lambda.js')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: path.join(distDir, 'index.mjs'),
    external: ['@aws-sdk/*'],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    }
  });
  console.log('✅ esbuild bundle completed: lambda-dist/index.mjs');
} catch (err) {
  console.error('❌ esbuild bundling failed:', err);
  process.exit(1);
}

const requiredFiles = [
  'ml/data/spatial_grids.json',
  'src/data/schoolsDirectory.json',
  'src/data/authoritiesConfig.json',
  'ml/model/sagemaker_forecast_metadata.json',
  'ml/model/xgboost_forecast_model.json'
];

const optionalFiles = [
  'ml/data/grid_14day_buffer.json'
];

console.log('📋 Copying model and data files into lambda-dist...');
for (const relPath of requiredFiles) {
  const srcPath = path.join(projectRoot, relPath);
  if (!fs.existsSync(srcPath)) {
    console.error(`❌ Required file missing: ${relPath}`);
    process.exit(1);
  }
  const destPath = path.join(distDir, relPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`  ✓ Copied ${relPath}`);
}

for (const relPath of optionalFiles) {
  const srcPath = path.join(projectRoot, relPath);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(distDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied (optional) ${relPath}`);
  }
}

console.log('🎉 Lambda bundle build complete in lambda-dist/');
