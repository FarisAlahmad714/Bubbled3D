// FILE: src/components/Scene.jsx
import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo
} from 'react'
import { OrbitControls, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Howl } from 'howler'
import { v4 as uuidv4 } from 'uuid'
import * as THREE from 'three'
import Sphere from './Sphere'
import Environment from './Environment'
import ParticleField from './ParticleField'
import ParticleInteraction from './ParticleInteraction'
import Lighting from './Lighting'

// Initialize sphere pool for object reuse
const createSpherePool = (size) => {
  return Array(size).fill().map(() => ({
    id: uuidv4(),
    active: false,
    position: [0, 0, 0],
    color: '#ffffff',
    scale: 1.0,
    pulseSpeed: 0.5,
    createdAt: 0,
    lifetime: 8000,
    key: ''
  }));
};

const Scene = forwardRef(function Scene(props, ref) {
  // Environment parameters - smaller and more contained
  const worldRadius = useMemo(() => 12, []); // Reduced from original larger values
  
  // Performance-related states
  const [frameSkip, setFrameSkip] = useState(0);
  const frameCount = useRef(0);
  
  // Sphere management
  const [activeSpheres, setActiveSpheres] = useState([]);
  const spherePool = useRef(createSpherePool(props.performanceSettings?.maxSpheres || 30));
  
  const [cameraMode, setCameraMode] = useState('orbit');
  const { camera } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPositionRef = useRef(new THREE.Vector3(0, 2, 5));
  const cameraPanoramaAngle = useRef(0);
  const lastActiveTime = useRef(Date.now());
  const activeSphereRef = useRef(null);
  
  const cameraParams = useRef({
    speed: 0.02,
    orbitRadius: 5,
    orbitHeight: 2,
    followSpeed: 0.05,
    panoramaSpeed: 0.005,
    panoramaRadius: 8,
    autoSwitchDelay: 30000,
  });

  // Sound and visual data
  const keyData = {
    '1': { color: '#d0f0c0', src: ['/Sounds/confetti.mp3'], scale: 1.0, lifetime: 8000, pulseSpeed: 0.5 },
    '2': { color: '#e6e6fa', src: ['/Sounds/clay.mp3'], scale: 1.2, lifetime: 7000, pulseSpeed: 0.8 },
    '3': { color: '#00ffff', src: ['/Sounds/corona.mp3'], scale: 0.8, lifetime: 10000, pulseSpeed: 0.3 },
    '4': { color: '#d8bfd8', src: ['/Sounds/dotted-spiral.mp3'], scale: 1.5, lifetime: 9000, pulseSpeed: 0.6 },
    '5': { color: '#ba99dd', src: ['/Sounds/glimmer.mp3'], scale: 1.1, lifetime: 6000, pulseSpeed: 1.0 },
    '6': { color: '#EF5350', src: ['/Sounds/moon.mp3'], scale: 0.9, lifetime: 8500, pulseSpeed: 0.7 },
    'q': { color: '#FF5733', src: ['/Sounds/flash-1.mp3'], scale: 1.3, lifetime: 7500, pulseSpeed: 0.9 },
    'w': { color: '#FF8333', src: ['/Sounds/pinwheel.mp3'], scale: 1.0, lifetime: 9000, pulseSpeed: 0.4 },
    'e': { color: '#FFAE33', src: ['/Sounds/piston-1.mp3'], scale: 1.4, lifetime: 8000, pulseSpeed: 0.6 },
    'r': { color: '#8844EE', src: ['/Sounds/piston-2.mp3'], scale: 1.2, lifetime: 7000, pulseSpeed: 0.5 },
    't': { color: '#44AAFF', src: ['/Sounds/piston-3.mp3'], scale: 0.9, lifetime: 9500, pulseSpeed: 0.7 },
    'a': { color: '#66DD88', src: ['/Sounds/prism-1.mp3'], scale: 1.1, lifetime: 8200, pulseSpeed: 0.8 },
    's': { color: '#FFDD44', src: ['/Sounds/prism-2.mp3'], scale: 1.0, lifetime: 7800, pulseSpeed: 0.6 },
    'd': { color: '#FF44AA', src: ['/Sounds/prism-3.mp3'], scale: 1.3, lifetime: 8800, pulseSpeed: 0.4 },
    'f': { color: '#22CCBB', src: ['/Sounds/splits.mp3'], scale: 1.2, lifetime: 7600, pulseSpeed: 0.9 },
  };

  const recordedEvents = useRef([]);
  const recordStart = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const timeoutsAndIntervals = useRef([]);
  
  // Audio reactivity
  const soundIntensity = useRef(0);
  const peakIntensity = useRef(0);
  const intensityDecay = useRef(0.95);

  // Set frame skip based on performance settings
  useEffect(() => {
    if (props.performanceSettings) {
      if (props.performanceSettings.particleCount > 4000) {
        setFrameSkip(2); // Skip 2 frames (render every 3rd frame)
      } else if (props.performanceSettings.particleCount > 2000) {
        setFrameSkip(1); // Skip 1 frame (render every 2nd frame)
      } else {
        setFrameSkip(0); // Render every frame
      }
    }
  }, [props.performanceSettings]);

  // Main animation loop
  useFrame(({ clock }) => {
    // Frame skipping for performance
    frameCount.current++;
    if (frameSkip > 0 && frameCount.current % (frameSkip + 1) !== 0) {
      return;
    }
    
    const time = clock.getElapsedTime();
    const now = Date.now();
    
    // Auto camera mode switching
    if (now - lastActiveTime.current > cameraParams.current.autoSwitchDelay) {
      const modes = ['orbit', 'panorama', 'follow'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = now;
    }
    
    // Sound intensity decay
    soundIntensity.current *= intensityDecay.current;
    if (soundIntensity.current < 0.01) soundIntensity.current = 0;
    
    // Camera movement based on mode
    if (cameraMode === 'orbit') {
      const orbitX = Math.sin(time * cameraParams.current.speed) * cameraParams.current.orbitRadius;
      const orbitZ = Math.cos(time * cameraParams.current.speed) * cameraParams.current.orbitRadius;
      cameraPositionRef.current.set(orbitX, cameraParams.current.orbitHeight, orbitZ);
      camera.position.lerp(cameraPositionRef.current, 0.01);
      camera.lookAt(0, 0, 0);
    } 
    else if (cameraMode === 'follow' && activeSphereRef.current) {
      cameraTargetRef.current.lerp(activeSphereRef.current, cameraParams.current.followSpeed);
      camera.lookAt(cameraTargetRef.current);
    }
    else if (cameraMode === 'panorama') {
      cameraPanoramaAngle.current += cameraParams.current.panoramaSpeed;
      const panoramaX = Math.sin(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius;
      const panoramaZ = Math.cos(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius;
      const panoramaY = 2 + Math.sin(time * 0.1) * 1;
      cameraPositionRef.current.set(panoramaX, panoramaY, panoramaZ);
      camera.position.lerp(cameraPositionRef.current, 0.01);
      camera.lookAt(0, 0, 0);
    }
  });

  // Optimized sphere creation with object pooling
  function createSphereAndPlaySound(k) {
    if (!keyData[k]) return;
    
    lastActiveTime.current = Date.now();
    
    // Find an inactive sphere in the pool
    const availableSphere = spherePool.current.find(sphere => !sphere.active);
    if (!availableSphere) return; // No spheres available
    
    // Configure position - keeping spheres within smaller radius
    const radius = 1.5 + Math.random() * 1.5; // Even smaller spawn radius (1.5-3)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    const position = [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + (Math.random() - 0.5) * 0.8, // Less Y variation
      radius * Math.sin(phi) * Math.sin(theta)
    ];
    
    // Update the sphere from the pool
    availableSphere.active = true;
    availableSphere.position = position;
    availableSphere.color = keyData[k].color;
    availableSphere.scale = keyData[k].scale || 1.0;
    availableSphere.pulseSpeed = keyData[k].pulseSpeed || 0.5;
    availableSphere.createdAt = Date.now();
    availableSphere.lifetime = keyData[k].lifetime || 8000;
    availableSphere.key = k;
    
    activeSphereRef.current = new THREE.Vector3(...position);
    
    setActiveSpheres(prev => {
      // Create a new array with active spheres + this one
      return spherePool.current.filter(sphere => sphere.active);
    });

    // Play sound with optimized settings
    const sound = new Howl({ 
      src: keyData[k].src,
      volume: 0.8 + (soundIntensity.current * 0.2),
      // Preload and cache optimization
      preload: true,
      html5: false, // Use Web Audio API for better performance
    });
    sound.play();
    
    // Update sound intensity
    soundIntensity.current += 0.3;
    if (soundIntensity.current > 1) soundIntensity.current = 1;
    peakIntensity.current = Math.max(peakIntensity.current, soundIntensity.current);
  }

  // Handle keydown events
  function handleKeyDown(e) {
    const k = e.key.toLowerCase();
    if (keyData[k]) {
      createSphereAndPlaySound(k);
      if (props.onKeyPress) {
        props.onKeyPress(k);
      }
      if (isRecording) {
        const now = performance.now();
        recordedEvents.current.push({
          offset: now - recordStart.current,
          key: k
        });
      }
    }
    
    if (e.key === 'c') {
      const modes = ['orbit', 'follow', 'panorama'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = Date.now();
    }
  }

  // Set up event listeners and cleanup interval
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    // Optimized cleanup interval - only runs when needed
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let needsUpdate = false;
      
      // Mark expired spheres as inactive
      spherePool.current.forEach(sphere => {
        if (sphere.active && (now - sphere.createdAt) >= sphere.lifetime) {
          sphere.active = false;
          needsUpdate = true;
        }
      });
      
      // Only update state if needed
      if (needsUpdate) {
        setActiveSpheres(spherePool.current.filter(sphere => sphere.active));
      }
    }, 500); // Less frequent checks (500ms instead of every 1000ms)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(cleanupInterval);
    };
  }, [isRecording, cameraMode, props.performanceSettings]);

  // Recording and playback functions
  function startRecording() {
    recordedEvents.current = [];
    recordStart.current = performance.now();
    setIsRecording(true);
  }
  
  function stopRecording() {
    setIsRecording(false);
  }

  function playOnce() {
    const evs = recordedEvents.current;
    if (!evs.length) return 0;
    const totalDuration = evs[evs.length - 1].offset;
    evs.forEach(ev => {
      const tId = setTimeout(() => {
        createSphereAndPlaySound(ev.key);
      }, ev.offset);
      timeoutsAndIntervals.current.push(tId);
    });
    return totalDuration;
  }

  function startLoop() {
    if (isLooping) return;
    setIsLooping(true);
    const dur = playOnce();
    if (dur <= 0) return;
    const intervalId = setInterval(() => {
      playOnce();
    }, dur);
    timeoutsAndIntervals.current.push(intervalId);
  }
  
  function stopLoop() {
    setIsLooping(false);
    timeoutsAndIntervals.current.forEach(id => {
      clearTimeout(id);
      clearInterval(id);
    });
    timeoutsAndIntervals.current = [];
  }
  
  function deleteLoop() {
    stopLoop();
    recordedEvents.current = [];
  }

  function removeSphereFromState(sId) {
    // Find the sphere in the pool and mark it inactive
    const sphereToRemove = spherePool.current.find(sphere => sphere.id === sId);
    if (sphereToRemove) {
      sphereToRemove.active = false;
      setActiveSpheres(spherePool.current.filter(sphere => sphere.active));
    }
  }

  function toggleCameraMode() {
    const modes = ['orbit', 'follow', 'panorama'];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCameraMode(modes[nextIndex]);
    lastActiveTime.current = Date.now();
  }

  function setCameraSpeed(speed) {
    cameraParams.current.speed = speed;
    cameraParams.current.panoramaSpeed = speed / 4;
  }

  function setPerformanceMode(settings) {
    // Performance settings are handled in props
  }

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    createSphereAndPlaySound,
    startRecording,
    stopRecording,
    startLoop,
    stopLoop,
    deleteLoop,
    toggleCameraMode,
    setCameraSpeed,
    setPerformanceMode,
    getSoundIntensity: () => soundIntensity.current,
    getCurrentCameraMode: () => cameraMode
  }));

  return (
    <>
      <Environment soundIntensity={soundIntensity.current} />
      
      {cameraMode === 'orbit' && (
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          maxDistance={10}
          minDistance={1}
          enableDamping
          dampingFactor={0.05}
        />
      )}
      
      <Lighting soundIntensity={soundIntensity.current} />
      
      <Stars 
        radius={18}  // Even more compact star field
        depth={8}    // Less depth for better performance
        count={props.performanceSettings.starCount || 3000}
        factor={2}
        saturation={0.3}
        fade
        speed={0.2}
      />

      <ParticleField 
        soundIntensity={soundIntensity.current} 
        performanceSettings={props.performanceSettings}
        worldRadius={worldRadius}
      />
      
      <ParticleInteraction 
        spheres={activeSpheres}
        soundIntensity={soundIntensity.current}
        worldRadius={worldRadius}
      />

      {activeSpheres.map(s => (
        <Sphere
          key={s.id}
          sphereId={s.id}
          position={s.position}
          color={s.color}
          scale={s.scale}
          pulseSpeed={s.pulseSpeed}
          removeSphere={removeSphereFromState}
          soundIntensity={soundIntensity.current}
          lifetime={s.lifetime}
          createdAt={s.createdAt}
          worldRadius={worldRadius}
        />
      ))}
    </>
  );
});

export default Scene;