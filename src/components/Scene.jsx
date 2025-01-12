// FILE: src/components/Scene.jsx

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Howl } from 'howler'
import { v4 as uuidv4 } from 'uuid'
import Sphere from './Sphere'
import Environment from './Environment'
import ParticleField from './ParticleField'
import ParticleInteraction from './ParticleInteraction'
import Lighting from './Lighting'

const Scene = forwardRef(function Scene(props, ref) {
  const [spheres, setSpheres] = useState([])

  // KEY -> SOUND data
  const keyData = {
    '1': { color: '#d0f0c0', src: ['/Sounds/confetti.mp3'] },
    '2': { color: '#e6e6fa', src: ['/Sounds/clay.mp3'] },
    '3': { color: '#00ffff', src: ['/Sounds/corona.mp3'] },
    '4': { color: '#d8bfd8', src: ['/Sounds/dotted-spiral.mp3'] },
    '5': { color: '#ba99dd', src: ['/Sounds/glimmer.mp3'] },
    '6': { color: '#EF5350', src: ['/Sounds/moon.mp3'] },
    'q': { color: '#FF5733', src: ['/Sounds/flash-1.mp3'] },
    'w': { color: '#FF8333', src: ['/Sounds/pinwheel.mp3'] },
    'e': { color: '#FFAE33', src: ['/Sounds/piston-1.mp3'] },
  }

  // SINGLE LOOP logic
  // Stored recorded keystroke events: each event = { offset, key }
  const recordedEvents = useRef([])
  const recordStart = useRef(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  // All setTimeout and setInterval IDs will be stored here
  const timeoutsAndIntervals = useRef([])

  // CREATE SPHERE + PLAY SOUND
  function createSphereAndPlaySound(k) {
    if (!keyData[k]) return
    const position = [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    ]
    const newSphere = { position, color: keyData[k].color, id: uuidv4() }
    setSpheres(prev => {
      const next = [...prev, newSphere]
      if (next.length > 50) next.shift()
      return next
    })

    const sound = new Howl({ src: keyData[k].src })
    sound.play()
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
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecording])

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

  // Expose methods to the parent via ref
  useImperativeHandle(ref, () => ({
    createSphereAndPlaySound,  // Now exposed!
    startRecording,
    stopRecording,
    startLoop,
    stopLoop,
    deleteLoop
  }))

  return (
    <>
      <Environment />
      <PerspectiveCamera makeDefault position={[0, 5, 10]} />
      <OrbitControls enableZoom={false} />
      <Lighting />
      <pointLight position={[10, 10, 10]} />

      {/* These R3F components must be inside Canvas */}
      <ParticleField />
      <ParticleInteraction spheres={spheres} />

      {spheres.map(s => (
        <Sphere
          key={s.id}
          sphereId={s.id}
          position={s.position}
          color={s.color}
          removeSphere={removeSphereFromState}
        />
      ))}

   
    </>
  )
})

export default Scene
