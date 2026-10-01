import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import BioLungsModel from './BioLungsModel';
import PollutionParticles from './PollutionParticles';

/**
 * LungsCanvas
 * High-performance WebGL Canvas hosting the reactive 3D lungs, lighting rig,
 * atmospheric fog, and particle swarm.
 */
export default function LungsCanvas({ aqi = 45, interactive = true }) {
  // Lighting and fog colors according to AQI
  const lighting = useMemo(() => {
    if (aqi <= 50) {
      return {
        ambient: '#093a3e',
        ambientIntensity: 1.4,
        keyLight: '#10b981',
        keyIntensity: 2.2,
        fillLight: '#06b6d4',
        fogColor: '#090d16',
        fogNear: 4,
        fogFar: 14,
      };
    } else if (aqi <= 100) {
      return {
        ambient: '#292510',
        ambientIntensity: 1.2,
        keyLight: '#fbbf24',
        keyIntensity: 2.0,
        fillLight: '#f59e0b',
        fogColor: '#0c0f17',
        fogNear: 3.5,
        fogFar: 12,
      };
    } else if (aqi <= 200) {
      return {
        ambient: '#2c120a',
        ambientIntensity: 1.1,
        keyLight: '#ea580c',
        keyIntensity: 2.4,
        fillLight: '#dc2626',
        fogColor: '#120b0b',
        fogNear: 3,
        fogFar: 10,
      };
    } else {
      // Hazardous / Severe Smog
      return {
        ambient: '#220808',
        ambientIntensity: 1.0,
        keyLight: '#ef4444',
        keyIntensity: 3.0,
        fillLight: '#991b1b',
        fogColor: '#170606', // Thick toxic smog fog
        fogNear: 2.5,
        fogFar: 8.5,
      };
    }
  }, [aqi]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        {/* Dynamic Atmospheric Fog */}
        <fog attach="fog" args={[lighting.fogColor, lighting.fogNear, lighting.fogFar]} />

        {/* Ambient & Key Lighting */}
        <ambientLight color={lighting.ambient} intensity={lighting.ambientIntensity} />
        <directionalLight
          position={[4, 5, 4]}
          color={lighting.keyLight}
          intensity={lighting.keyIntensity}
        />
        <pointLight
          position={[-4, -2, 3]}
          color={lighting.fillLight}
          intensity={1.8}
        />
        <pointLight
          position={[0, -3, -2]}
          color={aqi > 200 ? '#ef4444' : '#10b981'}
          intensity={aqi > 200 ? 3.5 : 1.5}
        />

        <Suspense fallback={null}>
          <Float
            speed={aqi > 200 ? 2.5 : 1.2}
            rotationIntensity={0.2}
            floatIntensity={0.3}
          >
            <BioLungsModel aqi={aqi} interactiveTilt={interactive} />
          </Float>
          <PollutionParticles aqi={aqi} />
        </Suspense>

        {/* Orbit Controls with soft damping */}
        {interactive && (
          <OrbitControls
            enableZoom={true}
            minDistance={3.5}
            maxDistance={7.5}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 3}
            rotateSpeed={0.6}
            dampingFactor={0.05}
          />
        )}
      </Canvas>

      {/* Interactive Helper Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '9999px',
          padding: '6px 14px',
          fontSize: '0.75rem',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
        <span>Click & drag to rotate 3D lungs · Scroll to zoom</span>
      </div>
    </div>
  );
}
