import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback
} from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Howl } from 'howler';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import Sphere from './Sphere';
import Environment from './Environment';
import ParticleField from './ParticleField';
import ParticleInteraction from './ParticleInteraction';
import Lighting from './Lighting';

// Initialize sphere pool outside component for better memory usage
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

// Preload sounds for better performance
const soundCache = {};

const Scene = forwardRef(function Scene(props, ref) {
  // Scene parameters
  const worldRadius = useMemo(() => 12, []);

  // Use refs for state that doesn't need to trigger re-renders
  const activeSpheresRef = useRef([]);
  const [activeSpheres, setActiveSpheres] = useState([]);
  const spherePoolRef = useRef(createSpherePool(props.performanceSettings?.maxSpheres || 30));

  // Camera controls
  const [cameraMode, setCameraMode] = useState('orbit');
  const { camera } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPositionRef = useRef(new THREE.Vector3(0, 2, 5));
  const cameraPanoramaAngle = useRef(0);
  const lastActiveTime = useRef(Date.now());
  const activeSphereRef = useRef(null);

  // Camera parameters
  const cameraParams = useRef({
    speed: 0.02,
    orbitRadius: 5,
    orbitHeight: 2,
    followSpeed: 0.05,
    panoramaSpeed: 0.005,
    panoramaRadius: 8,
    autoSwitchDelay: 30000,
  });

  // Sound data with optimized handling
  const keyData = useMemo(() => ({
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
  }), []);

  // Recording and looping state
  const recordedEvents = useRef([]);
  const recordStart = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const timeoutsAndIntervals = useRef([]);

  // Audio reactivity with smoothing
  const soundIntensity = useRef(0);
  const targetSoundIntensity = useRef(0);
  const intensityDecay = useRef(0.98); // Smoother decay

  // Preload sounds
  useEffect(() => {
    Object.keys(keyData).forEach(key => {
      const data = keyData[key];
      if (!soundCache[key]) {
        soundCache[key] = new Howl({
          src: data.src,
          volume: 0.8,
          preload: true,
          html5: false,
        });
      }
    });

    return () => {
      Object.values(soundCache).forEach(sound => sound.unload());
    };
  }, [keyData]);

  // Main animation loop with optimizations
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const now = Date.now();

    // Smooth sound intensity for better visual transitions
    soundIntensity.current += (targetSoundIntensity.current - soundIntensity.current) * 0.1;
    targetSoundIntensity.current *= intensityDecay.current;
    if (targetSoundIntensity.current < 0.005) targetSoundIntensity.current = 0;

    // Camera movement based on mode
    if (cameraMode === 'orbit') {
      const orbitX = Math.sin(time * cameraParams.current.speed) * cameraParams.current.orbitRadius;
      const orbitZ = Math.cos(time * cameraParams.current.speed) * cameraParams.current.orbitRadius;
      cameraPositionRef.current.set(orbitX, cameraParams.current.orbitHeight, orbitZ);
      camera.position.lerp(cameraPositionRef.current, 0.05);
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'follow' && activeSphereRef.current) {
      cameraTargetRef.current.lerp(activeSphereRef.current, cameraParams.current.followSpeed);
      camera.lookAt(cameraTargetRef.current);
    } else if (cameraMode === 'panorama') {
      cameraPanoramaAngle.current += cameraParams.current.panoramaSpeed;
      const panoramaX = Math.sin(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius;
      const panoramaZ = Math.cos(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius;
      const panoramaY = 2 + Math.sin(time * 0.1) * 1;
      cameraPositionRef.current.set(panoramaX, panoramaY, panoramaZ);
      camera.position.lerp(cameraPositionRef.current, 0.05);
      camera.lookAt(0, 0, 0);
    }

    // Auto camera mode switching with condition for 'follow' mode
    if (now - lastActiveTime.current > cameraParams.current.autoSwitchDelay) {
      const modes = ['orbit', 'panorama'];
      if (activeSpheres.length > 0) modes.push('follow');
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = now;
    }
  });

  // Optimized sphere creation with object pooling
  const createSphereAndPlaySound = useCallback((k) => {
    if (!keyData[k]) return;

    lastActiveTime.current = Date.now();

    const availableSphere = spherePoolRef.current.find(sphere => !sphere.active);
    if (!availableSphere) return; // No spheres available

    // Configure position using spherical coordinates
    const radius = 1.5 + Math.random() * 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const position = [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ];

    // Update sphere properties
    availableSphere.active = true;
    availableSphere.position = position;
    availableSphere.color = keyData[k].color;
    availableSphere.scale = keyData[k].scale || 1.0;
    availableSphere.pulseSpeed = keyData[k].pulseSpeed || 0.5;
    availableSphere.createdAt = Date.now();
    availableSphere.lifetime = keyData[k].lifetime || 8000;
    availableSphere.key = k;

    activeSphereRef.current = new THREE.Vector3(...position);

    // Update active spheres
    setActiveSpheres(spherePoolRef.current.filter(sphere => sphere.active));

    // Play preloaded sound
    const sound = soundCache[k];
    if (sound) {
      sound.volume(0.8 + (soundIntensity.current * 0.2));
      sound.play();
    }

    // Increase target sound intensity
    targetSoundIntensity.current += 0.3;
    if (targetSoundIntensity.current > 1) targetSoundIntensity.current = 1;

    // Record event if recording
    if (isRecording) {
      const now = performance.now();
      recordedEvents.current.push({
        offset: now - recordStart.current,
        key: k
      });
    }
  }, [keyData, isRecording]);

  // Remove sphere from state
  const removeSphereFromState = useCallback((sId) => {
    const sphere = spherePoolRef.current.find(sphere => sphere.id === sId);
    if (sphere) {
      sphere.active = false;
      setActiveSpheres(spherePoolRef.current.filter(sphere => sphere.active));
    }
  }, []);

  // Recording and playback functions
  const startRecording = useCallback(() => {
    recordedEvents.current = [];
    recordStart.current = performance.now();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const playOnce = useCallback(() => {
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
  }, [createSphereAndPlaySound]);

  const startLoop = useCallback(() => {
    if (isLooping) return;
    setIsLooping(true);
    const dur = playOnce();
    if (dur <= 0) return;
    const intervalId = setInterval(() => {
      playOnce();
    }, dur);
    timeoutsAndIntervals.current.push(intervalId);
  }, [isLooping, playOnce]);

  const stopLoop = useCallback(() => {
    setIsLooping(false);
    timeoutsAndIntervals.current.forEach(id => {
      clearTimeout(id);
      clearInterval(id);
    });
    timeoutsAndIntervals.current = [];
  }, []);

  const deleteLoop = useCallback(() => {
    stopLoop();
    recordedEvents.current = [];
  }, [stopLoop]);

  // Toggle camera mode
  const toggleCameraMode = useCallback(() => {
    const modes = ['orbit', 'follow', 'panorama'];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCameraMode(modes[nextIndex]);
    lastActiveTime.current = Date.now();
  }, [cameraMode]);

  // Set camera speed
  const setCameraSpeed = useCallback((speed) => {
    cameraParams.current.speed = speed;
    cameraParams.current.panoramaSpeed = speed / 4;
  }, []);

  // Event listeners and cleanup
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (keyData[k]) {
        createSphereAndPlaySound(k);
        if (props.onKeyPress) props.onKeyPress(k);
      }
      if (e.key === 'c') toggleCameraMode();
    };

    window.addEventListener('keydown', handleKeyDown);

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let needsUpdate = false;

      spherePoolRef.current.forEach(sphere => {
        if (sphere.active && (now - sphere.createdAt) >= sphere.lifetime) {
          sphere.active = false;
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        setActiveSpheres(spherePoolRef.current.filter(sphere => sphere.active));
      }
    }, 500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(cleanupInterval);
    };
  }, [createSphereAndPlaySound, keyData, toggleCameraMode, props.onKeyPress]);

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
    getSoundIntensity: () => soundIntensity.current,
    getCurrentCameraMode: () => cameraMode
  }));

  // Render the scene
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
        radius={18}
        depth={8}
        count={props.performanceSettings?.starCount || 3000}
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