// src/components/DebugUI.jsx

import React, { useState, useEffect } from 'react';

export default function DebugUI({ sceneRef, spacecraftRefs }) {
  const [showDebug, setShowDebug] = useState(false);
  const [cameraInfo, setCameraInfo] = useState({ position: {}, rotation: {} });
  const [spacecraftInfo, setSpacecraftInfo] = useState([]);
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle debug UI with Shift+D
      if (e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    if (!showDebug) return;
    
    // Update debug information every 500ms
    const intervalId = setInterval(() => {
      // Get camera info - don't access camera directly, use scene methods
      if (sceneRef?.current?.logCameraInfo) {
        // This logs to console and returns the info
        const info = sceneRef.current.logCameraInfo();
        if (info && info.position) {
          setCameraInfo({
            position: {
              x: info.position.x.toFixed(2),
              y: info.position.y.toFixed(2),
              z: info.position.z.toFixed(2)
            },
            rotation: {
              x: info.rotation.x.toFixed(2),
              y: info.rotation.y.toFixed(2),
              z: info.rotation.z.toFixed(2)
            }
          });
        }
      }
      
      // Get spacecraft info - only if we have refs
      if (spacecraftRefs && spacecraftRefs.length) {
        const info = spacecraftRefs.map((ref, index) => {
          if (!ref || !ref.current || !ref.current.getPosition) {
            return { id: index, visible: false };
          }
          
          try {
            const position = ref.current.getPosition();
            return {
              id: index,
              visible: position.z > -500, // Consider visible if not at the hidden position
              position: {
                x: position.x.toFixed(2),
                y: position.y.toFixed(2),
                z: position.z.toFixed(2)
              }
            };
          } catch (err) {
            console.error("Error getting spacecraft position:", err);
            return { id: index, visible: false };
          }
        });
        setSpacecraftInfo(info);
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [showDebug, sceneRef, spacecraftRefs]);
  
  const handleRotationChange = (axis, value) => {
    setModelRotation(prev => ({ ...prev, [axis]: parseFloat(value) }));
    
    // Apply rotation to all spacecraft models
    if (spacecraftRefs && spacecraftRefs.length) {
      spacecraftRefs.forEach(ref => {
        if (!ref || !ref.current || !ref.current.children) return;
        
        try {
          // Find the model object (should be a child with multiple children)
          const children = ref.current.children;
          if (!children || !children.length) return;
          
          // Look for the loaded model
          children.forEach(child => {
            if ((child.type === 'Group' || child.children?.length > 1) && child.rotation) {
              child.rotation.set(
                parseFloat(modelRotation.x),
                parseFloat(modelRotation.y),
                parseFloat(modelRotation.z)
              );
            }
          });
        } catch (err) {
          console.error("Error applying model rotation:", err);
        }
      });
    }
  };
  
  if (!showDebug) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '300px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        DEBUG MODE (Shift+D to toggle)
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold' }}>Camera:</div>
        <div>
          Position: x:{cameraInfo.position.x || '?'}, y:{cameraInfo.position.y || '?'}, z:{cameraInfo.position.z || '?'}
        </div>
        <div>
          Rotation: x:{cameraInfo.rotation.x || '?'}, y:{cameraInfo.rotation.y || '?'}, z:{cameraInfo.rotation.z || '?'}
        </div>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold' }}>Spacecraft:</div>
        {spacecraftInfo.map(info => (
          <div key={info.id} style={{ 
            marginBottom: '5px',
            color: info.visible ? '#5f5' : '#f55'
          }}>
            #{info.id}: {info.visible ? 'VISIBLE' : 'HIDDEN'}
            {info.visible && info.position && (
              <div>
                Position: x:{info.position.x}, y:{info.position.y}, z:{info.position.z}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold' }}>Model Rotation Adjust:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
          <label style={{ width: '15px' }}>X:</label>
          <input 
            type="range" 
            min="-3.14" 
            max="3.14" 
            step="0.1" 
            value={modelRotation.x}
            onChange={(e) => handleRotationChange('x', e.target.value)}
            style={{ flex: 1, marginRight: '5px' }}
          />
          <input 
            type="number" 
            value={modelRotation.x}
            onChange={(e) => handleRotationChange('x', e.target.value)}
            style={{ width: '50px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
          <label style={{ width: '15px' }}>Y:</label>
          <input 
            type="range" 
            min="-3.14" 
            max="3.14" 
            step="0.1" 
            value={modelRotation.y}
            onChange={(e) => handleRotationChange('y', e.target.value)}
            style={{ flex: 1, marginRight: '5px' }}
          />
          <input 
            type="number" 
            value={modelRotation.y}
            onChange={(e) => handleRotationChange('y', e.target.value)}
            style={{ width: '50px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
          <label style={{ width: '15px' }}>Z:</label>
          <input 
            type="range" 
            min="-3.14" 
            max="3.14" 
            step="0.1" 
            value={modelRotation.z}
            onChange={(e) => handleRotationChange('z', e.target.value)}
            style={{ flex: 1, marginRight: '5px' }}
          />
          <input 
            type="number" 
            value={modelRotation.z}
            onChange={(e) => handleRotationChange('z', e.target.value)}
            style={{ width: '50px' }}
          />
        </div>
      </div>
      
      <div>
        <button onClick={() => {
          // Save current values to console for reference
          console.log('Current model rotation:', modelRotation);
        }} style={{
          padding: '5px 10px',
          background: '#4466ff',
          border: 'none',
          borderRadius: '3px',
          color: 'white',
          cursor: 'pointer'
        }}>
          Log Values to Console
        </button>
      </div>
    </div>
  );
}