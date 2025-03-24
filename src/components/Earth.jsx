// Earth.jsx - Optimized Earth component with performance considerations
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { usePerformance } from './PerformanceOptimizer';

const Earth = ({
  modelPath = '/models/earth.glb',
  scale = 750,
  position = [0, -800, 0],
  rotation = [0, Math.PI, 0],
  visualMode = 'default',
}) => {
  const { camera } = useThree();
  const { performanceMode } = usePerformance();
  const earthRef = useRef();
  const earthGlobeRef = useRef();
  const cloudsRef = useRef();
  const atmosphereRef = useRef();
  const nightLightsRef = useRef();
  const [isInView, setIsInView] = useState(false);
  
  // Calculate polygon counts based on performance mode
  const segmentCount = useMemo(() => {
    switch (performanceMode) {
      case 'low': return 16;
      case 'medium': return 32;
      case 'high': return 64;
      default: return 32;
    }
  }, [performanceMode]);
  
  // Determine which features to enable based on performance mode
  const features = useMemo(() => {
    switch (performanceMode) {
      case 'low':
        return { clouds: false, atmosphere: true, nightLights: false, animations: false };
      case 'medium':
        return { clouds: true, atmosphere: true, nightLights: false, animations: true };
      case 'high':
      default:
        return { clouds: true, atmosphere: true, nightLights: true, animations: true };
    }
  }, [performanceMode]);
  
  // Initialize Earth model and its components
  useEffect(() => {
    // Only load Earth if in view (to start)
    if (!isInView) {
      setIsInView(true);
      return;
    }
    
    // Create and add base Earth container
    if (!earthRef.current) return;
    
    // Clear any existing content from reference
    while (earthRef.current.children.length > 0) {
      const child = earthRef.current.children[0];
      if (child.material) child.material.dispose();
      if (child.geometry) child.geometry.dispose();
      earthRef.current.remove(child);
    }
    
    // Load the Earth model
    const loader = new GLTFLoader();
    
    // Create a cached version for low detail
    if (performanceMode === 'low') {
      createFallbackEarth();
      return;
    }
    
    loader.load(
      modelPath,
      (gltf) => {
        // Add loaded model to our group
        if (earthRef.current) {
          // Scale the model appropriately
          gltf.scene.scale.set(scale, scale, scale);
          // Apply initial rotation
          gltf.scene.rotation.set(rotation[0], rotation[1], rotation[2]);
          earthRef.current.add(gltf.scene);
          
          // Find the main Earth mesh in the model
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              // Store reference to the main Earth globe
              earthGlobeRef.current = child;
              
              // Optimize material
              if (child.material) {
                adjustMaterialForVisualMode(child.material, visualMode);
                
                // Apply performance optimizations to material
                child.material.precision = performanceMode === 'low' ? 'lowp' : 'mediump';
                child.material.flatShading = performanceMode === 'low';
              }
              
              // Optimize geometry if possible
              if (child.geometry && performanceMode === 'low') {
                const simplifiedGeo = new THREE.SphereGeometry(scale, segmentCount, segmentCount);
                child.geometry.dispose();
                child.geometry = simplifiedGeo;
              }
            }
          });
          
          // Add additional layers only if needed
          if (earthGlobeRef.current) {
            if (features.atmosphere) createAtmosphere();
            if (features.clouds) createClouds();
            if (features.nightLights) createNightLights();
          }
        }
      },
      undefined,
      (error) => {
        console.error('Error loading Earth model:', error);
        createFallbackEarth();
      }
    );
    
    // Cleanup function
    return () => {
      [cloudsRef, atmosphereRef, nightLightsRef].forEach(ref => {
        if (ref.current) {
          if (ref.current.geometry) ref.current.geometry.dispose();
          if (ref.current.material) ref.current.material.dispose();
        }
      });
    };
  }, [modelPath, scale, visualMode, performanceMode, isInView, segmentCount, features]);
  
  // Create atmosphere glow effect
  const createAtmosphere = () => {
    // Use fewer segments for atmosphere (it's a simple effect)
    const atmosphereGeometry = new THREE.SphereGeometry(scale * 1.05, segmentCount, segmentCount);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4466ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    atmosphereRef.current = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthRef.current.add(atmosphereRef.current);
  };
  
  // Create cloud layer - optimized
  const createClouds = () => {
    // Simplified texture resolution based on performance
    const textureSize = performanceMode === 'low' ? 256 : 
                        performanceMode === 'medium' ? 512 : 1024;
    
    // Reduced geometry complexity
    const cloudsGeometry = new THREE.SphereGeometry(scale * 1.02, segmentCount, segmentCount);
    const cloudsMaterial = new THREE.MeshBasicMaterial({  // Using BasicMaterial instead of PhongMaterial
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      alphaMap: createCloudTexture(textureSize),
      side: THREE.FrontSide,
      depthWrite: false
    });
    
    cloudsRef.current = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earthRef.current.add(cloudsRef.current);
    
    // Only load cloud texture in medium/high performance mode
    if (performanceMode !== 'low') {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        '/textures/earth_clouds.png',
        (texture) => {
          // Apply texture size limit
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          
          cloudsMaterial.alphaMap = texture;
          cloudsMaterial.needsUpdate = true;
        },
        undefined,
        (error) => {} // Silently fall back to procedural
      );
    }
  };
  
  // Create night lights effect - optimized
  const createNightLights = () => {
    // Simpler geometry for night lights
    const lightsGeometry = new THREE.SphereGeometry(scale * 1.01, segmentCount, segmentCount);
    const lightsMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.3,
      alphaMap: createNightLightsTexture(performanceMode === 'high' ? 512 : 256),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    nightLightsRef.current = new THREE.Mesh(lightsGeometry, lightsMaterial);
    earthRef.current.add(nightLightsRef.current);
    
    // Only load texture in high performance mode
    if (performanceMode === 'high') {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        '/textures/earth_nightlights.jpg',
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          
          lightsMaterial.alphaMap = texture;
          lightsMaterial.needsUpdate = true;
        },
        undefined,
        (error) => {} // Silently fall back to procedural
      );
    }
  };
  
  // Create fallback Earth (optimized)
  const createFallbackEarth = () => {
    if (!earthRef.current) return;
    
    // Simplified Earth with lower polygon count
    const geometry = new THREE.SphereGeometry(scale, segmentCount, segmentCount);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x2244aa
    });
    
    if (performanceMode !== 'low') {
      material.specular = 0x333333;
      material.shininess = 15;
    }
    
    earthGlobeRef.current = new THREE.Mesh(geometry, material);
    earthRef.current.add(earthGlobeRef.current);
    
    // Add only essential layers based on performance mode
    if (features.atmosphere) createAtmosphere();
    if (features.clouds) createClouds();
    if (features.nightLights) createNightLights();
  };
  
  // Create optimized cloud texture with size parameter
  const createCloudTexture = (size = 512) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Fewer cloud particles for better performance
    const cloudCount = performanceMode === 'low' ? 20 : 
                      performanceMode === 'medium' ? 50 : 100;
    
    ctx.fillStyle = 'white';
    for (let i = 0; i < cloudCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 5 + Math.random() * 30;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Avoid mipmaps
    texture.generateMipmaps = false;        // Save memory
    return texture;
  };
  
  // Create optimized night lights texture
  const createNightLightsTexture = (size = 256) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Fewer lights for better performance
    const lightCount = performanceMode === 'low' ? 200 : 
                      performanceMode === 'medium' ? 500 : 1000;
    
    ctx.fillStyle = 'white';
    for (let i = 0; i < lightCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      
      if (Math.random() < 0.7) {
        const size = Math.random() + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add fewer city clusters
      if (Math.random() < 0.03) {
        const clusterRadius = 5 + Math.random() * 10;
        const numLights = Math.floor(Math.random() * 8) + 3;
        
        for (let j = 0; j < numLights; j++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * clusterRadius;
          const size = Math.random() + 0.5;
          
          const lightX = x + Math.cos(angle) * distance;
          const lightY = y + Math.sin(angle) * distance;
          
          ctx.beginPath();
          ctx.arc(lightX, lightY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  };
  
  // Simplified material adjustments
  const adjustMaterialForVisualMode = (material, visualMode) => {
    switch (visualMode) {
      case 'neon':
        material.emissive = new THREE.Color(0x000033);
        material.emissiveIntensity = 0.2;
        break;
      case 'dream':
        material.color.multiplyScalar(0.8);
        material.emissive = new THREE.Color(0x001133);
        material.emissiveIntensity = 0.1;
        break;
      case 'monochrome':
        const color = material.color;
        const gray = (color.r + color.g + color.b) / 3;
        material.color.setRGB(gray, gray, gray);
        break;
      default:
        break;
    }
    
    material.needsUpdate = true;
  };
  
  // Frustum culling check (only animate when visible)
  useFrame(({ clock, camera }) => {
    // Exit early if we're in low performance mode with animations disabled
    if (!features.animations) return;
    
    const time = clock.getElapsedTime();
    
    // Check if Earth is in camera frustum
    if (earthRef.current) {
      const frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix, 
        camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(matrix);
      
      // Create a bounding sphere for frustum culling check
      const position = new THREE.Vector3();
      earthRef.current.getWorldPosition(position);
      const boundingSphere = new THREE.Sphere(position, scale * 1.1);
      
      // Only run animations if Earth is in view
      if (frustum.intersectsSphere(boundingSphere)) {
        // Very slow Earth rotation
        earthRef.current.rotation.y += 0.00002; // Reduced from 0.00005
        
        // Clouds rotation - only if enabled
        if (cloudsRef.current && features.clouds) {
          cloudsRef.current.rotation.y += 0.00003; // Reduced from 0.00008
        }
        
        // Simplified atmosphere effect - only if enabled
        if (atmosphereRef.current && atmosphereRef.current.material && features.atmosphere) {
          // Use a slower, less intensive pulse
          if (Math.floor(time) % 5 === 0) { // Only update every 5 seconds
            const pulseFactor = (Math.sin(time * 0.05) * 0.03) + 0.97;
            atmosphereRef.current.material.opacity = 0.15 * pulseFactor;
          }
        }
        
        // Simpler night lights update - only if enabled
        if (nightLightsRef.current && earthRef.current && features.nightLights) {
          // Update less frequently
          if (Math.floor(time * 2) % 2 === 0) { // Only update every half second
            nightLightsRef.current.rotation.y = -earthRef.current.rotation.y;
          }
        }
      }
    }
  });
  
  return (
    <group ref={earthRef} position={position}>
      {/* Simplified lighting - only add if in medium or high performance mode */}
      {performanceMode !== 'low' && (
        <directionalLight 
          position={[0, 1000, 0]} 
          intensity={0.5} 
          color="#ffffff" 
        />
      )}
    </group>
  );
};

export default Earth;