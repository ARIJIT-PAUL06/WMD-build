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
        uScroll: { value: 0.0 },
        uParallax: { value: 0.0 },
        uCurvature: { value: 0.65 }, // High-impact authentic CRT spherical faceplate bulge!
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
        uniform float uScroll;
        uniform float uParallax;
        uniform float uCurvature;
        uniform float uAspect;
        varying vec2 vUv;

        // Spherical CRT barrel distortion math
        vec2 curveFaceplate(vec2 uv) {
          vec2 centered = uv * 2.0 - 1.0;
          centered.x *= uAspect;

          float r2 = dot(centered, centered);
          // Barrel distortion equation: pushes outer pixels inward & bulges center outward
          vec2 distorted = centered * (1.0 + uCurvature * r2 * 0.5);
          distorted.x /= uAspect;

          return distorted * 0.5 + 0.5;
        }

        void main() {
          // 1. Calculate the curved screen UV (Fixed to the physical CRT screen!)
          vec2 screenUv = curveFaceplate(vUv);

          // 2. Corner bezel blackout (Physical tube shadow outside the glass bulb)
          if (screenUv.x < 0.0 || screenUv.x > 1.0 || screenUv.y < 0.0 || screenUv.y > 1.0) {
            gl_FragColor = vec4(0.027, 0.039, 0.07, 1.0); // #070a12 background
            return;
          }

          // 3. Map panoramic 32:9 image: The texture slides horizontally behind the fixed lens
          // Panoramic image spans 2 full screen widths, so current window is a 0.5 slice
          float uOffset = uScroll * 0.5 + uParallax;
          vec2 texUv = vec2(screenUv.x * 0.5 + uOffset, screenUv.y);

          // 4. Sample RGB with subtle CRT chromatic aberration at the curved borders
          float distFromCenter = distance(screenUv, vec2(0.5));
          float rgbSplit = distFromCenter * 0.0035;

          vec4 colR = texture2D(uTexture, vec2(texUv.x + rgbSplit, texUv.y));
          vec4 colG = texture2D(uTexture, texUv);
          vec4 colB = texture2D(uTexture, vec2(texUv.x - rgbSplit, texUv.y));
          vec4 color = vec4(colR.r, colG.g, colB.b, 1.0);

          // 5. Authentic CRT bulb specular edge roll-off
          float edgeVignette = smoothstep(0.0, 0.08, screenUv.x) *
                               smoothstep(1.0, 0.92, screenUv.x) *
                               smoothstep(0.0, 0.08, screenUv.y) *
                               smoothstep(1.0, 0.92, screenUv.y);
          color.rgb *= mix(0.4, 1.0, edgeVignette);

          // 6. Contrast & Saturation boost
          color.rgb = pow(color.rgb, vec3(0.92)) * 1.06;

          gl_FragColor = color;
        }
      `,
      transparent: true,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), crtMaterial);
    scene.add(quad);

    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
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
