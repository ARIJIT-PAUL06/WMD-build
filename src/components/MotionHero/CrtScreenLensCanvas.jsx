import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * CrtScreenLensCanvas
 * Renders the panoramic image inside an authentic fixed CRT curved glass bulb.
 * - The curved glass CRT barrel distortion is FIXED to the 100vw x 100vh monitor faceplate.
 * - The minimal storytelling templates are painted FLAT onto the image layer inside the WebGL shader,
 *   sharing the EXACT SAME spherical curvature, scanlines, and retrace beam as the background!
 * - As the user scrolls down, the panorama scrolls horizontally and the templates rise from below to up.
 */
export default function CrtScreenLensCanvas({ scrollProgress = 0, mousePos = { x: 0, y: 0 }, onExploreTwin }) {
  const mountRef = useRef(null);
  const scrollRef = useRef(scrollProgress);
  const buttonBounds = useRef({ x: 0, y: 0, w: 0, h: 0, active: false });

  // Keep scrollRef synchronized with scrollProgress prop
  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    // Panoramic Texture Loader
    const textureLoader = new THREE.TextureLoader();
    const panoramicTex = textureLoader.load('/lungs-panoramic.png');
    panoramicTex.minFilter = THREE.LinearFilter;
    panoramicTex.magFilter = THREE.LinearFilter;
    panoramicTex.wrapS = THREE.ClampToEdgeWrapping;
    panoramicTex.wrapT = THREE.ClampToEdgeWrapping;

    // Offscreen 2D Canvas for Minimal Templates (Rendered directly into CRT screen space)
    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    textCanvas.width = width * dpr;
    textCanvas.height = height * dpr;

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;

    // Custom CRT Curved Faceplate Shader
    const crtMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: panoramicTex },
        uTextTexture: { value: textTexture },
        uTime: { value: 0.0 },
        uScroll: { value: 0.0 },
        uParallax: { value: 0.0 },
        uCurvature: { value: 0.28 }, // Authentic CRT spherical faceplate bulge
        uAspect: { value: width / height },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uTextTexture;
        uniform float uTime;
        uniform float uScroll;
        uniform float uParallax;
        uniform float uCurvature;
        uniform float uAspect;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // Balanced spherical CRT barrel distortion math
        vec2 curveFaceplate(vec2 uv) {
          vec2 centered = uv * 2.0 - 1.0;
          centered.x *= uAspect;

          float r2 = dot(centered, centered);
          vec2 distorted = centered * (1.0 + uCurvature * r2 * 0.38);
          distorted.x /= uAspect;

          return distorted * 0.5 + 0.5;
        }

        // Fast hash for analog TV noise
        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          // 1. Calculate physical curved CRT screen UV (Fixed spherical faceplate)
          vec2 screenUv = curveFaceplate(vUv);

          // 2. Crisp aperture boundary: Sharp 2.5% micro-bevel drop-off into dark bezel
          float edgeAlpha = smoothstep(0.0, 0.025, screenUv.x) *
                            smoothstep(1.0, 0.975, screenUv.x) *
                            smoothstep(0.0, 0.025, screenUv.y) *
                            smoothstep(1.0, 0.975, screenUv.y);

          if (edgeAlpha <= 0.001) {
            gl_FragColor = vec4(0.027, 0.039, 0.07, 1.0);
            return;
          }

          // 3. Physical spherical arch curvature for scanlines & rolling beam
          float domeBow = (screenUv.x - 0.5) * (screenUv.x - 0.5) * (screenUv.y - 0.5) * 0.52;
          float curvedY = screenUv.y + domeBow;

          // 4. Authentic TV vertical sync roll
          float rollSpeed = 0.13;
          float rollPos = fract(uTime * rollSpeed);
          float dY = mod(curvedY - rollPos + 0.5, 1.0) - 0.5;

          // 5. Horizontal sync jitter / analog PLL tear slip
          float syncSlipZone = exp(-pow(dY * 34.0, 2.0));
          float hJitter = (sin(curvedY * 140.0 + uTime * 48.0) * 0.0035 + 
                           sin(uTime * 32.0) * 0.002 + 
                           (hash12(vec2(floor(curvedY * 350.0), floor(uTime * 22.0))) - 0.5) * 0.0028) * syncSlipZone;

          // 6. Map panoramic 32:9 image texture behind the curved faceplate with jitter
          float uOffset = uScroll * 0.5 + uParallax;
          vec2 clampedScreen = clamp(screenUv, 0.0, 1.0);
          vec2 texUv = vec2(clamp(clampedScreen.x * 0.5 + uOffset + hJitter, 0.001, 0.999), clampedScreen.y);

          // 7. Chromatic dispersion: RGB electron gun separation
          float distFromCenter = distance(screenUv, vec2(0.5));
          float rgbSplit = distFromCenter * 0.0022 + syncSlipZone * 0.003;

          vec4 colR = texture2D(uTexture, vec2(clamp(texUv.x + rgbSplit, 0.0, 1.0), texUv.y));
          vec4 colG = texture2D(uTexture, texUv);
          vec4 colB = texture2D(uTexture, vec2(clamp(texUv.x - rgbSplit, 0.0, 1.0), texUv.y));
          vec4 color = vec4(colR.r, colG.g, colB.b, 1.0);

          // 8. SAMPLE THE MINIMAL TEMPLATES ON THE SAME CURVED SCREEN BULB
          // Sampled at screenUv so the template receives the EXACT SAME physical spherical barrel curvature!
          vec4 textCol = texture2D(uTextTexture, screenUv);

          // Blend the template flat onto the background image pixels before beam & scanlines
          color.rgb = mix(color.rgb, textCol.rgb, textCol.a);

          // 9. Authentic Retrace Bar & Vertical Blanking Interval
          float blankingBar = smoothstep(0.048, 0.0, abs(dY)) * 0.42;
          color.rgb *= (1.0 - blankingBar);

          // 10. Sharp Phosphor Electron Retrace Beam
          float beamDist = dY - 0.024;
          float sharpCore = exp(-pow(beamDist * 95.0, 2.0));
          float radiantBloom = exp(-pow(beamDist * 24.0, 2.0)) * 0.45;
          vec3 retraceColor = vec3(0.88, 0.96, 1.0) * (sharpCore * 0.72 + radiantBloom * 0.4);
          color.rgb += retraceColor;

          // 11. Secondary phosphor ghost echo & AC ground hum
          float trailingDist = dY + 0.026;
          float trailingLine = exp(-pow(trailingDist * 75.0, 2.0)) * 0.16;
          color.rgb += vec3(0.78, 0.92, 1.0) * trailingLine;

          float humBar = sin(curvedY * 6.28318 * 2.0 - uTime * 1.1) * 0.02;
          color.rgb += humBar;

          // 12. Curved phosphor interlace scanlines across entire screen
          float rasterLines = sin(curvedY * uResolution.y * 1.3) * 0.5 + 0.5;
          color.rgb *= mix(0.88, 1.0, rasterLines);

          // 13. Authentic CRT bulb edge vignette
          float edgeVignette = smoothstep(0.0, 0.06, screenUv.x) *
                               smoothstep(1.0, 0.94, screenUv.x) *
                               smoothstep(0.0, 0.06, screenUv.y) *
                               smoothstep(1.0, 0.94, screenUv.y);
          color.rgb *= mix(0.74, 1.0, edgeVignette);

          // 14. Contrast & Color Grading
          color.rgb = pow(color.rgb, vec3(0.95)) * 1.03;

          // 15. Blend cleanly into dark bezel background (#070a12)
          vec3 bgCol = vec3(0.027, 0.039, 0.07);
          gl_FragColor = vec4(mix(bgCol, color.rgb, edgeAlpha), 1.0);
        }
      `,
      transparent: true,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), crtMaterial);
    scene.add(quad);

    // Helper: Draw a minimal, high-impact template card onto the 2D offscreen canvas
    function drawMinimalCard(ctx, {
      x,
      y,
      cardW,
      badgeText,
      badgeColor,
      titleText,
      statementText,
      statPillText,
      statDetailText,
      accentColor,
      opacity,
      showButton = false,
      buttonText = '',
    }) {
      if (opacity <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = opacity;

      const paddingX = 24;
      const paddingY = 20;
      const innerW = cardW - paddingX * 2;

      // Wrap statement text into lines
      ctx.font = '400 13.5px Inter, -apple-system, sans-serif';
      const words = statementText.split(' ');
      const lines = [];
      let currentLine = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        if (ctx.measureText(testLine).width > innerW) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const cardH = 26 + 32 + (lines.length * 20) + 26 + (showButton ? 44 : 0) + paddingY * 2;

      // 1. Frosted Dark Glass Backdrop
      ctx.fillStyle = 'rgba(7, 11, 18, 0.85)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, cardW, cardH, 18);
      } else {
        ctx.rect(x, y, cardW, cardH);
      }
      ctx.fill();

      // 2. Phosphor Accent Border & Soft Glow
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();

      // 3. Subtle Glass Specular Sheen (Curved highlight across upper card)
      const sheenGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH * 0.65);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.02)');
      sheenGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sheenGrad;
      ctx.fill();

      // 4. Render Text Elements
      let curY = y + paddingY + 12;

      // A. Minimal Badge Tag
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = badgeColor;
      ctx.fillText(badgeText.toUpperCase(), x + paddingX, curY);

      curY += 28;

      // B. Minimal Bold Title
      ctx.font = '800 23px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(titleText, x + paddingX, curY);

      curY += 20;

      // C. Strong 2-Sentence Core Statement
      ctx.font = '400 13.5px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + paddingX, curY);
        curY += 19;
      }

      curY += 10;

      // D. Minimal Single-Line Stat Bar
      ctx.font = '700 11px "JetBrains Mono", monospace';
      const pillW = ctx.measureText(statPillText).width + 16;
      ctx.fillStyle = accentColor.replace('rgb', 'rgba').replace(')', ', 0.22)');
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x + paddingX, curY - 12, pillW, 20, 6);
      } else {
        ctx.rect(x + paddingX, curY - 12, pillW, 20);
      }
      ctx.fill();

      ctx.fillStyle = badgeColor;
      ctx.fillText(statPillText, x + paddingX + 8, curY + 2);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(statDetailText, x + paddingX + pillW + 10, curY + 2);

      // E. (Optional Phase 3) Minimal CTA Button
      if (showButton) {
        curY += 26;
        const btnW = innerW;
        const btnH = 36;
        const btnGrad = ctx.createLinearGradient(x + paddingX, curY, x + paddingX + btnW, curY);
        btnGrad.addColorStop(0, '#10b981');
        btnGrad.addColorStop(1, '#059669');

        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + paddingX, curY, btnW, btnH, 8);
        } else {
          ctx.rect(x + paddingX, curY, btnW, btnH);
        }
        ctx.fill();

        // Register button screen hitbox for pointer clicks
        buttonBounds.current = {
          x: x + paddingX,
          y: curY,
          w: btnW,
          h: btnH,
          active: opacity > 0.5,
        };

        ctx.font = '700 12px "Outfit", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(buttonText + '  →', x + paddingX + btnW / 2, curY + 22);
        ctx.textAlign = 'left';
      }

      ctx.restore();
    }

    // Helper: Smooth Hermite curve for natural cinematic acceleration and gentle deceleration
    const smooth = (min, max, val) => {
      const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
      return t * t * (3 - 2 * t);
    };

    // Function to draw all templates onto the offscreen canvas
    // Templates lay flat with the background image, glide horizontally, and rise from below to up as user scrolls
    const updateTextTexture = (scroll) => {
      textCtx.setTransform(1, 0, 0, 1, 0, 0);
      textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
      textCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cardW = Math.min(430, width * 0.85);

      // Phase 1: Urban Chokehold (Delhi Crisis)
      // Horizontal glide with the background image
      const x1 = width * 0.08 - scroll * width * 0.85;
      // Rises smoothly from below to up as user scrolls down from 0.0 to 0.14
      const p1Rise = smooth(0.0, 0.14, scroll);
      const y1 = height * 0.65 - p1Rise * (height * 0.17);
      const op1 = Math.max(0, Math.min(1, 1 - smooth(0.16, 0.28, scroll)));

      drawMinimalCard(textCtx, {
        x: x1,
        y: y1,
        cardW,
        badgeText: '01 • PROLOGUE // DELHI NCR',
        badgeColor: '#f87171',
        titleText: 'A City Choking in Silence.',
        statementText: 'A 140-meter thermal ceiling traps toxic stubble smoke and particulate soot over 30 million people. Microscopic soot settles deep into alveolar walls, destroying lung capacity breath by breath.',
        statPillText: 'AQI 486 · SEVERE',
        statDetailText: 'PM2.5: 19.4× WHO LIMIT',
        accentColor: 'rgba(239, 68, 68, 0.55)',
        opacity: op1,
      });

      // Phase 2: The Critical Turning Point (Intervention Corridor)
      // Horizontal glide to center at scroll = 0.50
      const x2 = (width - cardW) / 2 - (scroll - 0.50) * width * 0.85;
      // Rises from below (height * 0.94) up to resting position (height * 0.48)
      const p2Rise = smooth(0.24, 0.46, scroll);
      const y2 = height * 0.94 - p2Rise * (height * 0.46);
      const op2In = smooth(0.24, 0.38, scroll);
      const op2Out = smooth(0.58, 0.72, scroll);
      const op2 = op2In * (1.0 - op2Out);

      drawMinimalCard(textCtx, {
        x: x2,
        y: y2,
        cardW,
        badgeText: '02 • INTERVENTION // THE CORRIDOR',
        badgeColor: '#fbbf24',
        titleText: 'The Line Between Decay & Renewal.',
        statementText: 'Where predictive atmospheric intelligence intercepts the smog plume. Automated clean air corridors deploy dynamically to halt cellular damage before it becomes permanent.',
        statPillText: 'AQI 142 · TURNING POINT',
        statDetailText: 'AUTONOMOUS MITIGATION ACTIVE',
        accentColor: 'rgba(245, 158, 11, 0.55)',
        opacity: op2,
      });

      // Phase 3: The Living Canopy (Restoration)
      // Horizontal glide to right flank at scroll = 0.88-1.00
      const x3Target = width * 0.92 - cardW;
      const x3 = x3Target - Math.max(0, (0.88 - scroll) * width * 0.60);
      // Rises from below up to resting position
      const p3Rise = smooth(0.62, 0.86, scroll);
      const y3 = height * 0.94 - p3Rise * (height * 0.48);
      const op3 = smooth(0.62, 0.78, scroll);

      drawMinimalCard(textCtx, {
        x: x3,
        y: y3,
        cardW,
        badgeText: '03 • RESTORATION // HIMALAYAN CANOPY',
        badgeColor: '#34d399',
        titleText: '11,000 Liters of Pure Life.',
        statementText: 'Every healthy human lung processes 11,000 liters of atmospheric gas daily. In pristine forest air, bronchial cilia oscillate freely, synchronizing human respiration with the Himalayan canopy.',
        statPillText: 'AQI 22 · PRISTINE',
        statDetailText: 'ALVEOLAR FLUX: 98.8% OPTIMAL',
        accentColor: 'rgba(16, 185, 129, 0.55)',
        opacity: op3,
        showButton: true,
        buttonText: 'EXPLORE INDIA NATIONAL AQI HEATMAP',
      });

      textTexture.needsUpdate = true;
    };

    // Interactive button pointer tracking
    const handleCanvasClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const btn = buttonBounds.current;
      if (btn && btn.active && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (onExploreTwin) onExploreTwin();
      }
    };

    const handleCanvasMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const btn = buttonBounds.current;
      if (btn && btn.active && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        renderer.domElement.style.cursor = 'pointer';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('mousemove', handleCanvasMouseMove);

    const clock = new THREE.Clock();
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      crtMaterial.uniforms.uTime.value = clock.getElapsedTime();
      updateTextTexture(scrollRef.current);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      crtMaterial.uniforms.uAspect.value = width / height;
      crtMaterial.uniforms.uResolution.value.set(width, height);

      textCanvas.width = width * dpr;
      textCanvas.height = height * dpr;
    };
    window.addEventListener('resize', handleResize);

    // Save refs for fast uniform updates
    container._crtMaterial = crtMaterial;

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('mousemove', handleCanvasMouseMove);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      panoramicTex.dispose();
      textTexture.dispose();
      textCanvas.width = 0;
      textCanvas.height = 0;
      crtMaterial.dispose();
    };
  }, [onExploreTwin]);

  // Update uniforms smoothly when scroll or mouse changes
  useEffect(() => {
    if (mountRef.current && mountRef.current._crtMaterial) {
      mountRef.current._crtMaterial.uniforms.uScroll.value = scrollProgress;
      mountRef.current._crtMaterial.uniforms.uParallax.value = (mousePos.x / window.innerWidth) * -0.015;
    }
  }, [scrollProgress, mousePos.x]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        pointerEvents: 'auto',
      }}
    />
  );
}
