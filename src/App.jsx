// FILE: src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './components/Scene';
import MultiTrackLooper from './components/MultiTrackLooper';

// Performance preset configurations
const PERFORMANCE_PRESETS = {
  low: { particleCount: 100, maxSpheres: 10, postProcessing: false, bloomIntensity: 0.3, starCount: 200 },
  medium: { particleCount: 300, maxSpheres: 20, postProcessing: false, bloomIntensity: 0.5, starCount: 500 },
  high: { particleCount: 600, maxSpheres: 30, postProcessing: true, bloomIntensity: 0.8, starCount: 1000 }
};

export default function App() {
  const [entered, setEntered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showPerformancePopup, setShowPerformancePopup] = useState(false);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [visualMode, setVisualMode] = useState('default');
  const [cameraSpeed, setCameraSpeed] = useState(0.5);
  const [soundIntensity, setSoundIntensity] = useState(0);
  const [performanceMode, setPerformanceMode] = useState('medium');
  const [fps, setFps] = useState(0);

  const sceneRef = useRef(null);
  const looperRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    let frameId;
    const updateFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      if (delta > 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
      frameCountRef.current++;
      frameId = requestAnimationFrame(updateFps);
    };
    frameId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const resetTimeout = () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (!showControls) setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 5000);
    };
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('click', resetTimeout);
    window.addEventListener('keydown', resetTimeout);
    resetTimeout();
    return () => {
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const updateInterval = setInterval(() => {
      if (sceneRef.current.getSoundIntensity) setSoundIntensity(sceneRef.current.getSoundIntensity());
      if (sceneRef.current.getCurrentCameraMode) setCameraMode(sceneRef.current.getCurrentCameraMode());
    }, 100);
    return () => clearInterval(updateInterval);
  }, [sceneRef.current]);

  const handleKeyPress = (key) => {
    if (looperRef.current?.recordKeyPress) looperRef.current.recordKeyPress(key);
  };

  const handleCameraModeToggle = () => {
    if (sceneRef.current?.toggleCameraMode) sceneRef.current.toggleCameraMode();
  };

  const handleCameraSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setCameraSpeed(newSpeed);
    if (sceneRef.current?.setCameraSpeed) sceneRef.current.setCameraSpeed(newSpeed / 10);
  };

  const handleVisualModeToggle = () => {
    const modes = ['default', 'neon', 'dream', 'monochrome'];
    const currentIndex = modes.indexOf(visualMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setVisualMode(modes[nextIndex]);
  };

  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
    setShowPerformancePopup(false);
  };

  const togglePerformancePopup = () => {
    setShowPerformancePopup(!showPerformancePopup);
    setShowHelpPopup(false);
  };

  const changePerformanceMode = (mode) => {
    setPerformanceMode(mode);
    if (sceneRef.current?.setPerformanceMode) sceneRef.current.setPerformanceMode(PERFORMANCE_PRESETS[mode]);
  };

  function handleEnterClick() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    audioCtx.resume().then(() => {
      console.log('Audio context resumed successfully');
      setEntered(true);
    }).catch(err => {
      console.error('Error resuming audio context:', err);
      setEntered(true);
    });
  }

  const landingStyle = { width: '100vw', height: '100vh', background: 'linear-gradient(to bottom, #000000, #101025)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Arial, sans-serif' };
  const landingTitleStyle = { fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 10px rgba(120, 160, 255, 0.8)', animation: 'pulse 2s infinite' };
  const landingDescStyle = { fontSize: '1.2rem', maxWidth: '600px', textAlign: 'center', marginBottom: '2rem', lineHeight: '1.6' };
  const enterButtonStyle = { padding: '1rem 2rem', fontSize: '1.5rem', background: 'linear-gradient(45deg, #4466ff, #aa44ff)', border: 'none', borderRadius: '50px', color: 'white', cursor: 'pointer', boxShadow: '0 0 15px rgba(120, 160, 255, 0.5)', transition: 'all 0.3s ease' };
  const controlsStyle = { position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', zIndex: 10, background: 'rgba(10, 15, 30, 0.7)', backdropFilter: 'blur(5px)', transition: 'opacity 0.5s ease', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none', borderBottom: '1px solid rgba(80, 120, 220, 0.3)' };
  const buttonStyle = { padding: '0.5rem 1rem', margin: '0 0.3rem', background: 'rgba(40, 50, 80, 0.8)', border: '1px solid rgba(80, 120, 220, 0.5)', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' };
  const activeButtonStyle = { ...buttonStyle, background: 'rgba(60, 100, 200, 0.8)', boxShadow: '0 0 10px rgba(80, 150, 255, 0.5)' };
  const sliderContainerStyle = { display: 'flex', alignItems: 'center', margin: '0 1rem' };
  const sliderLabelStyle = { marginRight: '0.5rem', fontSize: '0.9rem' };
  const buttonGroupStyle = { display: 'flex', alignItems: 'center' };
  const fpsCounterStyle = { position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0, 0, 0, 0.6)', color: fps < 30 ? '#ff5555' : fps < 50 ? '#ffaa55' : '#55ff55', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem', zIndex: 11 };
  const helpButtonStyle = { position: 'absolute', bottom: '20px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(60, 80, 170, 0.8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.5rem', zIndex: '11', boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)' };
  const performanceButtonStyle = { position: 'absolute', bottom: '20px', right: '80px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(60, 80, 170, 0.8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', zIndex: 11, boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)' };
  const popupStyle = { position: 'absolute', bottom: '70px', right: '20px', width: '300px', background: 'rgba(15, 20, 35, 0.95)', backdropFilter: 'blur(10px)', color: 'white', padding: '1rem', borderRadius: '10px', zIndex: 12, boxShadow: '0 0 20px rgba(60, 100, 220, 0.5)', maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(80, 120, 220, 0.3)' };
  const performanceOptionStyle = (mode) => ({ padding: '0.5rem 0.8rem', margin: '0.5rem 0', background: performanceMode === mode ? 'rgba(60, 100, 200, 0.6)' : 'rgba(30, 40, 70, 0.6)', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: performanceMode === mode ? '1px solid rgba(100, 150, 255, 0.6)' : '1px solid rgba(60, 80, 140, 0.3)', transition: 'all 0.2s ease' });

  if (!entered) {
    return (
      <div style={landingStyle}>
        <h1 style={landingTitleStyle}>Interactive Sound Spheres</h1>
        <p style={landingDescStyle}>
          Welcome to a dynamic 3D audio-visual experience. Press keys like 1-6 or Q-F to create sounds and spheres,
          record loops, and vibe to the visuals.
        </p>
        <button 
          style={enterButtonStyle} 
          onClick={handleEnterClick}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          Enter Experience
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Canvas 
        style={{ width: '100%', height: '100%' }} 
        dpr={Math.min(1.5, window.devicePixelRatio)}
        frameloop={performanceMode === 'high' ? 'always' : 'demand'}
        gl={{ antialias: performanceMode === 'high', powerPreference: 'high-performance', alpha: true }}
      >
        <Scene 
          ref={sceneRef} 
          onKeyPress={handleKeyPress} 
          visualMode={visualMode}
          performanceSettings={PERFORMANCE_PRESETS[performanceMode]}
        />
        <MultiTrackLooper ref={looperRef} sceneRef={sceneRef} />
      </Canvas>

      <div style={controlsStyle}>
        <div style={buttonGroupStyle}>
          <button 
            onClick={() => sceneRef.current?.startLoop()}
            style={buttonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
          >
            Start Loop
          </button>
          <button 
            onClick={() => sceneRef.current?.stopLoop()} 
            style={buttonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
          >
            Stop Loop
          </button>
          <button 
            onClick={() => sceneRef.current?.deleteLoop()} 
            style={buttonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
          >
            Clear Loop
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={sliderContainerStyle}>
            <span style={sliderLabelStyle}>Camera Speed:</span>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1" 
              value={cameraSpeed} 
              onChange={handleCameraSpeedChange}
              style={{ accentColor: 'rgba(80, 120, 220, 0.8)' }}
            />
          </div>
          
          <button 
            onClick={handleCameraModeToggle}
            style={cameraMode === 'orbit' ? activeButtonStyle : buttonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
            onMouseOut={(e) => e.target.style.background = cameraMode === 'orbit' ? 'rgba(60, 100, 200, 0.8)' : 'rgba(40, 50, 80, 0.8)'}
          >
            Camera: {cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1)}
          </button>
          
          <button 
            onClick={handleVisualModeToggle}
            style={buttonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(40, 50, 80, 0.8)'}
          >
            Visual: {visualMode.charAt(0).toUpperCase() + visualMode.slice(1)}
          </button>
        </div>

        <div style={buttonGroupStyle}>
          <div style={{ background: 'rgba(20, 25, 45, 0.6)', padding: '0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>Sound Intensity:</span>
            <div style={{ width: '100px', height: '8px', background: 'rgba(30, 40, 60, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${soundIntensity * 100}%`, height: '100%', background: 'linear-gradient(90deg, #4466ff, #aa44ff)', transition: 'width 0.1s ease' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={fpsCounterStyle}>{fps} FPS</div>
      <div style={performanceButtonStyle} onClick={togglePerformancePopup} title="Performance Settings">⚙️</div>
      <div style={helpButtonStyle} onClick={toggleHelpPopup} title="Help">?</div>
      
      {showPerformancePopup && (
        <div style={popupStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(80, 120, 220, 0.5)', paddingBottom: '0.5rem' }}>
            Performance Settings
          </h3>
          <div style={performanceOptionStyle('low')} onClick={() => changePerformanceMode('low')}>
            <span>Low</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>For older devices</span>
          </div>
          <div style={performanceOptionStyle('medium')} onClick={() => changePerformanceMode('medium')}>
            <span>Medium</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Balanced</span>
          </div>
          <div style={performanceOptionStyle('high')} onClick={() => changePerformanceMode('high')}>
            <span>High</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Best visuals</span>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
            Lower settings improve performance on weaker devices.
          </p>
        </div>
      )}
      
      {showHelpPopup && (
        <div style={popupStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(80, 120, 220, 0.5)', paddingBottom: '0.5rem' }}>
            How to Use
          </h3>
          <p>Press keys to create sounds and spheres:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>1: Bubbles, 2: Clay, 3: Confetti, 4: Corona, 5: Dotted-Spiral, 6: Flash-1</li>
            <li>Q: Flash-2, W: Flash-3, E: Glimmer, R: Moon</li>
            <li>A: Pinwheel, S: Piston-1, D: Piston-2, F: Piston-3</li>
            <li>C: Switch camera mode</li>
          </ul>
          <p>Record loops:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>"Start Loop" to record</li>
            <li>Press keys to add sounds</li>
            <li>"Stop Loop" to finish</li>
            <li>"Start Loop" to replay</li>
          </ul>
          <p>Adjust camera speed and visuals with top controls.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Tip: Move mouse or press keys to show controls.
          </p>
        </div>
      )}
    </div>
  );
}