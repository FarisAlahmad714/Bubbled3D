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
import { Howl, Howler } from 'howler';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import Sphere from './Sphere';
import Environment from './Environment';
import ParticleField from './ParticleField';
import ParticleInteraction from './ParticleInteraction';
import Lighting from './Lighting';
import SimpleAudioPlayer from '../SimpleAudioPlayer';

const Scene = forwardRef(function Scene(props, ref) {
  const [spheres, setSpheres] = useState([]);
  const [cameraMode, setCameraMode] = useState('orbit');
  const { camera } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPositionRef = useRef(new THREE.Vector3(0, 2, 5));
  const cameraPanoramaAngle = useRef(0);
  const lastActiveTime = useRef(Date.now());
  const activeSphereRef = useRef(null);

  // Sound player refs
  const soundPlayer = useRef(null);
  const soundInfoGetter = useRef(null);

  const cameraParams = useRef({
    speed: 0.02,
    orbitRadius: 5,
    orbitHeight: 2,
    followSpeed: 0.05,
    panoramaSpeed: 0.005,
    panoramaRadius: 8,
    autoSwitchDelay: 30000,
  });

  // Define sound colors to match SimpleAudioPlayer
  const soundColors = {
    '1': '#FF5733', '2': '#FF9966', '3': '#FFFF99', '4': '#66CCCC', '5': '#99CCFF',
    '6': '#FF6666', 'q': '#FFCC66', 'w': '#FFCCFF', 'e': '#FF99FF', 'r': '#66FF66',
    'a': '#CC99FF', 's': '#FF9966', 'd': '#FF5733', 'f': '#FF6666', 't': '#FF6666',
    'g': '#FF99CC', 'h': '#FFCC99', 'i': '#66CCFF', 'j': '#FFFF66', 'k': '#CCFF66',
    'l': '#FF6699', 'z': '#99FFFF', 'x': '#FFCC33', 'c': '#66FF99', 'v': '#CC66FF',
    'b': '#FF33CC', 'n': '#66CC99'
  };

  // Define keyData with all 26 sounds
  const keyData = useMemo(() => {
    const baseKeys = {
      '1': { scale: 1.0, lifetime: 8000, pulseSpeed: 0.5, src: ['/Sounds/bubbles.mp3'] },
      '2': { scale: 1.2, lifetime: 7000, pulseSpeed: 0.8, src: ['/Sounds/clay.mp3'] },
      '3': { scale: 0.8, lifetime: 10000, pulseSpeed: 0.3, src: ['/Sounds/confetti.mp3'] },
      '4': { scale: 1.5, lifetime: 9000, pulseSpeed: 0.6, src: ['/Sounds/corona.mp3'] },
      '5': { scale: 1.1, lifetime: 6000, pulseSpeed: 1.0, src: ['/Sounds/dotted-spiral.mp3'] },
      '6': { scale: 0.9, lifetime: 8500, pulseSpeed: 0.7, src: ['/Sounds/flash-1.mp3'] },
      'q': { scale: 1.3, lifetime: 7500, pulseSpeed: 0.9, src: ['/Sounds/flash-2.mp3'] },
      'w': { scale: 1.0, lifetime: 9000, pulseSpeed: 0.4, src: ['/Sounds/flash-3.mp3'] },
      'e': { scale: 1.4, lifetime: 8000, pulseSpeed: 0.6, src: ['/Sounds/glimmer.mp3'] },
      'r': { scale: 1.1, lifetime: 8200, pulseSpeed: 0.8, src: ['/Sounds/moon.mp3'] },
      'a': { scale: 1.0, lifetime: 7800, pulseSpeed: 0.6, src: ['/Sounds/pinwheel.mp3'] },
      's': { scale: 1.3, lifetime: 8800, pulseSpeed: 0.4, src: ['/Sounds/piston-1.mp3'] },
      'd': { scale: 1.2, lifetime: 7600, pulseSpeed: 0.9, src: ['/Sounds/piston-2.mp3'] },
      'f': { scale: 1.0, lifetime: 8000, pulseSpeed: 0.5, src: ['/Sounds/piston-3.mp3'] },
      't': { scale: 1.2, lifetime: 7000, pulseSpeed: 0.8, src: ['/Sounds/prism-1.mp3'] },
      'g': { scale: 0.8, lifetime: 10000, pulseSpeed: 0.3, src: ['/Sounds/prism-2.mp3'] },
      'h': { scale: 1.5, lifetime: 9000, pulseSpeed: 0.6, src: ['/Sounds/prism-3.mp3'] },
      'i': { scale: 1.1, lifetime: 6000, pulseSpeed: 1.0, src: ['/Sounds/splits.mp3'] },
      'j': { scale: 0.9, lifetime: 8500, pulseSpeed: 0.7, src: ['/Sounds/squiggle.mp3'] },
      'k': { scale: 1.3, lifetime: 7500, pulseSpeed: 0.9, src: ['/Sounds/strike.mp3'] },
      'l': { scale: 1.0, lifetime: 9000, pulseSpeed: 0.4, src: ['/Sounds/suspension.mp3'] },
      'z': { scale: 1.4, lifetime: 8000, pulseSpeed: 0.6, src: ['/Sounds/timer.mp3'] },
      'x': { scale: 1.1, lifetime: 8200, pulseSpeed: 0.8, src: ['/Sounds/ufo.mp3'] },
      'c': { scale: 1.0, lifetime: 7800, pulseSpeed: 0.6, src: ['/Sounds/veil.mp3'] },
      'v': { scale: 1.3, lifetime: 8800, pulseSpeed: 0.4, src: ['/Sounds/wipe.mp3'] },
      'b': { scale: 1.2, lifetime: 7600, pulseSpeed: 0.9, src: ['/Sounds/zig-zag.mp3'] },
      'n': { scale: 1.0, lifetime: 8000, pulseSpeed: 0.5, src: ['/Sounds/bubbles.mp3'] } // Loop back for extra keys
    };

    const updatedKeys = {};
    Object.keys(baseKeys).forEach(key => {
      updatedKeys[key] = {
        ...baseKeys[key],
        color: soundColors[key] || '#FFFFFF'
      };
    });
    return updatedKeys;
  }, []);

  const recordedEvents = useRef([]);
  const recordStart = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const timeoutsAndIntervals = useRef([]);

  const soundIntensity = useRef(0);
  const peakIntensity = useRef(0);
  const intensityDecay = useRef(0.95);

  const soundCache = useRef({});

  const SimpleAudioIntegration = () => {
    return (
      <SimpleAudioPlayer 
        onLoad={({ playSound, getSoundInfo }) => {
          soundPlayer.current = playSound;
          soundInfoGetter.current = getSoundInfo;
          console.log('Simple audio player loaded successfully');
        }} 
      />
    );
  };

  useEffect(() => {
    // Initialize audio system (minimal Howler setup as fallback)
    const initAudio = async () => {
      try {
        console.log('Initializing Howler...');
        Howler.autoUnlock = true;
        Howler.volume(1.0);
        Howler.html5 = false;
        if (Howler.ctx) {
          console.log(`Howler audio context state: ${Howler.ctx.state}`);
        }
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initAudio();

    window.addEventListener('keydown', handleKeyDown);

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setSpheres(prevSpheres => 
        prevSpheres.filter(sphere => (now - sphere.createdAt) < sphere.lifetime)
      );
    }, 1000);

    return () => {
      Object.values(soundCache.current).forEach(sound => sound.unload());
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(cleanupInterval);
    };
  }, []);

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

    console.log(`Triggering sound for key: ${k}`);

    lastActiveTime.current = Date.now();

    const radius = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    const position = [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + (Math.random() - 0.5) * 1,
      radius * Math.sin(phi) * Math.sin(theta)
    ];

    const soundInfo = soundInfoGetter.current ? soundInfoGetter.current(k) : {
      color: keyData[k].color,
      scale: keyData[k].scale,
      lifetime: keyData[k].lifetime,
      pulseSpeed: keyData[k].pulseSpeed
    };

    const newSphere = {
      position,
      color: soundInfo.color,
      id: uuidv4(),
      scale: soundInfo.scale,
      pulseSpeed: soundInfo.pulseSpeed,
      createdAt: Date.now(),
      lifetime: soundInfo.lifetime,
      key: k
    };

    activeSphereRef.current = new THREE.Vector3(...position);

    setSpheres(prev => {
      const next = [...prev, newSphere];
      if (next.length > props.performanceSettings.maxSpheres) next.shift();
      return next;
    });

    if (soundPlayer.current) {
      try {
        soundPlayer.current(k);
      } catch (error) {
        console.error('SimpleAudioPlayer error:', error);
        playSound(k); // Fallback to Howler
      }
    } else {
      playSound(k);
    }

    soundIntensity.current += 0.3;
    if (soundIntensity.current > 1) soundIntensity.current = 1;
    peakIntensity.current = Math.max(peakIntensity.current, soundIntensity.current);
  }

  function playSound(k) {
    if (!keyData[k]) return;

    try {
      let sound = soundCache.current[k];
      if (!sound) {
        console.log(`Creating new sound for key ${k}, src: ${keyData[k].src[0]}`);
        sound = new Howl({
          src: keyData[k].src,
          volume: 0.8 + (soundIntensity.current * 0.2),
          html5: true,
          preload: true,
          onload: () => console.log(`Sound loaded: ${keyData[k].src[0]}`),
          onloaderror: (id, error) => console.error(`Load error for ${keyData[k].src[0]}:`, error),
          onplayerror: (id, error) => console.error(`Play error for ${keyData[k].src[0]}:`, error)
        });
        soundCache.current[k] = sound;
      }
      const id = sound.play();
      sound.volume(0.8 + (soundIntensity.current * 0.2), id);
      console.log(`Playing sound ${k} with ID ${id}`);
    } catch (error) {
      console.error(`Error in playSound for key ${k}:`, error);
    }
  }

  function handleKeyDown(e) {
    const k = e.key.toLowerCase();
    const validKeys = ['1', '2', '3', '4', '5', '6', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 't', 'g', 'h', 'i', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n'];
    if (validKeys.includes(k)) {
      createSphereAndPlaySound(k);
      if (props.onKeyPress) props.onKeyPress(k);
      if (isRecording) {
        const now = performance.now();
        recordedEvents.current.push({
          offset: now - recordStart.current,
          key: k,
          category: 'default', // No category needed with direct mapping
          sound: keyData[k].src[0].split('/').pop() // Extract filename
        });
      }
    } else if (k === 'm') { // Changed camera toggle to 'm' to free 'c'
      const modes = ['orbit', 'follow', 'panorama'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = Date.now();
    }
  }

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
        const soundInfo = soundInfoGetter.current ? soundInfoGetter.current(ev.key) : {
          color: keyData[ev.key].color,
          scale: keyData[ev.key].scale,
          lifetime: keyData[ev.key].lifetime,
          pulseSpeed: keyData[ev.key].pulseSpeed
        };

        const newSphere = {
          position: [
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
          ],
          color: soundInfo.color,
          id: uuidv4(),
          scale: soundInfo.scale,
          pulseSpeed: soundInfo.pulseSpeed,
          createdAt: Date.now(),
          lifetime: soundInfo.lifetime,
          key: ev.key
        };

        setSpheres(prev => {
          const next = [...prev, newSphere];
          if (next.length > props.performanceSettings.maxSpheres) next.shift();
          return next;
        });

        if (soundPlayer.current) {
          try {
            soundPlayer.current(ev.key);
          } catch (e) {
            console.error('Loop playback error:', e);
            playSound(ev.key);
          }
        } else {
          playSound(ev.key);
        }
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
    const intervalId = setInterval(() => playOnce(), dur);
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
      <SimpleAudioIntegration />
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
        count={props.performanceSettings?.starCount || 500}
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