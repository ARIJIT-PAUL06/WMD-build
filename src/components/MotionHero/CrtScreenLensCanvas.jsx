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
        uCurvature: { value: width < 600 ? 0.04 : 0.28 }, // Authentic CRT faceplate bulge on desktop, subtle on mobile
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

          // 8. SAMPLE THE TEMPLATES ON THE SAME CURVED SCREEN BULB
          // Sampled at screenUv so the template receives the EXACT SAME physical spherical barrel curvature!
          vec4 textCol = texture2D(uTextTexture, screenUv);

          // Blend the template flat onto the background image pixels before beam & scanlines
          color.rgb = mix(color.rgb, textCol.rgb, textCol.a);

          // 9. Authentic Retrace Bar & Vertical Blanking Interval
          float blankingBar = smoothstep(0.048, 0.0, abs(dY)) * 0.40;
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

          // 13. Authentic CRT bulb edge vignette on background image & templates
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

    // Helper: Draw an authentic ancient TV glitch card onto the 2D offscreen canvas
    // Large, bold, punchy typography rendered with authentic CRT glitch filter (RGB electron gun separation & tear slices)
    function drawAncientGlitchCard(ctx, {
      x,
      y,
      cardW,
      cardH,
      badgeText,
      badgeColor,
      strikingLine,
      statPillText,
      accentColor,
      accentGlow,
      opacity,
      actionText = '',
      isInteractiveButton = false,
      time = 0,
    }) {
      if (opacity <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = opacity;

      const isMobile = cardW < 440;
      const paddingX = isMobile ? 16 : 28;
      const paddingY = isMobile ? 14 : 22;
      const innerW = cardW - paddingX * 2;

      // 1. Dark Analog Cathode Ray Glass Box Backdrop
      ctx.fillStyle = 'rgba(6, 10, 18, 0.90)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, cardW, cardH, 10);
      } else {
        ctx.rect(x, y, cardW, cardH);
      }
      ctx.fill();

      // 2. Cathode Ray Scanline Texture baked into the card face
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      for (let sy = y + 2; sy < y + cardH - 2; sy += 3) {
        ctx.fillRect(x + 2, sy, cardW - 4, 1.2);
      }

      // 3. Phosphor Border with Analog CRT Glow
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = accentGlow;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();

      // 4. Vintage Terminal Corner Crosshairs
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.2;
      const markLen = isMobile ? 7 : 9;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6 + markLen);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x + 6 + markLen, y + 6);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + cardW - 6 - markLen, y + 6);
      ctx.lineTo(x + cardW - 6, y + 6);
      ctx.lineTo(x + cardW - 6, y + 6 + markLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x + 6, y + cardH - 6 - markLen);
      ctx.lineTo(x + 6, y + cardH - 6);
      ctx.lineTo(x + 6 + markLen, y + cardH - 6);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + cardW - 6 - markLen, y + cardH - 6);
      ctx.lineTo(x + cardW - 6, y + cardH - 6);
      ctx.lineTo(x + cardW - 6, y + cardH - 6 - markLen);
      ctx.stroke();

      // Glitch Physics: Authentic analog electron gun convergence wobble on desktop (disabled on mobile for crisp clarity)
      const isBurstGlitch = !isMobile && ((Math.sin(time * 8.5) > 0.82) || (Math.cos(time * 21.3) > 0.86));
      const glitchShiftX = isMobile ? 0 : (isBurstGlitch
        ? (Math.sin(time * 70.0) * 3.5 + (Math.sin(time * 110.0)) * 2.5)
        : (Math.sin(time * 14.0) * 1.0));

      let curY = y + paddingY + (isMobile ? 12 : 16);

      // Row 1: Channel OSD Badge (Bold monospace with blinking phosphor terminal cursor)
      const badgeFont = isMobile ? 12 : 15;
      ctx.font = `700 ${badgeFont}px "Share Tech Mono", "JetBrains Mono", monospace`;
      ctx.fillStyle = badgeColor;
      const blinker = Math.floor(time * 3.5) % 2 === 0 ? '█' : ' ';
      ctx.fillText(`${badgeText} ${blinker}`, x + paddingX, curY);

      curY += badgeFont + (isMobile ? 8 : 14);

      // Row 2: The Striking Line (Dynamic headline with RGB chromatic convergence glitch filter)
      const fontSize = cardW < 360 ? 15 : cardW < 460 ? 18 : cardW < 600 ? 21 : 32;
      const lineHeight = fontSize + (isMobile ? 4 : 6);
      ctx.font = `800 ${fontSize}px "Share Tech Mono", "JetBrains Mono", monospace`;

      const words = strikingLine.split(' ');
      const lines = [];
      let curLine = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = curLine ? curLine + ' ' + words[i] : words[i];
        if (ctx.measureText(testLine).width > innerW) {
          lines.push(curLine);
          curLine = words[i];
        } else {
          curLine = testLine;
        }
      }
      if (curLine) lines.push(curLine);

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const lineBaselineY = curY + (i + 1) * lineHeight - 3;

        // RGB Electron Gun Convergence Misalignment (Chromatic Glitch Filter on desktop only)
        if (glitchShiftX > 0.1) {
          ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
          ctx.fillText(lineText, x + paddingX - glitchShiftX * 1.5, lineBaselineY);

          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.fillText(lineText, x + paddingX + glitchShiftX * 1.5, lineBaselineY + (isBurstGlitch ? 0.9 : 0));
        }

        ctx.save();
        ctx.shadowColor = accentGlow;
        ctx.shadowBlur = isBurstGlitch ? 26 : (isMobile ? 8 : 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(lineText, x + paddingX, lineBaselineY);
        ctx.restore();

        if (isBurstGlitch && i === 0) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(x + paddingX - 4, lineBaselineY - fontSize * 0.35, innerW * 0.45, 2.2);
        }
      }

      curY += lines.length * lineHeight + (isMobile ? 8 : 14);

      // Row 3: Bold Single Telemetry Stat Callout (Clean, high impact, prominent AQI readability)
      const pillFont = isMobile ? 12 : 16;
      ctx.font = `800 ${pillFont}px "Outfit", "Inter", sans-serif`;
      const pillW = Math.min(innerW, ctx.measureText(statPillText).width + (isMobile ? 26 : 36));
      const pillH = isMobile ? 26 : 32;
      const pillTopY = curY;

      // Pill Background with high contrast dark plate
      ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x + paddingX, pillTopY, pillW, pillH, 7);
      } else {
        ctx.rect(x + paddingX, pillTopY, pillW, pillH);
      }
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = accentGlow;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Glowing indicator dot
      ctx.save();
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentGlow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x + paddingX + (isMobile ? 11 : 16), pillTopY + pillH / 2, isMobile ? 3.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sharp, bright, easily readable text centered vertically in pill
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(statPillText, x + paddingX + (isMobile ? 20 : 28), pillTopY + pillH / 2);
      ctx.textBaseline = 'alphabetic';

      curY = pillTopY + pillH + (isMobile ? 10 : 14);

      // Row 4: Bottom Action Strip
      const btnW = innerW;
      const btnH = isMobile ? 32 : 38;
      const btnTopY = curY;

      if (isInteractiveButton) {
        // Phase 3: Interactive CTA Button
        const btnGrad = ctx.createLinearGradient(x + paddingX, btnTopY, x + paddingX + btnW, btnTopY);
        btnGrad.addColorStop(0, '#059669');
        btnGrad.addColorStop(1, '#10b981');

        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + paddingX, btnTopY, btnW, btnH, 6);
        } else {
          ctx.rect(x + paddingX, btnTopY, btnW, btnH);
        }
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // Register button screen hitbox for pointer clicks
        buttonBounds.current = {
          x: x + paddingX,
          y: btnTopY,
          w: btnW,
          h: btnH,
          active: opacity > 0.5,
        };

        ctx.font = `700 ${isMobile ? 13 : 16}px "Share Tech Mono", "JetBrains Mono", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${actionText}  ►`, x + paddingX + btnW / 2, btnTopY + btnH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      } else {
        // Phase 1 & 2: Matching Status Bar of identical size
        ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + paddingX, btnTopY, btnW, btnH, 6);
        } else {
          ctx.rect(x + paddingX, btnTopY, btnW, btnH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = `700 ${isMobile ? 12 : 15}px "Share Tech Mono", "JetBrains Mono", monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(actionText, x + paddingX + btnW / 2, btnTopY + btnH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }

      ctx.restore();
    }

    // Helper: Smooth Hermite curve for natural cinematic acceleration and gentle deceleration
    const smooth = (min, max, val) => {
      const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
      return t * t * (3 - 2 * t);
    };

    // Function to draw all templates onto the offscreen canvas
    // 1. Template 1 & Template 3 have strictly EQUAL SIZES.
    // 2. Template 1 and Template 3 have OPPOSITE / MIRRORED animations:
    //    - Template 1 starts on-screen and goes DOWN on scroll.
    //    - Template 3 starts off-screen below and comes UP on scroll.
    // 3. Large, bold ancient TV text with rich CRT glitch filter.
    const updateTextTexture = (scroll, time = 0) => {
      textCtx.setTransform(1, 0, 0, 1, 0, 0);
      textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
      textCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Strictly equal dimensions for Template 1, Template 2, and Template 3
      const isMobile = width < 600;
      const cardW = Math.min(560, width * (isMobile ? 0.92 : 0.88));
      const cardH = isMobile ? 225 : 250;

      // Common vertical levels for symmetrical opposite motion
      const restingY = height * (isMobile ? 0.38 : 0.44);
      const bottomOffscreenY = height * 1.08;
      const travelDist = bottomOffscreenY - restingY;

      // ==============================================================
      // Phase 1: Urban Chokehold (Delhi Crisis)
      // ALREADY on-screen at restingY when scroll = 0, and sinks DOWN as we scroll down!
      // ==============================================================
      const p1Drop = smooth(0.00, 0.20, scroll);
      const y1 = restingY + p1Drop * travelDist;
      const x1 = isMobile ? (width - cardW) / 2 : (width * 0.08 - scroll * width * 0.35);
      const op1 = Math.max(0, 1.0 - smooth(0.06, 0.20, scroll));

      drawAncientGlitchCard(textCtx, {
        x: x1,
        y: y1,
        cardW,
        cardH,
        badgeText: 'DELHI NCR AIR ALERT',
        badgeColor: '#f87171',
        strikingLine: '30 MILLION PEOPLE BREATHING TOXIC SMOG.',
        statPillText: 'AQI 486  —  HAZARDOUS',
        accentColor: '#ef4444',
        accentGlow: 'rgba(239, 68, 68, 0.70)',
        opacity: op1,
        actionText: 'CRITICAL POLLUTION ALERT',
        isInteractiveButton: false,
        time,
      });

      // ==============================================================
      // Phase 2: The Critical Turning Point (Intervention Corridor)
      // Rises from below as we scroll into Phase 2, rests at restingY
      // ==============================================================
      const x2 = (width - cardW) / 2 - (scroll - 0.50) * width * (isMobile ? 0.45 : 0.85);
      const p2Rise = smooth(0.24, 0.46, scroll);
      const y2 = bottomOffscreenY - p2Rise * travelDist;
      const op2In = smooth(0.24, 0.38, scroll);
      const op2Out = smooth(0.58, 0.72, scroll);
      const op2 = op2In * (1.0 - op2Out);

      drawAncientGlitchCard(textCtx, {
        x: x2,
        y: y2,
        cardW,
        cardH,
        badgeText: 'ACTIVE AIR RESTORATION',
        badgeColor: '#fbbf24',
        strikingLine: 'FILTERING AND SCRUBBING THE AIR.',
        statPillText: 'AQI 142  —  MODERATE',
        accentColor: '#f59e0b',
        accentGlow: 'rgba(245, 158, 11, 0.70)',
        opacity: op2,
        actionText: 'CLEAN AIR FILTRATION IN PROGRESS',
        isInteractiveButton: false,
        time,
      });

      // ==============================================================
      // Phase 3: The Living Canopy (Restoration)
      // Starts offscreen below at bottomOffscreenY and RISES UP to restingY
      // EXACT OPPOSITE OF PHASE 1!
      // ==============================================================
      const x3Target = isMobile ? (width - cardW) / 2 : (width * 0.92 - cardW);
      const x3 = isMobile ? (width - cardW) / 2 : (x3Target - Math.max(0, (0.88 - scroll) * width * 0.50));
      const p3Rise = smooth(0.68, 0.88, scroll);
      const y3 = bottomOffscreenY - p3Rise * travelDist;
      const op3 = smooth(0.68, 0.84, scroll);

      drawAncientGlitchCard(textCtx, {
        x: x3,
        y: y3,
        cardW,
        cardH,
        badgeText: 'CLEAN MOUNTAIN AIR',
        badgeColor: '#34d399',
        strikingLine: 'PURE, HEALTHY AIR TO BREATHE.',
        statPillText: 'AQI 22  —  CLEAN & HEALTHY',
        accentColor: '#10b981',
        accentGlow: 'rgba(16, 185, 129, 0.70)',
        opacity: op3,
        actionText: 'EXPLORE LIVE AQI MAP',
        isInteractiveButton: true,
        time,
      });

      textTexture.needsUpdate = true;
    };

    // Interactive button pointer tracking (click & touch)
    const handleCanvasClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const btn = buttonBounds.current;
      if (btn && btn.active && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (onExploreTwin) onExploreTwin();
      }
    };

    const handleCanvasTouch = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
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
    renderer.domElement.addEventListener('touchstart', handleCanvasTouch, { passive: true });
    renderer.domElement.addEventListener('mousemove', handleCanvasMouseMove);

    const clock = new THREE.Clock();
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      crtMaterial.uniforms.uTime.value = time;
      crtMaterial.uniforms.uCurvature.value = width < 600 ? 0.04 : 0.28;
      updateTextTexture(scrollRef.current, time);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      crtMaterial.uniforms.uAspect.value = width / height;
      crtMaterial.uniforms.uResolution.value.set(width, height);
      crtMaterial.uniforms.uCurvature.value = width < 600 ? 0.04 : 0.28;

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
      renderer.domElement.removeEventListener('touchstart', handleCanvasTouch);
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
