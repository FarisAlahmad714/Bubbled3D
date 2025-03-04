// FILE: src/components/Scene.jsx

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react'
import { OrbitControls, PerspectiveCamera, useTexture, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Howl } from 'howler'
import { v4 as uuidv4 } from 'uuid'
import * as THREE from 'three'
import Sphere from './Sphere'
import Environment from './Environment'
import ParticleField from './ParticleField'
import ParticleInteraction from './ParticleInteraction'
import Lighting from './Lighting'

const Scene = forwardRef(function Scene(props, ref) {
  const [spheres, setSpheres] = useState([])
  const [cameraMode, setCameraMode] = useState('orbit') // orbit, follow, panorama
  const { camera } = useThree()
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0))
  const cameraPositionRef = useRef(new THREE.Vector3(0, 5, 10))
  const cameraPanoramaAngle = useRef(0)
  const lastActiveTime = useRef(Date.now())
  const activeSphereRef = useRef(null)
  
  // Camera animation parameters
  const cameraParams = useRef({
    speed: 0.02,
    orbitRadius: 15,
    orbitHeight: 5,
    followSpeed: 0.05,
    panoramaSpeed: 0.005,
    panoramaRadius: 20,
    autoSwitchDelay: 30000, // 30 seconds of inactivity to auto-switch camera modes
  })

  // KEY -> SOUND data with enhanced color palette and more properties
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
  }

  // SINGLE LOOP logic
  const recordedEvents = useRef([])
  const recordStart = useRef(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const timeoutsAndIntervals = useRef([])
  
  // Sound intensity tracking for visual reactivity
  const soundIntensity = useRef(0)
  const peakIntensity = useRef(0)
  const intensityDecay = useRef(0.95) // How quickly the intensity fades

  // Handle camera modes and animations
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    const now = Date.now()
    
    // Handle inactivity detection for auto camera switching
    if (now - lastActiveTime.current > cameraParams.current.autoSwitchDelay) {
      // Switch camera mode after inactivity
      const modes = ['orbit', 'panorama', 'follow']
      const currentIndex = modes.indexOf(cameraMode)
      const nextIndex = (currentIndex + 1) % modes.length
      setCameraMode(modes[nextIndex])
      lastActiveTime.current = now // Reset timer after switching
    }
    
    // Update sound intensity decay
    soundIntensity.current *= intensityDecay.current
    if (soundIntensity.current < 0.01) soundIntensity.current = 0
    
    // Camera animations based on mode
    if (cameraMode === 'orbit') {
      // Smooth orbital movement
      const orbitX = Math.sin(time * cameraParams.current.speed) * cameraParams.current.orbitRadius
      const orbitZ = Math.cos(time * cameraParams.current.speed) * cameraParams.current.orbitRadius
      cameraPositionRef.current.set(orbitX, cameraParams.current.orbitHeight, orbitZ)
      camera.position.lerp(cameraPositionRef.current, 0.01)
      camera.lookAt(0, 0, 0)
    } 
    else if (cameraMode === 'follow' && activeSphereRef.current) {
      // Follow the most recently active sphere
      cameraTargetRef.current.lerp(activeSphereRef.current, cameraParams.current.followSpeed)
      camera.lookAt(cameraTargetRef.current)
    }
    else if (cameraMode === 'panorama') {
      // Panoramic movement around the scene
      cameraPanoramaAngle.current += cameraParams.current.panoramaSpeed
      const panoramaX = Math.sin(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius
      const panoramaZ = Math.cos(cameraPanoramaAngle.current) * cameraParams.current.panoramaRadius
      const panoramaY = 5 + Math.sin(time * 0.1) * 2 // Slight up and down motion
      
      cameraPositionRef.current.set(panoramaX, panoramaY, panoramaZ)
      camera.position.lerp(cameraPositionRef.current, 0.01)
      camera.lookAt(0, 0, 0)
    }
  })

  // CREATE SPHERE + PLAY SOUND with enhanced properties
  function createSphereAndPlaySound(k) {
    if (!keyData[k]) return
    
    // Update activity timestamp
    lastActiveTime.current = Date.now()
    
    // More dynamic position generation using spherical coordinates for better distribution
    const radius = 5 + Math.random() * 5 // Distance from center
    const theta = Math.random() * Math.PI * 2 // Around Y axis
    const phi = Math.acos((Math.random() * 2) - 1) // From top to bottom
    
    const position = [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + (Math.random() - 0.5) * 2, // Add some variation to Y
      radius * Math.sin(phi) * Math.sin(theta)
    ]
    
    // Create a more complex sphere object with additional properties
    const newSphere = {
      position,
      color: keyData[k].color,
      id: uuidv4(),
      scale: keyData[k].scale || 1.0,
      pulseSpeed: keyData[k].pulseSpeed || 0.5,
      createdAt: Date.now(),
      lifetime: keyData[k].lifetime || 8000, // Sphere lifetime in ms
      key: k // Remember which key created this sphere
    }
    
    // Keep track of this sphere as the active one for camera following
    activeSphereRef.current = new THREE.Vector3(...position)
    
    // Add new sphere to state, keeping the newest 50
    setSpheres(prev => {
      const next = [...prev, newSphere]
      if (next.length > 50) next.shift()
      return next
    })

    // Play sound with enhanced volume based on accumulated intensity
    const sound = new Howl({ 
      src: keyData[k].src,
      volume: 0.8 + (soundIntensity.current * 0.2) // Slight volume increase with activity
    })
    sound.play()
    
    // Increase sound intensity for visual reactivity
    soundIntensity.current += 0.3
    if (soundIntensity.current > 1) soundIntensity.current = 1
    peakIntensity.current = Math.max(peakIntensity.current, soundIntensity.current)
  }

  // Handle keydown to create sphere and, if recording, record the event
  function handleKeyDown(e) {
    const k = e.key.toLowerCase()
    if (keyData[k]) {
      createSphereAndPlaySound(k)
      if (props.onKeyPress) {
        props.onKeyPress(k)
      }
      if (isRecording) {
        const now = performance.now()
        recordedEvents.current.push({
          offset: now - recordStart.current,
          key: k
        })
      }
    }
    
    // Camera control keys
    if (e.key === 'c') {
      // Cycle through camera modes
      const modes = ['orbit', 'follow', 'panorama']
      const currentIndex = modes.indexOf(cameraMode)
      const nextIndex = (currentIndex + 1) % modes.length
      setCameraMode(modes[nextIndex])
      lastActiveTime.current = Date.now() // Reset inactivity timer
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    
    // Set up a clean up interval to remove spheres that exceeded their lifetime
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      setSpheres(prevSpheres => 
        prevSpheres.filter(sphere => (now - sphere.createdAt) < sphere.lifetime)
      )
    }, 1000) // Check once per second
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(cleanupInterval)
    }
  }, [isRecording, cameraMode])

  // RECORDING methods
  function startRecording() {
    recordedEvents.current = []
    recordStart.current = performance.now()
    setIsRecording(true)
  }
  function stopRecording() {
    setIsRecording(false)
  }

  // PLAY ONCE: schedules setTimeouts for each recorded event and returns total duration
  function playOnce() {
    const evs = recordedEvents.current
    if (!evs.length) return 0
    const totalDuration = evs[evs.length - 1].offset
    evs.forEach(ev => {
      const tId = setTimeout(() => {
        createSphereAndPlaySound(ev.key)
      }, ev.offset)
      timeoutsAndIntervals.current.push(tId)
    })
    return totalDuration
  }

  // LOOP methods
  function startLoop() {
    if (isLooping) return
    setIsLooping(true)
    const dur = playOnce()
    if (dur <= 0) return
    const intervalId = setInterval(() => {
      playOnce()
    }, dur)
    timeoutsAndIntervals.current.push(intervalId)
  }
  function stopLoop() {
    setIsLooping(false)
    timeoutsAndIntervals.current.forEach(id => {
      clearTimeout(id)
      clearInterval(id)
    })
    timeoutsAndIntervals.current = []
  }
  function deleteLoop() {
    stopLoop()
    recordedEvents.current = []
  }

  // Remove sphere from state
  function removeSphereFromState(sId) {
    setSpheres(prev => prev.filter(s => s.id !== sId))
  }

  // Toggle camera mode from parent component
  function toggleCameraMode() {
    const modes = ['orbit', 'follow', 'panorama']
    const currentIndex = modes.indexOf(cameraMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setCameraMode(modes[nextIndex])
    lastActiveTime.current = Date.now() // Reset inactivity timer
  }

  // Set camera motion speed
  function setCameraSpeed(speed) {
    cameraParams.current.speed = speed
    cameraParams.current.panoramaSpeed = speed / 4
  }

  // Expose methods to the parent via ref
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
  }))

  return (
    <>
      <Environment soundIntensity={soundIntensity.current} />
      
      {/* We're not using the drei PerspectiveCamera component anymore 
          since we're controlling the camera directly via useThree */}
      
      {/* Conditionally show OrbitControls only in orbit mode, and disable when auto-animating */}
      {cameraMode === 'orbit' && (
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          maxDistance={30}
          minDistance={2}
          enableDamping
          dampingFactor={0.05}
        />
      )}
      
      <Lighting soundIntensity={soundIntensity.current} />
      
      {/* Add starfield background */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.5} 
      />

      {/* Particle systems */}
      <ParticleField soundIntensity={soundIntensity.current} />
      <ParticleInteraction 
        spheres={spheres} 
        soundIntensity={soundIntensity.current}
      />

      {/* Render all spheres with enhanced props */}
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
  )
})

export default Scene