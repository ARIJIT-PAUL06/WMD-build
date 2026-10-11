/**
 * awsServicesPageVerification.test.js
 * Verification Test for VayuVitals AWS Services Page
 *
 * Verifies:
 * 1. Catalogue schema integrity & disk evidence (Zero-Faking Directive)
 * 2. Complete absence of unused/faked services (IoT Core, API Gateway, CloudFront)
 * 3. Component SSR rendering without errors
 * 4. All 12 services rendered with authentic metadata and architecture lanes
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

import {
  AWS_SERVICES_CATALOG,
  CATEGORIES,
  ARCHITECTURE_LANES,
} from '../src/data/awsServicesCatalog.js';

describe('AWS Services Catalogue Schema & Evidence Verification', () => {
  it('1. Catalogue contains exactly 12 authentic services', () => {
    assert.equal(AWS_SERVICES_CATALOG.length, 12, 'Must contain exactly 12 services');
  });

  it('2. Every catalogue entry has valid schema and bounded bullets', () => {
    const requiredFields = ['id', 'name', 'category', 'region', 'purpose', 'usedFor', 'config', 'source'];

    for (const service of AWS_SERVICES_CATALOG) {
      for (const field of requiredFields) {
        assert.ok(
          service[field] !== undefined && service[field] !== '',
          `Service ${service.name} must have non-empty field: ${field}`
        );
      }

      assert.ok(
        CATEGORIES.includes(service.category),
        `Service ${service.name} category '${service.category}' must be in CATEGORIES`
      );

      assert.ok(
        Array.isArray(service.usedFor) && service.usedFor.length >= 2 && service.usedFor.length <= 3,
        `Service ${service.name} usedFor must have 2 to 3 items (found ${service.usedFor?.length})`
      );

      for (const bullet of service.usedFor) {
        assert.ok(
          bullet.length <= 90,
          `Service ${service.name} bullet exceeds 90 chars: "${bullet}" (${bullet.length} chars)`
        );
      }
    }
  });

  it('3. Every service source file exists on disk (Zero-Faking evidence)', () => {
    for (const service of AWS_SERVICES_CATALOG) {
      const fullPath = path.resolve(process.cwd(), service.source);
      assert.ok(
        fs.existsSync(fullPath),
        `Source evidence file for ${service.name} must exist on disk: ${service.source}`
      );
    }
  });

  it('4. Excluded services never appear as in-use services in the catalogue', () => {
    const catalogString = JSON.stringify(AWS_SERVICES_CATALOG).toLowerCase();
    assert.ok(!catalogString.includes('iot core'), 'IoT Core must NOT be present in catalogue');
    assert.ok(!catalogString.includes('api gateway'), 'API Gateway must NOT be present in catalogue');
    assert.ok(!catalogString.includes('cloudfront'), 'CloudFront must NOT be present in catalogue');
  });

  it('5. Architecture lanes contain 2 valid pipelines with sequenced steps', () => {
    assert.equal(ARCHITECTURE_LANES.length, 2, 'Must have exactly 2 architecture lanes');
    for (const lane of ARCHITECTURE_LANES) {
      assert.ok(lane.id && lane.title && lane.subtitle, 'Lane must have id, title, and subtitle');
      assert.ok(Array.isArray(lane.steps) && lane.steps.length >= 3, 'Lane must have at least 3 steps');
      lane.steps.forEach((step, idx) => {
        assert.equal(step.step, idx + 1, `Step sequence must be 1-indexed and sequential in ${lane.id}`);
        assert.ok(step.title && step.service && step.detail, `Step ${step.step} in ${lane.id} must have title, service, and detail`);
      });
    }
  });
});

describe('AWS Services Page SSR Rendering Verification', () => {
  let viteServer;
  let AwsServicesPage;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const pageMod = await viteServer.ssrLoadModule(
      './src/components/AwsServices/AwsServicesPage.jsx'
    );
    AwsServicesPage = pageMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('6. AwsServicesPage renders successfully with stats-page and aws-page classes', () => {
    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('stats-page'), 'Must include stats-page root class for theme inheritance');
    assert.ok(html.includes('aws-page'), 'Must include aws-page class for scoped styles');
    assert.ok(html.includes('stats-back-button'), 'Must include standard stats back button');
  });

  it('7. Metric strip displays derived service count matching catalogue length', () => {
    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(
      html.includes(String(AWS_SERVICES_CATALOG.length)),
      `Must display service count ${AWS_SERVICES_CATALOG.length}`
    );
    assert.ok(html.includes('ap-south-1'), 'Must display primary deployment region ap-south-1');
  });

  it('8. Every service name from catalogue appears in rendered HTML', () => {
    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    for (const service of AWS_SERVICES_CATALOG) {
      assert.ok(
        html.includes(service.name),
        `Rendered page must contain service name: ${service.name}`
      );
    }
  });

  it('9. Architecture flow lanes render as ordered lists with step titles', () => {
    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('aws-arch-flow'), 'Must render architecture flow container');
    assert.ok(html.includes('Client Request &amp; Inference Pipeline') || html.includes('Client Request & Inference Pipeline'), 'Must render lane 1 title');
    assert.ok(html.includes('Scheduled Atmospheric Monitor Routine'), 'Must render lane 2 title');
    assert.ok(html.includes('Lambda Function URL'), 'Must include Function URL in architecture flow');
    assert.ok(html.includes('Amazon EventBridge'), 'Must include EventBridge in architecture flow');
  });

  it('10. Excluded services never appear as in-use services in rendered page', () => {
    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(!html.includes('IoT Core'), 'Rendered HTML must never contain IoT Core');
    assert.ok(!html.includes('API Gateway'), 'Rendered HTML must never contain API Gateway');
    assert.ok(!html.includes('CloudFront'), 'Rendered HTML must never contain CloudFront');
  });

  it('11. AwsServicesPage renders the shared VayuVitals environmental intelligence footer', () => {
    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('vayu-footer'), 'Must render shared vayu-footer at page bottom');
    assert.ok(html.includes('id="app-footer"'), 'Must render app-footer ID');
    assert.ok(html.includes('id="doc-back-cargo-btn"'), 'Must render Back to Atmospheric Cargo button');
  });
});
