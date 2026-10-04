import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * CrtScreenLensCanvas
 * Renders the panoramic image inside an authentic fixed CRT curved glass bulb.
 * - The curved glass CRT barrel distortion is FIXED to the 100vw x 100vh monitor faceplate.
 * - As the user scrolls, the panoramic texture coordinates (UVs) glide horizontally behind the lens.
 * - Whatever passes through the center of the screen visibly swells, magnifies, and bows outward!
 */
export default function CrtScreenLensCanvas({ scrollProgress = 0, mousePos = { x: 0, y: 0 } }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();
    const panoramicTex = textureLoader.load('/lungs-panoramic.png');
    panoramicTex.minFilter = THREE.LinearFilter;
    panoramicTex.magFilter = THREE.LinearFilter;
    panoramicTex.wrapS = THREE.ClampToEdgeWrapping;
    panoramicTex.wrapT = THREE.ClampToEdgeWrapping;

    // Custom CRT Curved Faceplate Shader
    const crtMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: panoramicTex },
        uTime: { value: 0.0 },
        uScroll: { value: 0.0 },
        uParallax: { value: 0.0 },
        uCurvature: { value: 0.22 }, // Crisp, authentic CRT spherical faceplate bulge
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
          // 1. Calculate physical curved CRT screen UV
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

          // 3. PHYSICAL SPHERICAL CURVATURE ARCH FOR HORIZONTAL LINES
          // On a curved spherical CRT tube, horizontal raster lines bow in a 3D parabola:
          // In upper half (y > 0.5), it arches upwards toward the corners;
          // In lower half (y < 0.5), it arches downwards toward the corners.
          float domeBow = (screenUv.x - 0.5) * (screenUv.x - 0.5) * (screenUv.y - 0.5) * 0.52;
          float curvedY = screenUv.y + domeBow;

          // 4. AUTHENTIC TV VERTICAL SYNC ROLL (Steady, natural analog drift ~7.5s cycle)
          float rollSpeed = 0.13;
          float rollPos = fract(uTime * rollSpeed);

          // Shortest wrapped distance to the rolling sync bar (seamless looping)
          float dY = mod(curvedY - rollPos + 0.5, 1.0) - 0.5;

          // 5. HORIZONTAL SYNC JITTER / ANALOG TEAR SLIP
          // When the vertical blanking bar sweeps across, the analog horizontal PLL briefly slips,
          // creating an authentic horizontal jitter/tear right through the passing bar!
          float syncSlipZone = exp(-pow(dY * 34.0, 2.0));
          float hJitter = (sin(curvedY * 140.0 + uTime * 48.0) * 0.0035 + 
                           sin(uTime * 32.0) * 0.002 + 
                           (hash12(vec2(floor(curvedY * 350.0), floor(uTime * 22.0))) - 0.5) * 0.0028) * syncSlipZone;

          // 6. Map panoramic 32:9 image texture behind the curved faceplate with jitter
          float uOffset = uScroll * 0.5 + uParallax;
          vec2 clampedScreen = clamp(screenUv, 0.0, 1.0);
          vec2 texUv = vec2(clamp(clampedScreen.x * 0.5 + uOffset + hJitter, 0.001, 0.999), clampedScreen.y);

          // 7. Chromatic dispersion: RGB electron gun separation (stronger at lens periphery & sync tear)
          float distFromCenter = distance(screenUv, vec2(0.5));
          float rgbSplit = distFromCenter * 0.0022 + syncSlipZone * 0.003;

          vec4 colR = texture2D(uTexture, vec2(clamp(texUv.x + rgbSplit, 0.0, 1.0), texUv.y));
          vec4 colG = texture2D(uTexture, texUv);
          vec4 colB = texture2D(uTexture, vec2(clamp(texUv.x - rgbSplit, 0.0, 1.0), texUv.y));
          vec4 color = vec4(colR.r, colG.g, colB.b, 1.0);

          // 8. AUTHENTIC RETRACE BAR & VERTICAL BLANKING INTERVAL COMPOSITION
          // A. The Dark Vertical Blanking Interval Bar (the black bar that rolls when V-hold slips):
          float blankingBar = smoothstep(0.048, 0.0, abs(dY)) * 0.42;
          color.rgb *= (1.0 - blankingBar);

          // B. Sharp Phosphor Electron Retrace Beam (Luminous glowing line leading the roll):
          float beamDist = dY - 0.024;
          float sharpCore = exp(-pow(beamDist * 95.0, 2.0));      // Razor-sharp electron line
          float radiantBloom = exp(-pow(beamDist * 24.0, 2.0)) * 0.45; // Surrounding phosphor glow
          vec3 retraceColor = vec3(0.88, 0.96, 1.0) * (sharpCore * 0.72 + radiantBloom * 0.4);
          color.rgb += retraceColor;

          // C. Secondary phosphor ghost echo:
          float trailingDist = dY + 0.026;
          float trailingLine = exp(-pow(trailingDist * 75.0, 2.0)) * 0.16;
          color.rgb += vec3(0.78, 0.92, 1.0) * trailingLine;

          // D. Subtle 50/60Hz AC ground hum roll:
          float humBar = sin(curvedY * 6.28318 * 2.0 - uTime * 1.1) * 0.02;
          color.rgb += humBar;

          // 9. Curved phosphor interlace scanlines across entire screen (physically curved with glass)
          float rasterLines = sin(curvedY * uResolution.y * 1.3) * 0.5 + 0.5;
          color.rgb *= mix(0.88, 1.0, rasterLines);

          // 10. Authentic CRT bulb edge vignette (Gentle falloff at perimeter)
          float edgeVignette = smoothstep(0.0, 0.06, screenUv.x) *
                               smoothstep(1.0, 0.94, screenUv.x) *
                               smoothstep(0.0, 0.06, screenUv.y) *
                               smoothstep(1.0, 0.94, screenUv.y);
          color.rgb *= mix(0.74, 1.0, edgeVignette);

          // 11. Contrast & Color Grading
          color.rgb = pow(color.rgb, vec3(0.95)) * 1.03;

          // 12. Blend seamlessly into the dark background (#070a12) at the edges
          vec3 bgCol = vec3(0.027, 0.039, 0.07);
          gl_FragColor = vec4(mix(bgCol, color.rgb, edgeAlpha), 1.0);
        }
      `,
      transparent: true,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), crtMaterial);
    scene.add(quad);

    const clock = new THREE.Clock();
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      crtMaterial.uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      crtMaterial.uniforms.uAspect.value = w / h;
      crtMaterial.uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Save refs for fast uniform updates
    container._crtMaterial = crtMaterial;

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      panoramicTex.dispose();
      crtMaterial.dispose();
    };
  }, []);

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
        pointerEvents: 'none',
      }}
    />
  );
}
