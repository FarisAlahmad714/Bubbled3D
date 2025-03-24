import React, { useState, useEffect } from 'react';
import { usePerformance } from './PerformanceOptimizer';

const MobileControls = ({ sceneRef, isMobile, onTriggerSound }) => {
  const [activeKeys, setActiveKeys] = useState({});
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [keyboardMode, setKeyboardMode] = useState('main'); // 'main', 'drums', 'piano', etc.
  const { performanceMode } = usePerformance();
  
  const keyRows = {
    main: [
      ['1', '2', '3', '4', '5', '6'],
      ['q', 'w', 'e', 'r', 't', 'y'],
      ['a', 's', 'd', 'f', 'g', 'h'],
      ['z', 'x', 'c', 'v', 'b', 'n']
    ],
    drums: [
      ['1', '2', '3', '4'],
      ['5', '6', '7', '8'],
      ['9', '0', 'q', 'w'],
      ['e', 'r', 't', 'y']
    ],
    loops: [
      ['a', 's', 'd', 'f'],
      ['g', 'h', 'j', 'k'],
      ['z', 'x', 'c', 'v'],
      ['b', 'n', 'm', ',']
    ]
  };
  
  const handleKeyPress = (key) => {
    // Highlight the key visually
    setActiveKeys(prev => ({ ...prev, [key]: true }));
    
    // Trigger the sound
    if (onTriggerSound) {
      onTriggerSound(key);
    } else if (sceneRef?.current?.createSphereAndPlaySound) {
      sceneRef.current.createSphereAndPlaySound(key);
    }
    
    // Remove highlight after animation time
    setTimeout(() => {
      setActiveKeys(prev => ({ ...prev, [key]: false }));
    }, 300);
  };
  
  // Color mapping for keys - based on your existing keyData
  const getKeyColor = (key) => {
    const colorMap = {
      '1': '#ff5252', '2': '#ff7752', '3': '#ff9c52', '4': '#ffc152', 
      '5': '#ffe552', '6': '#f0ff52', '7': '#cbff52', '8': '#a6ff52',
      '9': '#81ff52', '0': '#52ff5e', 'q': '#52ff83', 'w': '#52ffa8',
      'e': '#52ffcd', 'r': '#52fff2', 't': '#52d4ff', 'y': '#52afff',
      'u': '#528aff', 'i': '#5266ff', 'o': '#6652ff', 'p': '#8b52ff',
      'a': '#af52ff', 's': '#d452ff', 'd': '#f952ff', 'f': '#ff52d4',
      'g': '#ff52af', 'h': '#ff528a', 'j': '#ff5266', 'k': '#ff7752',
      'l': '#ff9c52', 'z': '#ffc152', 'x': '#ffe552', 'c': '#f0ff52',
      'v': '#cbff52', 'b': '#a6ff52', 'n': '#81ff52', 'm': '#52ff5e'
    };
    
    return colorMap[key] || '#ffffff';
  };
  
  return (
    <div className="mobile-controls" style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(10, 15, 30, 0.85)',
      backdropFilter: 'blur(10px)',
      padding: '10px',
      display: showKeyboard ? 'block' : 'none',
      zIndex: 1000,
      borderTop: '1px solid rgba(80, 120, 220, 0.5)'
    }}>
      {/* Mode selector tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '10px'
      }}>
        <button
          onClick={() => setKeyboardMode('main')}
          style={{
            background: keyboardMode === 'main' ? 'rgba(80, 120, 220, 0.8)' : 'rgba(40, 50, 80, 0.8)',
            border: '1px solid rgba(80, 120, 220, 0.5)',
            borderRadius: '4px',
            color: 'white',
            padding: '5px 15px',
            margin: '0 5px',
            fontSize: '0.9rem'
          }}
        >
          Main
        </button>
        <button
          onClick={() => setKeyboardMode('drums')}
          style={{
            background: keyboardMode === 'drums' ? 'rgba(80, 120, 220, 0.8)' : 'rgba(40, 50, 80, 0.8)',
            border: '1px solid rgba(80, 120, 220, 0.5)',
            borderRadius: '4px',
            color: 'white',
            padding: '5px 15px',
            margin: '0 5px',
            fontSize: '0.9rem'
          }}
        >
          Drums
        </button>
        <button
          onClick={() => setKeyboardMode('loops')}
          style={{
            background: keyboardMode === 'loops' ? 'rgba(80, 120, 220, 0.8)' : 'rgba(40, 50, 80, 0.8)',
            border: '1px solid rgba(80, 120, 220, 0.5)',
            borderRadius: '4px',
            color: 'white',
            padding: '5px 15px',
            margin: '0 5px',
            fontSize: '0.9rem'
          }}
        >
          Loops
        </button>
        
        {/* Toggle button */}
        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          style={{
            position: 'absolute',
            right: '10px',
            top: '10px',
            background: 'rgba(60, 80, 170, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          {showKeyboard ? '▼' : '▲'}
        </button>
      </div>
      
      {/* Virtual keyboard */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        {keyRows[keyboardMode].map((row, rowIndex) => (
          <div 
            key={`row-${rowIndex}`} 
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: activeKeys[key] 
                    ? `linear-gradient(rgba(255,255,255,0.3), ${getKeyColor(key)})` 
                    : `linear-gradient(rgba(20,25,40,0.8), ${getKeyColor(key)}88)`,
                  border: activeKeys[key] 
                    ? `2px solid ${getKeyColor(key)}` 
                    : '1px solid rgba(80, 120, 220, 0.3)',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxShadow: activeKeys[key] 
                    ? `0 0 15px ${getKeyColor(key)}` 
                    : 'none',
                  transition: 'all 0.1s ease',
                  transform: activeKeys[key] ? 'scale(0.95)' : 'scale(1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileControls;