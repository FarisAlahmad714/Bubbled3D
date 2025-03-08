// src/components/CameraBeamLight.jsx

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Enhanced version with multiple light sources to better illuminate models from different angles
export default function CameraBeamLight({ color = "#ffffff", intensity = 2.5 }) {
  const primaryLightRef = useRef();
  const secondaryLightRef = useRef();
  const fillLightRef = useRef();
  const targetRef = useRef();
  const beamRef = useRef();
  
  useEffect(() => {
    // Initialize target position
    if (targetRef.current) {
      targetRef.current.position.set(0, 0, -10);
    }
  }, []);
  
  useFrame(({ camera }) => {
    if (primaryLightRef.current && targetRef.current) {
      // Update primary light position to match camera
      primaryLightRef.current.position.copy(camera.position);
      
      // Point target in front of camera
      const targetPos = new THREE.Vector3(0, 0, -10);
      targetPos.applyMatrix4(camera.matrixWorld);
      targetRef.current.position.copy(targetPos);
      
      // Update beam position and rotation to match camera
      if (beamRef.current) {
        beamRef.current.position.copy(camera.position);
        beamRef.current.lookAt(targetPos);
        
        // Adjust beam scale for better visibility
        const distance = camera.position.distanceTo(targetPos);
        beamRef.current.scale.z = distance;
      }
      
      // Position secondary light to illuminate from above and slightly to the side
      if (secondaryLightRef.current) {
        // Get camera forward direction and create a position above and to the right
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        
        // Position light above, to the side, and slightly behind camera
        const secondaryPos = camera.position.clone()
          .add(up.multiplyScalar(3))
          .add(right.multiplyScalar(2))
          .sub(forward.multiplyScalar(1));
        
        secondaryLightRef.current.position.copy(secondaryPos);
        secondaryLightRef.current.target.position.copy(targetPos);
      }
      
      // Position fill light to reduce shadows - opposite side from secondary
      if (fillLightRef.current) {
        // Get camera forward direction and create a position above and to the left
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        
        // Position light above, to the left, and slightly behind camera
        const fillPos = camera.position.clone()
          .add(up.multiplyScalar(2))
          .add(left.multiplyScalar(3))
          .sub(forward.multiplyScalar(1));
        
        fillLightRef.current.position.copy(fillPos);
      }
    }
  });
  
  return (
    <>
      {/* Main spotlight that follows camera - brighter and wider */}
      <spotLight
        ref={primaryLightRef}
        intensity={intensity}
        angle={0.4}      // Wider angle
        penumbra={0.8}   // Softer edges
        color={color}
        castShadow
        distance={70}    // Greater range
      />
      
      {/* Secondary spotlight for illuminating models from a different angle */}
      <spotLight
        ref={secondaryLightRef}
        intensity={intensity * 0.8}
        angle={0.5}
        penumbra={0.7}
        color={color}
        castShadow={false}
        distance={60}
      >
        <object3D name="target" />
      </spotLight>
      
      {/* Fill light to reduce harsh shadows - lower intensity */}
      <directionalLight
        ref={fillLightRef}
        intensity={intensity * 0.4}
        color={color}
      />
      
      {/* Target object for main spotlight to look at */}
      <object3D ref={targetRef} />
      
      {/* Enhanced visible beam effect */}
      <mesh ref={beamRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.8, 1, 8, 1, true]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.1} 
          side={THREE.BackSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}