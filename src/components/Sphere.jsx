// FILE: src/components/Sphere.jsx
import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Sphere({
  position,
  color,
  sphereId,
  removeSphere,
  scale = 1.0,
  pulseSpeed = 0.5,
  soundIntensity = 0,
  lifetime = 8000,
  createdAt = Date.now(),
}) {
  const ref = useRef();
  const [ageRatio, setAgeRatio] = useState(0);
  
  const velocity = useRef({
    x: (Math.random() - 0.5) * 0.01, // Slower velocity
    y: 0.005 + Math.random() * 0.01,
    z: (Math.random() - 0.5) * 0.01,
  });
  
  const targetPositionRef = useRef(new THREE.Vector3(...position));
  const originalPositionRef = useRef(new THREE.Vector3(...position));
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      removeSphere(sphereId);
    }, lifetime);
    
    return () => clearTimeout(timeoutId);
  }, [sphereId, removeSphere, lifetime]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    
    const time = clock.getElapsedTime();
    const now = Date.now();
    
    const age = now - createdAt;
    const newAgeRatio = Math.min(age / lifetime, 1);
    setAgeRatio(newAgeRatio);
    
    const baseScale = Math.max(0.1, scale * (1 - newAgeRatio * 0.9));
    const pulseAmount = Math.sin(time * pulseSpeed * 3) * 0.05 * (1 - newAgeRatio); // Reduced pulse
    const soundScaleBoost = soundIntensity * 0.1 * (1 - newAgeRatio); // Reduced boost
    const finalScale = baseScale + pulseAmount + soundScaleBoost;
    
    ref.current.scale.set(finalScale, finalScale, finalScale);
    
    velocity.current.x += (Math.random() - 0.5) * 0.0005; // Reduced noise
    velocity.current.y += (Math.random() - 0.5) * 0.0005;
    velocity.current.z += (Math.random() - 0.5) * 0.0005;
    
    const currentPos = ref.current.position;
    const ageDamping = 1 - newAgeRatio * 0.8;
    currentPos.x += velocity.current.x * ageDamping;
    currentPos.y += velocity.current.y * ageDamping;
    currentPos.z += velocity.current.z * ageDamping;
    
    if (Math.random() < 0.03 * (1 - newAgeRatio)) { // Less frequent updates
      targetPositionRef.current.set(
        originalPositionRef.current.x + (Math.random() - 0.5) * 2, // Reduced range
        originalPositionRef.current.y + (Math.random() - 0.5) * 2 + 1,
        originalPositionRef.current.z + (Math.random() - 0.5) * 2
      );
    }
    
    currentPos.lerp(targetPositionRef.current, 0.003); // Slower lerp
    
    if (newAgeRatio > 0.8) {
      const attraction = (newAgeRatio - 0.8) * 0.005; // Reduced attraction
      currentPos.lerp(new THREE.Vector3(0, -2, 0), attraction); // Smaller sink
    }
    
    const bounceMargin = 3; // Reduced from 12
    if (Math.abs(currentPos.x) > bounceMargin) {
      velocity.current.x *= -0.8;
      currentPos.x = Math.sign(currentPos.x) * bounceMargin;
    }
    if (Math.abs(currentPos.y) > bounceMargin) {
      velocity.current.y *= -0.8;
      currentPos.y = Math.sign(currentPos.y) * bounceMargin;
    }
    if (Math.abs(currentPos.z) > bounceMargin) {
      velocity.current.z *= -0.8;
      currentPos.z = Math.sign(currentPos.z) * bounceMargin;
    }
  });

  return (
    <mesh position={position} ref={ref}>
      <sphereGeometry args={[0.5, 16, 16]} /> {/* Reduced segments from 32 */}
      <meshStandardMaterial 
        color={color}
        transparent
        opacity={1 - ageRatio * 0.8}
      />
    </mesh>
  );
}