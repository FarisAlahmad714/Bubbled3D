// FILE: src/App.jsx

import React, { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Howler } from 'howler'
import Scene from './components/Scene'
import MultiTrackLooper from './components/MultiTrackLooper'

export default function App() {
  // "Enter Site" logic
  const [entered, setEntered] = useState(false)

  // Refs to Scene + MultiTrackLooper if needed
  const sceneRef = useRef(null)
  const looperRef = useRef(null)

  // The Scene calls this on recognized key presses
  const handleKeyPress = (key) => {
    if (looperRef.current?.recordKeyPress) {
      looperRef.current.recordKeyPress(key)
    }
  }

  // Styles for the landing screen
  const someStyle = {
    width: '100vw',
    height: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff'
  }

  function handleEnterClick() {
    if (Howler.usingWebAudio && Howler.ctx) {
      Howler.ctx.resume().then(() => {
        console.log('Audio context resumed with Web Audio!')
        setEntered(true)
      })
    } else {
      console.log('Using HTML5 audio fallback or no Web Audio support')
      setEntered(true)
    }
  }

  if (!entered) {
    return (
      <div style={someStyle}>
        <h1>Welcome to My 3D Bubbled Project</h1>
        <p>Click the button below to unlock audio and enter the scene.</p>
        <button onClick={handleEnterClick}>Enter Site</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D scene in Canvas */}
      <Canvas style={{ width: '100%', height: '100%' }}>
        {/* Scene is forwardRef, so ref works.
            No buttons are placed inside the 3D scene now. */}
        <Scene ref={sceneRef} onKeyPress={handleKeyPress} />
      </Canvas>

      {/* Normal HTML overlay for loop controls (Stop, Start, etc.) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: '#fff',
          background: 'rgba(0,0,0,0.4)',
          padding: '0.5rem'
        }}
      >
        <h3>Loop Controls</h3>
        <button onClick={() => sceneRef.current?.startLoop()}>Start Loop</button>
        <button onClick={() => sceneRef.current?.stopLoop()} style={{ marginLeft: '0.5rem' }}>
          Stop Loop
        </button>
        <button onClick={() => sceneRef.current?.deleteLoop()} style={{ marginLeft: '0.5rem' }}>
          Delete Loop
        </button>
      </div>

      {/* (Optional) MultiTrackLooper overlay if you want it */}
      <MultiTrackLooper sceneRef={sceneRef} ref={looperRef} />
    </div>
  )
}
