import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Create context for application-wide performance settings
const PerformanceContext = createContext({
  fpsTarget: 60,
  currentFps: 60,
  performanceMode: 'medium',
  isLowEnd: false,
  adaptiveQuality: true,
  qualityLevel: 1.0, // 0.0 to 1.0 scaling factor for effects
  setPerformanceMode: () => {},
  setAdaptiveQuality: () => {},
});

export const usePerformance = () => useContext(PerformanceContext);

export function PerformanceOptimizer({ children }) {
  const [performanceMode, setPerformanceMode] = useState(() => {
    // Check for stored preference or use device detection
    const stored = localStorage.getItem('performanceMode');
    if (stored) return stored;
    
    // Detect low-end devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isLowEnd = 
      (navigator.deviceMemory && navigator.deviceMemory < 4) || 
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
      
    return (isMobile || isLowEnd) ? 'low' : 'medium';
  });
  
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
  const [isLowEnd, setIsLowEnd] = useState(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile || 
      (navigator.deviceMemory && navigator.deviceMemory < 4) || 
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  });

  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId;
    
    const measureFps = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;
      
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        setCurrentFps(fps);
        frameCount = 0;
        lastTime = now;
        
        // Adjust quality level based on FPS if adaptive quality is enabled
        if (adaptiveQuality) {
          // If FPS is too low, reduce quality
          if (fps < fpsTarget * 0.8) {
            setQualityLevel(prevLevel => Math.max(0.3, prevLevel - 0.05));
          } 
          // If FPS is higher than target, gradually increase quality
          else if (fps > fpsTarget * 1.2) {
            setQualityLevel(prevLevel => Math.min(1.0, prevLevel + 0.02));
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(measureFps);
    };
    
    animationFrameId = requestAnimationFrame(measureFps);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fpsTarget, adaptiveQuality]);

  // Update target FPS when performance mode changes
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
      if (isLowEnd) {
        setPerformanceMode('low');
      } else {
        const isMidRange = 
          (navigator.deviceMemory && navigator.deviceMemory < 8) || 
          (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 8);
        setPerformanceMode(isMidRange ? 'medium' : 'high');
      }
    } else {
      setPerformanceMode(mode);
    }
  }, [isLowEnd]);

  const contextValue = {
    fpsTarget,
    currentFps,
    performanceMode,
    isLowEnd,
    adaptiveQuality,
    qualityLevel,
    setPerformanceMode: handleSetPerformanceMode,
    setAdaptiveQuality,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

export default PerformanceOptimizer;