// FILE: src/components/Scene.jsx
import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo
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

const Scene = forwardRef(function Scene(props, ref) {
  const [spheres, setSpheres] = useState([]);
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

  const instrumentColors = {
    '808': '#FF5733',
    'Clap': '#FFFF99',
    'Cymbal': '#66CCCC',
    'FX': '#FF99FF',
    'Hi Hat': '#99CCFF',
    'Kick': '#FF9966',
    'Loops': '#66FF66',
    'Open Hat': '#CC99FF',
    'Perc': '#FFCC66',
    'Snares': '#FF6666'
  };

  const keyData = useMemo(() => {
    const baseKeys = {
      '1': { scale: 1.0, lifetime: 8000, pulseSpeed: 0.5 },
      '2': { scale: 1.2, lifetime: 7000, pulseSpeed: 0.8 },
      '3': { scale: 0.8, lifetime: 10000, pulseSpeed: 0.3 },
      '4': { scale: 1.5, lifetime: 9000, pulseSpeed: 0.6 },
      '5': { scale: 1.1, lifetime: 6000, pulseSpeed: 1.0 },
      '6': { scale: 0.9, lifetime: 8500, pulseSpeed: 0.7 },
      'q': { scale: 1.3, lifetime: 7500, pulseSpeed: 0.9 },
      'w': { scale: 1.0, lifetime: 9000, pulseSpeed: 0.4 },
      'e': { scale: 1.4, lifetime: 8000, pulseSpeed: 0.6 },
      'a': { scale: 1.1, lifetime: 8200, pulseSpeed: 0.8 },
      's': { scale: 1.0, lifetime: 7800, pulseSpeed: 0.6 },
      'd': { scale: 1.3, lifetime: 8800, pulseSpeed: 0.4 },
      'f': { scale: 1.2, lifetime: 7600, pulseSpeed: 0.9 }
    };

    const updatedKeys = {};
    Object.keys(baseKeys).forEach(key => {
      const src = `/sounds/kit/${props.instrumentCategory}/${props.selectedSound}.mp3`;
      updatedKeys[key] = {
        ...baseKeys[key],
        color: instrumentColors[props.instrumentCategory],
        src: [src]
      };
    });
    return updatedKeys;
  }, [props.instrumentCategory, props.selectedSound]);

  const recordedEvents = useRef([]);
  const recordStart = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const timeoutsAndIntervals = useRef([]);
  
  const soundIntensity = useRef(0);
  const peakIntensity = useRef(0);
  const intensityDecay = useRef(0.95);

  const soundCache = useRef({});
  useEffect(() => {
    const preloadSounds = () => {
      Object.keys(keyData).forEach(key => {
        if (!soundCache.current[key]) {
          soundCache.current[key] = new Howl({
            src: keyData[key].src,
            preload: true,
            volume: 0.8,
            onload: () => console.log(`Preloaded: ${keyData[key].src[0]}`),
            onloaderror: (id, err) => console.error(`Preload error: ${keyData[key].src[0]}`, err)
          });
        }
      });
    };
    preloadSounds();
  }, [keyData]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const now = Date.now();
    
    if (now - lastActiveTime.current > cameraParams.current.autoSwitchDelay) {
      const modes = ['orbit', 'panorama', 'follow'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = now;
    }
    
    soundIntensity.current *= intensityDecay.current;
    if (soundIntensity.current < 0.01) soundIntensity.current = 0;
    
    if (cameraMode === 'orbit') {
      const orbitX = Math.sin(time * cameraParams.current.speed) * cameraParams.current.orbitRadius;
      const orbitZ = Math.cos(time * cameraParams.current.speed) * cameraParams.current.orbitRadius;
      cameraPositionRef.current.set(orbitX, cameraParams.current.orbitHeight, orbitZ);
      camera.position.lerp(cameraPositionRef.current, 0.01);
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
      camera.position.lerp(cameraPositionRef.current, 0.01);
      camera.lookAt(0, 0, 0);
    }
  });

  function createSphereAndPlaySound(k) {
    if (!keyData[k] || spheres.length >= props.performanceSettings.maxSpheres) return;
    
    console.log(`Triggering sound for key: ${k}, src: ${keyData[k].src[0]}`);
    
    lastActiveTime.current = Date.now();
    
    const radius = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    const position = [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + (Math.random() - 0.5) * 1,
      radius * Math.sin(phi) * Math.sin(theta)
    ];
    
    const newSphere = {
      position,
      color: keyData[k].color,
      id: uuidv4(),
      scale: keyData[k].scale || 1.0,
      pulseSpeed: keyData[k].pulseSpeed || 0.5,
      createdAt: Date.now(),
      lifetime: keyData[k].lifetime || 8000,
      key: k
    };
    
    activeSphereRef.current = new THREE.Vector3(...position);
    
    setSpheres(prev => {
      const next = [...prev, newSphere];
      if (next.length > props.performanceSettings.maxSpheres) next.shift();
      return next;
    });

    const sound = soundCache.current[k] || new Howl({ 
      src: keyData[k].src,
      volume: 0.8 + (soundIntensity.current * 0.2),
      onload: () => console.log(`Sound loaded: ${keyData[k].src[0]}`),
      onloaderror: (id, error) => console.error(`Load error for ${keyData[k].src[0]}:`, error),
      onplayerror: (id, error) => console.error(`Play error for ${keyData[k].src[0]}:`, error)
    });
    sound.play();
    console.log(`Playing sound: ${keyData[k].src[0]}`);
    
    soundIntensity.current += 0.3;
    if (soundIntensity.current > 1) soundIntensity.current = 1;
    peakIntensity.current = Math.max(peakIntensity.current, soundIntensity.current);
  }

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
          key: k,
          category: props.instrumentCategory,
          sound: props.selectedSound
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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setSpheres(prevSpheres => 
        prevSpheres.filter(sphere => (now - sphere.createdAt) < sphere.lifetime)
      );
    }, 1000);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(cleanupInterval);
    };
  }, [isRecording, cameraMode, props.performanceSettings, props.instrumentCategory, props.selectedSound]);

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
        const keyConfig = keyData[ev.key];
        const soundSrc = `/sounds/kit/${ev.category}/${ev.sound}.mp3`;
        const sound = new Howl({
          src: [soundSrc],
          volume: 0.8 + (soundIntensity.current * 0.2)
        });
        const newSphere = {
          position: [
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
          ],
          color: instrumentColors[ev.category],
          id: uuidv4(),
          scale: keyConfig.scale || 1.0,
          pulseSpeed: keyConfig.pulseSpeed || 0.5,
          createdAt: Date.now(),
          lifetime: keyConfig.lifetime || 8000,
          key: ev.key
        };
        setSpheres(prev => {
          const next = [...prev, newSphere];
          if (next.length > props.performanceSettings.maxSpheres) next.shift();
          return next;
        });
        sound.play();
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
    setSpheres(prev => prev.filter(s => s.id !== sId));
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
    // No-op, handled via props
  }

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
        radius={20}
        depth={10}
        count={props.performanceSettings.starCount}
        factor={2}
        saturation={0.3}
        fade
        speed={0.2}
      />

      <ParticleField 
        soundIntensity={soundIntensity.current} 
        performanceSettings={props.performanceSettings}
      />
      <ParticleInteraction 
        spheres={spheres} 
        soundIntensity={soundIntensity.current}
      />

      {spheres.map(s => (
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
        />
      ))}
    </>
  );
});

export default Scene;