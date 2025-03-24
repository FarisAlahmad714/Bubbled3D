import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import Sphere from './Sphere';
import Environment from './Environment';
import ParticleField from './ParticleField';
import ParticleInteraction from './ParticleInteraction';
import Lighting from './Lighting';
import StarBase from './StarBase';
import Planet from './Planet';
import Earth from './Earth';
import Astronaut from './Astronaut';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { useAudioManager } from './AudioManager';
import { usePerformance } from './PerformanceOptimizer'; // Import the usePerformance hook

// Helper functions to determine colors based on visualMode
const getColorForVisualMode = (baseColor, visualMode) => {
  const color = new THREE.Color(baseColor);
  switch (visualMode) {
    case 'neon':
      return new THREE.Color('#ff00ff'); // Bright pink
    case 'dream':
      return new THREE.Color('#aaccff'); // Soft blue
    case 'monochrome':
      const gray = (color.r + color.g + color.b) / 3;
      return new THREE.Color(gray, gray, gray);
    case 'default':
    default:
      return color; // Use the original color
  }
};

const getEmissiveColorForVisualMode = (visualMode) => {
  switch (visualMode) {
    case 'neon':
      return new THREE.Color('#ff00ff'); // Bright emissive pink
    case 'dream':
      return new THREE.Color('#aaccff'); // Soft emissive blue
    case 'monochrome':
      return new THREE.Color('#000000'); // No emissive in monochrome
    case 'default':
    default:
      return new THREE.Color('#000000'); // No emissive by default
  }
};

const getFogColor = (visualMode) => {
  switch (visualMode) {
    case 'neon':
      return new THREE.Color('#1a001a'); // Dark purple
    case 'dream':
      return new THREE.Color('#0a1a2a'); // Deep blue
    case 'monochrome':
      return new THREE.Color('#333333'); // Dark gray
    case 'default':
    default:
      return new THREE.Color('#030318'); // Default dark blue
  }
};

const Scene = forwardRef(function Scene({ spacecraftRefs, visualMode, onShowAdModal, ...props }, ref) {
  // Access the performance context
  const { 
    performanceMode, 
    performancePresets, 
    deviceInfo, 
    qualityLevel, 
    currentFps 
  } = usePerformance();

  // Use performance settings from context or props
  const currentSettings = useMemo(() => {
    // Priority: 1. Props (for backward compatibility) 2. Context settings
    return props.performanceSettings || performancePresets[performanceMode];
  }, [props.performanceSettings, performanceMode, performancePresets]);

  // Dynamic settings based on qualityLevel (for adaptive performance)
  const dynamicSettings = useMemo(() => {
    if (!currentSettings) return null;
    
    return {
      ...currentSettings,
      particleCount: Math.round(currentSettings.particleCount * qualityLevel),
      starCount: Math.round(currentSettings.starCount * qualityLevel),
      maxSpheres: Math.max(10, Math.round(currentSettings.maxSpheres * qualityLevel)),
      bloomIntensity: currentSettings.bloomIntensity * qualityLevel
    };
  }, [currentSettings, qualityLevel]);

  // Main state
  const [spheres, setSpheres] = useState([]);
  const [rings, setRings] = useState([]);
  const [cameraMode, setCameraMode] = useState('orbit');
  const { camera, scene } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPositionRef = useRef(new THREE.Vector3(0, 5, 10));
  const cameraPanoramaAngle = useRef(0);
  const lastActiveTime = useRef(Date.now());
  const activeSphereRef = useRef(null);
  const [orbColor, setOrbColor] = useState(new THREE.Color('#00FF66'));
  const freeControlsRef = useRef();
  const astronautRef = useRef();
  const astronautViewDistance = useRef(2); // Distance behind astronaut (0 for first person)
  const isFirstPersonView = useRef(false); // Toggle between first and third person views
  
  // Get audio manager from context
  const audioManager = useAudioManager();
  const bufferLoadingStarted = useRef(false);

  // Performance tracking
  const lastPerformanceMode = useRef(performanceMode);
  const lowFpsCount = useRef(0);
  const performanceAutoAdjusted = useRef(false);

  const cameraParams = useRef({
    speed: 0.02,
    orbitRadius: 5,
    orbitHeight: 2,
    followSpeed: 0.05,
    panoramaSpeed: 0.005,
    panoramaRadius: 20,
    autoSwitchDelay: 30000,
  });

  const keyData = {
    '1': { color: '#ff5252', src: ['/Sounds/clap1.wav', '/Sounds/clap1.mp3'], scale: 1.0, lifetime: 3000, pulseSpeed: 0.7, category: 'Clap' },
    '2': { color: '#ff7752', src: ['/Sounds/clap2.wav', '/Sounds/clap2.mp3'], scale: 1.1, lifetime: 3000, pulseSpeed: 0.7, category: 'Clap' },
    '3': { color: '#ff9c52', src: ['/Sounds/clap3.wav', '/Sounds/clap3.mp3'], scale: 1.2, lifetime: 3000, pulseSpeed: 0.7, category: 'Clap' },
    '4': { color: '#ffc152', src: ['/Sounds/drum1.wav', '/Sounds/drum1.mp3'], scale: 1.0, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '5': { color: '#ffe552', src: ['/Sounds/drum2.wav', '/Sounds/drum2.mp3'], scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '6': { color: '#f0ff52', src: ['/Sounds/drum3.wav', '/Sounds/drum3.mp3'], scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '7': { color: '#cbff52', src: ['/Sounds/drum4.wav', '/Sounds/drum4.mp3'], scale: 1.3, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '8': { color: '#a6ff52', src: ['/Sounds/drum5.wav', '/Sounds/drum5.mp3'], scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '9': { color: '#81ff52', src: ['/Sounds/drum6.wav', '/Sounds/drum6.mp3'], scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    '0': { color: '#52ff5e', src: ['/Sounds/drum7.wav', '/Sounds/drum7.mp3'], scale: 1.3, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'q': { color: '#52ff83', src: ['/Sounds/drum8.wav', '/Sounds/drum8.mp3'], scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'w': { color: '#52ffa8', src: ['/Sounds/drum9.wav', '/Sounds/drum9.mp3'], scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'e': { color: '#52ffcd', src: ['/Sounds/drum10.wav', '/Sounds/drum10.mp3'], scale: 1.2, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'r': { color: '#52fff2', src: ['/Sounds/drum11.wav', '/Sounds/drum11.mp3'], scale: 1.3, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    't': { color: '#52d4ff', src: ['/Sounds/drum12.wav', '/Sounds/drum12.mp3'], scale: 1.1, lifetime: 3500, pulseSpeed: 0.6, category: 'Drum' },
    'y': { color: '#52afff', src: ['/Sounds/drumsnare9.wav', '/Sounds/drumsnare9.mp3'], scale: 1.4, lifetime: 3500, pulseSpeed: 0.8, category: 'Snare' },
    'u': { color: '#528aff', src: ['/Sounds/intro.wav', '/Sounds/intro.mp3'], scale: 1.5, lifetime: 6000, pulseSpeed: 0.5, category: 'Intro' },
    'i': { color: '#5266ff', src: ['/Sounds/intro2.wav', '/Sounds/intro2.mp3'], scale: 1.6, lifetime: 6000, pulseSpeed: 0.5, category: 'Intro' },
    'o': { color: '#6652ff', src: ['/Sounds/intro3.wav', '/Sounds/intro3.mp3'], scale: 1.7, lifetime: 6000, pulseSpeed: 0.5, category: 'Intro' },
    'p': { color: '#8b52ff', src: ['/Sounds/piano1.wav', '/Sounds/piano1.mp3'], scale: 1.8, lifetime: 7000, pulseSpeed: 0.4, category: 'Piano' },
    'a': { color: '#af52ff', src: ['/Sounds/piano2.wav', '/Sounds/piano2.mp3'], scale: 1.5, lifetime: 7000, pulseSpeed: 0.4, category: 'Piano' },
    's': { color: '#d452ff', src: ['/Sounds/piano3.wav', '/Sounds/piano3.mp3'], scale: 1.5, lifetime: 7000, pulseSpeed: 0.4, category: 'Piano' },
    'd': { color: '#f952ff', src: ['/Sounds/loop1.wav', '/Sounds/loop1.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'f': { color: '#ff52d4', src: ['/Sounds/loop2.wav', '/Sounds/loop2.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'g': { color: '#ff52af', src: ['/Sounds/loop3.wav', '/Sounds/loop3.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'h': { color: '#ff528a', src: ['/Sounds/loop4.wav', '/Sounds/loop4.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'j': { color: '#ff5266', src: ['/Sounds/loop5.wav', '/Sounds/loop5.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'k': { color: '#ff7752', src: ['/Sounds/loop6.wav', '/Sounds/loop6.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'l': { color: '#ff9c52', src: ['/Sounds/loop7.wav', '/Sounds/loop7.mp3'], scale: 1.3, lifetime: 8000, pulseSpeed: 0.4, category: 'Loop' },
    'z': { color: '#ffc152', src: ['/Sounds/loop8.wav', '/Sounds/loop8.mp3'], scale: 1.5, lifetime: 8000, pulseSpeed: 0.3, category: 'Loop' },
    'x': { color: '#ffe552', src: ['/Sounds/loop9.wav', '/Sounds/loop9.mp3'], scale: 1.5, lifetime: 8000, pulseSpeed: 0.3, category: 'Loop' },
    'c': { color: '#f0ff52', src: ['/Sounds/loop10.wav', '/Sounds/loop10.mp3'], scale: 1.5, lifetime: 8000, pulseSpeed: 0.3, category: 'Loop' }
  };

  // Preload audio buffers
  useEffect(() => {
    if (audioManager.isReady && !bufferLoadingStarted.current) {
      bufferLoadingStarted.current = true;
      audioManager.loadBuffers(keyData)
        .then(() => {
          console.log('All sound buffers preloaded');
        })
        .catch(err => {
          console.error('Error preloading sound buffers:', err);
        });
    }
  }, [audioManager.isReady]);

  // Monitor for performance mode changes and apply them
  useEffect(() => {
    if (performanceMode !== lastPerformanceMode.current) {
      console.log(`Performance mode changed from ${lastPerformanceMode.current} to ${performanceMode}`);
      
      // Apply new performance settings
      applyPerformanceSettings(performancePresets[performanceMode]);
      
      // Reset auto-adjustment tracking
      performanceAutoAdjusted.current = true;
      lowFpsCount.current = 0;
      lastPerformanceMode.current = performanceMode;
    }
  }, [performanceMode, performancePresets]);

  // Apply performance settings function
  const applyPerformanceSettings = (settings) => {
    // Update fog distance based on performance
    if (scene && scene.fog) {
      scene.fog.near = settings.postProcessing ? 30 : 20;
      scene.fog.far = settings.postProcessing ? 100 : 80;
    }
    
    // Update camera far plane based on device capability
    if (camera) {
      // On low-end devices, reduce viewing distance to improve performance
      if (deviceInfo?.isLowEnd && !settings.postProcessing) {
        camera.far = 5000; // Reduced from 10000 for performance
      } else {
        camera.far = 10000;
      }
      camera.updateProjectionMatrix();
    }
    
    // Apply settings to any child components that need them
    // (Note: Most child components will receive these via props directly)
    
    console.log('Applied performance settings:', settings);
  };

  const trackPositions = useRef({});
  const recordedEvents = useRef([]);
  const recordStart = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const timeoutsAndIntervals = useRef([]);
  const soundIntensity = useRef(0);
  const peakIntensity = useRef(0);
  const intensityDecay = useRef(0.95);
  const activeSpacecraftRef = useRef(null);
  const performanceMonitorRef = useRef({
    lastCheck: Date.now(),
    checkInterval: 5000, // Check performance every 5 seconds
    fpsThreshold: 30     // FPS threshold for auto-adjustments
  });

  // Update scene fog based on visualMode
  useEffect(() => {
    console.log('Visual Mode updated in Scene:', visualMode);
    scene.fog = new THREE.Fog(
      getFogColor(visualMode),
      dynamicSettings ? dynamicSettings.postProcessing ? 30 : 20 : 30,  // Start fog further away
      dynamicSettings ? dynamicSettings.postProcessing ? 100 : 80 : 100  // Extend fog distance
    );
  }, [visualMode, scene, dynamicSettings]);

  // Update camera far plane to see distant Earth
  useEffect(() => {
    if (camera) {
      camera.near = 0.1;
      // Set far plane based on device capability and performance mode
      if (deviceInfo?.isLowEnd && performanceMode === 'low') {
        camera.far = 5000; // Reduced for low-end devices
      } else {
        camera.far = 10000; // Full distance for better devices
      }
      camera.updateProjectionMatrix();
      console.log('Updated camera far plane for Earth visibility');
    }
  }, [camera, deviceInfo, performanceMode]);

  // Apply initial performance settings
  useEffect(() => {
    if (dynamicSettings) {
      applyPerformanceSettings(dynamicSettings);
    }
  }, [dynamicSettings]);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const now = Date.now();

    // Auto-switch camera mode after inactivity
    if (now - lastActiveTime.current > cameraParams.current.autoSwitchDelay) {
      const modes = ['orbit', 'panorama', 'follow', 'free', 'astronaut'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = now;
    }

    // Performance monitoring
    if (now - performanceMonitorRef.current.lastCheck > performanceMonitorRef.current.checkInterval) {
      performanceMonitorRef.current.lastCheck = now;
      
      // Check if we need auto performance adjustment
      if (!performanceAutoAdjusted.current && currentFps < performanceMonitorRef.current.fpsThreshold) {
        lowFpsCount.current++;
        
        // If consistently low FPS for multiple checks, suggest performance reduction
        if (lowFpsCount.current >= 3 && performanceMode !== 'low') {
          console.warn(`Performance issue detected: ${currentFps} FPS. Consider reducing quality.`);
          // We could automatically adjust here by dispatching to the PerformanceOptimizer
          // but we'll leave that decision to the user interface
        }
      } else {
        // Reset counter if FPS is good
        lowFpsCount.current = 0;
      }
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
    } else if (cameraMode === 'astronaut' && astronautRef.current) {
      // Astronaut camera mode
      // Determine if we're in first-person or third-person view
      let targetPosition;
      
      if (isFirstPersonView.current) {
        // First-person view (from astronaut's eyes)
        targetPosition = astronautRef.current.getFirstPersonPosition();
        
        // Get the direction the astronaut is looking
        const lookDirection = astronautRef.current.getLookDirection();
        
        // Calculate a look-at point in front of the astronaut
        const lookAtPoint = targetPosition.clone().add(lookDirection.multiplyScalar(10));
        
        // Smoothly transition camera position
        camera.position.lerp(targetPosition, 0.05);
        
        // Smoothly look at the target point
        cameraTargetRef.current.lerp(lookAtPoint, 0.05);
        camera.lookAt(cameraTargetRef.current);
      } else {
        // Third-person view (behind astronaut)
        targetPosition = astronautRef.current.getThirdPersonPosition(astronautViewDistance.current);
        
        // Move camera up to see the feet better
        targetPosition.y += 2;
        
        // Get astronaut's position to look at
        const astronautPosition = astronautRef.current.getWorldPosition();
        
        // Get look direction to calculate a point ahead of the astronaut
        const lookDirection = astronautRef.current.getLookDirection();
        const lookAheadPoint = astronautPosition.clone().add(
          lookDirection.multiplyScalar(5) // Look ahead of astronaut
        );
        
        // Aim camera slightly downward
        lookAheadPoint.y -= 1;
        
        // Smoothly transition camera position
        camera.position.lerp(targetPosition, 0.05);
        
        // Smoothly look at the point ahead of the astronaut
        cameraTargetRef.current.lerp(lookAheadPoint, 0.05);
        camera.lookAt(cameraTargetRef.current);
      }
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
    // Don't create rings in low performance mode with many objects
    if (performanceMode === 'low' && rings.length > 20) return null;
    
    const ringId = uuidv4();
    const newRing = {
      id: ringId,
      position,
      color: getColorForVisualMode(color, visualMode),
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

  function createSphereAndPlaySound(k, trackId = null, isRecorded = false) {
    const effectiveSettings = dynamicSettings || (props.performanceSettings || performancePresets[performanceMode]);
    
    if (!keyData[k] || (spheres.length >= effectiveSettings.maxSpheres && !isRecorded)) return null;
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
    
    sphereColor = getColorForVisualMode(sphereColor, visualMode).getStyle();
    
    // Adjust lifetime based on performance mode to reduce object count
    const lifetimeAdjustment = performanceMode === 'low' ? 0.7 : 
                              performanceMode === 'medium' ? 0.85 : 1.0;
    
    const newSphere = {
      position,
      color: sphereColor,
      id: uuidv4(),
      scale: (keyData[k].scale || 1.0) * scaleMultiplier,
      pulseSpeed: (keyData[k].pulseSpeed || 0.5) * pulseSpeedMultiplier,
      createdAt: Date.now(),
      lifetime: (keyData[k].lifetime || 8000) * lifetimeMultiplier * lifetimeAdjustment,
      key: k,
      isRecorded: isRecorded,
      trackId: trackId,
      emissiveIntensity: isRecorded ? 0.7 : 0.4,
      opacity: isRecorded ? 0.9 : 0.7
    };
    
    activeSphereRef.current = new THREE.Vector3(...position);
    
    setSpheres(prev => {
      // Sort by recorded/non-recorded to prioritize keeping recorded spheres
      const next = [...prev, newSphere].sort((a, b) => {
        // Keep recorded spheres
        if (a.isRecorded && !b.isRecorded) return 1;
        if (!a.isRecorded && b.isRecorded) return -1;
        // Otherwise, remove oldest first
        return a.createdAt - b.createdAt;
      });
      
      // If over limit, remove oldest non-recorded spheres first
      if (next.length > effectiveSettings.maxSpheres) {
        return next.slice(next.length - effectiveSettings.maxSpheres);
      }
      
      return next;
    });
    
    if (isRecorded) {
      createRingEffect(position, sphereColor, trackId);
    }
    
    // Play sound unless it should be silent (used for recorded events)
    const silent = isRecorded && trackId;
    
    if (!silent && audioManager.isReady) {
      // Use the centralized audio manager to play sounds
      audioManager.playSound(k, keyData, {
        volume: 0.8 + (soundIntensity.current * 0.2)
      });
    }
    
    // Update sound intensity
    soundIntensity.current += 0.3;
    if (soundIntensity.current > 1) soundIntensity.current = 1;
    peakIntensity.current = Math.max(peakIntensity.current, soundIntensity.current);
    
    return true;
  }

  function clearSoundsForTrack(trackId) {
    console.log(`Clearing sounds for track ${trackId}`);
    // Remove spheres and rings for the track
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
      const modes = ['orbit', 'follow', 'panorama', 'free', 'astronaut'];
      const currentIndex = modes.indexOf(cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCameraMode(modes[nextIndex]);
      lastActiveTime.current = Date.now();
    }
    if (e.key === 'v' && cameraMode === 'astronaut') {
      isFirstPersonView.current = !isFirstPersonView.current;
      console.log(`Switching to ${isFirstPersonView.current ? 'first' : 'third'} person view`);
    }
    
    // In astronaut mode, use + and - to adjust view distance (in third-person)
    if (cameraMode === 'astronaut' && !isFirstPersonView.current) {
      if (e.key === '+' || e.key === '=') {
        // Zoom in (reduce distance)
        astronautViewDistance.current = Math.max(1, astronautViewDistance.current - 0.5);
      } else if (e.key === '-' || e.key === '_') {
        // Zoom out (increase distance)
        astronautViewDistance.current = Math.min(10, astronautViewDistance.current + 0.5);
      }
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
    window.addEventListener('keydown', handleKeyDown);
    
    // Performance-optimized cleanup interval
    // Adjust frequency based on performance mode
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setSpheres(prevSpheres =>
        prevSpheres.filter(sphere => (now - sphere.createdAt) < sphere.lifetime)
      );
      setRings(prevRings =>
        prevRings.filter(ring => (now - ring.createdAt) < ring.lifetime)
      );
    }, performanceMode === 'high' ? 500 : performanceMode === 'medium' ? 1000 : 2000);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(cleanupInterval);
    };
  }, [isRecording, cameraMode, performanceMode]);

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
    const modes = ['orbit', 'follow', 'panorama', 'free', 'astronaut'];
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

  function setPerformanceMode(settings) {
    // Only apply settings that are actually passed
    if (!settings) return;
    
    console.log('Manual performance settings update:', settings);
    applyPerformanceSettings(settings);
    
    // Reset auto-adjustment tracking
    performanceAutoAdjusted.current = true;
    lowFpsCount.current = 0;
  }

  // Add these helper functions before useImperativeHandle
  // Toggle astronaut first/third person view
  function toggleAstronautView(isFirstPerson) {
    if (cameraMode === 'astronaut') {
      isFirstPersonView.current = isFirstPerson;
    }
  }

  // Set astronaut view distance (for third-person)
  function setAstronautViewDistance(distance) {
    astronautViewDistance.current = Math.max(1, Math.min(10, distance));
  }

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
    toggleAstronautView,
    setAstronautViewDistance,
    isAstronautFirstPerson: () => isFirstPersonView.current,
    getAstronautViewDistance: () => astronautViewDistance.current,
    getKeyData: () => keyData,
    logCameraInfo: () => {
      return {
        position: camera.position.clone(),
        rotation: camera.rotation.clone(),
        mode: cameraMode,
        target: cameraTargetRef.current?.clone() || null
      };
    },
    getActiveSpacecraft: () => activeSpacecraftRef.current,
    getCurrentPerformanceMode: () => performanceMode,
    getPerformanceSettings: () => dynamicSettings || currentSettings
  }));

  function Ring({ ring }) {
    return (
      <mesh position={ring.position} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ring.scale * 1.5, ring.scale * 2.0, 32]} />
        <meshBasicMaterial
          color={ring.color}
          transparent={true}
          opacity={ring.opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  // Use dynamic settings or fallback to props
  const activeSettings = dynamicSettings || (props.performanceSettings || performancePresets[performanceMode]);

  return (
    <>
      {/* Add the Earth component below everything in the scene */}
      <Earth
        modelPath="/models/rock.glb" // Use your actual Earth model path
        visualMode={visualMode}
        scale={750}
        position={[0, -800, 0]}
        rotation={[0, Math.PI, 0]}
      />
    
      <Planet
        modelPath="/models/planet3.glb"
        visualMode={visualMode}
        scale={10}
        position={[0, 15, -56]}
        adImage="/ads/ad3.png"
        adLink="https://example.com/planet-offer"
        adTitle="Explore New Worlds"
        ringTextContent="YOUR AD HERE!"
        onShowModal={onShowAdModal} // Pass the modal handler to Planet
      /> 
      
      <Environment soundIntensity={soundIntensity.current} visualMode={visualMode} />
      {cameraMode === 'orbit' && (
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          maxDistance={1000} // Increased to allow seeing Earth in the distance
          minDistance={1}
          enableDamping
          dampingFactor={0.05}
          target={[0, 0, 0]}
          autoRotate={false}
          maxPolarAngle={Math.PI} // Allow looking straight down to see Earth
        />
      )}
      
      <Astronaut 
        ref={astronautRef}
        visualMode={visualMode}
        orbitRadius={8}
        orbitHeight={5}
        floatSpeed={0.015}   
        scale={5}
      />
      
      <Lighting
        soundIntensity={soundIntensity.current}
        orbColor={orbColor}
        visualMode={visualMode}
      />
      
      <Stars
        radius={20}
        depth={10}
        count={activeSettings.starCount}
        factor={2}
        saturation={visualMode === 'monochrome' ? 0 : 0.3}
        fade
        speed={0.2}
      />
      
      <ParticleField
        soundIntensity={soundIntensity.current}
        performanceSettings={activeSettings}
        visualMode={visualMode}
      />
      
      <ParticleInteraction
        spheres={spheres}
        soundIntensity={soundIntensity.current}
        visualMode={visualMode}
      />
      
      <StarBase
        soundIntensity={soundIntensity.current}
        onColorChange={(color) => setOrbColor(getColorForVisualMode(color, visualMode))}
        visualMode={visualMode}
      />
      
      {process.env.NODE_ENV === 'development' && spacecraftRefs && spacecraftRefs.map((spacecraftRef, index) => {
        if (!spacecraftRef?.current) return null;
        try {
          const position = spacecraftRef.current.getPosition();
          if (position.z <= -500) return null;
          return (
            <group key={`helper-${index}`} position={position}>
              <axesHelper args={[2]} />
            </group>
          );
        } catch (err) {
          return null;
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
          visualMode={visualMode}
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