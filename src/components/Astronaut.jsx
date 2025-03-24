// Astronaut.jsx - Performance-optimized with orb focus (Fixed Version)
import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { usePerformance } from './PerformanceOptimizer'; // Adjust path as needed

const Astronaut = forwardRef(({
  modelPath = '/models/astro.glb',
  orbitRadius = 10,   // Distance from center to float
  orbitHeight = 2,    // Height off the "ground"
  floatSpeed = 0.05,  // Dramatically reduced for space-like movement
  scale = 1.5,        // Size of the astronaut
  visualMode = 'default',
  driftFactor = 0.03, // How much the astronaut drifts from perfect orbit
  rotationFactor = 0.002, // How fast the astronaut rotates (very slow)
}, ref) => {
  const { camera, scene } = useThree();
  const groupRef = useRef();
  const modelRef = useRef();
  const headPositionRef = useRef(new THREE.Vector3(0, 1.1 * scale, 0)); // Approximate head position
  const lookDirectionRef = useRef(new THREE.Vector3(0, 0, -1)); // Forward direction
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  
  // IMPORTANT: Get performance settings at component level (not inside useFrame)
  // This fixes the "Invalid hook call" error
  const performance = usePerformance();
  
  // Animation parameters with much slower values
  const animationRef = useRef({
    time: Math.random() * 1000, // Random starting time for variety
    verticalOffset: 0,
    rotationSpeed: rotationFactor,
    bobSpeed: 0.2,      // Slower bobbing
    bobHeight: 0.3,     // Subtle height variation
    driftPhase: Math.random() * Math.PI * 2, // Random drift phase
    driftAmplitude: orbitRadius * driftFactor, // Subtle drift from perfect circle
    lastUpdateTime: 0
  });
  
  // Expose methods and properties for camera control
  useImperativeHandle(ref, () => ({
    // Get position for third-person view (behind astronaut's head)
    getThirdPersonPosition: (distance = 2) => {
      if (!groupRef.current) return new THREE.Vector3(0, 5, 10);
      
      // Get current world position and rotation
      const position = new THREE.Vector3();
      groupRef.current.getWorldPosition(position);
      
      // Calculate head position in world space
      const headPosition = headPositionRef.current.clone();
      headPosition.applyMatrix4(groupRef.current.matrixWorld);
      
      // Get current looking direction (normalized)
      const direction = lookDirectionRef.current.clone();
      direction.applyQuaternion(groupRef.current.quaternion);
      direction.normalize();
      
      // Position camera behind head at specified distance
      const cameraPos = headPosition.clone();
      cameraPos.sub(direction.multiplyScalar(distance));
      
      // Lift camera up slightly for better view
      cameraPos.y += 0.1 * scale;
      
      return cameraPos;
    },
    
    // Get position for first-person view (from astronaut's eyes)
    getFirstPersonPosition: () => {
      if (!groupRef.current) return new THREE.Vector3(0, 5, 10);
      
      // Calculate head position in world space
      const headPosition = headPositionRef.current.clone();
      headPosition.applyMatrix4(groupRef.current.matrixWorld);
      
      // Adjust for eye level
      headPosition.y -= 0.1 * scale; // Slightly below head center for eye level
      
      return headPosition;
    },
    
    // Get the direction the astronaut is looking
    getLookDirection: () => {
      if (!groupRef.current) return new THREE.Vector3(0, 0, -1);
      
      const direction = lookDirectionRef.current.clone();
      direction.applyQuaternion(groupRef.current.quaternion);
      direction.normalize();
      
      return direction;
    },
    
    // Get quaternion for camera orientation
    getViewQuaternion: () => {
      if (!groupRef.current) return new THREE.Quaternion();
      return groupRef.current.quaternion.clone();
    },
    
    // Get world position
    getWorldPosition: () => {
      const position = new THREE.Vector3();
      if (groupRef.current) {
        groupRef.current.getWorldPosition(position);
      }
      return position;
    },
    
    // Direct access to the group reference
    getGroupRef: () => groupRef.current
  }));
  
  // Load the astronaut model
  useEffect(() => {
    console.log('Astronaut: Loading model from', modelPath);
    
    // Create a simple fallback figure first
    createFallbackAstronaut();
    
    // Try to load the actual model
    const loader = new GLTFLoader();
    
    loader.load(
      modelPath,
      (gltf) => {
        console.log('Astronaut: Model loaded successfully!', gltf);
        setModelLoaded(true);
        
        if (groupRef.current) {
          // Remove fallback
          if (groupRef.current.children.length > 0) {
            const fallback = groupRef.current.getObjectByName('fallback-astronaut');
            if (fallback) groupRef.current.remove(fallback);
          }
          
          // Add and configure the model
          const model = gltf.scene;
          model.scale.set(scale, scale, scale);
          model.name = 'astronaut-model';
          
          // Find the astronaut's head for camera placement
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              // Make materials emissive to ensure visibility
              child.material.emissive = new THREE.Color(getEmissiveColor());
              child.material.emissiveIntensity = 0.3;
              
              // Add environment reflection
              child.material.envMapIntensity = 1.5;
              
              child.material.needsUpdate = true;
              console.log('Astronaut: Enhanced material for', child.name);
              
              // Try to identify the head by name or position
              if (child.name.toLowerCase().includes('head') || 
                  child.name.toLowerCase().includes('helmet')) {
                // Store head position for camera reference
                const headCenter = new THREE.Vector3();
                child.geometry.computeBoundingBox();
                child.geometry.boundingBox.getCenter(headCenter);
                
                // Transform to model space
                headCenter.applyMatrix4(child.matrixWorld);
                headCenter.applyMatrix4(model.matrix.clone().invert());
                
                headPositionRef.current = headCenter;
                console.log('Astronaut: Found head at', headCenter);
              }
            }
          });
          
          // Add model to scene
          groupRef.current.add(model);
          modelRef.current = model;
          
          // Log success
          console.log('Astronaut: Model added to scene');
        }
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Astronaut: Loading progress: ${Math.round(percent)}%`);
        }
      },
      (error) => {
        console.error('Astronaut: Error loading model:', error);
        setLoadError(error.message || 'Unknown error');
        // Fallback is already created
      }
    );
    
    return () => {
      console.log('Astronaut: Cleaning up');
    };
  }, [modelPath, scale, visualMode]);
  
  // Create a fallback astronaut figure if model loading fails
  const createFallbackAstronaut = () => {
    if (!groupRef.current) return;
    
    // Create a simple astronaut shape
    const body = new THREE.Group();
    body.name = 'fallback-astronaut';
    
    // Head (helmet)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: getEmissiveColor(),
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
      shininess: 90
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.1;
    body.add(head);
    
    // Update head position for camera
    headPositionRef.current = new THREE.Vector3(0, 1.1 * scale, 0);
    
    // Visor
    const visorGeometry = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const visorMaterial = new THREE.MeshPhongMaterial({
      color: 0x3377ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8,
      shininess: 100,
      side: THREE.DoubleSide
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.rotation.x = Math.PI * 0.2;
    visor.position.set(0, 1.1, 0.2);
    body.add(visor);
    
    // Body (torso)
    const torsoGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8);
    const torsoMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: getEmissiveColor(),
      emissiveIntensity: 0.3
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.3;
    body.add(torso);
    
    // Arms
    const createArm = (side) => {
      const armGroup = new THREE.Group();
      
      // Upper arm
      const upperArmGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
      const upperArm = new THREE.Mesh(upperArmGeometry, torsoMaterial);
      upperArm.position.y = -0.3;
      
      // Set the arm's position and rotation based on side
      armGroup.position.set(side * 0.5, 0.5, 0);
      armGroup.rotation.z = side * Math.PI * 0.15;
      
      // Lower arm
      const lowerArmGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8);
      const lowerArm = new THREE.Mesh(lowerArmGeometry, torsoMaterial);
      lowerArm.position.y = -0.6;
      
      // Hand
      const handGeometry = new THREE.SphereGeometry(0.12, 8, 8);
      const hand = new THREE.Mesh(handGeometry, torsoMaterial);
      hand.position.y = -0.9;
      
      armGroup.add(upperArm);
      armGroup.add(lowerArm);
      armGroup.add(hand);
      
      return armGroup;
    };
    
    // Left and right arms
    body.add(createArm(-1)); // Left arm
    body.add(createArm(1));  // Right arm
    
    // Legs
    const createLeg = (side) => {
      const legGroup = new THREE.Group();
      
      // Upper leg
      const upperLegGeometry = new THREE.CylinderGeometry(0.18, 0.15, 0.7, 8);
      const upperLeg = new THREE.Mesh(upperLegGeometry, torsoMaterial);
      upperLeg.position.y = -0.35;
      
      // Set the leg's position and rotation
      legGroup.position.set(side * 0.2, -0.4, 0);
      
      // Lower leg
      const lowerLegGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.7, 8);
      const lowerLeg = new THREE.Mesh(lowerLegGeometry, torsoMaterial);
      lowerLeg.position.y = -0.7;
      
      // Boot
      const bootGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.4);
      const boot = new THREE.Mesh(bootGeometry, torsoMaterial);
      boot.position.set(0, -1.05, 0.1);
      
      legGroup.add(upperLeg);
      legGroup.add(lowerLeg);
      legGroup.add(boot);
      
      return legGroup;
    };
    
    // Left and right legs
    body.add(createLeg(-1)); // Left leg
    body.add(createLeg(1));  // Right leg
    
    // Backpack
    const backpackGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.3);
    const backpack = new THREE.Mesh(backpackGeometry, torsoMaterial);
    backpack.position.set(0, 0.3, -0.4);
    body.add(backpack);
    
    // Add a light to make the astronaut more visible
    const light = new THREE.PointLight(getAccentColor(), 1, 10);
    light.position.set(0, 1, 2);
    body.add(light);
    
    // Scale the astronaut
    body.scale.set(scale, scale, scale);
    
    // Add astronaut to the group
    groupRef.current.add(body);
    modelRef.current = body;
    console.log('Astronaut: Created fallback figure');
  };
  
  // Get base color based on visual mode
  const getBaseColor = () => {
    switch (visualMode) {
      case 'neon':
        return new THREE.Color(0xff00ff);
      case 'dream':
        return new THREE.Color(0x8888ff);
      case 'monochrome':
        return new THREE.Color(0xcccccc);
      default:
        return new THREE.Color(0xffffff);
    }
  };
  
  // Get emissive color based on visual mode
  const getEmissiveColor = () => {
    switch (visualMode) {
      case 'neon':
        return new THREE.Color(0x880088);
      case 'dream':
        return new THREE.Color(0x4444aa);
      case 'monochrome':
        return new THREE.Color(0x333333);
      default:
        return new THREE.Color(0x112244);
    }
  };
  
  // Get accent color based on visual mode
  const getAccentColor = () => {
    switch (visualMode) {
      case 'neon':
        return 0xff00ff;
      case 'dream':
        return 0x8888ff;
      case 'monochrome':
        return 0xaaaaaa;
      default:
        return 0x4488ff;
    }
  };
  
  // Fixed animation with performance scaling - no hooks inside useFrame!
  useFrame((state) => {
    if (!groupRef.current) return;  // Early return to avoid unnecessary calculations
    
    // Access performance settings from the component level variable
    const performanceMode = performance?.performanceMode || 'medium';
    const qualityLevel = performance?.qualityLevel || 0.8;
    
    // For low-end devices, we'll update position less frequently
    // Using timestamp comparison instead of modulo for smoother results
    const now = state.clock.elapsedTime;
    const updateFrequency = performanceMode === 'low' ? 0.05 : 0.01; // Seconds between updates
    
    if (now - animationRef.current.lastUpdateTime < updateFrequency && performanceMode === 'low') {
      return; // Skip this frame for low performance mode
    }
    
    // Store last update time
    animationRef.current.lastUpdateTime = now;
    
    // Scale animation speed based on quality level
    const timeIncrement = state.clock.elapsedTime * 0.0009 * floatSpeed * 
                         (performanceMode === 'high' ? 1 : 0.8);
    animationRef.current.time += timeIncrement;
    const t = animationRef.current.time;
    
    // Calculate orbit position - scale complexity based on performance
    let x, y, z;
    
    if (performanceMode === 'low') {
      // Simpler calculation for low performance mode
      x = Math.sin(t) * orbitRadius;
      z = Math.cos(t) * orbitRadius;
      y = orbitHeight;
    } else {
      // More complex calculation with drift for medium/high
      const driftScale = qualityLevel * 0.7; // Scale drift based on quality
      const driftX = Math.sin(t * 0.2 + animationRef.current.driftPhase) * 
                    animationRef.current.driftAmplitude * driftScale;
      const driftZ = Math.cos(t * 0.3 + animationRef.current.driftPhase) * 
                    animationRef.current.driftAmplitude * driftScale;
      
      x = Math.sin(t) * orbitRadius + driftX;
      z = Math.cos(t) * orbitRadius + driftZ;
      y = orbitHeight + Math.sin(t * animationRef.current.bobSpeed) * 
         animationRef.current.bobHeight * driftScale;
    }
    
    // Use direct position updates for low performance, smoother lerp for high
    if (performanceMode === 'low') {
      groupRef.current.position.set(x, y, z);
    } else {
      // Adapt lerp factor based on performance - smoother on high-end
      const lerpFactor = performanceMode === 'high' ? 0.02 : 0.04;
      groupRef.current.position.lerp(new THREE.Vector3(x, y, z), lerpFactor);
    }
    
    // MOST IMPORTANT PART: Make astronaut face the orb
    // This is the critical part to fix the "astronaut not turned and focus on the orb" issue
    const dx = -x; // Vector from astronaut to center (x component)
    const dz = -z; // Vector from astronaut to center (z component)
    const angle = Math.atan2(dx, dz);
    groupRef.current.rotation.y = angle + Math.PI;
    
    // Only apply model animation if quality level allows it
    if (modelRef.current && qualityLevel > 0.5) {
      // Scale animation amount based on quality level
      const animScale = qualityLevel * 0.5;
      modelRef.current.rotation.x = Math.sin(t * 0.04) * 0.01 * animScale;
      modelRef.current.rotation.y = Math.sin(t * 0.03) * 0.01 * animScale;
      modelRef.current.rotation.z = Math.sin(t * 0.02) * 0.005 * animScale;
    } else if (modelRef.current) {
      // Reset rotations on low quality to avoid calculation
      modelRef.current.rotation.set(0, 0, 0);
    }
    
    // Update look direction reference to match our rotation
    lookDirectionRef.current.set(0, 0, -1);
  });
  
  return (
    <group ref={groupRef}>
      {/* Model or fallback will be added here */}
      
      {/* Add a light that follows the astronaut */}
      <pointLight 
        color={getAccentColor()} 
        intensity={1} 
        distance={10}
      />
      
      {/* Add a very subtle contrail/space dust effect */}
      <mesh position={[0, 0, 0]} visible={true}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial 
          color={visualMode === 'monochrome' ? 0xaaaaaa : 0x88aaff} 
          transparent={true}
          opacity={0.3}
        />
      </mesh>
    </group>
  );
});

export default Astronaut;