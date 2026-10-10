import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * ParticleTerrainCanvas
 * Recreates the high-density 3D particle mountain terrain from the scientific reference image.
 * Tech: WebGL + Three.js BufferGeometry with mouse reactivity, depth parallax,
 * formation entrance, and IntersectionObserver-driven performant rendering.
 */
export default function ParticleTerrainCanvas({ height = 520, className = '' }) {
  const mountRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    // Check WebGL capability
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

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(48, width / canvasHeight, 0.1, 1000);
    const initialCamPos = { x: 0, y: 34, z: 62 };
    camera.position.set(initialCamPos.x, initialCamPos.y, initialCamPos.z);
    camera.lookAt(0, 9, 0);

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

    // 2. Build 3D Mountain Point-Cloud
    const cols = isMobile ? 80 : 115;
    const rows = isMobile ? 55 : 80;
    const numPoints = cols * rows;

    const positions = new Float32Array(numPoints * 3);
    const baseElevations = new Float32Array(numPoints);
    const targetElevations = new Float32Array(numPoints);
    const colors = new Float32Array(numPoints * 3);

    const gridWidth = 92;
    const gridDepth = 62;

    let pIdx = 0;
    for (let r = 0; r < rows; r++) {
      const zNorm = (r / (rows - 1)) - 0.5;
      const z = zNorm * gridDepth;

      for (let c = 0; c < cols; c++) {
        const xNorm = (c / (cols - 1)) - 0.5;
        const x = xNorm * gridWidth;

        // Mountain elevation equation mimicking the sharp alpine terrain in reference
        const distFromCenter = Math.sqrt(xNorm * xNorm * 3.0 + zNorm * zNorm * 1.6);
        const mainPeak = Math.max(0, 1 - distFromCenter);

        // Multi-frequency harmonic ridges
        const ridge1 = Math.cos(xNorm * Math.PI * 4.6) * Math.sin(zNorm * Math.PI * 3.2) * 0.24;
        const ridge2 = Math.cos(xNorm * Math.PI * 9.2) * 0.09;
        const subPeaks =
          Math.exp(-((xNorm - 0.22) ** 2 * 18 + (zNorm + 0.1) ** 2 * 16)) * 0.46 +
          Math.exp(-((xNorm + 0.26) ** 2 * 16 + (zNorm - 0.08) ** 2 * 14)) * 0.42;

        let elevation =
          Math.pow(mainPeak, 2.3) * 28 +
          subPeaks * 15 +
          ridge1 * 12 +
          ridge2 * 8;

        // Edge fade
        const edgeFade = (1 - Math.abs(xNorm * 2)) * (1 - Math.abs(zNorm * 2));
        elevation = Math.max(0.1, elevation * Math.max(0, edgeFade));

        targetElevations[pIdx] = elevation;
        baseElevations[pIdx] = prefersReducedMotion ? elevation : 0.05;

        positions[pIdx * 3] = x;
        positions[pIdx * 3 + 1] = baseElevations[pIdx];
        positions[pIdx * 3 + 2] = z;

        // Height-based luminance: pure white peaks, silver ridges, muted charcoal base
        const lum = Math.min(1.0, 0.32 + (elevation / 28) * 0.68);
        colors[pIdx * 3] = lum;
        colors[pIdx * 3 + 1] = lum;
        colors[pIdx * 3 + 2] = lum;

        pIdx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circular particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const pointsMaterial = new THREE.PointsMaterial({
      size: isMobile ? 1.5 : 1.85,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(geometry, pointsMaterial);
    scene.add(pointCloud);

    // 3. Subtle Wire Contour Lattice Lines along alternate rows
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
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    // 4. Subtle Coordinate Ground Grid
    const gridHelper = new THREE.GridHelper(92, 36, 0x555555, 0x1f1f1f);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // 5. Mouse Interaction & Parallax
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

    // 6. IntersectionObserver for Rendering Performance
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

    // 7. Animation Loop with Formation Progress
    let animationFrameId;
    const clock = new THREE.Clock();
    let formationProgress = prefersReducedMotion ? 1.0 : 0.0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isIntersecting) return;

      const elapsedTime = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta(), 0.05);

      // Smooth mouse lerp
      mouse.currentX += (mouse.targetX - mouse.currentX) * 0.06;
      mouse.currentY += (mouse.targetY - mouse.currentY) * 0.06;

      if (!prefersReducedMotion) {
        // Formation ease-in from baseline to peak elevations
        if (formationProgress < 1.0) {
          formationProgress = Math.min(1.0, formationProgress + delta * 0.85);
        }

        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array;
        const lineAttr = lineGeometry.attributes.position;
        const lineArray = lineAttr.array;

        // Particle elevation dynamics + cursor localized disturbance
        const mouseWorldX = mouse.currentX * 35;
        const mouseWorldZ = -mouse.currentY * 20;

        for (let i = 0; i < numPoints; i++) {
          const targetY = targetElevations[i] * formationProgress;
          const px = posArray[i * 3];
          const pz = posArray[i * 3 + 2];

          // Harmonic ambient breath
          const wave = Math.sin(elapsedTime * 0.85 + px * 0.08 + pz * 0.06) * 0.45;

          // Localized mouse proximity displacement
          const dx = px - mouseWorldX;
          const dz = pz - mouseWorldZ;
          const distSq = dx * dx + dz * dz;
          const mouseLift = Math.exp(-distSq * 0.008) * 3.2;

          posArray[i * 3 + 1] = targetY + wave + mouseLift;
        }
        posAttr.needsUpdate = true;

        // Update contour lines corresponding to point positions
        let lineIdx = 0;
        for (let r = 0; r < rows; r += 2) {
          for (let c = 0; c < cols - 1; c++) {
            const i1 = r * cols + c;
            const i2 = r * cols + (c + 1);
            lineArray[lineIdx + 1] = posArray[i1 * 3 + 1];
            lineArray[lineIdx + 4] = posArray[i2 * 3 + 1];
            lineIdx += 6;
          }
        }
        lineAttr.needsUpdate = true;

        // Camera parallax reaction
        camera.position.x = initialCamPos.x + mouse.currentX * 14;
        camera.position.y = initialCamPos.y + mouse.currentY * 6;
        camera.lookAt(0, 9, 0);

        // Subtle yaw rotation
        pointCloud.rotation.y = Math.sin(elapsedTime * 0.22) * 0.035;
        lineMesh.rotation.y = pointCloud.rotation.y;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      camera.aspect = width / canvasHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, canvasHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. WebGL Context Loss Handling
    const handleContextLost = (e) => {
      e.preventDefault();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
    const handleContextRestored = () => {
      animate();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      observer.disconnect();

      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

      geometry.dispose();
      pointsMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, [height]);

  if (!isSupported) {
    return (
      <div
        className={`particle-terrain-canvas-container static-fallback ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.95) 70%)',
          color: '#888',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          letterSpacing: '0.1em',
        }}
        aria-hidden="true"
      >
        <span>[ 3D POINT-LATTICE TERRAIN · HARDWARE FALLBACK ACTIVE ]</span>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`particle-terrain-canvas-container ${className}`}
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
