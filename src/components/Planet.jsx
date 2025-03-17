// Planet.jsx - Three.js planet component
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Html } from '@react-three/drei';
import { usePerformance } from './PerformanceOptimizer';

const Planet = ({
  modelPath = '/models/planet3.glb',
  visualMode = 'default',
  scale = 8,
  position = [0, 15, -60],
  adImage = '/ads/ad3.png',
  adLink = 'https://example.com/planet-offer',
  adTitle = "Explore New Worlds",
  ringTextContent = "YOUR AD HERE!",
  onShowModal // New prop to communicate with parent component
}) => {
  const { camera, raycaster, pointer, gl } = useThree();
  const { performanceMode } = usePerformance();
  const planetRef = useRef();
  const jupiterGlobeRef = useRef();
  const jupiterRingRef = useRef();
  const ringTextRef = useRef();
  const clickableAreaRef = useRef();
  
  // Interactive states
  const [hovered, setHovered] = useState(false);
  
  // Initialize meshes and materials
  useEffect(() => {
    // Load the model
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        console.log('Planet model loaded successfully');
        
        // Add loaded model to our group
        if (planetRef.current) {
          gltf.scene.scale.set(scale, scale, scale);
          planetRef.current.add(gltf.scene);
          
          // Find the specific parts of the model
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              // Identify parts based on names from your Blender code
              if (child.name === "Jupiter" || child.name.includes("sphere")) {
                jupiterGlobeRef.current = child;
                console.log('Found Jupiter globe mesh');
              } else if (child.name === "JupiterRing" || child.name.includes("torus")) {
                jupiterRingRef.current = child;
                console.log('Found Jupiter ring mesh');
              } else if (child.name === "RingText" || child.name.includes("text")) {
                ringTextRef.current = child;
                console.log('Found ring text mesh');
                
                // Fix the text position - move it to the ring position
                if (jupiterRingRef.current) {
                  child.position.copy(jupiterRingRef.current.position);
                  // Adjust the position to be slightly above rings
                  child.position.z += 0.3 * scale;
                  
                  // Make text always face camera
                  child.material.depthTest = false;
                  child.material.depthWrite = false;
                  child.renderOrder = 1;
                }
              }
            }
          });
          
          // Create an invisible clickable sphere for the entire planet
          if (jupiterGlobeRef.current) {
            // Calculate planet radius based on the mesh
            const boundingBox = new THREE.Box3().setFromObject(jupiterGlobeRef.current);
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const planetRadius = Math.max(size.x, size.y, size.z) / 2;
            
            // Create transparent sphere slightly larger than the planet
            const clickableGeometry = new THREE.SphereGeometry(
              planetRadius * 1.1, // Slightly larger than the planet
              32,
              32
            );
            
            // Create invisible material for the clickable area
            const clickableMaterial = new THREE.MeshBasicMaterial({
              transparent: true,
              opacity: 0.0, // Completely invisible
              depthWrite: false
            });
            
            // Create mesh
            const clickableArea = new THREE.Mesh(clickableGeometry, clickableMaterial);
            clickableAreaRef.current = clickableArea;
            
            // Position it at the same place as the planet
            clickableArea.position.copy(jupiterGlobeRef.current.position);
            
            // Add to scene
            planetRef.current.add(clickableArea);
          }
          
          // If we found text but not ring, we need to create a ring path for the text
          if (ringTextRef.current && !jupiterRingRef.current) {
            // Create an invisible ring to use as a reference
            const ringGeometry = new THREE.TorusGeometry(4 * scale, 0.1 * scale, 16, 48);
            const ringMaterial = new THREE.MeshBasicMaterial({
              transparent: true, 
              opacity: 0,
              visible: false
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            jupiterRingRef.current = ring;
            planetRef.current.add(ring);
          }
        }
      },
      undefined,
      (error) => {
        console.error('Error loading Planet model:', error);
      }
    );
    
    // Cleanup
    return () => {
      if (clickableAreaRef.current && clickableAreaRef.current.material) {
        clickableAreaRef.current.material.dispose();
        clickableAreaRef.current.geometry.dispose();
      }
    };
  }, [modelPath, scale]);
  
  // Check for intersection with the clickable area
  const checkIntersection = () => {
    if (!clickableAreaRef.current || !camera || !raycaster) return false;
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(clickableAreaRef.current);
    return intersects.length > 0;
  };
  
  // Handle click on the planet
  const handleClick = () => {
    if (hovered) {
      console.log('Planet clicked, showing modal');
      // Call the parent component's handler with ad info
      if (onShowModal) {
        onShowModal({
          adImage,
          adLink,
          adTitle
        });
      }
    }
  };
  
  // Add click handler for the planet
  useEffect(() => {
    const clickHandler = (event) => {
      if (hovered) handleClick();
    };
    
    window.addEventListener('click', clickHandler);
    
    return () => {
      window.removeEventListener('click', clickHandler);
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);
  
  // Animation and interaction in frame updates
  useFrame(() => {
    // Rotate the planet slowly
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.001;
    }
    
    // Check for hover on the clickable area
    if (clickableAreaRef.current) {
      const isHovering = checkIntersection();
      if (isHovering !== hovered) {
        setHovered(isHovering);
        document.body.style.cursor = isHovering ? 'pointer' : 'auto';
      }
    }
    
    // Make ring text always face the camera
    if (ringTextRef.current && camera) {
      // Get position of the text in world space
      const textPosition = new THREE.Vector3();
      ringTextRef.current.getWorldPosition(textPosition);
      
      // Make text billboard to camera (always face camera)
      ringTextRef.current.lookAt(camera.position);
      
      // If the text has wrong position, put it above the ring
      if (jupiterRingRef.current && 
          Math.abs(ringTextRef.current.position.z) < 0.1) {
        const ringPosition = new THREE.Vector3();
        jupiterRingRef.current.getWorldPosition(ringPosition);
        
        // Position text slightly above ring
        ringTextRef.current.position.set(
          ringPosition.x,
          ringPosition.y,
          ringPosition.z + 0.3 * scale
        );
      }
    }
  });
  
  return (
    <group ref={planetRef} position={position}>
      {/* Tooltip that appears when hovering */}
      {hovered && (
        <Html position={[0, 3 * scale, 0]} center>
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            transform: 'translateY(-30px)',
            whiteSpace: 'nowrap'
          }}>
            Click For Special Offer
          </div>
        </Html>
      )}
      
      {/* Create ring text if missing in model */}
      {!ringTextRef.current && jupiterRingRef.current && (
        <Html 
          position={[0, 0, 0.3 * scale]} 
          center
          occlude
          transform
          sprite
        >
          <div style={{
            width: '400px',
            height: '30px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '0 0 5px rgba(0,0,0,0.8)',
            transform: `scale(${scale / 4})`,
            pointerEvents: 'none',
          }}>
            {ringTextContent}
          </div>
        </Html>
      )}
    </group>
  );
};

export default Planet;