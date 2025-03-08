import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// This creates a visible light beam from the camera to help illuminate models
export default function CameraBeamLight({ color = "#ffffff", intensity = 1.5 }) {
  const lightRef = useRef();
  const targetRef = useRef();
  const beamRef = useRef();
  
  useEffect(() => {
    // Initialize target position
    if (targetRef.current) {
      targetRef.current.position.set(0, 0, -10);
    }
  }, []);
  
  useFrame(({ camera }) => {
    if (lightRef.current && targetRef.current) {
      // Update light position to match camera
      lightRef.current.position.copy(camera.position);
      
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
    }
  });
  
  return (
    <>
      {/* Spotlight that follows camera */}
      <spotLight
        ref={lightRef}
        intensity={intensity}
        angle={0.3}
        penumbra={0.7}
        color={color}
        castShadow
        distance={50}
      />
      
      {/* Target object for spotlight to look at */}
      <object3D ref={targetRef} />
      
      {/* Optional visible beam effect */}
      <mesh ref={beamRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.5, 1, 8, 1, true]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.15} 
          side={THREE.BackSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}