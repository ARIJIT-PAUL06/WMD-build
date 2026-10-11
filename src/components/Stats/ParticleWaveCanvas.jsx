import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * ParticleWaveCanvas
 * Secondary particle-wave landscape for Dataset & Historical Observation distributions.
 * Features:
 * - Real-time smooth elevation morphing between active subsets/seasons.
 * - Monochromatic layered luminous wave cross-sections.
 * - Mouse parallax and localized ripples.
 * - IntersectionObserver to optimize offscreen rendering.
 */
export default function ParticleWaveCanvas({
  height = 380,
  observations = [],
  mode = 'dataset',
  activeSubset = 'ALL',
  activeSeason = 'ALL',
  className = '',
}) {
  const mountRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  // Store active filter values in refs so the animation loop can access them smoothly
  const filterRef = useRef({ mode, activeSubset, activeSeason });
  useEffect(() => {
    filterRef.current = { mode, activeSubset, activeSeason };
  }, [mode, activeSubset, activeSeason]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    // Check WebGL support
    const canvasTest = document.createElement('canvas');
    const gl = canvasTest.getContext('webgl') || canvasTest.getContext('experimental-webgl');
    if (!gl) {
      setIsSupported(false);
      return;
    }

    let width = container.clientWidth || window.innerWidth;
    let canvasHeight = height;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isMobile = width < 768;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / canvasHeight, 0.1, 1000);
    const initialCamPos = { x: 0, y: 22, z: 54 };
    camera.position.set(initialCamPos.x, initialCamPos.y, initialCamPos.z);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, canvasHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL init failed:', err);
      setIsSupported(false);
      return;
    }

    // Grid dimensions
    const cols = isMobile ? 70 : 100;
    const rows = isMobile ? 30 : 42;
    const numPoints = cols * rows;

    const positions = new Float32Array(numPoints * 3);
    const targetYArray = new Float32Array(numPoints);
    const currentYArray = new Float32Array(numPoints);
    const colors = new Float32Array(numPoints * 3);

    const gridWidth = 78;
    const gridDepth = 40;

    // Precompute sample heights from real observations if available
    const realValues = observations && observations.length > 0
      ? observations.map((o) => o.pm25 || 80)
      : [];

    // Helper to calculate target elevation for given coordinate and active state
    const computeTargetElevation = (xNorm, zNorm, rNorm, curMode, subset, season) => {
      if (curMode === 'distribution') {
        let baseVal = 70;
        if (realValues.length > 0) {
          const sampleIdx = Math.floor(xNorm * (realValues.length - 1));
          baseVal = realValues[sampleIdx] || 70;
        }

        // Season scaling
        let multiplier = 1.0;
        if (season === 'WINTER') multiplier = 1.65; // Peak inversion
        else if (season === 'SUMMER') multiplier = 0.85; // Heat/dust advection
        else if (season === 'MONSOON') multiplier = 0.42; // Washout
        else if (season === 'POST_MONSOON') multiplier = 1.5; // Stubble fire peak

        const normalized = Math.min(1.0, (baseVal * multiplier) / 350);
        const depthCurve = Math.sin(rNorm * Math.PI);
        return normalized * 14 * depthCurve;
      } else {
        // Dataset mode
        const wave1 = Math.sin(xNorm * Math.PI * 4 + rNorm * 3.5) * 3.4;
        const wave2 = Math.cos(xNorm * Math.PI * 8.5 - rNorm * 2.0) * 1.8;
        const centerCrest = Math.exp(-((xNorm - 0.5) ** 2) * 9) * 6.8;
        let baseWave = (wave1 + wave2 + centerCrest) * Math.sin(rNorm * Math.PI);

        // Subset dampening/accent
        if (subset === 'TRAIN') {
          // Highlight first 80% (xNorm <= 0.8), compress test 20%
          if (xNorm > 0.8) baseWave *= 0.35;
        } else if (subset === 'TEST') {
          // Highlight held-out 20% (xNorm > 0.8), compress train 80%
          if (xNorm <= 0.8) baseWave *= 0.35;
          else baseWave *= 1.35;
        }
        return baseWave;
      }
    };

    let pIdx = 0;
    for (let r = 0; r < rows; r++) {
      const rNorm = r / (rows - 1);
      const zNorm = rNorm - 0.5;
      const z = zNorm * gridDepth;

      for (let c = 0; c < cols; c++) {
        const xNorm = c / (cols - 1);
        const x = (xNorm - 0.5) * gridWidth;

        const initialY = computeTargetElevation(xNorm, zNorm, rNorm, mode, activeSubset, activeSeason);
        targetYArray[pIdx] = initialY;
        currentYArray[pIdx] = initialY;

        positions[pIdx * 3] = x;
        positions[pIdx * 3 + 1] = initialY;
        positions[pIdx * 3 + 2] = z;

        // Initial luminance
        const lum = Math.min(1.0, 0.35 + Math.max(0, initialY / 14) * 0.65);
        colors[pIdx * 3] = lum;
        colors[pIdx * 3 + 1] = lum;
        colors[pIdx * 3 + 2] = lum;

        pIdx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const pointsMaterial = new THREE.PointsMaterial({
      size: isMobile ? 1.4 : 1.7,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(geometry, pointsMaterial);
    scene.add(pointCloud);

    // Subtle horizontal wave lattice lines
    const linePositions = [];
    for (let r = 0; r < rows; r += 2) {
      for (let c = 0; c < cols - 1; c++) {
        const i1 = r * cols + c;
        const i2 = r * cols + (c + 1);
        linePositions.push(
          positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2],
          positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]
        );
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
    });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    // Mouse Interaction
    const mouse = { currentX: 0, currentY: 0, targetX: 0, targetY: 0 };
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = THREE.MathUtils.clamp(normX, -1, 1);
      mouse.targetY = THREE.MathUtils.clamp(normY, -1, 1);
    };
    const handlePointerLeave = () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
    };
    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    // IntersectionObserver
    let isIntersecting = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isIntersecting = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Animation Loop with Elevation Morphing
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isIntersecting) return;

      const time = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta(), 0.05);

      // Lerp mouse
      mouse.currentX += (mouse.targetX - mouse.currentX) * 0.06;
      mouse.currentY += (mouse.targetY - mouse.currentY) * 0.06;

      const posAttr = geometry.attributes.position;
      const posArr = posAttr.array;
      const colorAttr = geometry.attributes.color;
      const colorArr = colorAttr.array;
      const lineAttr = lineGeometry.attributes.position;
      const lineArr = lineAttr.array;

      const { mode: currentMode, activeSubset: curSubset, activeSeason: curSeason } = filterRef.current;

      // Recompute targets if filter changed and morph smoothly
      let pointIndex = 0;
      for (let r = 0; r < rows; r++) {
        const rNorm = r / (rows - 1);
        const zNorm = rNorm - 0.5;

        for (let c = 0; c < cols; c++) {
          const xNorm = c / (cols - 1);
          const px = posArr[pointIndex * 3];
          const pz = posArr[pointIndex * 3 + 2];

          const targetH = computeTargetElevation(xNorm, zNorm, rNorm, currentMode, curSubset, curSeason);
          targetYArray[pointIndex] = targetH;

          // Smooth morph interpolation towards target
          currentYArray[pointIndex] += (targetYArray[pointIndex] - currentYArray[pointIndex]) * 0.08;

          // Gentle ambient harmonic ripple
          let dynamicWave = 0;
          if (!prefersReducedMotion) {
            dynamicWave = Math.sin(time * 0.9 + px * 0.12 + pz * 0.08) * 0.35;
          }

          const finalY = currentYArray[pointIndex] + dynamicWave;
          posArr[pointIndex * 3 + 1] = finalY;

          // Update color based on elevation
          const lum = Math.min(1.0, 0.32 + Math.max(0, finalY / 14) * 0.68);
          colorArr[pointIndex * 3] = lum;
          colorArr[pointIndex * 3 + 1] = lum;
          colorArr[pointIndex * 3 + 2] = lum;

          pointIndex++;
        }
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      // Update line segments
      let lineIdx = 0;
      for (let r = 0; r < rows; r += 2) {
        for (let c = 0; c < cols - 1; c++) {
          const i1 = r * cols + c;
          const i2 = r * cols + (c + 1);
          lineArr[lineIdx + 1] = posArr[i1 * 3 + 1];
          lineArr[lineIdx + 4] = posArr[i2 * 3 + 1];
          lineIdx += 6;
        }
      }
      lineAttr.needsUpdate = true;

      // Camera parallax
      if (!prefersReducedMotion) {
        camera.position.x = initialCamPos.x + mouse.currentX * 10;
        camera.position.y = initialCamPos.y + mouse.currentY * 5;
        camera.lookAt(0, 0, 0);

        pointCloud.rotation.y = Math.sin(time * 0.15) * 0.02;
        lineSegments.rotation.y = pointCloud.rotation.y;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      camera.aspect = width / canvasHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, canvasHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      observer.disconnect();

      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      pointsMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, [height, mode, observations]);

  if (!isSupported) {
    return (
      <div
        className={`particle-wave-canvas-container static-fallback ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          color: '#888',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
        }}
        aria-hidden="true"
      >
        <span>[ 3D HARMONIC WAVE MATRIX · 2D FALLBACK ]</span>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`particle-wave-canvas-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
        cursor: 'crosshair',
        touchAction: 'none',
      }}
      aria-hidden="true"
    />
  );
}
