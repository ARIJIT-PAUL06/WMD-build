import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * BioLungsModel
 * Procedural 3D anatomical lungs & bronchial tree that visually reacts to live AQI data:
 * - Color shifts from healthy cyan/emerald -> amber -> charcoal ash with crimson inflammation
 * - Breathing rate changes from tranquil deep breaths -> rapid distressed spasms
 * - Translucency and vascular emissive intensity react dynamically
 */
export default function BioLungsModel({ aqi = 45, interactiveTilt = true }) {
  const groupRef = useRef();
  const leftLungRef = useRef();
  const rightLungRef = useRef();
  const tracheaRef = useRef();
  const bronchiGroupRef = useRef();

  // Color targets based on AQI
  const colorTarget = useMemo(() => {
    if (aqi <= 50) {
      return {
        lobePrimary: new THREE.Color('#10b981'), // Lush Emerald
        lobeSecondary: new THREE.Color('#06b6d4'), // Cyan
        airway: new THREE.Color('#38bdf8'), // Sky Blue
        emissive: new THREE.Color('#059669'),
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.1,
        clearcoat: 0.8,
        transmission: 0.65, // Clean, glass-like living bio-tissue
        breathingSpeed: 1.2,
        breathingAmp: 0.08,
      };
    } else if (aqi <= 100) {
      return {
        lobePrimary: new THREE.Color('#eab308'), // Warm Yellow
        lobeSecondary: new THREE.Color('#f59e0b'), // Amber
        airway: new THREE.Color('#fbbf24'),
        emissive: new THREE.Color('#d97706'),
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.15,
        clearcoat: 0.5,
        transmission: 0.45,
        breathingSpeed: 1.5,
        breathingAmp: 0.07,
      };
    } else if (aqi <= 200) {
      return {
        lobePrimary: new THREE.Color('#ea580c'), // Burnt Orange
        lobeSecondary: new THREE.Color('#dc2626'), // Red
        airway: new THREE.Color('#f97316'),
        emissive: new THREE.Color('#b91c1c'),
        emissiveIntensity: 0.6,
        roughness: 0.5,
        metalness: 0.25,
        clearcoat: 0.3,
        transmission: 0.25,
        breathingSpeed: 2.1,
        breathingAmp: 0.09,
      };
    } else {
      // Hazardous / Severe Smog (AQI 200 - 500+)
      return {
        lobePrimary: new THREE.Color('#27272a'), // Charcoal / Ash
        lobeSecondary: new THREE.Color('#7f1d1d'), // Necrotic Deep Crimson
        airway: new THREE.Color('#991b1b'), // Inflamed Airway
        emissive: new THREE.Color('#ef4444'), // Bright inflamed vein glow
        emissiveIntensity: 0.85,
        roughness: 0.75,
        metalness: 0.35,
        clearcoat: 0.1,
        transmission: 0.08, // Opaque, congested with particulate soot
        breathingSpeed: 3.2,
        breathingAmp: 0.11, // Distressed tachypneic breathing
      };
    }
  }, [aqi]);

  // Current interpolated material colors
  const currentLobeColor = useRef(new THREE.Color('#10b981'));
  const currentAirwayColor = useRef(new THREE.Color('#38bdf8'));
  const currentEmissiveColor = useRef(new THREE.Color('#059669'));

  // Materials with high physical fidelity
  const lungMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#10b981'),
      emissive: new THREE.Color('#059669'),
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.7,
      clearcoatRoughness: 0.2,
      transmission: 0.5,
      ior: 1.35,
      thickness: 1.2,
      transparent: true,
      opacity: 0.92,
    });
  }, []);

  const airwayMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38bdf8'),
      emissive: new THREE.Color('#0284c7'),
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2,
    });
  }, []);

  const innerVeinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      emissive: new THREE.Color('#10b981'),
      emissiveIntensity: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
  }, []);

  // Procedural tree branches for secondary and tertiary bronchi
  const branches = useMemo(() => {
    const list = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const isRight = i % 2 === 0;
      const t = i / count;
      const angle = (isRight ? 1 : -1) * (0.4 + t * 0.8) + (Math.sin(i) * 0.2);
      const length = 0.5 + (1 - t) * 0.7;
      const radius = 0.04 * (1 - t * 0.6);
      const y = -0.5 - t * 1.8;
      const x = (isRight ? 0.35 : -0.35) + Math.cos(angle) * (0.3 + t * 0.7);
      const z = Math.sin(i * 1.7) * 0.3;

      list.push({
        id: i,
        position: [x, y, z],
        rotation: [Math.sin(i) * 0.3, angle * 0.5, (isRight ? -1 : 1) * (0.5 + t * 0.4)],
        scale: [radius, length, radius],
        isRight,
      });
    }
    return list;
  }, []);

  // Frame loop for respiration & mouse interaction
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // 1. Smoothly interpolate material colors toward current AQI target
    currentLobeColor.current.lerp(colorTarget.lobePrimary, delta * 3);
    currentAirwayColor.current.lerp(colorTarget.airway, delta * 3);
    currentEmissiveColor.current.lerp(colorTarget.emissive, delta * 3);

    lungMaterial.color.copy(currentLobeColor.current);
    lungMaterial.emissive.copy(currentEmissiveColor.current);
    lungMaterial.emissiveIntensity = THREE.MathUtils.lerp(lungMaterial.emissiveIntensity, colorTarget.emissiveIntensity, delta * 2);
    lungMaterial.roughness = THREE.MathUtils.lerp(lungMaterial.roughness, colorTarget.roughness, delta * 2);
    lungMaterial.transmission = THREE.MathUtils.lerp(lungMaterial.transmission, colorTarget.transmission, delta * 2);

    airwayMaterial.color.copy(currentAirwayColor.current);
    airwayMaterial.emissive.copy(currentEmissiveColor.current);
    innerVeinMaterial.emissive.copy(currentEmissiveColor.current);

    // 2. Respiration cycle (Breathing Expansion/Contraction)
    const breathFreq = colorTarget.breathingSpeed;
    const breathAmp = colorTarget.breathingAmp;
    
    // Normal sinus breath wave
    let breath = Math.sin(time * breathFreq);

    // If severe pollution (AQI > 200), inject occasional irregular coughing spasm / twitch
    if (aqi > 200) {
      const coughSpasm = Math.pow(Math.sin(time * 6.5), 11) * 0.08;
      breath += coughSpasm;
    }

    const scaleX = 1 + breath * breathAmp * 1.1;
    const scaleY = 1 + breath * breathAmp * 0.6;
    const scaleZ = 1 + breath * breathAmp * 1.2;

    if (leftLungRef.current) {
      leftLungRef.current.scale.set(scaleX, scaleY, scaleZ);
      leftLungRef.current.position.y = -1.2 + breath * 0.03;
    }
    if (rightLungRef.current) {
      rightLungRef.current.scale.set(scaleX * 1.05, scaleY, scaleZ * 1.05); // Right lung naturally slightly larger
      rightLungRef.current.position.y = -1.2 + breath * 0.03;
    }

    // 3. Mouse Parallax Tilt & gentle levitation
    if (interactiveTilt) {
      const targetRotX = (state.pointer.y * 0.25) + Math.sin(time * 0.5) * 0.04;
      const targetRotY = (state.pointer.x * 0.35) + Math.cos(time * 0.4) * 0.05;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 4);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 4);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(time * 1.2) * 0.06, delta * 3);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.4, 0]}>
      {/* 1. TRACHEA (Main Windpipe) with cartilage rings */}
      <group ref={tracheaRef} position={[0, 1.1, 0]}>
        {/* Main trachea tube */}
        <mesh material={airwayMaterial}>
          <cylinderGeometry args={[0.22, 0.2, 1.5, 32]} />
        </mesh>
        
        {/* Cartilage Ring Ridges */}
        {[-0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6].map((yPos, idx) => (
          <mesh key={idx} position={[0, yPos, 0]} material={airwayMaterial}>
            <torusGeometry args={[0.225, 0.03, 12, 32]} />
          </mesh>
        ))}

        {/* Carina Bifurcation Hub */}
        <mesh position={[0, -0.8, 0]} material={airwayMaterial}>
          <sphereGeometry args={[0.26, 24, 24]} />
        </mesh>
      </group>

      {/* 2. MAIN BRONCHI (Left & Right Mainstems) */}
      <group ref={bronchiGroupRef}>
        {/* Left Bronchus */}
        <mesh position={[-0.45, 0.05, 0]} rotation={[0, 0, 0.65]} material={airwayMaterial}>
          <cylinderGeometry args={[0.15, 0.12, 0.9, 20]} />
        </mesh>
        {/* Right Bronchus */}
        <mesh position={[0.45, 0.05, 0]} rotation={[0, 0, -0.65]} material={airwayMaterial}>
          <cylinderGeometry args={[0.16, 0.13, 0.9, 20]} />
        </mesh>

        {/* Secondary Bronchial Tree Branches */}
        {branches.map((b) => (
          <mesh
            key={b.id}
            position={b.position}
            rotation={b.rotation}
            scale={b.scale}
            material={airwayMaterial}
          >
            <cylinderGeometry args={[1, 0.6, 1, 12]} />
          </mesh>
        ))}
      </group>

      {/* 3. LEFT LUNG LOBE (Anatomical Dual-Shell Bio-Organ) */}
      <group ref={leftLungRef} position={[-1.15, -1.2, 0]}>
        {/* Superior Lobe (Upper) */}
        <mesh position={[-0.1, 0.55, 0]} rotation={[0.1, 0.1, 0.15]} material={lungMaterial}>
          <sphereGeometry args={[0.82, 32, 32]} />
        </mesh>
        {/* Inferior Lobe (Lower Base with Cardiac Notch contour) */}
        <mesh position={[0.0, -0.45, 0]} rotation={[-0.1, -0.15, -0.1]} material={lungMaterial}>
          <sphereGeometry args={[0.95, 32, 32]} />
        </mesh>
        {/* Inner vascular neural tree lattice */}
        <mesh position={[-0.05, 0.1, 0]} material={innerVeinMaterial}>
          <sphereGeometry args={[0.9, 16, 16]} />
        </mesh>
      </group>

      {/* 4. RIGHT LUNG LOBE (3 Lobe Segment: Superior, Middle, Inferior) */}
      <group ref={rightLungRef} position={[1.2, -1.2, 0]}>
        {/* Superior Lobe */}
        <mesh position={[0.15, 0.65, 0]} rotation={[-0.1, -0.1, -0.15]} material={lungMaterial}>
          <sphereGeometry args={[0.86, 32, 32]} />
        </mesh>
        {/* Middle Lobe */}
        <mesh position={[0.2, 0.05, 0.1]} rotation={[0, 0.1, -0.05]} material={lungMaterial}>
          <sphereGeometry args={[0.78, 32, 32]} />
        </mesh>
        {/* Inferior Lobe Base */}
        <mesh position={[0.05, -0.55, 0]} rotation={[0.1, 0.15, 0.1]} material={lungMaterial}>
          <sphereGeometry args={[1.02, 32, 32]} />
        </mesh>
        {/* Inner vascular tree lattice */}
        <mesh position={[0.1, 0.1, 0]} material={innerVeinMaterial}>
          <sphereGeometry args={[0.95, 16, 16]} />
        </mesh>
      </group>
    </group>
  );
}
