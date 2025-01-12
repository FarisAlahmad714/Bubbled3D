import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ParticleField() {
  const particles = useRef();
  const count = 5000;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i]     = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 20;
  }

  useFrame(() => {
    particles.current.rotation.y += 0.001;
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}
