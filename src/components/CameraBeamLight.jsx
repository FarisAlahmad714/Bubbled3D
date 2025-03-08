// src/components/CameraBeamLight.jsx

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraBeamLight({ color = "#ffffff", intensity = 2.5, fullSceneIllumination = true }) {
  const primaryLightRef = useRef();
  const secondaryLightRef = useRef();
  const fillLightRef = useRef();
  const rimLightRef = useRef();
  const ambientLightRef = useRef();
  const hemisphereRef = useRef();
  const targetRef = useRef();
  const beamRef = useRef();
  
  useEffect(() => {
    // Initialize target position
    if (targetRef.current) {
      targetRef.current.position.set(0, 0, -10);
    }
  }, []);
  
  useFrame(({ camera, scene }) => {
    if (primaryLightRef.current && targetRef.current) {
      // Update primary light position to match camera
      primaryLightRef.current.position.copy(camera.position);
      
      // Point target in front of camera (farther for wider coverage)
      const targetPos = new THREE.Vector3(0, 0, -25);
      targetPos.applyMatrix4(camera.matrixWorld);
      targetRef.current.position.copy(targetPos);
      
      // Update beam position and rotation to match camera
      if (beamRef.current) {
        beamRef.current.position.copy(camera.position);
        beamRef.current.lookAt(targetPos);
        
        // Adjust beam scale for better visibility and wider coverage
        const distance = camera.position.distanceTo(targetPos);
        beamRef.current.scale.z = distance;
        beamRef.current.scale.x = 3; // Wider beam
        beamRef.current.scale.y = 3; // Wider beam
      }
      
      // Position secondary light to illuminate from above and slightly to the side
      if (secondaryLightRef.current) {
        // Get camera forward direction and create a position above and to the right
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        
        // Position light above, to the side, and slightly behind camera
        const secondaryPos = camera.position.clone()
          .add(up.multiplyScalar(5))
          .add(right.multiplyScalar(3))
          .sub(forward.multiplyScalar(2));
        
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
          .add(up.multiplyScalar(4))
          .add(left.multiplyScalar(4))
          .sub(forward.multiplyScalar(2));
        
        fillLightRef.current.position.copy(fillPos);
      }
      
      // Position rim light to create back-lighting and edge definition
      if (rimLightRef.current) {
        // Get camera forward direction and create a position behind
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        
        // Position light behind and slightly above camera target
        const rimPos = targetPos.clone()
          .add(forward.multiplyScalar(15)) // Behind target
          .add(up.multiplyScalar(5));      // Above target
        
        rimLightRef.current.position.copy(rimPos);
        rimLightRef.current.lookAt(targetPos);
      }
    }
  });
  
  return (
    <>
      {/* Main spotlight that follows camera - brighter and much wider */}
      <spotLight
        ref={primaryLightRef}
        intensity={intensity * 1.2}
        angle={0.6}      // Much wider angle for fuller coverage
        penumbra={0.9}   // Softer edges for better blending
        color={color}
        castShadow
        distance={100}   // Greater range for full scene coverage
      />
      
      {/* Secondary spotlight for illuminating models from a different angle */}
      <spotLight
        ref={secondaryLightRef}
        intensity={intensity * 0.9}
        angle={0.7}      // Wider angle
        penumbra={0.8}   // Softer edges
        color={color}
        castShadow={false}
        distance={90}    // Longer range
      >
        <object3D name="target" />
      </spotLight>
      
      {/* Fill light to reduce harsh shadows - increased intensity */}
      <directionalLight
        ref={fillLightRef}
        intensity={intensity * 0.6}
        color={color}
      />
      
      {/* Rim light for edge definition and depth */}
      <spotLight
        ref={rimLightRef}
        intensity={intensity * 0.8}
        angle={0.5}
        penumbra={0.5}
        color="#f0f8ff"  // Slightly blueish for cool rim effect
        distance={80}
      />
      
      {/* Ambient light for global base illumination */}
      <ambientLight 
        ref={ambientLightRef}
        intensity={0.4}  // Provides a base level of illumination
        color="#e0e8ff"  // Slightly blue-tinted for cool ambient tone
      />
      
      {/* Hemisphere light for natural sky/ground illumination */}
      <hemisphereLight
        ref={hemisphereRef}
        intensity={0.5}
        color="#ffffff"  // Sky color
        groundColor="#303030"  // Ground color
      />
      
      {/* Target object for main spotlight to look at */}
      <object3D ref={targetRef} />
      
      {/* Enhanced visible beam effect - wider and more subtle */}
      <mesh ref={beamRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 2, 1, 12, 1, true]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.08} 
          side={THREE.BackSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}