import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/bubble';

// Improved bubble material with optimized shaders
const BubbleMaterial = shaderMaterial(
  {
    color: [1, 1, 1],
    rimPower: 2.0,
    time: 0,
    pulseSpeed: 0.5,
    soundIntensity: 0,
    colorShift: 0,
    opacity: 1.0
  },
  vertexShader,
  fragmentShader
);

// Extend drei with our custom material
extend({ BubbleMaterial });

// Create a shared geometry instance to reduce memory usage
const sharedGeometry = new THREE.SphereGeometry(1, 16, 16);

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
  worldRadius = 12
}) {
  const meshRef = useRef();
  const materialRef = useRef();
  
  // Memoize the color conversion to RGB values
  const colorRGB = useMemo(() => {
    return [
      parseInt(color.slice(1, 3), 16) / 255,
      parseInt(color.slice(3, 5), 16) / 255,
      parseInt(color.slice(5, 7), 16) / 255
    ];
  }, [color]);
  
  // Physics references
  const velocity = useRef({
    x: (Math.random() - 0.5) * 0.01,
    y: 0.003 + Math.random() * 0.01,
    z: (Math.random() - 0.5) * 0.01
  });
  
  // Rotation parameters
  const rotationAxis = useRef(new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize());
  
  const rotationSpeed = useRef(0.002 + Math.random() * 0.003);
  const rimSpeed = useRef(0.004 + Math.random() * 0.006);
  
  // Calculate age only once per frame
  const age = useRef(0);
  const ageRatio = useRef(0);
  
  // Reuse vector objects
  const targetPosition = useRef(new THREE.Vector3(...position));
  const basePosition = useRef(new THREE.Vector3(...position));
  
  // Setup and cleanup
  useEffect(() => {
    // Set initial material properties
    if (materialRef.current) {
      materialRef.current.uniforms.color.value = colorRGB;
      materialRef.current.uniforms.pulseSpeed.value = pulseSpeed;
    }
    
    // Cleanup timer
    const timeoutId = setTimeout(() => {
      removeSphere(sphereId);
    }, lifetime);
    
    return () => clearTimeout(timeoutId);
  }, [sphereId, removeSphere, lifetime, colorRGB, pulseSpeed]);
  
  // Simplified animation frame
  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    
    const time = clock.getElapsedTime();
    const now = Date.now();
    
    // Calculate age only once
    age.current = now - createdAt;
    ageRatio.current = Math.min(age.current / lifetime, 1);
    
    // Update material uniforms - minimized calculations
    materialRef.current.uniforms.time.value = time;
    materialRef.current.uniforms.soundIntensity.value = soundIntensity;
    materialRef.current.uniforms.colorShift.value = ageRatio.current * 0.5;
    materialRef.current.uniforms.opacity.value = 1 - ageRatio.current * 0.8;
    
    // Fast scale calculation
    const finalScale = scale * (1 - ageRatio.current * 0.7) * 
                        (1 + Math.sin(time * pulseSpeed * 2) * 0.05 + soundIntensity * 0.1);
    meshRef.current.scale.set(finalScale, finalScale, finalScale);
    
    // Simplified physics update - fewer calculations per frame
    const ageDamping = 1 - ageRatio.current * 0.5;
    const pos = meshRef.current.position;
    
    // Apply velocity with damping
    pos.x += velocity.current.x * ageDamping;
    pos.y += velocity.current.y * ageDamping;
    pos.z += velocity.current.z * ageDamping;
    
    // Occasional random motion and boundary checks (less frequent)
    if (Math.random() < 0.01) {
      // Add small random motion
      velocity.current.x += (Math.random() - 0.5) * 0.0002;
      velocity.current.y += (Math.random() - 0.5) * 0.0002;
      velocity.current.z += (Math.random() - 0.5) * 0.0002;
      
      // Check boundaries with world radius
      const distSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
      
      if (distSq > worldRadius * worldRadius * 0.7) {
        // Push back toward center
        pos.multiplyScalar(0.98);
      }
    }
    
    // Apply gentle attraction to origin for older spheres
    if (ageRatio.current > 0.7) {
      const attraction = (ageRatio.current - 0.7) * 0.005;
      pos.y -= attraction; // Simplified gravity effect
    }
    
    // Apply rim effect growth - capped for performance
    const newRimPower = materialRef.current.uniforms.rimPower.value + 
                         rimSpeed.current * (1 - ageRatio.current * 0.3);
    materialRef.current.uniforms.rimPower.value = Math.min(4, newRimPower);
    
    // Apply rotation - simpler calculation
    meshRef.current.rotateOnAxis(
      rotationAxis.current, 
      rotationSpeed.current * (1 + soundIntensity * 0.3)
    );
  });
  
  return (
    <mesh position={position} ref={meshRef}>
      <primitive object={sharedGeometry} attach="geometry" />
      <bubbleMaterial 
        ref={materialRef}
        color={colorRGB}
        rimPower={2.0}
        transparent
        opacity={1.0}
        depthWrite={false}
      />
    </mesh>
  );
}