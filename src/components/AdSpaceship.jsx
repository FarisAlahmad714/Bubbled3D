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

// Create the Blue Planet with craters
const createBluePlanet = () => {
  // Create the base sphere for the planet
  const planetGeometry = new THREE.SphereGeometry(15, 32, 32);
  const planetMaterial = new THREE.MeshPhongMaterial({
    color: 0x1a56e8, // Blue color
    emissive: 0x112244,
    specular: 0x2233aa,
    shininess: 30,
    flatShading: false
  });
  
  const planet = new THREE.Mesh(planetGeometry, planetMaterial);
  
  // Add atmosphere glow
  const atmosphereGeometry = new THREE.SphereGeometry(16, 32, 32);
  const atmosphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x4499ff,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  });
  
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  planet.add(atmosphere);
  
  // Add craters
  const addCrater = (x, y, z, size) => {
    const craterGeometry = new THREE.CircleGeometry(size, 20);
    const craterMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a3366,
      emissive: 0x0a1a33,
      side: THREE.DoubleSide
    });
    
    const crater = new THREE.Mesh(craterGeometry, craterMaterial);
    
    // Position the crater on the surface of the sphere
    const distance = 15.1; // Slightly above surface
    crater.position.set(x, y, z).normalize().multiplyScalar(distance);
    
    // Make the crater face outward
    crater.lookAt(0, 0, 0);
    crater.rotateX(Math.PI);
    
    planet.add(crater);
  };
  
  // Add multiple craters of different sizes
  for (let i = 0; i < 15; i++) {
    const phi = Math.acos((Math.random() * 2) - 1);
    const theta = Math.random() * Math.PI * 2;
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);
    const size = 0.5 + Math.random() * 2.5;
    
    addCrater(x, y, z, size);
  }
  
  // Position the planet
  planet.position.set(0, 10, -100); // Keep at a distance
  planet.name = "blue_planet"; // Specific name to avoid conflicts
  
  return planet;
};

const AdSpaceship = forwardRef(function AdSpaceship({ 
  modelPath, 
  bannerUrl, 
  bannerLink = "https://example.com",
  speedFactor, 
  animationType, 
  positionOffset,
  thrusterPositions: customThrusterPositions,
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
  const bluePlanetRef = useRef();
  
  // Interaction states
  const [hovered, setHovered] = useState(false);
  const [adVisible, setAdVisible] = useState(true); // Set to true by default
  const [bannerScale, setBannerScale] = useState(1);
  const [bannerRotation, setBannerRotation] = useState([0, 0, 0]);
  const [enginePower, setEnginePower] = useState(1);
  
  // Banner position stability
  const [stableBannerPosition, setStableBannerPosition] = useState([0, 5, 0]);
  
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

  // Add blue planet to the scene
  useEffect(() => {
    if (scene) {
      // Check if we already have a blue planet
      const existingPlanet = scene.getObjectByName("blue_planet");
      if (!existingPlanet) {
        const planet = createBluePlanet();
        scene.add(planet);
        bluePlanetRef.current = planet;
        console.log("Blue planet added to scene");
      }
    }
    
    // Cleanup when component unmounts
    return () => {
      if (bluePlanetRef.current && scene) {
        scene.remove(bluePlanetRef.current);
      }
    };
  }, [scene]);

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
  
  // Click handler for the banner ad
  const handleAdClick = (e) => {
    e.stopPropagation();
    // Open the link in a new tab
    window.open(bannerLink, '_blank');
    console.log('Ad clicked:', bannerLink);
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

  // Update the blue planet rotation
  useFrame(({ clock }) => {
    if (bluePlanetRef.current) {
      bluePlanetRef.current.rotation.y += 0.0005;
    }
  });

  // MODIFIED: Updated useFrame to fix ad visibility issues
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

      // REMOVED the banner position updating code entirely
      // We no longer need to update the banner position separately
      // since it's now a direct child of the spacecraft group and will move with it
      
      // We still update the engine effects


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

  // COMPLETELY REWORKED RETURN SECTION:
  // Instead of using Html component as a sibling, we'll create a more rigid structure
  return (
    <group ref={spaceshipRef}>
      {/* This is a fixed position banner directly attached to the spacecraft */}
      <group position={[0, 8, 0]}>
        {adVisible && (
          <Html
            ref={htmlBannerRef}
            // Use a fixed local position relative to this group
            position={[0, 0, 0]}
            // Force the banner to always face the camera
            rotation={[0, Math.PI, 0]} 
            // This makes the HTML element stay exactly in the 3D position without trying to be clever
            prepend
            // Disable any transform adjustments - we want precise control
            transform
            // Important - this guarantees it moves exactly with the parent
            center
            // Keep distanceFactor smaller for tighter coupling
            distanceFactor={7}
            // Prevent any UI scaling behavior for stability
            zIndexRange={[100, 10000]}
            // Higher spring value to be more responsive
            sprite={false}
            style={{
              width: '300px',
              height: '150px',
              color: 'white',
              display: 'flex',
              padding: 0,
              margin: 0,
              pointerEvents: 'auto',
              userSelect: 'none',
              // No transitions that could cause visual lag
              transition: 'none',
            }}
            pointerEvents="auto"
          >
            <div 
              onClick={handleAdClick}
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
                animation: 'pulse 2s infinite ease-in-out',
                // Remove transform that could conflict with the rotation
                // and use direct parent rotation instead
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                Check Out Our Offer!
              </div>
              <div style={{ fontSize: '14px', maxWidth: '280px', textAlign: 'center' }}>
                Click for exclusive deals on space travel
              </div>
              <div style={{ 
                marginTop: '10px', 
                padding: '5px 15px', 
                background: 'rgba(30, 80, 200, 0.8)', 
                borderRadius: '5px',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 0 10px rgba(50, 120, 255, 0.5)',
              }}>
                Learn More
              </div>
            </div>
            <style>{`
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