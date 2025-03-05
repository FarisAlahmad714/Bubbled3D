// FILE: src/components/Environment.jsx
import { useRef } from 'react';
import * as THREE from 'three';

export default function Environment({ soundIntensity = 0 }) {
  const fogRef = useRef();
  
  return (
    <>
      <color attach="background" args={['#000000']} /> {/* Static black */}
      <fog ref={fogRef} attach="fog" args={['#000000', 2, 8]} /> {/* Tighter range */}
    </>
  );
}