// src/components/Sphere.jsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/bubble';
import { lerpColor } from './ColorTransition';

const BubbleMaterial = shaderMaterial(
  {
    color: [1, 1, 1],
    rimPower: 2.0,
  },
  vertexShader,
  fragmentShader
);

extend({ BubbleMaterial });

export default function Sphere({
  position,
  color,
  sphereId,
  removeSphere, // new prop: function to remove sphere from parent state
}) {
  const ref = useRef();

  // Store random velocity
  const velocity = useRef({
    x: (Math.random() - 0.5) * 0.01,
    y: 0.01 + Math.random() * 0.005,
    z: (Math.random() - 0.5) * 0.01,
  });

  // Store random rim growth speed
  const rimSpeed = useRef(0.01 + Math.random() * 0.015);

  useFrame(() => {
    // Get current scale once
    const currentScale = ref.current.scale.x;

    // Compute a color transition based on scale
    const transitionColor = lerpColor(color, '#ffffff', currentScale);
    ref.current.material.uniforms.color.value = [
      parseInt(transitionColor.slice(1, 3), 16) / 255,
      parseInt(transitionColor.slice(3, 5), 16) / 255,
      parseInt(transitionColor.slice(5, 7), 16) / 255,
    ];

    // Update position
    ref.current.position.x += velocity.current.x;
    ref.current.position.y += velocity.current.y;
    ref.current.position.z += velocity.current.z;

    // Shrink the sphere
    if (ref.current.scale.x > 0.1) {
      ref.current.scale.multiplyScalar(0.99);
    } else {
      // If it’s too small, remove it from state
      removeSphere(sphereId);
    }

    // Increase the rim effect
    ref.current.material.uniforms.rimPower.value += rimSpeed.current;

    // Rotate slightly
    ref.current.rotation.x += 0.001;
    ref.current.rotation.y += 0.001;
  });

  return (
    <mesh position={position} ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <bubbleMaterial color={[1, 1, 1]} rimPower={2.0} transparent opacity={0.8} />
    </mesh>
  );
}
