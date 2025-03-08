import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

export default function AdSpaceship({
  modelPath,
  bannerUrl,
  speedFactor = 1.0,
  animationType = 'none',
  positionOffset = [0, 0, 0],
}) {
  const spaceshipRef = useRef();
  const bannerRef = useRef();
  const pathRef = useRef();
  const timeRef = useRef(0);
  const modelLoadedRef = useRef(false);
  
  // Create the path first to avoid getPointAt errors
  useEffect(() => {
    const radius = 10 + Math.random() * 5;
    const height = 2 + Math.random() * 3;
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        )
      );
    }
    pathRef.current = new THREE.CatmullRomCurve3(points, true);
  }, []);

  // Load the model with proper material files
  useEffect(() => {
    if (modelLoadedRef.current) return;
    
    // Ensure paths start with slash
    const fullModelPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`;
    
    // Generate MTL path by replacing .obj with .mtl
    const mtlPath = fullModelPath.replace('.obj', '.mtl');
    
    // First load the MTL file
    const mtlLoader = new MTLLoader();
    
    // Load materials first
    mtlLoader.load(
      mtlPath,
      (materials) => {
        // Configure materials and make them preload textures
        materials.preload();
        
        // Now create OBJ loader and apply materials
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        
        // Load the actual model
        objLoader.load(
          fullModelPath,
          (object) => {
            if (!spaceshipRef.current) return;
            
            // Enhance materials to be more visible in our scene
            object.traverse((child) => {
              if (child.isMesh) {
                // Only modify material properties if needed, keeping original colors
                if (child.material) {
                  // Keep original colors but enhance properties
                  child.material.roughness = child.material.roughness || 0.3;
                  child.material.metalness = child.material.metalness || 0.7;
                  child.material.emissiveIntensity = 0.2; // Add slight glow
                  
                  // Make sure it handles shadows
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              }
            });
            
            // Scale the model appropriately
            object.scale.set(1.5, 1.5, 1.5);
            
            // Add to scene
            spaceshipRef.current.add(object);
            modelLoadedRef.current = true;
            
            console.log("Model and materials loaded successfully:", fullModelPath);
          },
          // Progress callback
          (xhr) => {
            console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
          },
          // Error callback
          (error) => {
            console.error("Error loading model:", error);
            // Create fallback if model fails to load - same as before
            createFallbackModel();
          }
        );
      },
      // MTL progress
      (xhr) => {
        console.log(`MTL ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      // MTL error - try loading model without materials
      (error) => {
        console.error("Error loading MTL:", error, "Trying to load OBJ without materials");
        loadModelWithoutMTL();
      }
    );
    
    // Function to load model without materials if MTL fails
    function loadModelWithoutMTL() {
      const objLoader = new OBJLoader();
      
      objLoader.load(
        fullModelPath,
        (object) => {
          if (!spaceshipRef.current) return;
          
          // Apply custom materials since MTL failed
          object.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xCCCCCC,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x444466,
                emissiveIntensity: 0.5,
              });
              
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          object.scale.set(1.5, 1.5, 1.5);
          spaceshipRef.current.add(object);
          modelLoadedRef.current = true;
          
          console.log("Model loaded without MTL:", fullModelPath);
        },
        null,
        (error) => {
          console.error("Failed to load model without MTL:", error);
          createFallbackModel();
        }
      );
    }
    
    // Function to create fallback model
    function createFallbackModel() {
      if (spaceshipRef.current && !modelLoadedRef.current) {
        // Create a simple ship shape as fallback
        const fallbackGeometry = new THREE.ConeGeometry(0.5, 2, 8);
        const fallbackMaterial = new THREE.MeshStandardMaterial({
          color: 0x3366ff,
          metalness: 0.7,
          roughness: 0.3,
          emissive: 0x112244,
          emissiveIntensity: 0.5
        });
        const fallback = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        fallback.rotation.x = Math.PI / 2;
        fallback.castShadow = true;
        spaceshipRef.current.add(fallback);
        
        // Add wings for better visibility
        const wingGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.5);
        const wingMaterial = new THREE.MeshStandardMaterial({
          color: 0x66aaff,
          metalness: 0.5,
          roughness: 0.5
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.set(0, 0, -0.1);
        wings.castShadow = true;
        spaceshipRef.current.add(wings);
        
        modelLoadedRef.current = true;
      }
    }
    
    // Create banner
    try {
      const bannerGeometry = new THREE.PlaneGeometry(2, 1);
      const bannerMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xffcc33 : 0x33ccff,
        side: THREE.DoubleSide
      });
      const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
      banner.position.set(0, 1, 0);
      
      if (bannerRef.current) {
        bannerRef.current.add(banner);
      }
    } catch (error) {
      console.error("Error creating banner:", error);
    }
    
    // Helper for debugging
    const axisHelper = new THREE.AxesHelper(2);
    if (spaceshipRef.current) {
      spaceshipRef.current.add(axisHelper);
    }
    
    // Cleanup function
    return () => {
      if (spaceshipRef.current) {
        // Safe cleanup
        const children = [...spaceshipRef.current.children];
        children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
          spaceshipRef.current.remove(child);
        });
      }
      
      if (bannerRef.current) {
        const children = [...bannerRef.current.children];
        children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
          bannerRef.current.remove(child);
        });
      }
    };
  }, [modelPath, bannerUrl]);

  // Animation frame - same as before
  useFrame(({ clock, camera }) => {
    if (!pathRef.current) return;
    
    try {
      const elapsed = clock.getElapsedTime();
      timeRef.current += 0.005 * speedFactor;
      const t = timeRef.current % 1;

      // Move along path
      const position = pathRef.current.getPointAt(t);
      position.add(new THREE.Vector3(...positionOffset));
      spaceshipRef.current.position.copy(position);
      
      // Look in direction of movement
      const tangent = pathRef.current.getTangentAt(t);
      const lookTarget = position.clone().add(tangent);
      spaceshipRef.current.lookAt(lookTarget);
      
      // Billboard effect for banner
      if (bannerRef.current) {
        bannerRef.current.lookAt(camera.position);
      }

      // Animation effects
      if (animationType === 'rotate' && bannerRef.current) {
        bannerRef.current.rotation.z += 0.01;
      } else if (animationType === 'pulse' && bannerRef.current) {
        const scale = 1 + Math.sin(elapsed * 2) * 0.1;
        bannerRef.current.scale.set(scale, scale, 1);
      }
    } catch (error) {
      console.error("Error in animation frame:", error);
    }
  });

  // Return with all the lighting
  return (
    <group ref={spaceshipRef}>
      <group ref={bannerRef} />
      
      {/* Main spotlight */}
      <spotLight 
        intensity={1.5}
        distance={10}
        angle={0.6}
        penumbra={0.5}
        color="#ffffff"
        position={[0, 2, 0]}
        castShadow
      />
      
      {/* Rim light */}
      <pointLight 
        intensity={1} 
        distance={5} 
        color="#66ccff"
        position={[-1, 0, -1]} 
      />
      
      {/* Warm fill light */}
      <pointLight 
        intensity={0.8} 
        distance={5} 
        color="#ffcc66"
        position={[1, -0.5, 1]} 
      />
      
      {/* Engine glow effect */}
      <pointLight 
        intensity={2} 
        distance={3} 
        color="#ff6633"
        position={[0, -1, 0]} 
      />
    </group>
  );
}