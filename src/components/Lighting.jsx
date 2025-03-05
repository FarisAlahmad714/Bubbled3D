// FILE: src/components/Lighting.jsx
import * as THREE from 'three';

export default function Lighting({ soundIntensity = 0 }) {
  return (
    <>
      <ambientLight intensity={0.1} /> {/* Reduced from 0.2 */}
      <pointLight 
        position={[0, 2, 0]} // Reduced height from 5
        intensity={1 + soundIntensity} // Simplified reactivity
        color="#ffffff"
        distance={10} // Reduced from 25
        decay={2}
      />
      <hemisphereLight 
        skyColor="#6688ff"
        groundColor="#000033"
        intensity={0.2} // Reduced from 0.3
      />
    </>
  );
}