// FILE: src/components/DebugUI.jsx
import React, { useEffect, useState } from 'react';

const DebugUI = ({ sceneRef }) => {
  const [hasError, setHasError] = useState(false);
  const [isAudioSuspended, setIsAudioSuspended] = useState(false);

  useEffect(() => {
    // Check for suspended audio context
    const checkAudioContext = () => {
      if (window.Howler && window.Howler.ctx) {
        setIsAudioSuspended(window.Howler.ctx.state === 'suspended');
      }
    };
    
    // Add global error listener
    const handleError = (event) => {
      console.log("Caught error:", event);
      if (event.message && event.message.includes("THREE.WebGLAttributes")) {
        setHasError(true);
      }
    };
    
    // Initial check
    checkAudioContext();
    
    // Set up listeners
    window.addEventListener('error', handleError);
    
    // Check audio context state periodically
    const intervalId = setInterval(checkAudioContext, 2000);
    
    return () => {
      window.removeEventListener('error', handleError);
      clearInterval(intervalId);
    };
  }, []);

  const handleResetClick = () => {
    if (sceneRef && sceneRef.current) {
      // Try to fix audio contexts
      if (sceneRef.current.fixAudioContexts) {
        sceneRef.current.fixAudioContexts();
        setIsAudioSuspended(false);
      }
      
      // Reload the page if needed for serious errors
      if (hasError) {
        window.location.reload();
      }
    }
  };
  
  // Don't show anything if everything is fine
  if (!hasError && !isAudioSuspended) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: isAudioSuspended ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 10000,
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)'
    }}>
      {hasError && (
        <p style={{ margin: '0 0 8px' }}>
          Three.js rendering error detected!
        </p>
      )}
      {isAudioSuspended && (
        <p style={{ margin: '0 0 8px' }}>
          Audio is suspended! Click to enable sound.
        </p>
      )}
      <button 
        onClick={handleResetClick}
        style={{
          background: '#2a2a2a',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {hasError ? "Fix Renderer" : "Enable Audio"}
      </button>
    </div>
  );
};

export default DebugUI;