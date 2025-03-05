// FILE: src/components/Flame.jsx (Example)
import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Flame({ orbColor, soundIntensity = 0 }) {
  const pointsRef = useRef();
  const particleCount = 100;

  // Generate particle positions and velocities
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Start near orb surface (radius ~1)
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1 + Math.random() * 0.2;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      // Move outward and slightly upward
      vel[i * 3] = pos[i * 3] * 0.05;
      vel[i * 3 + 1] = pos[i * 3 + 1] * 0.05 + 0.02;
      vel[i * 3 + 2] = pos[i * 3 + 2] * 0.05;
    }
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        // Update positions
        positions[i * 3] += velocities[i * 3] * (1 + soundIntensity);
        positions[i * 3 + 1] += velocities[i * 3 + 1] * (1 + soundIntensity);
        positions[i * 3 + 2] += velocities[i * 3 + 2] * (1 + soundIntensity);
        // Reset if too far from orb
        if (positions[i * 3 + 1] > 3) {
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 1 + Math.random() * 0.2;
          positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = r * Math.cos(phi);
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          itemSize={3}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        color={orbColor}
        size={0.1}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}