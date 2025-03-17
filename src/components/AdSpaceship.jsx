import { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { Html } from '@react-three/drei';
import { usePerformance } from './PerformanceOptimizer';

// Create a more efficient flame texture
const createFlameTexture = () => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Create radial gradient
  const gradient = ctx.createRadialGradient(
    size/2, size/2, 0,
    size/2, size/2, size/2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 200, 50, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 50, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};


const AdSpaceship = forwardRef(function AdSpaceship({ 
  modelPath, 
  bannerUrl, 
  bannerLink = "https://example.com",
  bannerTitle,
  speedFactor, 
  animationType, 
  positionOffset,
  thrusterPositions: customThrusterPositions,
  onShowModal,
  debugMode = false
}, ref) {
  const { qualityLevel, performanceMode } = usePerformance();
  const { camera, gl, raycaster, pointer, scene } = useThree();
  
  const spaceshipRef = useRef();
  const bannerRef = useRef();
  const htmlBannerRef = useRef();
  const pathRef = useRef();
  const modelRef = useRef(null);
  const followLightRef = useRef();
  const followLightTargetRef = useRef();
  const engineFlameRef = useRef(); // Main engine flame
  const smallFlamesRef = useRef([]); // Array for smaller thrusters
  const exhaustCloudRef = useRef(); // Smoke/vapor trail
  const adBannerRef = useRef();
  const loadedTextures = useRef([]);
 
  
  // Create a ref to hold the banner group for smooth rotation
  const bannerGroupRef = useRef();
  
  // Store the current rotation values to interpolate between
  const currentRotation = useRef({ x: 0, y: Math.PI, z: 0 });
  
  // Store the target rotation values
  const targetRotation = useRef({ x: 0, y: Math.PI, z: 0 });
  
  // Interaction states
  const [hovered, setHovered] = useState(false);
  const [adVisible, setAdVisible] = useState(true); // Set to true by default
  const [bannerScale, setBannerScale] = useState(1);
  const [bannerRotation, setBannerRotation] = useState([0, 0, 0]);
  const [enginePower, setEnginePower] = useState(1);
  
  // Thruster positions - will be set after model loads
  const thrusterPositions = useRef([]);
  
  // Memoize flame texture for reuse
  const flameTexture = useMemo(() => createFlameTexture(), []);
  
  // Memoized path
  const path = useMemo(() => {
    const startPoint = new THREE.Vector3(-40, 0, -30).add(new THREE.Vector3(...positionOffset));
    const endPoint = new THREE.Vector3(40, 0, -30).add(new THREE.Vector3(...positionOffset));
    return new THREE.CatmullRomCurve3([startPoint, endPoint]);
  }, [positionOffset]);

  // Determine particle counts based on performance mode
  const particleCount = useMemo(() => {
    switch(performanceMode) {
      case 'low': return 20;
      case 'medium': return 50;
      case 'high': return 100;
      default: return 50;
    }
  }, [performanceMode]);
  
  // Determine if we should use simple materials
  const useSimpleMaterials = useMemo(() => {
    return performanceMode === 'low';
  }, [performanceMode]);

  // Determine if we're loading a GLTF or OBJ file
  const isGltf = useMemo(() => {
    return modelPath.toLowerCase().endsWith('.gltf') || 
           modelPath.toLowerCase().endsWith('.glb');
  }, [modelPath]);

  // Check if the pointer is over any of our objects
  const checkIntersection = () => {
    if (!spaceshipRef.current || !camera || !raycaster) return false;
    
    // Update the picking ray
    raycaster.setFromCamera(pointer, camera);
    
    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(spaceshipRef.current.children, true);
    
    // Return true if any intersections
    return intersects.length > 0;
  };
  
  // Handle click on the spaceship - UPDATED to match Planet.jsx
  const handleClick = () => {
    if (hovered) {
      console.log('Spaceship clicked, showing modal');
      // Call the parent component's handler with ad info
      if (onShowModal) {
        onShowModal({
          adImage: bannerUrl,
          adLink: bannerLink,
          adTitle: bannerTitle || 'Space Travel Offer'
        });
      }
    }
  };

  useEffect(() => {
    // Store path in ref
    pathRef.current = path;
    
    // Create loading manager
    const loadingManager = new THREE.LoadingManager();
    
    loadingManager.onStart = (url) => {
      console.log(`Started loading: ${url}`);
    };
    
    loadingManager.onLoad = () => {
      console.log('All assets loaded successfully');
    };
    
    loadingManager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };

    // Load 3D model based on file extension
    if (isGltf) {
      loadGltfModel(loadingManager);
    } else {
      loadObjModel(loadingManager);
    }

    // Load the banner texture
    loadBanner(loadingManager);
    
    // Add lights to the spacecraft
    addLights();

    return () => {
      // Cleanup
      loadedTextures.current.forEach(texture => {
        if (texture) texture.dispose();
      });
      
      if (engineFlameRef.current && engineFlameRef.current.material) {
        if (engineFlameRef.current.material.uniforms?.flameTexture?.value) {
          engineFlameRef.current.material.uniforms.flameTexture.value.dispose();
        }
        engineFlameRef.current.material.dispose();
        engineFlameRef.current.geometry.dispose();
      }
      
      // Cleanup small flames
      smallFlamesRef.current.forEach(flame => {
        if (flame && flame.material) {
          flame.material.dispose();
          flame.geometry.dispose();
        }
      });
      
      // Cancel any ongoing loads
      loadingManager.onLoad = () => {};
      loadingManager.onProgress = () => {};
      loadingManager.onError = () => {};
    };
  }, [modelPath, bannerUrl, positionOffset, qualityLevel, performanceMode, 
      useSimpleMaterials, particleCount, path, flameTexture, isGltf, customThrusterPositions]);

  // Add click handler for the spaceship - UPDATED to match Planet.jsx
  useEffect(() => {
    const clickHandler = (event) => {
      if (hovered) {
        handleClick();
        console.log('Global click handler fired when hovered, calling handleClick()');
      }
    };
    
    window.addEventListener('click', clickHandler);
    
    return () => {
      window.removeEventListener('click', clickHandler);
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  // Function to load GLTF model
  const loadGltfModel = (loadingManager) => {
    const gltfLoader = new GLTFLoader(loadingManager);
    
    gltfLoader.load(modelPath, (gltf) => {
      console.log('GLTF model loaded successfully:', modelPath);
      
      // Store the model
      modelRef.current = gltf.scene;
      
      // Apply scale
      gltf.scene.scale.set(6, 6, 6);
      
      // Apply optimizations for low-end devices
      if (useSimpleMaterials) {
        gltf.scene.traverse(child => {
          if (child.isMesh) {
            // Lower geometry detail if needed
            if (child.geometry) {
              child.geometry.computeVertexNormals();
            }
            
            // Simplify materials
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  mat.side = THREE.FrontSide;
                  mat.flatShading = true;
                  mat.needsUpdate = true;
                });
              } else {
                child.material.side = THREE.FrontSide;
                child.material.flatShading = true;
                child.material.needsUpdate = true;
              }
            }
          }
        });
      }
      
      // Add model to the scene
      if (spaceshipRef.current) {
        spaceshipRef.current.add(gltf.scene);
      }
      
      // Use custom thruster positions if provided, or find them automatically
      if (customThrusterPositions) {
        thrusterPositions.current = customThrusterPositions;
        console.log('Using custom thruster positions:', thrusterPositions.current);
      } else {
        findThrusterPositions(gltf.scene);
      }
      
      // Add engine flames after model is loaded
      addEngineFlames();
    });
  };
  
  // Function to load OBJ/MTL model
  const loadObjModel = (loadingManager) => {
    const mtlLoader = new MTLLoader(loadingManager);
    const mtlPath = modelPath.replace('.obj', '.mtl');
    
    mtlLoader.load(mtlPath, (materials) => {
      materials.preload();
      
      // Set low-quality materials in low performance mode
      if (useSimpleMaterials) {
        Object.values(materials.materials).forEach(material => {
          material.side = THREE.FrontSide;
          material.shininess = 0;
          material.flatShading = true;
        });
      }
      
      const objLoader = new OBJLoader(loadingManager);
      objLoader.setMaterials(materials);
      objLoader.load(modelPath, (object) => {
        console.log('OBJ model loaded successfully:', modelPath);
        modelRef.current = object;
        object.scale.set(6, 6, 6);
        
        // Apply optimizations for low-end devices
        if (useSimpleMaterials) {
          object.traverse(child => {
            if (child.isMesh) {
              // Lower geometry detail if needed
              if (child.geometry) {
                child.geometry.computeVertexNormals();
              }
              
              // Simplify materials
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.side = THREE.FrontSide;
                    mat.flatShading = true;
                    mat.needsUpdate = true;
                  });
                } else {
                  child.material.side = THREE.FrontSide;
                  child.material.flatShading = true;
                  child.material.needsUpdate = true;
                }
              }
            }
          });
        }
        
        if (spaceshipRef.current) {
          spaceshipRef.current.add(object);
        }
        
        // Use custom thruster positions if provided
        if (customThrusterPositions) {
          thrusterPositions.current = customThrusterPositions;
          console.log('Using custom thruster positions:', thrusterPositions.current);
        } else {
          findThrusterPositions(object);
        }
        
        // Add engine flames after model is loaded
        addEngineFlames();
      });
    });
  };
  
  // Function to find appropriate thruster positions based on model geometry
  const findThrusterPositions = (model) => {
    // Create a bounding box to analyze the model dimensions
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    console.log('Model bounding box:', { 
      min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
      max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
      size: { x: size.x, y: size.y, z: size.z }
    });
    
    // Based on the Blender model's orientation, we need to adjust our thruster positions
    // Default positions if none were found - at rear of model
    const thrusters = [
      // Main thruster (center)
      new THREE.Vector3(15, 0, 0),  // CHANGED: Using positive X for back
      // Top row:
      new THREE.Vector3(15, 4, 1.5),
      new THREE.Vector3(15, 0, 1.5),
      new THREE.Vector3(15, -4, 1.5),
      // Bottom row:
      new THREE.Vector3(15, 3, -1.5),
      new THREE.Vector3(15, 0, -1.5),
      new THREE.Vector3(15, -3, -1.5)
    ];
    
    thrusterPositions.current = thrusters;
    console.log('Thruster positions determined:', thrusters);
  };
  
  // Function to load banner texture
  const loadBanner = (loadingManager) => {
    // DIRECT TEXTURE APPROACH - More reliable than using a loader
    const textureUrl = bannerUrl;
    console.log('Creating banner with texture URL:', textureUrl);
    
    // Create the banner mesh immediately with a placeholder material
    const bannerGeometry = new THREE.PlaneGeometry(6, 3);
    const bannerMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa, // Placeholder color
      side: THREE.DoubleSide,
      transparent: true,
    });
    
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    banner.position.set(0, 5, 0); // Positioned above ship
    bannerRef.current = banner;
    
    if (spaceshipRef.current) {
      spaceshipRef.current.add(banner);
    }
    
    // Now load the texture manually
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous'; // Important for some servers
    
    // Log the process
    console.log('Starting texture load for banner from URL:', textureUrl);
    
    textureLoader.load(
      textureUrl, 
      // Success callback
      (texture) => {
        console.log('Banner texture loaded successfully:', textureUrl);
        loadedTextures.current.push(texture);
        
        // Update the banner material with the loaded texture
        if (bannerRef.current) {
          bannerRef.current.material.map = texture;
          bannerRef.current.material.color.set(0xffffff); // Reset color
          bannerRef.current.material.needsUpdate = true;
          console.log('Texture applied to banner mesh');
        }
      },
      // Progress callback
      (xhr) => {
        console.log(`Banner texture ${textureUrl} loading: ${(xhr.loaded / xhr.total * 100)}%`);
      },
      // Error callback
      (error) => {
        console.error('Error loading banner texture:', textureUrl, error);
        // Try with a different approach as fallback
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const fallbackTexture = new THREE.CanvasTexture(canvas);
            loadedTextures.current.push(fallbackTexture);
            
            if (bannerRef.current) {
              bannerRef.current.material.map = fallbackTexture;
              bannerRef.current.material.color.set(0xffffff);
              bannerRef.current.material.needsUpdate = true;
              console.log('Fallback banner texture applied');
            }
          };
          img.src = textureUrl;
        } catch (fallbackError) {
          console.error('Fallback texture load also failed:', fallbackError);
        }
      }
    );
  };
  
  // Function to add lights to the spacecraft
  const addLights = () => {
    // Add lights with intensity based on performance
    const lightIntensity = performanceMode === 'high' ? 0.3 : 0.2;
    const ambientLight = new THREE.AmbientLight(0x404060, lightIntensity);
    if (spaceshipRef.current) {
      spaceshipRef.current.add(ambientLight);
    }

    // Only add spotlight for medium/high performance modes
    if (performanceMode !== 'low') {
      const lightTarget = new THREE.Object3D();
      lightTarget.position.set(0, 0, 5);
      if (spaceshipRef.current) {
        spaceshipRef.current.add(lightTarget);
      }
      followLightTargetRef.current = lightTarget;

      const spotIntensity = performanceMode === 'high' ? 2.5 : 1.8;
      const followSpotlight = new THREE.SpotLight(0xffffff, spotIntensity, 40, Math.PI/6, 0.5, 2);
      followSpotlight.position.set(5, 8, -3);
      followSpotlight.target = lightTarget;
      if (spaceshipRef.current) {
        spaceshipRef.current.add(followSpotlight);
      }
      followLightRef.current = followSpotlight;
    }
  };
  
  // Function to add engine flames
  const addEngineFlames = () => {
    if (thrusterPositions.current.length === 0) {
      console.warn('No thruster positions found, using defaults');
      // Default positions if none were found - at rear of model
      thrusterPositions.current = [
        new THREE.Vector3(15, 0, 0),  // CHANGED: Using positive X for back
        new THREE.Vector3(15, 4, 1.5),
        new THREE.Vector3(15, 0, 1.5),
        new THREE.Vector3(15, -4, 1.5),
        new THREE.Vector3(15, 3, -1.5),
        new THREE.Vector3(15, 0, -1.5),
        new THREE.Vector3(15, -3, -1.5)
      ];
    }
    
    // Create the main engine flame - use the first thruster position
    const mainThrusterPos = thrusterPositions.current[0];
    
    // Create a flame geometry with more detail for better flames
    // CHANGED: Using a modified cylinder for a horizontal flame
    const flameLength = 12; // Longer flame
    const flameGeometry = new THREE.CylinderGeometry(
      0.1,  // radiusTop (narrow at the back)
      2.0,  // radiusBottom (wide at the front)
      flameLength, // height (length of flame)
      16,  // radialSegments (detail)
      1,   // heightSegments
      true // open-ended
    );
    
    // Rotate and position the flame to be horizontal and extend backwards from thruster
    flameGeometry.rotateZ(Math.PI / 2); // Rotate to point along X axis
    flameGeometry.translate(flameLength/2, 0, 0); // Center it and move it forward
    
    // Create advanced flame material
    const flameMaterial = performanceMode === 'low' 
      ? new THREE.MeshBasicMaterial({
          color: 0xff5500,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
        })
      : new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0xffff80) },
            color2: { value: new THREE.Color(0xff4400) },
            noiseScale: { value: 6.0 },
            twistScale: { value: 2.0 },
            enginePower: { value: 1.0 },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
              vUv = uv;
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform float noiseScale;
            uniform float twistScale;
            uniform float enginePower;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            
            // Simple noise function
            float noise(vec3 p) {
              return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            }
            
            void main() {
              // Base gradient along X axis (for horizontal flame)
              float gradient = 1.0 - abs(vPosition.x) / 6.0;
              
              // Add animated noise
              float n = noise(vec3(vPosition.x * noiseScale, vPosition.y * noiseScale - time * 2.0, vPosition.z * noiseScale));
              
              // Add twist effect
              float twist = sin(vPosition.x * twistScale + time * 3.0) * 0.2;
              gradient += twist;
              
              // Add noise to gradient
              gradient += n * 0.2;
              
              // Clamp and adjust by engine power
              gradient = clamp(gradient * enginePower, 0.0, 1.0);
              
              // Mix colors based on gradient
              vec3 color = mix(color1, color2, gradient);
              
              // Fade out at the end
              float fadeOut = smoothstep(0.98, 1.0, abs(vPosition.x) / 6.0);
              float alpha = (1.0 - fadeOut) * 0.8 * enginePower;
              
              gl_FragColor = vec4(color, alpha);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
    
    // Create the flame mesh
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    
    // Position the flame exactly at the thruster position
    flame.position.copy(mainThrusterPos);
    
    // IMPORTANT CHANGE: Push the flames much further to the right to align with the red thrusters
    flame.position.x += 7.0; // Increased from 1.5 to 7.0
    
    engineFlameRef.current = flame;
    
    if (spaceshipRef.current) {
      spaceshipRef.current.add(flame);
    }
    
    // Create smaller thrusters if in higher performance modes and we have multiple thruster positions
    if (performanceMode !== 'low' && thrusterPositions.current.length > 1) {
      const smallFlames = [];
      
      // Create one flame for each additional thruster position
      for (let i = 1; i < Math.min(thrusterPositions.current.length, 7); i++) {
        // Small flame geometry - horizontal cylinder
        const smallFlameLength = 7; // Shorter than main flame
        const smallFlameGeometry = new THREE.CylinderGeometry(
          0.05, // radiusTop
          0.6,  // radiusBottom
          smallFlameLength, // height
          8,    // radialSegments
          1,    // heightSegments
          true  // open-ended
        );
        
        // Rotate and position the flame to be horizontal
        smallFlameGeometry.rotateZ(Math.PI / 2);
        smallFlameGeometry.translate(smallFlameLength/2, 0, 0);
        
        const smallFlameMaterial = performanceMode === 'medium'
          ? new THREE.MeshBasicMaterial({
              color: 0xff8844,
              transparent: true,
              opacity: 0.6,
              blending: THREE.AdditiveBlending,
            })
          : new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0xffff80) },
                color2: { value: new THREE.Color(0xff4400) },
                noiseScale: { value: 8.0 },
                enginePower: { value: 1.0 },
              },
              vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                  vUv = uv;
                  vPosition = position;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float noiseScale;
                uniform float enginePower;
                
                varying vec2 vUv;
                varying vec3 vPosition;
                
                // Simple noise function
                float noise(vec3 p) {
                  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
                }
                
                void main() {
                  // Base gradient along X axis (for horizontal flame)
                  float gradient = 1.0 - abs(vPosition.x) / 3.5;
                  
                  // Add animated noise
                  float n = noise(vec3(vPosition.x * noiseScale, vPosition.y * noiseScale - time * 3.0, vPosition.z * noiseScale));
                  
                  // Add noise to gradient
                  gradient += n * 0.2;
                  
                  // Clamp and adjust by engine power
                  gradient = clamp(gradient * enginePower, 0.0, 1.0);
                  
                  // Mix colors based on gradient
                  vec3 color = mix(color1, color2, gradient);
                  
                  // Fade out at the end
                  float fadeOut = smoothstep(0.98, 1.0, abs(vPosition.x) / 3.5);
                  float alpha = (1.0 - fadeOut) * 0.7 * enginePower;
                  
                  gl_FragColor = vec4(color, alpha);
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
        
        const smallFlame = new THREE.Mesh(smallFlameGeometry, smallFlameMaterial);
        
        // Position at thruster and move much further right for proper alignment
        smallFlame.position.copy(thrusterPositions.current[i]);
        smallFlame.position.x += 7.0; // CHANGED: Increased from 1.0 to 7.0
        
        if (spaceshipRef.current) {
          spaceshipRef.current.add(smallFlame);
        }
        
        smallFlames.push(smallFlame);
      }
      
      smallFlamesRef.current = smallFlames;
    }
    
    // Add debug helpers if in debug mode
    if (debugMode) {
      // Add a visible marker at each thruster position
      thrusterPositions.current.forEach((pos, index) => {
        const markerGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
          color: index === 0 ? 0xff0000 : 0x00ff00,
          wireframe: true
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(pos);
        if (spaceshipRef.current) {
          spaceshipRef.current.add(marker);
        }
      });
    }
  };

  // Add smooth banner rotation to the useFrame function
  useFrame(({ clock, camera }) => {
    if (!spaceshipRef.current || !pathRef.current) return;

    const time = clock.getElapsedTime();
    const cycleTime = 60;
    const flyByDuration = 30;
    const elapsed = clock.getElapsedTime() % cycleTime;

    // IMPORTANT CHANGE: Always make the ad visible when spacecraft is in view
    // This ensures it stays visible across cycles
    if (!adVisible && elapsed < flyByDuration) {
      setAdVisible(true);
    }

    // Update banner rotation smoothly if banner group exists
    if (bannerGroupRef.current && camera) {
      // Calculate the direction from banner to camera
      const bannerPos = new THREE.Vector3();
      bannerGroupRef.current.getWorldPosition(bannerPos);
      
      // Get the camera position on the same Y plane as the banner
      // This restricts rotation to only horizontal movement
      const cameraHorizontal = new THREE.Vector3(
        camera.position.x,
        bannerPos.y, // Keep y the same as the banner
        camera.position.z
      );
      
      // Create a temporary object to use lookAt for horizontal rotation only
      const tempObj = new THREE.Object3D();
      tempObj.position.copy(bannerPos);
      tempObj.lookAt(cameraHorizontal);
      
      // Extract just the Y rotation (horizontal)
      const yRotation = tempObj.rotation.y;
      
      // Update only the Y component of the target rotation
      targetRotation.current = {
        x: 0, // Keep X rotation fixed (no vertical tilting)
        y: yRotation + Math.PI, // Add PI to keep it facing the camera
        z: 0  // Keep Z rotation fixed
      };
      
      // Smoothly interpolate current rotation to target rotation
      // But only for the Y-axis
      currentRotation.current = {
        x: 0, // Fixed at 0
        y: THREE.MathUtils.lerp(currentRotation.current.y, targetRotation.current.y, 0.1),
        z: 0  // Fixed at 0
      };
      
      // Apply the smoothed rotation (horizontal only)
      bannerGroupRef.current.rotation.set(
        currentRotation.current.x,
        currentRotation.current.y,
        currentRotation.current.z
      );
    }

    if (elapsed < flyByDuration) {
      // Skip frames in low performance mode
      if (performanceMode === 'low' && elapsed % 2 !== 0) return;
      
      const t = elapsed / flyByDuration;
      const position = pathRef.current.getPointAt(t);
      spaceshipRef.current.position.copy(position);

      const tangent = pathRef.current.getTangentAt(t);
      spaceshipRef.current.lookAt(position.clone().add(tangent));
      spaceshipRef.current.rotateY(Math.PI / 2);

      // Check if spacecraft is being hovered
      const isHovering = checkIntersection();
      if (isHovering !== hovered) {
        setHovered(isHovering);
        
        // Change engine power during hover for visual feedback
        if (isHovering) {
          setEnginePower(1.5); // Boost engines when hovered
        } else {
          setEnginePower(1.0); // Normal engine power
        }
      }

      // Update flame effects
      if (engineFlameRef.current && engineFlameRef.current.material) {
        if (engineFlameRef.current.material.uniforms) {
          // Update shader-based flame
          engineFlameRef.current.material.uniforms.time.value = time;
          engineFlameRef.current.material.uniforms.enginePower.value = enginePower;
          
          // Pulsate the flame length
          const speedVariation = 1.0 + Math.sin(time * 4) * 0.2;
          engineFlameRef.current.scale.x = 1 + (enginePower - 1) * 2 * speedVariation;
        } else {
          // Update simple material-based flame
          engineFlameRef.current.scale.x = 1 + (enginePower - 1) * 1.5;
        }
      }
      
      // Update small thrusters
      smallFlamesRef.current.forEach((flame, index) => {
        if (flame && flame.material) {
          if (flame.material.uniforms) {
            // Update shader-based flame
            flame.material.uniforms.time.value = time + index; // Offset for variation
            flame.material.uniforms.enginePower.value = enginePower * (0.8 + Math.random() * 0.4);
          }
          
          // Pulsate the small flame length
          const pulseAmount = 0.8 + Math.sin(time * 5 + index * 2) * 0.2;
          flame.scale.x = enginePower * pulseAmount;
        }
      });

      // Adjust lighting based on distance only in medium/high performance modes
      if (followLightRef.current && performanceMode !== 'low') {
        const distanceToCamera = position.distanceTo(camera.position);
        const normalizedDistance = Math.min(Math.max(distanceToCamera / 50, 0.5), 1.5);
        followLightRef.current.intensity = 2.5 * normalizedDistance * qualityLevel;
      }
    } else {
      // IMPORTANT CHANGE: Don't hide the spaceship completely, just move it offscreen
      // This approach maintains its structure including the ad for the next cycle
      spaceshipRef.current.position.set(-1000, -1000, -1000);
      
      // IMPORTANT CHANGE: Don't set adVisible to false here
      // We want the ad to stay in memory for the next cycle
    }
  });

  useImperativeHandle(ref, () => ({
    getPosition: () => spaceshipRef.current ? spaceshipRef.current.position : new THREE.Vector3(0, 0, -1000),
  }));

  // UPDATED RETURN SECTION - Now matches Planet.jsx approach
// This is the correct HTML banner section for AdSpaceship.jsx that preserves the clickable button

// In the return() section of AdSpaceship.jsx, replace the current HTML banner with:

return (
  <group ref={spaceshipRef}>
    {/* This is a fixed position banner directly attached to the spacecraft */}
    <group position={[0, 8, -24]} ref={bannerGroupRef}>
      {/* Tooltip that appears when hovering */}
      {hovered && (
        <Html position={[0, 3, 0]} center>
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
      
      {/* Clickable banner - keep pointerEvents: 'all' to make it directly clickable */}
      {adVisible && (
        <Html
          ref={htmlBannerRef}
          position={[0, 0, 0]}
          transform
          center
          distanceFactor={7}
          zIndexRange={[100, 10000]}
          sprite={false}
          style={{
            width: '300px',
            height: '150px',
            color: 'white',
            display: 'flex',
            padding: 0,
            margin: 0,
            pointerEvents: 'all', // Keep as 'all' to make it clickable
            userSelect: 'none',
          }}
          onClick={(e) => {
            // Event handler on the Html component itself as a fallback
            e.stopPropagation();
          }}
        >
          <button 
            onClick={(e) => {
              // Stop event propagation and prevent default browser behavior
              e.preventDefault();
              e.stopPropagation();
              
              console.log('SPACESHIP BANNER BUTTON CLICKED!');
              
              // Call the onShowModal function with the ad info
              if (typeof onShowModal === 'function') {
                onShowModal({
                  adImage: bannerUrl,
                  adLink: bannerLink,
                  adTitle: bannerTitle || 'Space Travel Offer'
                });
                console.log('Modal function called with:', {
                  adImage: bannerUrl,
                  adLink: bannerLink,
                  adTitle: bannerTitle || 'Space Travel Offer'
                });
              } else {
                console.error('onShowModal is not a function:', onShowModal);
                // Only as absolute fallback
                window.open(bannerLink, '_blank');
              }
              
              return false;
            }}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 20, 60, 0.8)',
              backdropFilter: 'blur(5px)',
              borderRadius: '10px',
              padding: '10px 15px',
              boxShadow: '0 0 20px rgba(80, 150, 255, 0.7)',
              border: '1px solid rgba(100, 170, 255, 0.6)',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              textAlign: 'center',
            }}
          >
           <div style={{
  position: 'relative',
  width: '100%',
  padding: '15px', // Added padding around all content
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 20, 60, 0.8)', // Added/emphasized the background
  backdropFilter: 'blur(5px)',
  borderRadius: '10px',
  boxShadow: '0 0 20px rgba(80, 150, 255, 0.7)',
  border: '1px solid rgba(100, 170, 255, 0.6)',
  minHeight: '280px', // Minimum height for the container
}}>
  {/* Image with increased size */}
  <img 
    src="/ads/ad4.png"
    alt="Beatclub Offer" 
    style={{
      width: '100%', // Full width
      minHeight: '160px', // Taller minimum height
      maxHeight: '180px', // Increased maximum height
      objectFit: 'contain',
      borderRadius: '8px',
      marginBottom: '12px' // More space below image
    }}
  />
  
  {/* Updated primary text with larger font */}
  <div style={{
    fontSize: '18px', // Larger font size
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: '1.3',
    marginBottom: '8px', // More space below
    textShadow: '0 1px 1px rgba(0,0,0,0.6)',
    padding: '0 10px' // Add some horizontal padding
  }}>
    Level up your creativity with Beatclub!
  </div>
  
  {/* Updated secondary text */}
  <div style={{ 
    fontSize: '15px', // Slightly larger
    maxWidth: '300px', // Wider text container
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: '14px' // More space below
  }}>
    An all-in-one solution for music creators.
  </div>
  
  {/* Call to action button - larger and more prominent */}
  <div style={{ 
    marginTop: '8px', 
    padding: '8px 20px', // Larger padding for a bigger button
    background: 'rgba(30, 80, 200, 0.8)', 
    borderRadius: '6px',
    fontSize: '16px', // Larger font
    fontWeight: 'bold',
    boxShadow: '0 0 15px rgba(50, 120, 255, 0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(100, 170, 255, 0.4)'
  }}>
    Learn More
  </div>
</div>
          </button>
          
          <style jsx>{`
            button {
              animation: pulse 2s infinite ease-in-out;
            }
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          `}</style>
        </Html>
      )}
    </group>
  </group>
);
});

export default AdSpaceship;