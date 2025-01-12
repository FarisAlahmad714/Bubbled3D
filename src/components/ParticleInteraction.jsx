// src/components/ParticleInteraction.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ParticleInteraction({ spheres }) {
  const particles = useRef();

  // 1) Lower count to reduce total computations
  const count = 500;

  // Pre-allocate arrays
  const particlePositions = new Float32Array(count * 3);

  // Store random velocities
  const particleVelocities = useRef(
    Array(count)
      .fill()
      .map(() => new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ))
  ).current;

  // Randomize initial positions
  for (let i = 0; i < count * 3; i += 3) {
    particlePositions[i]     = (Math.random() - 0.5) * 20;
    particlePositions[i + 1] = (Math.random() - 0.5) * 20;
    particlePositions[i + 2] = (Math.random() - 0.5) * 20;
  }

  let frame = 0;

  useFrame(() => {
    const positions = particles.current.geometry.attributes.position.array;

    // 3) Skip frames to reduce CPU load (update collisions only every other frame)
    frame++;
    const doCollisionCheck = frame % 2 === 0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update particle positions based on velocity every frame
      positions[i3]     += particleVelocities[i].x;
      positions[i3 + 1] += particleVelocities[i].y;
      positions[i3 + 2] += particleVelocities[i].z;

      // Only do collision checks on skipped frames
      if (doCollisionCheck && spheres.length > 0) {
        const particlePos = new THREE.Vector3(
          positions[i3],
          positions[i3 + 1],
          positions[i3 + 2]
        );

        // 2) Use squared distance to avoid sqrt overhead
        spheres.forEach(sphere => {
          const spherePos = new THREE.Vector3(...sphere.position);
          const distanceSq = spherePos.distanceToSquared(particlePos);

          // distance < 3 means distance^2 < 9
          if (distanceSq < 9) {
            const force = spherePos.sub(particlePos).normalize().multiplyScalar(0.01);
            particleVelocities[i].add(force);
          }
        });
      }

      // Boundary check
      if (Math.abs(positions[i3]) > 10) {
        particleVelocities[i].x *= -1;
      }
      if (Math.abs(positions[i3 + 1]) > 10) {
        particleVelocities[i].y *= -1;
      }
      if (Math.abs(positions[i3 + 2]) > 10) {
        particleVelocities[i].z *= -1;
      }
    }

    // Mark geometry as updated
    particles.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}
