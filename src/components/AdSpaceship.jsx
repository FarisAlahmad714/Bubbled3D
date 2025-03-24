import { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { Html } from '@react-three/drei';
import { usePerformance } from './PerformanceOptimizer';

// Cache for shared geometries and materials
const sharedResources = {
  geometries: {},
  materials: {},
  textures: {}
};

const AdSpaceship = forwardRef(function AdSpaceship({ 
  modelPath, 
  bannerUrl, 
  bannerLink = "https://example.com",
  bannerTitle, 
  speedFactor, 
  animationType, 
  positionOffset,
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
  const adBannerRef = useRef();
  const loadedTextures = useRef([]);
  const frameCount = useRef(0); // For frame skipping
  
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
  
  // Memoized path
  const path = useMemo(() => {
    const startPoint = new THREE.Vector3(-40, 0, -30).add(new THREE.Vector3(...positionOffset));
    const endPoint = new THREE.Vector3(40, 0, -30).add(new THREE.Vector3(...positionOffset));
    return new THREE.CatmullRomCurve3([startPoint, endPoint]);
  }, [positionOffset]);

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
  
  // Click handler for the banner ad
  const handleAdClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('SPACESHIP BANNER BUTTON CLICKED!');
    
    // Always use the modal when available
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
  };

  // Handle click on the spaceship
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
    
    // Add lights to the spacecraft (only in medium/high performance)
    if (performanceMode !== 'low') {
      addLights();
    }

    return () => {
      // Cleanup
      loadedTextures.current.forEach(texture => {
        if (texture) texture.dispose();
      });
      
      // Cancel any ongoing loads
      loadingManager.onLoad = () => {};
      loadingManager.onProgress = () => {};
      loadingManager.onError = () => {};
    };
  }, [modelPath, bannerUrl, positionOffset, qualityLevel, performanceMode, 
      useSimpleMaterials, path, isGltf]);

  // Add click handler for the spaceship
  useEffect(() => {
    const clickHandler = (event) => {
      if (hovered) {
        handleClick();
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
                  mat.shininess = 0;
                  mat.metalness = 0.1;
                  mat.roughness = 0.8;
                  mat.needsUpdate = true;
                });
              } else {
                child.material.side = THREE.FrontSide;
                child.material.flatShading = true;
                child.material.shininess = 0;
                child.material.metalness = 0.1;
                child.material.roughness = 0.8;
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
      
      // Make sure the model has proper bounding volume for frustum culling
      gltf.scene.traverse(child => {
        if (child.isMesh && child.geometry) {
          child.geometry.computeBoundingSphere();
          child.frustumCulled = true;
        }
      });
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
        
        // Make sure the model has proper bounding volume for frustum culling
        object.traverse(child => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingSphere();
            child.frustumCulled = true;
          }
        });
        
        if (spaceshipRef.current) {
          spaceshipRef.current.add(object);
        }
      });
    });
  };
  
  // Function to load banner texture
  const loadBanner = (loadingManager) => {
    // Cache texture check
    if (sharedResources.textures[bannerUrl]) {
      console.log('Using cached banner texture:', bannerUrl);
      createBannerWithTexture(sharedResources.textures[bannerUrl]);
      return;
    }
    
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
        
        // Cache the texture for reuse
        sharedResources.textures[bannerUrl] = texture;
        
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
            
            // Cache the fallback texture
            sharedResources.textures[bannerUrl] = fallbackTexture;
            
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
  
  // Function to create banner with already loaded texture
  const createBannerWithTexture = (texture) => {
    const bannerGeometry = new THREE.PlaneGeometry(6, 3);
    const bannerMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    });
    
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    banner.position.set(0, 5, 0); // Positioned above ship
    bannerRef.current = banner;
    
    if (spaceshipRef.current) {
      spaceshipRef.current.add(banner);
    }
  };
  
  // Function to add lights to the spacecraft
  const addLights = () => {
    // Add ambient light with intensity based on performance
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

  // Add smooth banner rotation to the useFrame function with optimizations
  useFrame(({ clock, camera }) => {
    if (!spaceshipRef.current || !pathRef.current) return;

    // Skip detailed updates for very distant spacecraft
    const distanceToCamera = spaceshipRef.current.position.distanceTo(camera.position);
    const isVeryDistant = distanceToCamera > 100;

    // Throttle updates when very distant - more aggressive frame skipping
    if (isVeryDistant) {
      // Skip frames based on performance mode
      const skipFrames = performanceMode === 'low' ? 5 : 
                        performanceMode === 'medium' ? 3 : 2;
      if (frameCount.current++ % skipFrames !== 0) {
        return; // Skip this frame for distant objects
      }
    } else if (performanceMode === 'low' && frameCount.current++ % 2 !== 0) {
      // Skip every other frame in low performance mode even when closer
      return;
    }

    const time = clock.getElapsedTime();
    const cycleTime = 60;
    const flyByDuration = 30;
    const elapsed = clock.getElapsedTime() % cycleTime;

    // Always make the ad visible when spacecraft is in view
    if (!adVisible && elapsed < flyByDuration) {
      setAdVisible(true);
    }

    // Only update banner rotation when not very distant
    if (!isVeryDistant && bannerGroupRef.current && camera) {
      // Calculate the direction from banner to camera
      const bannerPos = new THREE.Vector3();
      bannerGroupRef.current.getWorldPosition(bannerPos);
      
      // Get the camera position on the same Y plane as the banner
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
      // Get path position
      const t = elapsed / flyByDuration;
      const position = pathRef.current.getPointAt(t);
      spaceshipRef.current.position.copy(position);

      // Properly orient the spaceship along path
      const tangent = pathRef.current.getTangentAt(t);
      spaceshipRef.current.lookAt(position.clone().add(tangent));
      spaceshipRef.current.rotateY(Math.PI / 2);

      // Check for hover only when close enough
      if (distanceToCamera < 50) {
        const isHovering = checkIntersection();
        if (isHovering !== hovered) {
          setHovered(isHovering);
        }
      } else if (hovered) {
        // Reset hover state when too far
        setHovered(false);
      }

      // Adjust lighting based on distance (only in higher performance modes)
      if (followLightRef.current && performanceMode !== 'low') {
        const normalizedDistance = Math.min(Math.max(distanceToCamera / 50, 0.5), 1.5);
        followLightRef.current.intensity = 2.5 * normalizedDistance * qualityLevel;
      }
    } else {
      // Move the spaceship offscreen but don't remove it completely
      spaceshipRef.current.position.set(-1000, -1000, -1000);
    }
  });

  useImperativeHandle(ref, () => ({
    getPosition: () => spaceshipRef.current ? spaceshipRef.current.position : new THREE.Vector3(0, 0, -1000),
  }));

  return (
    <group ref={spaceshipRef}>
      {/* Banner group for billboard rotation */}
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
        
        {/* Banner with clickable button - only shown when close enough in lower performance modes */}
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
                color: 'white',
                fontFamily: 'Arial, sans-serif',
                textAlign: 'center',
              }}
            >
              <div style={{
                position: 'relative',
                width: '100%',
                marginBottom: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* Image takes up almost all the space */}
                <img 
                  src="/ads/ad4.png"
                  alt="Beatclub Offer" 
                  style={{
                    width: '95%', // Almost full width
                    minHeight: '100px', // Ensure it has enough height
                    maxHeight: '140px', // Limit maximum height
                    objectFit: 'contain',
                    borderRadius: '6px',
                    marginBottom: '6px'
                  }}
                />
                
                {/* Only show text content in higher performance modes */}
                {performanceMode !== 'low' && (
                  <>
                    {/* Primary text */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      lineHeight: '1.3',
                      marginBottom: '4px',
                      textShadow: '0 1px 1px rgba(0,0,0,0.6)'
                    }}>
                      Level up your creativity with Beatclub!
                    </div>
                    
                    {/* Secondary text - only in high performance mode */}
                    {performanceMode === 'high' && (
                      <div style={{ 
                        fontSize: '14px', 
                        maxWidth: '280px', 
                        textAlign: 'center',
                        opacity: 0.9
                      }}>
                        An all-in-one solution for music creators.
                      </div>
                    )}
                  </>
                )}
                
                {/* Call to action button - simplified in low performance mode */}
                <div style={{ 
                  marginTop: performanceMode === 'low' ? '5px' : '10px', 
                  padding: '5px 15px', 
                  background: 'rgba(30, 80, 200, 0.8)', 
                  borderRadius: '5px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: performanceMode === 'low' ? 'none' : '0 0 10px rgba(50, 120, 255, 0.5)',
                }}>
                  Learn More
                </div>
              </div>
            </button>
            
            {/* Only use animation in higher performance modes */}
            {performanceMode !== 'low' && (
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
            )}
          </Html>
        )}
      </group>
    </group>
  );
});

export default AdSpaceship;