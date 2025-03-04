// src/components/Sphere.jsx
import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/bubble';
import { lerpColor } from './ColorTransition';

// Enhanced bubble material with additional uniforms
const BubbleMaterial = shaderMaterial(
  {
    color: [1, 1, 1],
    rimPower: 2.0,
    time: 0,
    pulseSpeed: 0.5,
    soundIntensity: 0,
    colorShift: 0,
  },
  vertexShader,
  fragmentShader
);

extend({ BubbleMaterial });

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
  const materialRef = useRef();
  const targetPositionRef = useRef(new THREE.Vector3(...position));
  const originalPositionRef = useRef(new THREE.Vector3(...position));
  const [ageRatio, setAgeRatio] = useState(0);
  
  // Store random velocity with more variation and direction
  const velocity = useRef({
    x: (Math.random() - 0.5) * 0.03,
    y: 0.01 + Math.random() * 0.02, // More upward movement
    z: (Math.random() - 0.5) * 0.03,
  });

  // Store random rim growth speed
  const rimSpeed = useRef(0.01 + Math.random() * 0.015);
  
  // Random rotation axes
  const rotationAxis = useRef(new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize());
  
  // Rotation speed varies per sphere
  const rotationSpeed = useRef(0.005 + Math.random() * 0.01);

  // Effect to clean up spheres that have lived too long
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      removeSphere(sphereId);
    }, lifetime);
    
    return () => clearTimeout(timeoutId);
  }, [sphereId, removeSphere, lifetime]);

  useFrame(({ clock }) => {
    if (!ref.current || !materialRef.current) return;
    
    const time = clock.getElapsedTime();
    const now = Date.now();
    
    // Calculate how old this sphere is as a ratio (0 = new, 1 = at end of lifetime)
    const age = now - createdAt;
    const newAgeRatio = Math.min(age / lifetime, 1);
    setAgeRatio(newAgeRatio);
    
    // Update material uniforms
    materialRef.current.uniforms.time.value = time;
    materialRef.current.uniforms.pulseSpeed.value = pulseSpeed;
    materialRef.current.uniforms.soundIntensity.value = soundIntensity;
    materialRef.current.uniforms.colorShift.value = newAgeRatio * 0.5;
    
    // Get current scale once and apply sound reactivity
    const baseScale = Math.max(0.1, scale * (1 - newAgeRatio * 0.9));
    const pulseAmount = Math.sin(time * pulseSpeed * 5) * 0.1 * (1 - newAgeRatio);
    const soundScaleBoost = soundIntensity * 0.2 * (1 - newAgeRatio);
    const finalScale = baseScale + pulseAmount + soundScaleBoost;
    
    ref.current.scale.set(finalScale, finalScale, finalScale);

    // Compute a color transition based on age and sound intensity
    const transitionColor = lerpColor(color, '#ffffff', newAgeRatio * 0.7 + soundIntensity * 0.3);
    materialRef.current.uniforms.color.value = [
      parseInt(transitionColor.slice(1, 3), 16) / 255,
      parseInt(transitionColor.slice(3, 5), 16) / 255,
      parseInt(transitionColor.slice(5, 7), 16) / 255,
    ];

    // Apply more organic motion - velocity changes gradually
    velocity.current.x += (Math.random() - 0.5) * 0.001;
    velocity.current.y += (Math.random() - 0.5) * 0.001;
    velocity.current.z += (Math.random() - 0.5) * 0.001;
    
    // Path correction to make spheres move along more curved paths
    // Calculate vector to target position
    const currentPos = ref.current.position;
    
    // Apply velocity with some noise and damping as it ages
    const ageDamping = 1 - newAgeRatio * 0.8;
    ref.current.position.x += velocity.current.x * ageDamping;
    ref.current.position.y += velocity.current.y * ageDamping;
    ref.current.position.z += velocity.current.z * ageDamping;
    
    // Add some random motion - more for younger spheres
    if (Math.random() < 0.05 * (1 - newAgeRatio)) {
      targetPositionRef.current.set(
        originalPositionRef.current.x + (Math.random() - 0.5) * 8,
        originalPositionRef.current.y + (Math.random() - 0.5) * 8 + 2, // Bias upward
        originalPositionRef.current.z + (Math.random() - 0.5) * 8
      );
    }
    
    // Move gently toward the target position
    currentPos.lerp(targetPositionRef.current, 0.005);
    
    // Apply slight attraction to origin for very old spheres
    if (newAgeRatio > 0.8) {
      const attraction = (newAgeRatio - 0.8) * 0.01;
      currentPos.lerp(new THREE.Vector3(0, -5, 0), attraction); // Drift downward when dying
    }

    // Boundary check - bounce off invisible boundaries
    const bounceMargin = 12;
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

    // Increase the rim effect with nonlinear growth
    materialRef.current.uniforms.rimPower.value += rimSpeed.current * (1 - newAgeRatio * 0.5);

    // Apply rotation around custom axis - more active with sound
    ref.current.rotateOnAxis(
      rotationAxis.current, 
      rotationSpeed.current * (1 + soundIntensity)
    );
  });

  return (
    <mesh position={position} ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <bubbleMaterial 
        ref={materialRef}
        color={[1, 1, 1]} 
        rimPower={2.0} 
        transparent 
        opacity={1 - ageRatio * 0.8} 
      />
    </mesh>
  );
}