import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Howler } from 'howler';
import Scene from './components/Scene';
import './App.css'; 
import MultiTrackLooper from './components/MultiTrackLooper';
import AdManager from './components/AdManager';
import CameraBeamLight from './components/CameraBeamLight';

// Performance preset configurations
const PERFORMANCE_PRESETS = {
  low: {
    particleCount: 100,
    maxSpheres: 10,
    postProcessing: false,
    bloomIntensity: 0.3,
    starCount: 200
  },
  medium: {
    particleCount: 300,
    maxSpheres: 20,
    postProcessing: false,
    bloomIntensity: 0.5,
    starCount: 500
  },
  high: {
    particleCount: 600,
    maxSpheres: 30,
    postProcessing: true,
    bloomIntensity: 0.8,
    starCount: 1000
  }
};

export default function App() {
  const [entered, setEntered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showPerformancePopup, setShowPerformancePopup] = useState(false);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [userCameraMode, setUserCameraMode] = useState('orbit');
  const [visualMode, setVisualMode] = useState('default');
  const [cameraSpeed, setCameraSpeed] = useState(0.5);
  const [soundIntensity, setSoundIntensity] = useState(0);
  const [performanceMode, setPerformanceMode] = useState('medium');
  const [fps, setFps] = useState(0);
  const [spacecraftRefs, setSpacecraftRefs] = useState([]);
  const sceneRef = useRef(null);
  const looperRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  // Remove redundant isEntered state since entered already exists
  // const [isEntered, setIsEntered] = useState(false);

  const handleSetSpacecraftRefs = (refs) => {
    setSpacecraftRefs(refs);
  };

  const handleSpacecraftVisibility = (isVisible) => {
    if (isVisible) {
      if (sceneRef.current?.setCameraMode) {
        sceneRef.current.setCameraMode('follow');
        setCameraMode('follow');
      }
    } else {
      if (sceneRef.current?.setCameraMode) {
        sceneRef.current.setCameraMode(userCameraMode);
        setCameraMode(userCameraMode);
      }
    }
  };

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
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (!showControls) {
        setShowControls(true);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    };
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('click', resetTimeout);
    window.addEventListener('keydown', resetTimeout);
    resetTimeout();
    return () => {
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const updateInterval = setInterval(() => {
      if (sceneRef.current.getSoundIntensity) {
        setSoundIntensity(sceneRef.current.getSoundIntensity());
      }
      if (sceneRef.current.getCurrentCameraMode) {
        const currentMode = sceneRef.current.getCurrentCameraMode();
        if (currentMode !== 'follow') {
          setUserCameraMode(currentMode);
        }
        setCameraMode(currentMode);
      }
    }, 100);
    return () => clearInterval(updateInterval);
  }, [sceneRef.current]);

  const handleKeyPress = (key) => {
    if (looperRef.current?.recordKeyPress) {
      looperRef.current.recordKeyPress(key);
    }
  };

  const handleCameraModeToggle = () => {
    if (sceneRef.current?.toggleCameraMode) {
      sceneRef.current.toggleCameraMode();
      const newMode = sceneRef.current.getCurrentCameraMode();
      setUserCameraMode(newMode);
    }
  };

  const handleCameraSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setCameraSpeed(newSpeed);
    if (sceneRef.current?.setCameraSpeed) {
      sceneRef.current.setCameraSpeed(newSpeed / 10);
    }
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
    if (sceneRef.current?.setPerformanceMode) {
      sceneRef.current.setPerformanceMode(PERFORMANCE_PRESETS[mode]);
    }
  };

  function handleEnterClick() {
    if (Howler.usingWebAudio && Howler.ctx) {
      Howler.ctx.resume().then(() => {
        console.log('Audio context resumed with Web Audio!');
        setEntered(true);
      });
    } else {
      console.log('Using HTML5 audio fallback or no Web Audio support');
      setEntered(true);
    }
  }

  // Component to generate animated bubbles
  const Bubbles = () => {
    const bubbles = Array.from({ length: 30 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 100}%`,
      size: `${20 + Math.random() * 50}px`, // 20px to 70px
      duration: `${10 + Math.random() * 20}s`, // 10s to 30s
      delay: `${Math.random() * 5}s`, // 0s to 5s
      sway: `${5 + Math.random() * 10}px`, // 5px to 15px
    }));

    return (
      <>
        {bubbles.map((bubble, index) => (
          <div
            key={index}
            className="bubble"
            style={{
              left: bubble.left,
              bottom: bubble.bottom,
              width: bubble.size,
              height: bubble.size,
              animationDuration: bubble.duration,
              animationDelay: bubble.delay,
              '--sway': bubble.sway,
            }}
          />
        ))}
      </>
    );
  };

  if (!entered) {
    return (
      <div className="landing">
        <Bubbles />
        <h1 className="title">
          {'Bubbled'.split('').map((char, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.1}s` }}>
              {char}
            </span>
          ))}
        </h1>
        <p className="description">
          Welcome to a dynamic 3D audio-visual experience. Press keys to create sounds and visual elements,
          record sequences, and watch as the environment responds to your music.
        </p>
        <button className="enter-button" onClick={handleEnterClick}>
          Enter Experience
        </button>
      </div>
    );
  }


  const controlsStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    zIndex: 10,
    background: 'rgba(10, 15, 30, 0.7)',
    backdropFilter: 'blur(5px)',
    transition: 'opacity 0.5s ease',
    opacity: showControls ? 1 : 0,
    pointerEvents: showControls ? 'auto' : 'none',
    borderBottom: '1px solid rgba(80, 120, 220, 0.3)'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    margin: '0 0.3rem',
    background: 'rgba(40, 50, 80, 0.8)',
    border: '1px solid rgba(80, 120, 220, 0.5)',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: 'rgba(60, 100, 200, 0.8)',
    boxShadow: '0 0 10px rgba(80, 150, 255, 0.5)'
  };

  const sliderContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '0 1rem'
  };

  const sliderLabelStyle = {
    marginRight: '0.5rem',
    fontSize: '0.9rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    alignItems: 'center'
  };

  const fpsCounterStyle = {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    background: 'rgba(0, 0, 0, 0.6)',
    color: fps < 30 ? '#ff5555' : fps < 50 ? '#ffaa55' : '#55ff55',
    padding: '0.3rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    zIndex: 11
  };

  const helpButtonStyle = {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(60, 80, 170, 0.8)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.5rem',
    zIndex: 11,
    boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)'
  };

  const performanceButtonStyle = {
    position: 'absolute',
    bottom: '20px',
    right: '80px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(60, 80, 170, 0.8)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.2rem',
    zIndex: 11,
    boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)'
  };

  const popupStyle = {
    position: 'absolute',
    bottom: '70px',
    right: '20px',
    width: '300px',
    background: 'rgba(15, 20, 35, 0.95)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    padding: '1rem',
    borderRadius: '10px',
    zIndex: 12,
    boxShadow: '0 0 20px rgba(60, 100, 220, 0.5)',
    maxHeight: '400px',
    overflowY: 'auto',
    border: '1px solid rgba(80, 120, 220, 0.3)'
  };

  const performanceOptionStyle = (mode) => ({
    padding: '0.5rem 0.8rem',
    margin: '0.5rem 0',
    background: performanceMode === mode 
      ? 'rgba(60, 100, 200, 0.6)' 
      : 'rgba(30, 40, 70, 0.6)',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: performanceMode === mode 
      ? '1px solid rgba(100, 150, 255, 0.6)'
      : '1px solid rgba(60, 80, 140, 0.3)',
    transition: 'all 0.2s ease'
  });

 
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Canvas 
        style={{ width: '100%', height: '100%' }} 
        dpr={Math.min(1.5, window.devicePixelRatio)}
        frameloop={performanceMode === 'high' ? 'always' : 'demand'}
        gl={{ 
          antialias: performanceMode === 'high',
          powerPreference: 'high-performance',
          alpha: true
        }}
        shadows
      >
        <Scene 
          ref={sceneRef} 
          onKeyPress={handleKeyPress} 
          visualMode={visualMode}
          performanceSettings={PERFORMANCE_PRESETS[performanceMode]}
          spacecraftRefs={spacecraftRefs}
        />
        <AdManager 
          performanceSettings={PERFORMANCE_PRESETS[performanceMode]} 
          onSpacecraftVisible={handleSpacecraftVisibility}
          onSetSpacecraftRefs={handleSetSpacecraftRefs} 
        />
        <CameraBeamLight color="#aaddff" intensity={1.8} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[-10, 10, -10]} 
          intensity={0.8} 
          castShadow 
        />
        <fog attach="fog" args={['#030318', 10, 50]} />
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
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1
        }}>
          <div style={sliderContainerStyle}>
            <span style={sliderLabelStyle}>Camera Speed:</span>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1" 
              value={cameraSpeed} 
              onChange={handleCameraSpeedChange}
              style={{
                accentColor: 'rgba(80, 120, 220, 0.8)'
              }}
            />
          </div>
          
          <button 
            onClick={handleCameraModeToggle}
            style={cameraMode === 'orbit' ? activeButtonStyle : buttonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(50, 70, 120, 0.8)'}
            onMouseOut={(e) => e.target.style.background = cameraMode === 'orbit' 
              ? 'rgba(60, 100, 200, 0.8)' 
              : 'rgba(40, 50, 80, 0.8)'
            }
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
          <div style={{
            background: 'rgba(20, 25, 45, 0.6)',
            padding: '0.5rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>Sound Intensity:</span>
            <div style={{
              width: '100px',
              height: '8px',
              background: 'rgba(30, 40, 60, 0.5)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${soundIntensity * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4466ff, #aa44ff)',
                transition: 'width 0.1s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      <div style={fpsCounterStyle}>
        {fps} FPS
      </div>

      <div 
        style={performanceButtonStyle} 
        onClick={togglePerformancePopup}
        title="Performance Settings"
      >
        ⚙️
      </div>

      <div 
        style={helpButtonStyle} 
        onClick={toggleHelpPopup}
        title="Help"
      >
        ?
      </div>
      
      {showPerformancePopup && (
        <div style={popupStyle}>
          <h3 style={{ borderBottom: '1px solid rgba(80, 120, 220, 0.3)', paddingBottom: '0.5rem' }}>
            Performance Settings
          </h3>
          
          <div onClick={() => changePerformanceMode('low')} 
            style={performanceOptionStyle('low')}
            onMouseOver={(e) => {
              if (performanceMode !== 'low') {
                e.target.style.background = 'rgba(40, 60, 100, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (performanceMode !== 'low') {
                e.target.style.background = 'rgba(30, 40, 70, 0.6)';
              }
            }}
          >
            <div>
              <strong>Low</strong>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                Fewer particles, simpler effects
              </div>
            </div>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: performanceMode === 'low' ? '#55ff55' : '#555',
              border: '1px solid #888'
            }}/>
          </div>
          
          <div onClick={() => changePerformanceMode('medium')} 
            style={performanceOptionStyle('medium')}
            onMouseOver={(e) => {
              if (performanceMode !== 'medium') {
                e.target.style.background = 'rgba(40, 60, 100, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (performanceMode !== 'medium') {
                e.target.style.background = 'rgba(30, 40, 70, 0.6)';
              }
            }}
          >
            <div>
              <strong>Medium</strong>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                Balanced performance & visuals
              </div>
            </div>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: performanceMode === 'medium' ? '#55ff55' : '#555',
              border: '1px solid #888'
            }}/>
          </div>
          
          <div onClick={() => changePerformanceMode('high')} 
            style={performanceOptionStyle('high')}
            onMouseOver={(e) => {
              if (performanceMode !== 'high') {
                e.target.style.background = 'rgba(40, 60, 100, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (performanceMode !== 'high') {
                e.target.style.background = 'rgba(30, 40, 70, 0.6)';
              }
            }}
          >
            <div>
              <strong>High</strong>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                Maximum visual quality
              </div>
            </div>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: performanceMode === 'high' ? '#55ff55' : '#555',
              border: '1px solid #888'
            }}/>
          </div>
          
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '1rem' }}>
            If you experience lag, try a lower setting.
            Changes apply immediately.
          </p>
        </div>
      )}
      
      {showHelpPopup && (
        <div style={popupStyle}>
          <h3 style={{ borderBottom: '1px solid rgba(80, 120, 220, 0.3)', paddingBottom: '0.5rem' }}>
            Keyboard Controls:
          </h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li style={{ margin: '0.3rem 0' }}>Keys 1-6: Play different sounds with green/blue spheres</li>
            <li style={{ margin: '0.3rem 0' }}>Keys Q-W-E: Play sounds with orange/red spheres</li>
            <li style={{ margin: '0.3rem 0' }}>Keys A-S-D-F: Additional sound options</li>
            <li style={{ margin: '0.3rem 0' }}>Press C: Toggle camera modes</li>
          </ul>
          
          <h3 style={{ borderBottom: '1px solid rgba(80, 120, 220, 0.3)', paddingBottom: '0.5rem', marginTop: '1rem' }}>
            Tips:
          </h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li style={{ margin: '0.3rem 0' }}>Create loops by recording sequences of keypresses</li>
            <li style={{ margin: '0.3rem 0' }}>Try different camera modes for varied perspectives</li>
            <li style={{ margin: '0.3rem 0' }}>Experiment with layering multiple sounds</li>
            <li style={{ margin: '0.3rem 0' }}>If performance is slow, try the ⚙️ menu for performance options</li>
          </ul>
        </div>
      )}

      <MultiTrackLooper sceneRef={sceneRef} ref={looperRef} />
    </div>
  );
}