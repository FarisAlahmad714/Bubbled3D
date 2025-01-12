import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Howler } from 'howler';
import Scene from './components/Scene';

export default function App() {
  const [entered, setEntered] = useState(false);

  function handleEnterClick() {
    // Check if Howler is using the Web Audio API
    if (Howler.usingWebAudio && Howler.ctx) {
      Howler.ctx.resume().then(() => {
        console.log('Audio context resumed with Web Audio!');
        setEntered(true);
      });
    } else {
      // This means HTML5 audio fallback or no Web Audio support
      console.log('Using HTML5 audio or no Web Audio support. No resume needed.');
      setEntered(true);
    }
  }

  // If the user hasn't clicked "Enter Site," show the landing screen
  if (!entered) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <h1>Welcome to My 3D Bubbled Project</h1>
        <p>Click the button below to unlock audio and enter the scene.</p>
        <button
          onClick={handleEnterClick}
          style={{
            padding: '1em 2em',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '1em',
          }}
        >
          Enter Site
        </button>
      </div>
    );
  }

  // Once "entered" is true, render the Canvas + Scene
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        <Scene />
      </Canvas>
    </div>
  );
}
