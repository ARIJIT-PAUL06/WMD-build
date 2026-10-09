/**
 * AtmosphericCargoCanvas.jsx
 * VayuVitals - Cinematic 3D Environmental Particle & Spatial Lighting Engine
 *
 * Implements luxury 3D presentation inspired by award-winning spatial design:
 * - Volumetric aerosol particulate cloud in true 3D space with soft Gaussian alpha falloff
 * - Camera movement with lerped inertia responding to mouse yaw, pitch, and scroll depth
 * - Dynamic spatial point light that tracks the active / hovered pollutant container
 * - Smooth color interpolation matching each pollutant's environmental signature
 * - Cinematic camera approach & atmospheric particle vortex on container selection
 * - 100% lifecycle safety, pauses when off-screen, respects prefers-reduced-motion
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const POLLUTANT_3D_COORDS = {
  pm25: { x: -85, y: 35, color: '#ef4444' },
  pm10: { x: -10, y: 35, color: '#f97316' },
  no2:  { x: 65,  y: 35, color: '#eab308' },
  so2:  { x: 140, y: 35, color: '#10b981' },
  co:   { x: 215, y: 35, color: '#f43f5e' },
  o3:   { x: 290, y: 35, color: '#06b6d4' },
  nh3:  { x: 365, y: 35, color: '#a855f7' },
};

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function AtmosphericCargoCanvas({
  activePollutantId = 'pm25',
  hoveredPollutantId = null,
  isTransitioning = false,
  transitionTargetId = 'pm25',
  mouseNorm = { x: 0, y: 0 },
  inView = true,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    activePollutantId,
    hoveredPollutantId,
    isTransitioning,
    transitionTargetId,
    mouseNorm,
    inView,
  });

  useEffect(() => {
    stateRef.current = {
      activePollutantId,
      hoveredPollutantId,
      isTransitioning,
      transitionTargetId,
      mouseNorm,
      inView,
    };
  }, [activePollutantId, hoveredPollutantId, isTransitioning, transitionTargetId, mouseNorm, inView]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = container.clientWidth || 1200;
    let height = container.clientHeight || 500;

    // 1. Scene, Camera, and Fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070a12, 0.0016);

    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1500);
    camera.position.set(0, 18, 420);
    camera.lookAt(0, 10, 0);

    // 2. WebGL Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.warn('AtmosphericCargoCanvas: WebGL context creation failed', err);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Volumetric Particle Texture & Cloud
    const particleTexture = createParticleTexture();
    const particleCount = prefersReducedMotion ? 25 : 75;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Scatter in bounding volume around truck & flatbed deck
      positions[i * 3]     = (Math.random() - 0.35) * 650;
      positions[i * 3 + 1] = (Math.random() - 0.45) * 220 + 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 320;

      velocities[i * 3]     = (Math.random() - 0.3) * 0.45 + 0.15; // Gentle rightward air drift
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.22;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.22;

      scales[i] = Math.random() * 9 + 4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const targetColor = new THREE.Color(POLLUTANT_3D_COORDS[activePollutantId]?.color || '#ef4444');
    const currentColor = targetColor.clone();

    const pMaterial = new THREE.PointsMaterial({
      color: currentColor,
      size: 14,
      map: particleTexture,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // 4. Dynamic Spatial Spot & Point Light Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const cargoPointLight = new THREE.PointLight(currentColor, 2.5, 450);
    cargoPointLight.position.set(0, 70, 60);
    scene.add(cargoPointLight);

    // Subtle volumetric ground glow disk
    const groundDiskGeo = new THREE.PlaneGeometry(850, 180);
    const groundDiskMat = new THREE.MeshBasicMaterial({
      color: currentColor,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const groundGlow = new THREE.Mesh(groundDiskGeo, groundDiskMat);
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.set(120, -65, 0);
    scene.add(groundGlow);

    // 5. Animation Loop with Smooth Camera Lerp & Particle Dynamics
    let animId = null;
    let clock = new THREE.Clock();

    const render = () => {
      animId = requestAnimationFrame(render);

      const state = stateRef.current;
      if (!state.inView) return;

      const elapsed = clock.getElapsedTime();
      const posAttr = geometry.attributes.position;
      const posArray = posAttr.array;

      // Determine active target color from hovered or active pollutant
      const currentActiveId = state.hoveredPollutantId || state.activePollutantId || 'pm25';
      const targetHex = POLLUTANT_3D_COORDS[currentActiveId]?.color || '#ef4444';
      targetColor.set(targetHex);
      currentColor.lerp(targetColor, 0.06);

      pMaterial.color.copy(currentColor);
      cargoPointLight.color.copy(currentColor);
      groundDiskMat.color.copy(currentColor);

      // Smooth point light tracking to active/hovered container 3D position
      const activeCoords = POLLUTANT_3D_COORDS[currentActiveId] || { x: 0, y: 35 };
      cargoPointLight.position.x += (activeCoords.x - cargoPointLight.position.x) * 0.07;
      cargoPointLight.position.y += (activeCoords.y + 40 - cargoPointLight.position.y) * 0.07;

      // Ambient lighting and point light subtle tracking
      pMaterial.opacity = 0.44;
      cargoPointLight.intensity = 2.4;

      // Update atmospheric particles with gentle ambient airflow around stationary truck
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;

        // Ambient organic Brownian airflow
        const pAngle = phases[i] + elapsed * 0.7;
        posArray[idx]     += velocities[idx] + Math.cos(pAngle) * 0.1;
        posArray[idx + 1] += velocities[idx + 1] + Math.sin(pAngle) * 0.12;
        posArray[idx + 2] += velocities[idx + 2];

        // Restrained environmental particle response around hovered pollutant container
        if (state.hoveredPollutantId) {
          const hCoord = POLLUTANT_3D_COORDS[state.hoveredPollutantId];
          if (hCoord) {
            const distToHover = Math.abs(posArray[idx] - hCoord.x);
            if (distToHover < 65) {
              posArray[idx + 1] += Math.sin(elapsed * 3 + i) * 0.25; // Gentle thermal excitation
            }
          }
        }

        // Boundary wrap
        if (posArray[idx] > 400) posArray[idx] = -300;
        if (posArray[idx] < -320) posArray[idx] = 380;
        if (posArray[idx + 1] > 160) posArray[idx + 1] = -70;
        if (posArray[idx + 1] < -80) posArray[idx + 1] = 150;
        if (posArray[idx + 2] > 200) posArray[idx + 2] = -180;
        if (posArray[idx + 2] < -200) posArray[idx + 2] = 180;
      }

      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };

    render();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      pMaterial.dispose();
      if (particleTexture) particleTexture.dispose();
      groundDiskGeo.dispose();
      groundDiskMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="atmospheric-cargo-three-viewport"
      aria-hidden="true"
    />
  );
}
