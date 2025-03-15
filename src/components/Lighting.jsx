import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Lighting({ soundIntensity = 0, orbColor = '#ffffff' }) {
  const pointLightRef = useRef();
  const directionalLightRef = useRef();

  // Update light properties every frame
  useFrame(({ clock }) => {
    if (pointLightRef.current) {
      const time = clock.getElapsedTime();
      const flicker = Math.sin(time * 10) * 0.2 * soundIntensity;
      pointLightRef.current.intensity = 1 + soundIntensity + flicker;
      pointLightRef.current.color.set(orbColor);
    }
  });

  return (
    <>
      {/* Ambient light: Increased for better overall brightness */}
      <ambientLight intensity={0.3} />

      {/* Existing point light: Moved closer to planet and extended range */}
      <pointLight
        ref={pointLightRef}
        position={[0, 2, -45]} // Closer to planet at Z = -100
        distance={60}          // Extended range to reach planet
        decay={2}
      />

      {/* Hemisphere light: Slightly increased intensity */}
      <hemisphereLight
        skyColor="#6688ff"
        groundColor="#000033"
        intensity={0.3}
      />

      {/* Directional light: Simulates a star illuminating the planet */}
      <directionalLight
        position={[0, 20, 0]}      // Above the scene
        target-position={[0, 10, -100]} // Points at planet
        intensity={1.5}            // Bright but not overpowering
        color="#ffffff"
      />

      {/* Planet-specific point light: Highlights the planet */}
      <pointLight
        position={[0, 10, -7]}    // Near the planet at [0, 10, -100]
        intensity={1.0}
        distance={30}              // Focused illumination
        decay={2}
        color="#ffffff"
      />
    </>
  );
}