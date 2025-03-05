// src/components/Sphere.jsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/bubble';

import { lerpColor } from './ColorTransition';

// Improved bubble material with optimized shaders
const BubbleMaterial = shaderMaterial(
  {
    color: [1, 1, 1],
    rimPower: 2.0,
    time: 0,
    pulseSpeed: 0.5,
    soundIntensity: 0,
    colorShift: 0,
    opacity: 1.0,
    useSimpleShading: false,
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
  worldRadius = 12, // Default world radius for constraints
}) {
  const ref = useRef();
  const materialRef = useRef();
  const targetPositionRef = useRef(new THREE.Vector3(...position));
  const originalPositionRef = useRef(new THREE.Vector3(...position));
  const [ageRatio, setAgeRatio] = useState(0);
  
  // Use memoized geometry to avoid recreation
  const sphereGeometry = useMemo(() => {
    // Use lower resolution for better performance
    // 16 segments is enough for smooth bubbles while being much faster
    return new THREE.SphereGeometry(1, 16, 16);
  }, []);
  
  // Optimized physics parameters
  const velocity = useRef({
    x: (Math.random() - 0.5) * 0.02, // Reduced speed
    y: 0.005 + Math.random() * 0.015, // Gentler upward movement
    z: (Math.random() - 0.5) * 0.02,
  });

  // Store rim growth speed
  const rimSpeed = useRef(0.008 + Math.random() * 0.012); // Slower growth
  
  // Random rotation axis
  const rotationAxis = useRef(new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize());
  
  // Slower rotation for better visual quality
  const rotationSpeed = useRef(0.003 + Math.random() * 0.007);
  
  // Performance optimization flag
  const useSimpleShading = useRef(false);

  // Cleanup effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      removeSphere(sphereId);
    }, lifetime);
    
    // Set performance-based rendering when sphere is created
    useSimpleShading.current = window.innerWidth < 768 || 
                               (typeof performance !== 'undefined' && 
                                performance.memory && 
                                performance.memory.jsHeapSizeLimit < 2147483648);
    
    return () => clearTimeout(timeoutId);
  }, [sphereId, removeSphere, lifetime]);

  // Animation frame updates
  useFrame(({ clock }) => {
    if (!ref.current || !materialRef.current) return;
    
    const time = clock.getElapsedTime();
    const now = Date.now();
    
    // Calculate age ratio
    const age = now - createdAt;
    const newAgeRatio = Math.min(age / lifetime, 1);
    setAgeRatio(newAgeRatio);
    
    // Update material uniforms - optimized to reduce calculations
    materialRef.current.uniforms.time.value = time;
    materialRef.current.uniforms.pulseSpeed.value = pulseSpeed;
    materialRef.current.uniforms.soundIntensity.value = soundIntensity;
    materialRef.current.uniforms.colorShift.value = newAgeRatio * 0.5;
    materialRef.current.uniforms.opacity.value = 1 - newAgeRatio * 0.8;
    materialRef.current.uniforms.useSimpleShading.value = useSimpleShading.current;
    
    // Optimized scale calculation
    const baseScale = Math.max(0.1, scale * (1 - newAgeRatio * 0.9));
    const pulseAmount = Math.sin(time * pulseSpeed * 5) * 0.1 * (1 - newAgeRatio);
    const soundScaleBoost = soundIntensity * 0.2 * (1 - newAgeRatio);
    const finalScale = baseScale + pulseAmount + soundScaleBoost;
    
    ref.current.scale.set(finalScale, finalScale, finalScale);

    // Calculate color transition once per frame
    const transitionColor = lerpColor(color, '#ffffff', newAgeRatio * 0.7 + soundIntensity * 0.3);
    materialRef.current.uniforms.color.value = [
      parseInt(transitionColor.slice(1, 3), 16) / 255,
      parseInt(transitionColor.slice(3, 5), 16) / 255,
      parseInt(transitionColor.slice(5, 7), 16) / 255,
    ];

    // More efficient physics updates - calculate once outside conditional blocks
    const ageDamping = 1 - newAgeRatio * 0.8;
    
    // Perform less frequent physics calculations for better performance
    // Apply velocity with age-based damping
    ref.current.position.x += velocity.current.x * ageDamping;
    ref.current.position.y += velocity.current.y * ageDamping;
    ref.current.position.z += velocity.current.z * ageDamping;
    
    // Only apply random motion occasionally for performance
    if (Math.random() < 0.02 * (1 - newAgeRatio)) {
      // Less extreme target positions
      targetPositionRef.current.set(
        originalPositionRef.current.x + (Math.random() - 0.5) * 5, // Reduced range
        originalPositionRef.current.y + (Math.random() - 0.5) * 5 + 1, // Slight upward bias
        originalPositionRef.current.z + (Math.random() - 0.5) * 5
      );
      
      // Occasional small velocity changes
      velocity.current.x += (Math.random() - 0.5) * 0.0005;
      velocity.current.y += (Math.random() - 0.5) * 0.0005;
      velocity.current.z += (Math.random() - 0.5) * 0.0005;
    }
    
    // Move gently toward target position
    ref.current.position.lerp(targetPositionRef.current, 0.003);
    
    // Apply slight attraction to origin for very old spheres
    if (newAgeRatio > 0.8) {
      const attraction = (newAgeRatio - 0.8) * 0.01;
      ref.current.position.lerp(new THREE.Vector3(0, -3, 0), attraction);
    }

    // Boundary check - keep bubbles inside world radius
    const currentPos = ref.current.position;
    const distance = currentPos.length();
    if (distance > worldRadius * 0.8) {
      // Push back toward center if nearing boundary
      const pushBackStrength = 0.01 * (distance / worldRadius);
      currentPos.multiplyScalar(1 - pushBackStrength);
    }

    // Apply more controlled rim effect growth
    materialRef.current.uniforms.rimPower.value += rimSpeed.current * (1 - newAgeRatio * 0.5);
    if (materialRef.current.uniforms.rimPower.value > 5) {
      materialRef.current.uniforms.rimPower.value = 5; // Cap rim effect
    }

    // Apply rotation with optimized performance
    ref.current.rotateOnAxis(
      rotationAxis.current, 
      rotationSpeed.current * (1 + soundIntensity * 0.5)
    );
  });

  return (
    <mesh position={position} ref={ref}>
      <primitive object={sphereGeometry} attach="geometry" />
      <bubbleMaterial 
        ref={materialRef}
        color={[1, 1, 1]} 
        rimPower={2.0} 
        transparent 
        opacity={1 - ageRatio * 0.8}
        depthWrite={false} // Important for transparent overlapping bubbles
      />
    </mesh>
  );
}