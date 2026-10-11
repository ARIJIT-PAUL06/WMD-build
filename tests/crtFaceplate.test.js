import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crtCurvature,
  curveFaceplate,
  faceplateToViewport,
  crtCornerAnchor,
} from '../src/components/MotionHero/crtFaceplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CRT Faceplate Barrel Curvature and Corner Anchor Math', () => {
  it('1. Round trip: curveFaceplate(faceplateToViewport(fx, fy)/size) returns (fx, fy) within 1e-4', () => {
    const viewports = [
      [1920, 1080],
      [1366, 768],
      [390, 844],
    ];
    const testPoints = [
      [0.045, 0.05],
      [0.955, 0.05],
    ];

    for (const [w, h] of viewports) {
      const aspect = w / h;
      const k = crtCurvature(w);
      for (const [fx, fy] of testPoints) {
        const [vx, vy] = faceplateToViewport(fx, fy, w, h);
        const [u, v] = [vx / w, vy / h];
        const [nfx, nfy] = curveFaceplate(u, v, aspect, k);

        assert.ok(
          Math.abs(nfx - fx) < 1e-4,
          `fx roundtrip error at ${w}x${h} was ${Math.abs(nfx - fx)}`
        );
        assert.ok(
          Math.abs(nfy - fy) < 1e-4,
          `fy roundtrip error at ${w}x${h} was ${Math.abs(nfy - fy)}`
        );
      }
    }
  });

  it('2. The centre is fixed: faceplateToViewport(0.5, 0.5, w, h) returns (w/2, h/2)', () => {
    const [cx, cy] = faceplateToViewport(0.5, 0.5, 1920, 1080);
    assert.strictEqual(cx, 960);
    assert.strictEqual(cy, 540);
  });

  it('3. Pulled inward: at 1920x1080 brand anchor x > 0.045 * 1920 and y > 0.05 * 1080', () => {
    const brand = crtCornerAnchor(0.045, 0.05, 240, 1920, 1080, 'left');
    assert.ok(
      brand.x > 0.045 * 1920,
      `Expected brand.x (${brand.x}) > ${0.045 * 1920}`
    );
    assert.ok(
      brand.y > 0.05 * 1080,
      `Expected brand.y (${brand.y}) > ${0.05 * 1080}`
    );
  });

  it('4. Mirror symmetry: left anchor x equals right anchor x within 0.5px and angles have opposite signs', () => {
    const left = crtCornerAnchor(0.045, 0.05, 240, 1920, 1080, 'left');
    const right = crtCornerAnchor(1 - 0.045, 0.05, 120, 1920, 1080, 'right');

    assert.ok(
      Math.abs(left.x - right.x) < 0.5,
      `Expected left.x (${left.x}) to match right.x (${right.x}) within 0.5px`
    );
    assert.strictEqual(left.y, right.y);
    assert.ok(
      Math.sign(left.angle) === -Math.sign(right.angle),
      `Expected left.angle (${left.angle}) and right.angle (${right.angle}) to have opposite signs`
    );
  });

  it('5. Tilt direction: left angle < 0 and right angle > 0 at 1920x1080', () => {
    const left = crtCornerAnchor(0.045, 0.05, 240, 1920, 1080, 'left');
    const right = crtCornerAnchor(1 - 0.045, 0.05, 120, 1920, 1080, 'right');

    assert.ok(left.angle < 0, `Expected left.angle < 0, got ${left.angle}`);
    assert.ok(right.angle > 0, `Expected right.angle > 0, got ${right.angle}`);
  });

  it('6. Clears the sidebar: at 1280x800 and above, brand anchor x > 70', () => {
    const brand1280 = crtCornerAnchor(0.045, 0.05, 240, 1280, 800, 'left');
    const brand1920 = crtCornerAnchor(0.045, 0.05, 240, 1920, 1080, 'left');

    assert.ok(brand1280.x > 70, `Expected brand1280.x (${brand1280.x}) > 70`);
    assert.ok(brand1920.x > 70, `Expected brand1920.x (${brand1920.x}) > 70`);
  });

  it('7. Curvature parity with shader: values and formulas match CrtScreenLensCanvas.jsx', () => {
    assert.strictEqual(crtCurvature(599), 0.04);
    assert.strictEqual(crtCurvature(600), 0.28);

    const shaderPath = path.resolve(__dirname, '../src/components/MotionHero/CrtScreenLensCanvas.jsx');
    const shaderSrc = fs.readFileSync(shaderPath, 'utf8');

    assert.ok(
      shaderSrc.includes('width < 600 ? 0.04 : 0.28'),
      'Shader file must contain width < 600 ? 0.04 : 0.28'
    );
    assert.ok(
      shaderSrc.includes('uCurvature * r2 * 0.38'),
      'Shader file must contain uCurvature * r2 * 0.38'
    );
  });
});
