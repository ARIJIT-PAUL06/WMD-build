import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

describe('Hero Brand (VAYUVITALS) Legibility and SSR Verification', () => {
  let viteServer;
  let PanoramicScrollHero;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const heroMod = await viteServer.ssrLoadModule(
      './src/components/MotionHero/PanoramicScrollHero.jsx'
    );
    PanoramicScrollHero = heroMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. The SSR HTML preserves hero-top-hud, hero-hud-brand, and VAYUVITALS text', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
      })
    );

    assert.ok(html.includes('hero-top-hud'), 'Must render hero-top-hud container');
    assert.ok(html.includes('hero-hud-brand'), 'Must render hero-hud-brand container');
    assert.ok(html.includes('VAYUVITALS'), 'Must render VAYUVITALS brand text');
  });

  it('2. The wordmark inline text-shadow contains dark separation layer before amber glow', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
      })
    );

    const darkLayerIndex = html.indexOf('rgba(7, 10, 18, 0.9)');
    const amberGlowIndex = html.indexOf('rgba(245, 158, 11, 0.85)');

    assert.ok(
      darkLayerIndex !== -1,
      'Must contain dark separation layer rgba(7, 10, 18, 0.9)'
    );
    assert.ok(
      amberGlowIndex !== -1,
      'Must contain amber glow layer rgba(245, 158, 11, 0.85)'
    );
    assert.ok(
      darkLayerIndex < amberGlowIndex,
      'Dark separation layer must precede amber glow in text-shadow'
    );
  });

  it('3. The SSR HTML does not contain old two-layer shadow string', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
      })
    );

    const oldShadow = '0 0 16px rgba(245, 158, 11, 0.65), 0 0 32px rgba(245, 158, 11, 0.25)';
    assert.ok(
      !html.includes(oldShadow),
      'Must not contain the obsolete two-layer shadow string'
    );
  });
});
