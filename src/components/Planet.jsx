import { useRef, useEffect } from 'react';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as THREE from 'three';

const getColorForVisualMode = (baseColor, mode) => {
  switch (mode) {
    case 'neon': return new THREE.Color(0x00ffff);
    case 'dark': return new THREE.Color(0x666666);
    default: return new THREE.Color(baseColor);
  }
};

const getEmissiveColorForVisualMode = (mode) => {
  switch (mode) {
    case 'neon': return new THREE.Color(0x00aaaa);
    default: return new THREE.Color(0x222222); // Subtle glow instead of black
  }
};

const Planet = ({
  modelPath = '/models/planet.obj',
  visualMode = 'default',
  scale = 8,
  position = [0, 15, -150],
}) => {
  const planetRef = useRef();
  const modelRef = useRef(null);

  // Load the model and materials only once (or when modelPath/scale changes)
  useEffect(() => {
    const mtlLoader = new MTLLoader();
    const mtlPath = modelPath.replace('.obj', '.mtl');

    mtlLoader.load(
      mtlPath,
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
          modelPath,
          (object) => {
            console.log('Planet model loaded successfully:', modelPath);
            modelRef.current = object;
            object.scale.set(scale, scale, scale);
            planetRef.current.add(object);
          },
          undefined,
          (error) => {
            console.error('Error loading planet OBJ:', error);
          }
        );
      },
      undefined,
      (mtlError) => {
        console.warn('No MTL file found or error loading, using fallback material:', mtlError);
        const objLoader = new OBJLoader();
        objLoader.load(
          modelPath,
          (object) => {
            console.log('Planet model loaded with fallback material:', modelPath);
            modelRef.current = object;
            object.scale.set(scale, scale, scale);
            object.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: getColorForVisualMode('#ffffff', visualMode),
                  emissive: getEmissiveColorForVisualMode(visualMode),
                  emissiveIntensity: visualMode === 'neon' ? 0.5 : 0.2,
                  metalness: 0.3,
                  roughness: 0.7,
                });
              }
            });
            planetRef.current.add(object);
          },
          undefined,
          (objError) => {
            console.error('Error loading planet OBJ with fallback:', objError);
          }
        );
      }
    );

    // Cleanup function to remove the model when the component unmounts
    return () => {
      if (modelRef.current && planetRef.current) {
        planetRef.current.remove(modelRef.current);
      }
    };
  }, [modelPath, scale]); // Dependencies: only modelPath and scale

  // Update material properties when visualMode changes
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const material = child.material;
          material.color = getColorForVisualMode(material.color || '#ffffff', visualMode);
          material.emissive = getEmissiveColorForVisualMode(visualMode);
          material.emissiveIntensity = visualMode === 'neon' ? 0.5 : 0.2;
        }
      });
    }
  }, [visualMode]); // Dependency: only visualMode

  return <group ref={planetRef} position={position} />;
};

export default Planet;