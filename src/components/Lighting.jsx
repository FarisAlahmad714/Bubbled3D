// FILE: src/components/Lighting.jsx
import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Lighting({ soundIntensity = 0, orbColor = '#ffffff' }) {
  const pointLightRef = useRef();

  // Update light properties every frame
  useFrame(({ clock }) => {
    if (pointLightRef.current) {
      const time = clock.getElapsedTime();
      // Add flicker effect: amplitude scales with soundIntensity
      const flicker = Math.sin(time * 10) * 0.2 * soundIntensity;
      pointLightRef.current.intensity = 1 + soundIntensity + flicker;
      // Set point light color to match orb
      pointLightRef.current.color.set(orbColor);
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight
        ref={pointLightRef}
        position={[0, 2, 0]}
        distance={10}
        decay={2}
      />
      <hemisphereLight
        skyColor="#6688ff"
        groundColor="#000033"
        intensity={0.2}
      />
    </>
  );
}