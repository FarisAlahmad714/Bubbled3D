import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// Performance preset configurations matching those in App.jsx
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

// Utility function to detect device capabilities
export const detectDeviceCapabilities = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  const isPhone = isMobile && !isTablet;
  
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  const deviceMemory = navigator.deviceMemory || 4; // Default to 4GB if not available
  const hardwareConcurrency = navigator.hardwareConcurrency || 4; // Default to 4 cores
  
  const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4 || isPhone;
  const isMidRange = (deviceMemory >= 4 && deviceMemory < 8) || 
                     (hardwareConcurrency >= 4 && hardwareConcurrency < 8);
  
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  return {
    isMobile,
    isTablet,
    isPhone,
    hasTouch,
    deviceMemory,
    hardwareConcurrency,
    isLowEnd,
    isMidRange,
    screenWidth,
    screenHeight
  };
};

// Create context for application-wide performance settings
const PerformanceContext = createContext({
  fpsTarget: 60,
  currentFps: 60,
  performanceMode: 'medium',
  performancePresets: PERFORMANCE_PRESETS,
  deviceInfo: {},
  adaptiveQuality: true,
  qualityLevel: 1.0,
  setPerformanceMode: () => {},
  setAdaptiveQuality: () => {},
  getCurrentPreset: () => PERFORMANCE_PRESETS.medium,
});

export const usePerformance = () => useContext(PerformanceContext);

export function PerformanceOptimizer({ children }) {
  // Device detection
  const [deviceInfo, setDeviceInfo] = useState(() => detectDeviceCapabilities());
  
  // Performance mode state with persistence
  const [performanceMode, setPerformanceMode] = useState(() => {
    // Check for stored preference or use device detection
    const stored = localStorage.getItem('performanceMode');
    if (stored && ['low', 'medium', 'high'].includes(stored)) return stored;
    
    // Auto-detect appropriate mode based on device capabilities
    if (deviceInfo.isLowEnd) return 'low';
    if (deviceInfo.isMidRange) return 'medium';
    return 'high';
  });
  
  // FPS related states
  const [fpsTarget, setFpsTarget] = useState(() => {
    switch (performanceMode) {
      case 'low': return 30;
      case 'medium': return 45;
      case 'high': return 60;
      default: return 45;
    }
  });
  
  const [currentFps, setCurrentFps] = useState(60);
  const [adaptiveQuality, setAdaptiveQuality] = useState(true);
  const [qualityLevel, setQualityLevel] = useState(1.0);
  
  // FPS tracking refs
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  
  // Update device info on resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectDeviceCapabilities());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FPS counter with adaptive quality adjustment
  useEffect(() => {
    let frameId;
    
    const updateFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      frameCountRef.current++;
      
      if (delta > 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        setCurrentFps(fps);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
        
        // Adjust quality level based on FPS if adaptive quality is enabled
        if (adaptiveQuality) {
          // If FPS is too low, reduce quality
          if (fps < fpsTarget * 0.8) {
            setQualityLevel(prevLevel => Math.max(0.3, prevLevel - 0.05));
            
            // If fps is critically low, downgrade performance mode
            if (fps < fpsTarget * 0.5 && performanceMode !== 'low') {
              const newMode = performanceMode === 'high' ? 'medium' : 'low';
              handleSetPerformanceMode(newMode);
            }
          } 
          // If FPS is higher than target, gradually increase quality
          else if (fps > fpsTarget * 1.2 && qualityLevel < 1.0) {
            setQualityLevel(prevLevel => Math.min(1.0, prevLevel + 0.02));
          }
        }
      }
      
      frameId = requestAnimationFrame(updateFps);
    };
    
    frameId = requestAnimationFrame(updateFps);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [fpsTarget, adaptiveQuality, performanceMode]);

  // Update target FPS and quality level when performance mode changes
  useEffect(() => {
    switch (performanceMode) {
      case 'low':
        setFpsTarget(30);
        setQualityLevel(0.5);
        break;
      case 'medium':
        setFpsTarget(45);
        setQualityLevel(0.8);
        break;
      case 'high':
        setFpsTarget(60);
        setQualityLevel(1.0);
        break;
    }
    
    // Save to localStorage
    localStorage.setItem('performanceMode', performanceMode);
  }, [performanceMode]);

  // Handle changing performance mode
  const handleSetPerformanceMode = useCallback((mode) => {
    if (mode === 'auto') {
      // For auto mode, detect device capabilities and set accordingly
      if (deviceInfo.isLowEnd) {
        setPerformanceMode('low');
      } else if (deviceInfo.isMidRange) {
        setPerformanceMode('medium');
      } else {
        setPerformanceMode('high');
      }
    } else if (['low', 'medium', 'high'].includes(mode)) {
      setPerformanceMode(mode);
    }
  }, [deviceInfo]);
  
  // Get current performance preset
  const getCurrentPreset = useCallback(() => {
    return PERFORMANCE_PRESETS[performanceMode];
  }, [performanceMode]);

  // Context value to be provided
  const contextValue = {
    fpsTarget,
    currentFps,
    performanceMode,
    performancePresets: PERFORMANCE_PRESETS,
    deviceInfo,
    adaptiveQuality,
    qualityLevel,
    setPerformanceMode: handleSetPerformanceMode,
    setAdaptiveQuality,
    getCurrentPreset,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

// Example usage in components
export const usePerformanceSettings = () => {
  const { performanceMode, getCurrentPreset } = usePerformance();
  return {
    currentMode: performanceMode,
    settings: getCurrentPreset(),
  };
};

export default PerformanceOptimizer;