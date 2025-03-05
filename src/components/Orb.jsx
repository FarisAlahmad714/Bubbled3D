// FILE: src/components/Orb.jsx (Example)
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useState, useMemo } from 'react';

export default function Orb({ soundIntensity = 0, onColorChange }) {
  const meshRef = useRef();
  const [colorIndex, setColorIndex] = useState(0);

  // Define color states
  const colors = useMemo(
    () => [
      new THREE.Color('#00ff00'), // Emerald
      new THREE.Color('#0000ff'), // Sapphire
      new THREE.Color('#ff0000'), // Ruby
    ],
    []
  );

  // Cycle colors over time or based on sound
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      // Change color every 2 seconds (adjust timing as needed)
      const newIndex = Math.floor(time / 2) % colors.length;
      if (newIndex !== colorIndex) {
        setColorIndex(newIndex);
        onColorChange(colors[newIndex]); // Notify parent of color change
      }
      meshRef.current.material.color.copy(colors[colorIndex]);
      meshRef.current.material.emissive.copy(colors[colorIndex]);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={colors[colorIndex]}
        emissive={colors[colorIndex]}
        emissiveIntensity={1}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}