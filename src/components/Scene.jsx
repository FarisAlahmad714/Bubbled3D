import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
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
import StarBase from './StarBase';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';

const Scene = forwardRef(function Scene({ spacecraftRefs, ...props }, ref) {
  const [spheres, setSpheres] = useState([]);
  const [rings, setRings] = useState([]);
  const [cameraMode, setCameraMode] = useState('orbit');
  const { camera } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPositionRef = useRef(new THREE.Vector3(0, 2, 5));
  const cameraPanoramaAngle = useRef(0);
  const lastActiveTime = useRef(Date.now());
  const activeSphereRef = useRef(null);
  const [orbColor, setOrbColor] = useState(new THREE.Color('#00FF66'));
  const freeControlsRef = useRef();

  const cameraParams = useRef({
    speed: 0.02,
    orbitRadius: 5,
    orbitHeight: 2,
    followSpeed: 0.05,
    panoramaSpeed: 0.005,
    panoramaRadius: 8,
    autoSwitchDelay: 30000,
  });

  const keyData = {
    '1': { color: '#ff5252', src: '/Sounds/clap1.mp3', scale: 1.0, lifetime: 3000, pulseSpeed: 0.7, category: 'Clap' },
    '2': { color: '#ff7752', src: '/Sounds/clap2.mp3', scale: 1.1, lifetime: 3000, pulseSpeed: 0.7, category: 'Clap' },
    '3': { color: '#ff9c52', src: '/Sounds/clap3.mp3', scale: 1.2, lifetime: 3000, pulseSpeed: 0.7, category: 'Clap' },
    '4': { color: '#ffc152', src: '/Sounds/drum1.mp3', scale: 1.0, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '5': { color: '#ffe552', src: '/Sounds/drum2.mp3', scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '6': { color: '#f0ff52', src: '/Sounds/drum3.mp3', scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '7': { color: '#cbff52', src: '/Sounds/drum4.mp3', scale: 1.3, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '8': { color: '#a6ff52', src: '/Sounds/drum5.mp3', scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '9': { color: '#81ff52', src: '/Sounds/drum6.mp3', scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '0': { color: '#52ff5e', src: '/Sounds/drum7.mp3', scale: 1.3, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'q': { color: '#52ff83', src: '/Sounds/drum8.mp3', scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'w': { color: '#52ffa8', src: '/Sounds/drum9.mp3', scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'e': { color: '#52ffcd', src: '/Sounds/drum10.mp3', scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'r': { color: '#52fff2', src: '/Sounds/drum11.mp3', scale: 1.3, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    't': { color: '#52d4ff', src: '/Sounds/drum12.mp3', scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'y': { color: '#52afff', src: '/Sounds/drumsnare9.mp3', scale: 1.4, lifetime: 3500, pulseSpeed: 0.8, category: 'Snare' },
    'u': { color: '#528aff', src: '/Sounds/intro.mp3', scale: 1.5, lifetime: 6000, pulseSpeed: 0.5, category: 'Intro' },
    'i': { color: '#5266ff', src: '/Sounds/intro2.mp3', scale: 1.6, lifetime: 6000, pulseSpeed: 0.5, category: 'Intro' },
    'o': { color: '#6652ff', src: '/Sounds/intro3.mp3', scale: 1.7, lifetime: 6000, pulseSpeed: 0.5, category: 'Intro' },
    'p': { color: '#8b52ff', src: '/Sounds/piano1.mp3', scale: 1.8, lifetime: 7000, pulseSpeed: 0.4, category: 'Piano' },
    'a': { color: '#af52ff', src: '/Sounds/piano2.mp3', scale: 1.5, lifetime: 7000, pulseSpeed: 0.4, category: 'Piano' },
    's': { color: '#d452ff', src: '/Sounds/piano3.mp3', scale: 1.5, lifetime: 7000, pulseSpeed: 0.4, category: 'Piano' },
    'd': { color: '#f952ff', src: '/Sounds/loop1.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'f': { color: '#ff52d4', src: '/Sounds/loop2.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'g': { color: '#ff52af', src: '/Sounds/loop3.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'h': { color: '#ff528a', src: '/Sounds/loop4.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'j': { color: '#ff5266', src: '/Sounds/loop5.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'k': { color: '#ff7752', src: '/Sounds/loop6.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'l': { color: '#ff9c52', src: '/Sounds/loop7.mp3', scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'z': { color: '#ffc152', src: '/Sounds/loop8.mp3', scale: 1.5, lifetime: 8000, pulseSpeed: 0.3, category: 'Loop' },
    'x': { color: '#ffe552', src: '/Sounds/loop9.mp3', scale: 1.5, lifetime: 8000, pulseSpeed: 0.3, category: 'Loop' },
    'c': { color: '#f0ff52', src: '/Sounds/loop10.mp3', scale: 1.5, lifetime: 8000, pulseSpeed: 0.3, category: 'Loop' }
  };

  const trackPositions = useRef({});
  const recordedEvents = useRef([]);
  const recordStart = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const timeoutsAndIntervals = useRef([]);
  const activeSounds = useRef(new Map());
  const soundIntensity = useRef(0);
  const peakIntensity = useRef(0);
  const intensityDecay = useRef(0.95);
  const activeSpacecraftRef = useRef(null);

  useFrame(({ clock }, delta) => {
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

    let targetSpacecraftPosition = null;
    if (cameraMode === 'follow' && spacecraftRefs && spacecraftRefs.length > 0) {
      for (const spacecraftRef of spacecraftRefs) {
        if (spacecraftRef.current) {
          const position = spacecraftRef.current.getPosition();
          if (position.z > -1000) {
            targetSpacecraftPosition = position;
            activeSpacecraftRef.current = position;
            break;
          }
        }
      }
    }

    if (cameraMode === 'free' && freeControlsRef.current) {
      freeControlsRef.current.update(delta);
    } else if (cameraMode === 'orbit') {
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'follow') {
      if (targetSpacecraftPosition) {
        cameraTargetRef.current.lerp(targetSpacecraftPosition, cameraParams.current.followSpeed);
        camera.lookAt(cameraTargetRef.current);
        const offset = new THREE.Vector3(2, 2, 4);
        const cameraPos = targetSpacecraftPosition.clone().add(offset);
        camera.position.lerp(cameraPos, cameraParams.current.followSpeed);
      } else if (activeSphereRef.current) {
        cameraTargetRef.current.lerp(activeSphereRef.current, cameraParams.current.followSpeed);
        camera.lookAt(cameraTargetRef.current);
      }
    } else if (cameraMode === 'panorama') {
      cameraPanoramaAngle.current += cameraParams.current.panoramaSpeed;
      const panoramaX = Math.sin(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius;
      const panoramaZ = Math.cos(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius;
      const panoramaY = 2 + Math.sin(time * 0.1) * 1;
      cameraPositionRef.current.set(panoramaX, panoramaY, panoramaZ);
      camera.position.lerp(cameraPositionRef.current, 0.01);
      camera.lookAt(0, 0, 0);
    }

    setRings(prevRings =>
      prevRings.map(ring => {
        const age = (now - ring.createdAt) / ring.lifetime;
        if (age >= 1) return ring;
        return {
          ...ring,
          scale: 1 + (age * 3),
          opacity: 0.6 * (1 - age)
        };
      })
    );
  });

  function getTrackPositionConstraint(trackId) {
    if (!trackPositions.current[trackId]) {
      trackPositions.current[trackId] = {
        x: (Math.random() - 0.5) * 30,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 30
      };
    }
    return trackPositions.current[trackId];
  }

  function createRingEffect(position, color, trackId) {
    const ringId = uuidv4();
    const newRing = {
      id: ringId,
      position,
      color,
      createdAt: Date.now(),
      lifetime: 2000,
      trackId,
      scale: 1,
      opacity: 0.6
    };
    setRings(prev => [...prev, newRing]);
    setTimeout(() => {
      setRings(prev => prev.filter(r => r.id !== ringId));
    }, newRing.lifetime);
    return ringId;
  }

  function playTrackEvents(events, baseTime, trackId) {
    if (!events || !events.length) {
      console.log(`No events to play for track ID: ${trackId}`);
      return 0;
    }
    const totalDuration = events[events.length - 1].offset;
    events.forEach(ev => {
      const offsetSeconds = ev.offset / 1000;
      if (keyData[ev.key]) {
        try {
          if (typeof Tone !== 'undefined' && Tone.Transport) {
            Tone.Transport.scheduleOnce(time => {
              console.log(`Playing ${ev.key} at Transport time ${time} (offset ${ev.offset}ms)`);
              createSphereAndPlaySound(ev.key, trackId, true);
            }, baseTime + offsetSeconds);
          } else {
            const timeout = setTimeout(() => {
              createSphereAndPlaySound(ev.key, trackId, false);
            }, ev.offset);
            timeoutsAndIntervals.current.push(timeout);
          }
        } catch (err) {
          console.error(`Error scheduling event for key ${ev.key}:`, err);
        }
      } else {
        console.error(`No sound data for key ${ev.key}`);
      }
    });
    return totalDuration;
  }

  function createSphereAndPlaySound(k, trackId = null, isRecorded = false) {
    if (!keyData[k] || spheres.length >= props.performanceSettings.maxSpheres) return null;
    lastActiveTime.current = Date.now();
    let position;
    if (trackId && isRecorded) {
      const constraint = getTrackPositionConstraint(trackId);
      const spread = isRecorded ? 6 : 10;
      position = [
        constraint.x + (Math.random() - 0.5) * spread,
        constraint.y + (Math.random() - 0.5) * spread,
        constraint.z + (Math.random() - 0.5) * spread
      ];
    } else {
      const radius = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      position = [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) + (Math.random() - 0.5) * 1,
        radius * Math.sin(phi) * Math.sin(theta)
      ];
    }
    const scaleMultiplier = isRecorded ? 1.35 : 1.0;
    const lifetimeMultiplier = isRecorded ? 1.25 : 1.0;
    const pulseSpeedMultiplier = isRecorded ? 1.2 : 1.0;
    let sphereColor = keyData[k].color;
    if (isRecorded) {
      const color = new THREE.Color(sphereColor);
      color.r = Math.min(1, color.r * 1.2);
      color.g = Math.min(1, color.g * 1.2);
      color.b = Math.min(1, color.b * 1.2);
      sphereColor = color.getStyle();
    }
    const newSphere = {
      position,
      color: sphereColor,
      id: uuidv4(),
      scale: (keyData[k].scale || 1.0) * scaleMultiplier,
      pulseSpeed: (keyData[k].pulseSpeed || 0.5) * pulseSpeedMultiplier,
      createdAt: Date.now(),
      lifetime: (keyData[k].lifetime || 8000) * lifetimeMultiplier,
      key: k,
      isRecorded: isRecorded,
      trackId: trackId,
      emissiveIntensity: isRecorded ? 0.7 : 0.4,
      opacity: isRecorded ? 0.9 : 0.7
    };
    activeSphereRef.current = new THREE.Vector3(...position);
    setSpheres(prev => {
      const next = [...prev, newSphere];
      if (next.length > props.performanceSettings.maxSpheres) next.shift();
      return next;
    });
    if (isRecorded) {
      createRingEffect(position, sphereColor, trackId);
    }
    let sound = null;
    const silent = isRecorded && trackId;
    if (!silent) {
      sound = new Howl({
        src: Array.isArray(keyData[k].src) ? keyData[k].src : [keyData[k].src],
        volume: 0.8 + (soundIntensity.current * 0.2),
        preload: true,
        onend: () => {
          if (trackId && activeSounds.current.has(trackId)) {
            activeSounds.current.get(trackId).delete(sound);
          }
        },
      });
      sound.play();
      if (trackId) {
        if (!activeSounds.current.has(trackId)) {
          activeSounds.current.set(trackId, new Set());
        }
        activeSounds.current.get(trackId).add(sound);
      }
    }
    soundIntensity.current += 0.3;
    if (soundIntensity.current > 1) soundIntensity.current = 1;
    peakIntensity.current = Math.max(peakIntensity.current, soundIntensity.current);
    return sound;
  }

  function clearSoundsForTrack(trackId) {
    if (activeSounds.current.has(trackId)) {
      const trackSounds = activeSounds.current.get(trackId);
      trackSounds.forEach((sound) => sound.stop());
      activeSounds.current.delete(trackId);
      console.log(`Cleared sounds for track ${trackId}`);
    }
    setSpheres(prev => prev.filter(s => s.trackId !== trackId));
    setRings(prev => prev.filter(r => r.trackId !== trackId));
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
          key: k
        });
      }
    }
    if (e.key === 'c') {
      const modes = ['orbit', 'follow', 'panorama', 'free'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = Date.now();
    }
  }

  useEffect(() => {
    if (cameraMode === 'free') {
      freeControlsRef.current = new FirstPersonControls(camera, document.body);
      freeControlsRef.current.movementSpeed = 10;
      freeControlsRef.current.lookSpeed = 0.1;
      freeControlsRef.current.activeLook = true;
      freeControlsRef.current.constrainVertical = false;
    }
    return () => {
      if (freeControlsRef.current) {
        freeControlsRef.current.dispose();
        freeControlsRef.current = null;
      }
    };
  }, [cameraMode, camera]);

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setSpheres(prevSpheres =>
        prevSpheres.filter(sphere => (now - sphere.createdAt) < sphere.lifetime)
      );
      setRings(prevRings =>
        prevRings.filter(ring => (now - ring.createdAt) < ring.lifetime)
      );
    }, 1000);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(cleanupInterval);
    };
  }, [isRecording, cameraMode, props.performanceSettings]);

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
        createSphereAndPlaySound(ev.key, null, true);
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
    const modes = ['orbit', 'follow', 'panorama', 'free'];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCameraMode(modes[nextIndex]);
    lastActiveTime.current = Date.now();
  }

  function changeCameraMode(mode) {
    setCameraMode(mode);
    lastActiveTime.current = Date.now();
  }

  function setCameraSpeed(speed) {
    cameraParams.current.speed = speed;
    cameraParams.current.panoramaSpeed = speed / 4;
  }

  function setPerformanceMode(settings) {}

  useImperativeHandle(ref, () => ({
    createSphereAndPlaySound,
    startRecording,
    stopRecording,
    startLoop,
    stopLoop,
    deleteLoop,
    toggleCameraMode,
    setCameraMode: changeCameraMode,
    setCameraSpeed,
    setPerformanceMode,
    getSoundIntensity: () => soundIntensity.current,
    getCurrentCameraMode: () => cameraMode,
    clearSoundsForTrack,
    // Add this debug helper function for DebugUI
    logCameraInfo: () => {
      return {
        position: camera.position.clone(),
        rotation: camera.rotation.clone(),
        mode: cameraMode,
        target: cameraTargetRef.current?.clone() || null
      };
    },
    // Add a function to get the active spacecraft
    getActiveSpacecraft: () => activeSpacecraftRef.current
  }));

  function Ring({ ring }) {
    return (
      <mesh position={ring.position} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ring.scale * 1.5, ring.scale * 2.0, 32]} />
        <meshBasicMaterial color={ring.color} transparent={true} opacity={ring.opacity} side={THREE.DoubleSide} />
      </mesh>
    );
  }

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
          target={[0, 0, 0]}
          autoRotate={false}
        />
      )}
      <Lighting soundIntensity={soundIntensity.current} orbColor={orbColor} />
      <Stars
        radius={20}
        depth={10}
        count={props.performanceSettings.starCount}
        factor={2}
        saturation={0.3}
        fade
        speed={0.2}
      />
      <ParticleField soundIntensity={soundIntensity.current} performanceSettings={props.performanceSettings} />
      <ParticleInteraction spheres={spheres} soundIntensity={soundIntensity.current} />
      <StarBase soundIntensity={soundIntensity.current} onColorChange={(color) => setOrbColor(color)} />
      
      {/* Add debug helpers for visible spacecraft */}
      {process.env.NODE_ENV === 'development' && spacecraftRefs && spacecraftRefs.map((spacecraftRef, index) => {
        if (!spacecraftRef?.current) return null;
        
        try {
          const position = spacecraftRef.current.getPosition();
          if (position.z <= -500) return null; // Don't render helpers for hidden spacecraft
          
          return (
            <group key={`helper-${index}`} position={position}>
              <axesHelper args={[2]} /> {/* Shows XYZ axes to help with orientation */}
            </group>
          );
        } catch (err) {
          return null; // Skip if there's an error
        }
      })}
      
      {spheres.map(sphere => (
        <Sphere
          key={sphere.id}
          sphereId={sphere.id}
          position={sphere.position}
          color={sphere.color}
          scale={sphere.scale}
          pulseSpeed={sphere.pulseSpeed}
          removeSphere={removeSphereFromState}
          soundIntensity={soundIntensity.current}
          lifetime={sphere.lifetime}
          createdAt={sphere.createdAt}
          isRecorded={sphere.isRecorded}
          emissiveIntensity={sphere.emissiveIntensity}
          opacity={sphere.opacity}
        />
      ))}
      {rings.map(ring => (
        <Ring key={ring.id} ring={ring} />
      ))}
    </>
  );
});

export default Scene;

export { Scene };