import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Howler } from 'howler';
import Scene from './components/Scene';
import './App.css';
import './MobileStyles.css'; // Import mobile-specific styles
import MultiTrackLooper from './components/MultiTrackLooper';
import AdManager from './components/AdManager';
//import DebugUI from './components/DebugUI';
import EnhancedBubblesTitle from './components/EnhancedBubblesTitle';
import { AudioManagerProvider, useAudioManager } from './components/AudioManager';
import AdModal from './components/AdModal'; 
import GuidedTour from './components/GuidedTour';
import SubtitledWelcomeText from './components/SubtitledWelcomeText';
import MobileControls from './components/MobileControls';
import TouchControls from './components/TouchControls';
import { detectMobileDevice } from './utils/DeviceDetector';
// Import Firebase functions
import { initFirebase, trackAdClick } from './components/FirebaseAnalytics';

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

// Main App component wrapped with AudioManagerProvider
export default function AppWithAudio() {
  return (
    <AudioManagerProvider>
      <App />
    </AudioManagerProvider>
  );
}

// Actual App implementation
function App() {
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  
  // Welcome audio states
  const [welcomeAudioPlayed, setWelcomeAudioPlayed] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const welcomeAudioRef = useRef(null);
  const welcomeAudioScheduled = useRef(false);
  const userInteractionReceived = useRef(false);
  
  // Mobile-specific states
  const [deviceInfo, setDeviceInfo] = useState(() => detectMobileDevice());
  
  // Keyboard visibility state - NEW
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  
  // Add state for the guided tour
  const [showTour, setShowTour] = useState(false);
  
  // Add state for the ad modal
  const [adModalInfo, setAdModalInfo] = useState(null);
  
  // Access the AudioManager using our custom hook
  const audioManager = useAudioManager();
  
  const sceneRef = useRef(null);
  const looperRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const spacecraftRefsArray = useRef([]);
  const particleContainerRef = useRef(null);

  // Initialize Firebase analytics on app load
  useEffect(() => {
    initFirebase();
  }, []);

  // Update device info on resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Handle sound triggering from mobile UI
  const handleMobileSoundTrigger = (key) => {
    // First try direct Scene access
    if (sceneRef.current?.createSphereAndPlaySound) {
      sceneRef.current.createSphereAndPlaySound(key);
    }
    
    // Also send to the looper if recording
    if (looperRef.current?.recordKeyPress) {
      looperRef.current.recordKeyPress(key);
    }
  };

  // Handle keyboard visibility toggle - NEW
  const toggleKeyboard = () => {
    setKeyboardVisible(prev => !prev);
    // Store preference in localStorage
    localStorage.setItem('keyboardVisible', (!keyboardVisible).toString());
  };
  
  // Load keyboard visibility preference - NEW
  useEffect(() => {
    const savedVisibility = localStorage.getItem('keyboardVisible');
    if (savedVisibility !== null) {
      setKeyboardVisible(savedVisibility === 'true');
    }
  }, []);

  // Check if user has seen the guided tour before
  useEffect(() => {
    if (entered) {
      console.log('Setting showTour to true for debugging');
      // Force the tour to show for testing
      setShowTour(true);
      
      // Uncomment this when done debugging
      // const hasCompletedTour = localStorage.getItem('hasCompletedTour') === 'true';
      // setShowTour(!hasCompletedTour);
    }
  }, [entered]);
  
  // Updated welcome audio logic - Fixed to prevent double playing
  useEffect(() => {
    // Only set up welcome audio if we're on the landing page
    if (!entered && !welcomeAudioPlayed && !welcomeAudioScheduled.current) {
      welcomeAudioScheduled.current = true;
      
      // Setup a one-time event handler for first user interaction
      const playOnInteraction = () => {
        if (!welcomeAudioPlayed && !userInteractionReceived.current) {
          userInteractionReceived.current = true;
          
          // Set welcomeAudioPlayed to true FIRST to prevent double play
          setWelcomeAudioPlayed(true);
          
          console.log('Playing welcome audio after user interaction');
          welcomeAudioRef.current = audioManager.playOneShot('/Sounds/welcome.mp3', { 
            volume: 0.75,
            onend: () => console.log('Welcome audio finished playing'),
            onerror: (err) => console.error('Welcome audio error:', err)
          });
          
          // Remove all event listeners after first interaction
          events.forEach(event => window.removeEventListener(event, playOnInteraction));
        }
      };
      
      // Listen for ANY interaction to play welcome audio
      const events = ['click', 'touchstart', 'keydown', 'pointerdown', 'mousedown'];
      events.forEach(event => window.addEventListener(event, playOnInteraction, { once: true }));
      
      // Clean up event listeners
      return () => {
        events.forEach(event => window.removeEventListener(event, playOnInteraction));
      };
    }
  }, [audioManager, entered, welcomeAudioPlayed]);
  
  // Handler to complete the tour
  const handleTourComplete = () => {
    console.log('Tour completion handler called');
    setShowTour(false);
    localStorage.setItem('hasCompletedTour', 'true');
  };

  // Function to manually start the tour
  const startTour = () => {
    setShowTour(true);
    setShowHelpPopup(false);
  };

  // Handler to show the ad modal - Updated with Firebase tracking
  const handleShowAdModal = (adInfo) => {
    console.log("App.jsx: Modal handler called with:", adInfo);
    setAdModalInfo(adInfo);
  };
  
  // Handler to close the ad modal and track clicks
  const handleCloseAdModal = (isClick = false) => {
    // If this is a real ad click (not just closing), track it
    if (isClick && adModalInfo) {
      trackAdClick(adModalInfo.adTitle || "Unknown Ad");
    }
    
    setAdModalInfo(null);
  };

  const handleSetSpacecraftRefs = (refs) => {
    spacecraftRefsArray.current = refs;
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

  // Handle mouse movement for interactive elements
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Update loading progress from AudioManager
  useEffect(() => {
    if (!entered && isLoading) {
      // Use AudioManager's loading progress if available
      if (audioManager && audioManager.loadingProgress > 0) {
        setLoadingProgress(audioManager.loadingProgress);
        if (audioManager.loadingProgress >= 100) {
          setTimeout(() => setIsLoading(false), 500);
        }
        return;
      }
      
      // Fallback loading simulation if AudioManager isn't ready yet
      let interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + (Math.random() * 15);
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => setIsLoading(false), 500);
            return 100;
          }
          return newProgress;
        });
      }, 200);
      
      return () => clearInterval(interval);
    }
  }, [isLoading, entered, audioManager]);

  // FPS counter
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

  // Hide controls when inactive
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

  // Update sound intensity and camera mode from Scene component
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
    // If help is already showing, clicking again will start the tour
    if (showHelpPopup) {
      setShowHelpPopup(false);
      startTour();
    } else {
      setShowHelpPopup(!showHelpPopup);
      setShowPerformancePopup(false);
    }
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

  // Updated enter button handler to properly handle welcome audio
  async function handleEnterClick() {
    // Properly stop welcome audio - FIXED: using pause() instead of stop()
    if (welcomeAudioRef.current) {
      console.log('Stopping welcome audio due to enter click');
      // For HTML5 Audio element, use pause() not stop()
      if (welcomeAudioRef.current.pause) {
        welcomeAudioRef.current.pause();
      } else if (welcomeAudioRef.current.stop) {
        welcomeAudioRef.current.stop();
      }
      welcomeAudioRef.current = null;
    } else if (audioManager.stopSound) {
      audioManager.stopSound('/Sounds/welcome.mp3');
    }
    
    // Make sure we won't play welcome audio after this
    setWelcomeAudioPlayed(true);
    
    // Initialize audio context for the main experience
    try {
      const success = await audioManager.forceResumeAudio();
      if (success) {
        console.log('Audio context resumed successfully on enter!');
        // Wait a moment to ensure audio context is fully active
        setTimeout(() => {
          setEntered(true);
        }, 100);
      } else {
        console.warn('Audio context resume returned false, trying anyway');
        setEntered(true);
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      // Fallback to traditional method if our AudioManager fails
      if (Howler.usingWebAudio && Howler.ctx) {
        Howler.ctx.resume().then(() => {
          console.log('Audio context resumed with Howler Web Audio!');
          setEntered(true);
        });
      } else {
        console.log('Using HTML5 audio fallback or no Web Audio support');
        setEntered(true);
      }
    }
  }

  // FIXED: Portrait mode warning component with persistent dismissal
  const PortraitModeWarning = ({ isPortrait, isPhone }) => {
    // Use a ref to track the dismissed state that persists through re-renders
    const dismissedRef = useRef(false);
    const [dismissed, setDismissed] = useState(false);
    
    // Check for stored dismissal state on mount
    useEffect(() => {
      const wasDismissed = sessionStorage.getItem('portraitWarningDismissed') === 'true';
      if (wasDismissed) {
        dismissedRef.current = true;
        setDismissed(true);
      }
    }, []);
    
    const handleDismiss = () => {
      dismissedRef.current = true;
      setDismissed(true);
      // Store dismissal in sessionStorage
      sessionStorage.setItem('portraitWarningDismissed', 'true');
    };
    
    if (!isPhone || !isPortrait || dismissedRef.current) return null;
  
    return (
      <div className="portrait-message">
        <div style={{ fontSize: '24px', marginBottom: '1rem' }}>
          ↺ Rotate Your Device ↻
        </div>
        <p>
          For the best experience with the sound keyboard,
          please rotate your device to landscape mode.
        </p>
        <button 
          onClick={handleDismiss}
          style={{
            marginTop: '1rem',
            padding: '10px 20px',
            background: 'rgba(80, 120, 220, 0.8)',
            border: 'none',
            borderRadius: '20px',
            color: 'white'
          }}
        >
          Continue Anyway
        </button>
      </div>
    );
  };

  // Optimized bubbles that don't reset
  const OptimizedBubbles = () => {
    // Create and cache bubbles only once
    const [bubbles] = useState(() => {
      const bubbleCount = 20;
      const generatedBubbles = [];
      
      for (let i = 0; i < bubbleCount; i++) {
        const size = 20 + Math.random() * 70;
        const duration = 15 + Math.random() * 20;
        const delay = Math.random() * 8;
        const swayX = 30 + Math.random() * 60;
        const maxOpacity = 0.3 + Math.random() * 0.3;
        
        generatedBubbles.push({
          key: i,
          left: `${Math.random() * 100}%`,
          bottom: `${Math.random() * 40}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${duration}s`,
          swayX: `${swayX}px`,
          maxOpacity,
          animationDelay: `${delay}s`,
        });
      }
      
      return generatedBubbles;
    });
    
    return (
      <>
        {bubbles.map(bubble => (
          <div
            key={bubble.key}
            className="bubble"
            style={{
              left: bubble.left,
              bottom: bubble.bottom,
              width: bubble.width,
              height: bubble.height,
              '--animation-duration': bubble.animationDuration,
              '--sway-x': bubble.swayX,
              '--max-opacity': bubble.maxOpacity,
              animationDelay: bubble.animationDelay,
            }}
          />
        ))}
      </>
    );
  };

  // Loading screen component
  const LoadingScreen = () => (
    <div className="loading-screen">
      <div className="loading-bar-container">
        <div 
          className="loading-bar" 
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      <div className="loading-text">
        Loading Experience... {Math.floor(loadingProgress)}%
        {audioManager.bufferLoadErrors?.length > 0 && (
          <div className="loading-errors">
            Some audio resources could not be loaded. Sounds may be limited.
          </div>
        )}
      </div>
    </div>
  );

  if (!entered) {
    return (
      <div className="landing">
        {isLoading ? (
          <LoadingScreen />
        ) : (
          <>
            {/* Static glowing background elements */}
            <div className="glow-container">
              <div className="glow"></div>
              <div className="glow"></div>
              <div className="glow"></div>
            </div>
            
            {/* Optimized bubbles that don't reset */}
            <OptimizedBubbles />
            
            {/* Enhanced artistic title that won't reset */}
            <EnhancedBubblesTitle />
            
            {/* Welcome text with subtitles - only shown when showSubtitles is true */}
            <div className="welcome-container">
              {showSubtitles && <SubtitledWelcomeText duration={21} />}
            </div>
              
            <div className="enter-button-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {!welcomeAudioPlayed && (
                <button 
                  className="play-audio-button" 
                  onClick={() => {
                    // Direct play with HTML5 Audio - simpler approach
                    const audio = new Audio('/Sounds/welcome.mp3');
                    audio.volume = 0.75;
                    audio.onended = () => {
                      console.log('Welcome audio finished playing');
                    };
                    audio.play().then(() => {
                      // Set welcomeAudioRef for potential stopping later
                      welcomeAudioRef.current = audio;
                      // Mark as played
                      setWelcomeAudioPlayed(true);
                      // Show subtitles synchronized with audio
                      setShowSubtitles(true);
                    }).catch(err => {
                      console.error('Could not play audio:', err);
                    });
                  }}
                  style={{
                    background: 'rgba(80, 120, 255, 0.6)',
                    border: '1px solid rgba(100, 150, 255, 0.8)',
                    borderRadius: '30px',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(80, 120, 255, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Play Introduction Audio
                </button>
              )}
              <button 
                className="enter-button" 
                onClick={handleEnterClick}
              >
                Begin Journey
              </button>
            </div>          
          </>
        )}
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
    zIndex: '11',
    boxShadow: '0 0 10px rgba(100, 150, 255, 0.5)'
  };
  
  const keyboardButtonStyle = {  // NEW: Style for keyboard toggle button
    position: 'absolute',
    bottom: '20px',
    right: '140px',  // Positioned before the performance button
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: keyboardVisible ? 'rgba(80, 120, 220, 0.8)' : 'rgba(60, 80, 170, 0.8)', // Brighter when active
    color: 'white',
    display: deviceInfo.isMobile || deviceInfo.hasTouch ? 'flex' : 'none', // Only show on mobile
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.2rem',
    zIndex: '11',
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
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Mobile portrait mode warning */}
      <PortraitModeWarning 
        isPortrait={deviceInfo.screenWidth < deviceInfo.screenHeight} 
        isPhone={deviceInfo.isPhone} 
      />
      
      <div ref={canvasContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas 
          style={{ width: '100%', height: '100%' }} 
          dpr={Math.min(deviceInfo.isMobile ? 1.2 : 1.5, window.devicePixelRatio)}
          frameloop={performanceMode === 'high' ? 'always' : 'demand'}
          gl={{ 
            antialias: performanceMode === 'high',
            powerPreference: 'high-performance',
            alpha: true
          }}
          shadows={!deviceInfo.isMobile || performanceMode !== 'low'}
        >
          <Scene 
            ref={sceneRef} 
            onKeyPress={handleKeyPress} 
            visualMode={visualMode}
            performanceSettings={PERFORMANCE_PRESETS[performanceMode]}
            spacecraftRefs={spacecraftRefs}
            onShowAdModal={handleShowAdModal}
          />
          <AdManager 
            performanceSettings={PERFORMANCE_PRESETS[performanceMode]} 
            onSpacecraftVisible={handleSpacecraftVisibility}
            onSetSpacecraftRefs={handleSetSpacecraftRefs} 
            onShowAdModal={handleShowAdModal}
          />
        </Canvas>
        
        {/* Add TouchControls for mobile devices */}
        {(deviceInfo.isMobile || deviceInfo.hasTouch) && (
          <TouchControls 
            sceneRef={sceneRef}
            containerRef={canvasContainerRef}
            deviceInfo={deviceInfo}
          />
        )}
      </div>
  
      {/* Guided Tour Component */}
      <GuidedTour isFirstVisit={showTour} onComplete={handleTourComplete} />
  
      {/* Ad Modal - Rendered outside the Canvas with Firebase tracking */}
      {adModalInfo && (
        <AdModal
          onClose={handleCloseAdModal}
          adImage={adModalInfo.adImage}
          adLink={adModalInfo.adLink}
          adTitle={adModalInfo.adTitle}
          onAdClick={() => handleCloseAdModal(true)} // Track clicks with Firebase
        />
      )}
  
      <div 
        className="controls-bar"
        style={{
          ...controlsStyle,
          flexWrap: deviceInfo.isMobile ? 'wrap' : 'nowrap',
          padding: deviceInfo.isMobile ? '0.5rem' : '1rem'
        }}
      >
        <div style={buttonGroupStyle}>
          
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          flexWrap: deviceInfo.isMobile ? 'wrap' : 'nowrap'
        }}>
          <div 
            className="slider-container"
            style={sliderContainerStyle}
          >
            <span style={sliderLabelStyle}>Camera Speed:</span>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1" 
              value={cameraSpeed} 
              onChange={handleCameraSpeedChange}
              style={{
                accentColor: 'rgba(80, 120, 220, 0.8)',
                width: deviceInfo.isMobile ? '80px' : '120px'
              }}
              data-tour-target="camera-speed"
            />
          </div>
          
          <button 
            onClick={handleCameraModeToggle}
            style={cameraMode === 'orbit' ? activeButtonStyle : buttonStyle}
            data-tour-target="camera-mode"
          >
            Camera: {cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1)}
          </button>
          
          <button 
            onClick={handleVisualModeToggle}
            style={buttonStyle}
            data-tour-target="visual-mode"
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
              width: deviceInfo.isMobile ? '60px' : '100px',
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
      
      {/* NEW: Keyboard toggle button */}
      {(deviceInfo.isMobile || deviceInfo.hasTouch) && (
        <div 
          style={keyboardButtonStyle}
          onClick={toggleKeyboard}
          title="Toggle Keyboard"
        >
          {keyboardVisible ? '⌨️' : '⌨'}
        </div>
      )}
  
      <div 
        className="performance-button"
        style={performanceButtonStyle} 
        onClick={togglePerformancePopup}
        title="Performance Settings"
        data-tour-target="performance"
      >
        ⚙️
      </div>
  
      <div 
        className="help-button"
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
          
          {/* Add the "Restart Tour" button */}
          <button 
            onClick={startTour} 
            style={{
              padding: '8px 12px',
              marginTop: '15px',
              background: 'rgba(60, 100, 200, 0.6)',
              border: '1px solid rgba(100, 150, 255, 0.6)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Restart Guided Tour
          </button>
        </div>
      )}
  
      <MultiTrackLooper sceneRef={sceneRef} ref={looperRef} />
      {/*<DebugUI sceneRef={sceneRef} spacecraftRefs={spacecraftRefsArray.current} />*/}
      
      {/* Mobile Controls - Only shown on mobile/touch devices */}
      {(deviceInfo.isMobile || deviceInfo.hasTouch) && (
        <MobileControls 
          sceneRef={sceneRef}
          isMobile={deviceInfo.isMobile}
          onTriggerSound={handleMobileSoundTrigger}
          isVisible={keyboardVisible}  // NEW: Pass the visibility state
          onToggleVisibility={toggleKeyboard}  // NEW: Pass the toggle function
        />
      )}
    </div>
  );
}