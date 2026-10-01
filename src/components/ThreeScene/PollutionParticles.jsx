import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PollutionParticles
 * Dynamic 3D particle swarm simulating PM2.5, PM10, smog, or clean oxygen ions:
 * - Particle density scales with AQI (from 80 clean motes to 1,600 toxic soot particles)
 * - Motion changes from gentle buoyant drift to high-turbulence chaotic agitation
 * - Colors match current pollution severity
 */
export default function PollutionParticles({ aqi = 45 }) {
  const pointsRef = useRef();

  // Particle count based on AQI
  const particleCount = useMemo(() => {
    if (aqi <= 50) return 100;
    if (aqi <= 100) return 350;
    if (aqi <= 200) return 850;
    return 1600;
  }, [aqi]);

  // Particle positions, velocities, and color buffers
  const [positions, velocities, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    const color = new THREE.Color();
    const isGood = aqi <= 50;
    const isModerate = aqi > 50 && aqi <= 100;
    const isUnhealthy = aqi > 100 && aqi <= 200;

    for (let i = 0; i < particleCount; i++) {
      // Spawn particles in a volume enclosing the lungs
      const radius = 1.0 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      pos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      pos[i * 3 + 1] = radius * Math.sin(phi) + (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      // Velocities: turbulent if hazardous, buoyant if clean
      const speed = isGood ? 0.005 : (isModerate ? 0.015 : 0.04);
      vel[i * 3] = (Math.random() - 0.5) * speed;
      vel[i * 3 + 1] = isGood ? Math.random() * 0.01 + 0.002 : (Math.random() - 0.5) * speed;
      vel[i * 3 + 2] = (Math.random() - 0.5) * speed;

      // Color selection
      if (isGood) {
        // Cyan and emerald oxygen ions
        color.set(Math.random() > 0.4 ? '#38bdf8' : '#34d399');
      } else if (isModerate) {
        // Yellow-amber dust & pollen
        color.set(Math.random() > 0.5 ? '#fbbf24' : '#f59e0b');
      } else if (isUnhealthy) {
        // Orange-red irritant soot
        color.set(Math.random() > 0.4 ? '#f97316' : '#ef4444');
      } else {
        // Toxic dark charcoal, ash, and crimson particulate matter
        const r = Math.random();
        if (r < 0.4) color.set('#ef4444'); // Crimson particulate
        else if (r < 0.7) color.set('#52525b'); // Dark ash
        else color.set('#18181b'); // Soot
      }

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    return [pos, vel, col];
  }, [particleCount, aqi]);

  // Frame update loop
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArr = posAttr.array;
    const time = state.clock.getElapsedTime();

    const isHazardous = aqi > 200;
    const turbulence = isHazardous ? 0.08 : 0.015;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;

      // Inward pull toward lungs if breathing in (AQI > 100)
      if (aqi > 100) {
        const distToCenter = Math.sqrt(
          posArr[idx] * posArr[idx] +
          posArr[idx + 1] * posArr[idx + 1] +
          posArr[idx + 2] * posArr[idx + 2]
        );
        if (distToCenter > 3.8) {
          posArr[idx] = (Math.random() - 0.5) * 4;
          posArr[idx + 1] = (Math.random() - 0.5) * 4;
          posArr[idx + 2] = (Math.random() - 0.5) * 3;
        }
      }

      // Add velocity and noise turbulence
      posArr[idx] += velocities[idx] + Math.sin(time * 2 + i) * turbulence * delta;
      posArr[idx + 1] += velocities[idx + 1] + (aqi <= 50 ? 0.008 : Math.cos(time * 2 + i) * turbulence * delta);
      posArr[idx + 2] += velocities[idx + 2] + Math.sin(time * 3 + i) * turbulence * delta;

      // Wrap around bounds
      if (posArr[idx + 1] > 3.5) posArr[idx + 1] = -3.0;
      if (posArr[idx + 1] < -3.5) posArr[idx + 1] = 3.0;
      if (Math.abs(posArr[idx]) > 4.5) posArr[idx] *= -0.9;
      if (Math.abs(posArr[idx + 2]) > 4.0) posArr[idx + 2] *= -0.9;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={aqi > 200 ? 0.065 : 0.045}
        vertexColors
        transparent
        opacity={aqi > 200 ? 0.85 : 0.65}
        blending={aqi <= 50 ? THREE.AdditiveBlending : THREE.NormalBlending}
        depthWrite={false}
      />
    </points>
  );
}
