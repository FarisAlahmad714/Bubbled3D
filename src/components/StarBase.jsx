// FILE: src/components/StarCluster.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createParticleTexture } from './ParticleTexture';

export default function StarBase({
  center = [0, 0, 0], // Center of the cluster
  starCount = 1000,   // Number of stars
  sigma = 2,          // Spread of the Gaussian distribution
  soundIntensity = 0  // Optional: React to sound
}) {
  const pointsRef = useRef();
  const texture = createParticleTexture('#ffffff', 32); // Smaller texture for sharper stars

  // Generate star data once using useMemo for performance
  const { positions, colors, sizes, axes, radii, angles, speeds } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const axes = [];  // Orbital axis for each star
    const radii = []; // Orbital radius for each star
    const angles = []; // Current angle in orbit
    const speeds = []; // Angular speed

    for (let i = 0; i < starCount; i++) {
      // Gaussian distribution for radius (centered clustering)
      const radius = Math.abs(THREE.MathUtils.randFloatSpread(2 * sigma));
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = center[0] + radius * Math.sin(phi) * Math.cos(theta);
      const y = center[1] + radius * Math.sin(phi) * Math.sin(theta);
      const z = center[2] + radius * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // White stars for simplicity
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = 0.01; // Small size for star-like points

      // Random orbital axis
      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      axes.push(axis);
      radii.push(radius);
      angles.push(Math.random() * 2 * Math.PI);
      // Orbital speed decreases with distance (simplified gravity)
      const speed = 0.1 / Math.sqrt(radius + 0.1); // Avoid division by zero
      speeds.push(speed);
    }
    return { positions, colors, sizes, axes, radii, angles, speeds };
  }, [center, starCount, sigma]);

  // Animate stars with orbital motion
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const positionAttr = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < starCount; i++) {
      const radius = radii[i];
      const axis = axes[i];
      let speed = speeds[i];
      // Optional: Adjust speed with sound intensity
      speed *= 1 + soundIntensity * 0.5;
      let angle = angles[i] + speed * time;

      // Define orbital plane
      const randomVec = new THREE.Vector3(1, 0, 0);
      if (Math.abs(axis.dot(randomVec)) > 0.99) randomVec.set(0, 1, 0);
      const U = axis.clone().cross(randomVec).normalize();
      const V = axis.clone().cross(U).normalize();

      // Calculate new position
      const x = center[0] + radius * (Math.cos(angle) * U.x + Math.sin(angle) * V.x);
      const y = center[1] + radius * (Math.cos(angle) * U.y + Math.sin(angle) * V.y);
      const z = center[2] + radius * (Math.cos(angle) * U.z + Math.sin(angle) * V.z);
      positionAttr.array[i * 3] = x;
      positionAttr.array[i * 3 + 1] = y;
      positionAttr.array[i * 3 + 2] = z;
    }
    positionAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={starCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={starCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.01} // Small size for sharp stars
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={texture}
      />
    </points>
  );
}