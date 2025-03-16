import { useRef, useEffect, useMemo } from 'react';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { usePerformance } from './PerformanceOptimizer';

const getColorForVisualMode = (baseColor, mode) => {
  switch (mode) {
    case 'neon': return new THREE.Color(0x00ffff);
    case 'dream': return new THREE.Color(0x8888ff);
    case 'monochrome': 
      const color = new THREE.Color(baseColor);
      const grey = (color.r + color.g + color.b) / 3;
      return new THREE.Color(grey, grey, grey);
    default: return new THREE.Color(baseColor);
  }
};

const getEmissiveColorForVisualMode = (mode) => {
  switch (mode) {
    case 'neon': return new THREE.Color(0x00aaaa);
    case 'dream': return new THREE.Color(0x4444aa);
    case 'monochrome': return new THREE.Color(0x222222);
    default: return new THREE.Color(0x222222); // Subtle glow instead of black
  }
};

const Planet = ({
  modelPath = '/models/planet1.glb', 
  visualMode = 'default',
  scale = 8,
  position = [0, 15, -150],
}) => {
  const planetRef = useRef();
  const modelRef = useRef(null);
  const { performanceMode } = usePerformance();

  // Determine if we're loading a GLTF/GLB or OBJ file
  const isGltf = useMemo(() => {
    return modelPath.toLowerCase().endsWith('.gltf') || 
           modelPath.toLowerCase().endsWith('.glb');
  }, [modelPath]);

  // Determine LOD level based on performance mode
  const qualityLevel = useMemo(() => {
    switch(performanceMode) {
      case 'low': return { 
        geometry: 16, 
        shadows: false, 
        emissiveIntensity: 0.1
      };
      case 'medium': return { 
        geometry: 32, 
        shadows: true, 
        emissiveIntensity: 0.2
      };
      case 'high': return { 
        geometry: 64, 
        shadows: true, 
        emissiveIntensity: 0.3
      };
      default: return { 
        geometry: 32, 
        shadows: true, 
        emissiveIntensity: 0.2
      };
    }
  }, [performanceMode]);

  // Load the model using the appropriate loader
  useEffect(() => {
    // Create loading manager for better handling
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onError = (url) => console.error(`Error loading: ${url}`);

    if (isGltf) {
      // Load GLTF/GLB model
      const gltfLoader = new GLTFLoader(loadingManager);
      gltfLoader.load(
        modelPath,
        (gltf) => {
          console.log('Planet GLTF model loaded successfully:', modelPath);
          modelRef.current = gltf.scene;
          
          // Apply scale
          gltf.scene.scale.set(scale, scale, scale);
          
          // Apply materials based on visual mode and optimize based on performance
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              // Apply visual mode adjustments
              if (child.material) {
                // Handle array of materials or single material
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => applyMaterialSettings(mat));
                } else {
                  applyMaterialSettings(child.material);
                }
              }
              
              // Set shadow properties based on performance mode
              child.castShadow = qualityLevel.shadows;
              child.receiveShadow = qualityLevel.shadows;
            }
          });
          
          if (planetRef.current) {
            planetRef.current.add(gltf.scene);
          }
          
          // Add rotation animation
          addRotationAnimation();
        },
        undefined,
        (error) => {
          console.error('Error loading planet GLTF:', error);
          loadFallbackSphere();
        }
      );
    } else {
      // Load OBJ/MTL model (legacy support)
      const mtlLoader = new MTLLoader(loadingManager);
      const mtlPath = modelPath.replace('.obj', '.mtl');

      mtlLoader.load(
        mtlPath,
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader(loadingManager);
          objLoader.setMaterials(materials);
          objLoader.load(
            modelPath,
            (object) => {
              console.log('Planet OBJ model loaded successfully:', modelPath);
              modelRef.current = object;
              object.scale.set(scale, scale, scale);
              
              // Apply materials based on visual mode
              object.traverse((child) => {
                if (child.isMesh) {
                  // Apply visual mode adjustments
                  if (child.material) {
                    // Handle array of materials or single material
                    if (Array.isArray(child.material)) {
                      child.material.forEach(mat => applyMaterialSettings(mat));
                    } else {
                      applyMaterialSettings(child.material);
                    }
                  }
                  
                  // Set shadow properties based on performance mode
                  child.castShadow = qualityLevel.shadows;
                  child.receiveShadow = qualityLevel.shadows;
                }
              });
              
              if (planetRef.current) {
                planetRef.current.add(object);
              }
              
              // Add rotation animation
              addRotationAnimation();
            },
            undefined,
            (error) => {
              console.error('Error loading planet OBJ:', error);
              loadFallbackSphere();
            }
          );
        },
        undefined,
        (mtlError) => {
          console.warn('No MTL file found or error loading, using fallback material:', mtlError);
          const objLoader = new OBJLoader(loadingManager);
          objLoader.load(
            modelPath,
            (object) => {
              console.log('Planet model loaded with fallback material:', modelPath);
              modelRef.current = object;
              object.scale.set(scale, scale, scale);
              
              // Apply fallback material
              object.traverse((child) => {
                if (child.isMesh) {
                  child.material = createFallbackMaterial();
                  
                  // Set shadow properties based on performance mode
                  child.castShadow = qualityLevel.shadows;
                  child.receiveShadow = qualityLevel.shadows;
                }
              });
              
              if (planetRef.current) {
                planetRef.current.add(object);
              }
              
              // Add rotation animation
              addRotationAnimation();
            },
            undefined,
            (objError) => {
              console.error('Error loading planet OBJ with fallback:', objError);
              loadFallbackSphere();
            }
          );
        }
      );
    }

    // Helper function to create a fallback sphere if model loading fails
    function loadFallbackSphere() {
      console.log('Using fallback sphere for planet');
      const geometry = new THREE.SphereGeometry(1, qualityLevel.geometry, qualityLevel.geometry);
      const material = createFallbackMaterial();
      const sphere = new THREE.Mesh(geometry, material);
      sphere.scale.set(scale, scale, scale);
      
      // Set shadow properties
      sphere.castShadow = qualityLevel.shadows;
      sphere.receiveShadow = qualityLevel.shadows;
      
      modelRef.current = sphere;
      if (planetRef.current) {
        planetRef.current.add(sphere);
      }
      
      // Add rotation animation
      addRotationAnimation();
    }

    // Helper function to create a fallback material
    function createFallbackMaterial() {
      return new THREE.MeshStandardMaterial({
        color: getColorForVisualMode('#aaaacc', visualMode),
        emissive: getEmissiveColorForVisualMode(visualMode),
        emissiveIntensity: qualityLevel.emissiveIntensity,
        metalness: 0.3,
        roughness: 0.7,
        flatShading: performanceMode === 'low'
      });
    }

    // Helper function to apply material settings
    function applyMaterialSettings(material) {
      if (!material) return;
      
      // Store original color if not already stored
      if (!material._originalColor) {
        material._originalColor = material.color ? material.color.clone() : new THREE.Color('#aaaacc');
      }
      
      // Apply visual mode
      material.color = getColorForVisualMode(material._originalColor, visualMode);
      material.emissive = getEmissiveColorForVisualMode(visualMode);
      material.emissiveIntensity = qualityLevel.emissiveIntensity;
      
      // Optimize for low-end devices
      if (performanceMode === 'low') {
        material.flatShading = true;
        material.roughness = 0.8; // Higher roughness = less complex reflections
        material.metalness = 0.2; // Lower metalness = less complex reflections
        
        // Simplify textures if they exist
        if (material.map) {
          material.map.minFilter = THREE.NearestFilter;
          material.map.magFilter = THREE.NearestFilter;
          material.map.generateMipmaps = false;
        }
      }
      
      material.needsUpdate = true;
    }

    // Add a subtle rotation animation to the planet
    function addRotationAnimation() {
      // This will be handled in the frame update outside this useEffect
      // to avoid creating animation loops inside the effect
    }

    // Cleanup function
    return () => {
      if (modelRef.current && planetRef.current) {
        planetRef.current.remove(modelRef.current);
        
        // Clean up any geometries and materials
        if (modelRef.current.traverse) {
          modelRef.current.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        }
      }
      
      loadingManager.onLoad = () => {};
      loadingManager.onProgress = () => {};
      loadingManager.onError = () => {};
    };
  }, [modelPath, scale, isGltf, visualMode, performanceMode, qualityLevel]);

  // Handle slow rotation animation in frame updates
  useEffect(() => {
    let frameId;
    const animate = () => {
      if (planetRef.current) {
        // Apply very slow rotation - adjust speed based on performance mode for consistency
        const rotationSpeed = 0.0001 * (performanceMode === 'low' ? 2 : 1);
        planetRef.current.rotation.y += rotationSpeed;
      }
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [performanceMode]);

  return <group ref={planetRef} position={position} />;
};

export default Planet;