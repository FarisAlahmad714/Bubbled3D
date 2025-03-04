// AudioDebugger.jsx - Add this component to your project
import React, { useState, useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';

export default function AudioDebugger() {
  const [status, setStatus] = useState('Initializing...');
  const [logMessages, setLogMessages] = useState([]);
  const [canPlay, setCanPlay] = useState(false);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const testSoundRef = useRef(null);

  const addLogMessage = (message) => {
    console.log("[AudioDebugger]", message);
    setLogMessages(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 19)]);
  };

  const checkContext = () => {
    if (Howler.ctx) {
      setStatus(`Audio Context state: ${Howler.ctx.state}`);
      setCanPlay(Howler.ctx.state === 'running');
      addLogMessage(`AudioContext state is ${Howler.ctx.state}`);
    } else {
      setStatus('No Audio Context available');
      addLogMessage('No AudioContext available');
    }
  };

  const initializeTest = () => {
    try {
      addLogMessage('Attempting to initialize AudioContext...');
      Howler.autoUnlock = true; // Ensure auto unlock is enabled
      
      if (Howler.ctx) {
        addLogMessage(`AudioContext exists with state: ${Howler.ctx.state}`);
      } else {
        addLogMessage('Creating new AudioContext...');
        // Force initializing context
        const sound = new Howl({
          src: ['/test-tone.mp3'],
          volume: 0,
          preload: false
        });
        if (Howler.ctx) {
          addLogMessage(`AudioContext created with state: ${Howler.ctx.state}`);
        } else {
          addLogMessage('Failed to create AudioContext');
        }
      }
      
      checkContext();
    } catch (error) {
      addLogMessage(`Error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
    }
  };

  const unlockAudio = async () => {
    try {
      addLogMessage('Attempting to unlock audio...');
      
      // Method 1: Use Howler's own unlock
      Howler.unlock();
      
      // Method 2: Resume context directly if available
      if (Howler.ctx && Howler.ctx.state !== 'running') {
        await Howler.ctx.resume();
      }
      
      // Check again after unlock attempt
      checkContext();
      
      // Method 3: Play a silent sound
      const silentSound = new Howl({
        src: ['/silent.mp3'],
        volume: 0.1,
        onload: () => {
          addLogMessage('Silent sound loaded successfully');
          silentSound.play();
        },
        onplay: () => {
          addLogMessage('Silent sound playing!');
          checkContext();
        },
        onloaderror: (id, error) => {
          addLogMessage(`Silent sound load error: ${error}`);
        },
        onplayerror: (id, error) => {
          addLogMessage(`Silent sound play error: ${error}`);
        }
      });
    } catch (error) {
      addLogMessage(`Unlock error: ${error.message}`);
    }
  };

  const testSound = (category, soundName) => {
    const soundPath = `/sounds/kit/${category}/${soundName}.mp3`;
    addLogMessage(`Testing sound: ${soundPath}`);

    // If previous test sound exists, unload it to prevent memory issues
    if (testSoundRef.current) {
      testSoundRef.current.unload();
    }

    testSoundRef.current = new Howl({
      src: [soundPath],
      volume: 0.8,
      onload: () => {
        addLogMessage(`✅ Sound loaded successfully: ${soundPath}`);
        setSoundLoaded(true);
        testSoundRef.current.play();
      },
      onplay: () => {
        addLogMessage(`🔊 Sound playing: ${soundPath}`);
      },
      onend: () => {
        addLogMessage(`Sound finished: ${soundPath}`);
      },
      onloaderror: (id, error) => {
        addLogMessage(`❌ Sound load error for ${soundPath}: ${error}`);
        setSoundLoaded(false);
      },
      onplayerror: (id, error) => {
        addLogMessage(`❌ Sound play error for ${soundPath}: ${error}`);
      }
    });
  };

  // Check file existence separately using fetch
  const checkFileExists = async (category, soundName) => {
    const path = `/sounds/kit/${category}/${soundName}.mp3`;
    try {
      addLogMessage(`Checking if file exists: ${path}`);
      const response = await fetch(path, { method: 'HEAD' });
      
      if (response.ok) {
        addLogMessage(`✅ File exists: ${path} (${response.status})`);
      } else {
        addLogMessage(`❌ File does not exist: ${path} (${response.status})`);
      }
    } catch (error) {
      addLogMessage(`❌ Error checking file: ${path} - ${error.message}`);
    }
  };

  useEffect(() => {
    initializeTest();
    
    // Check context state periodically
    const intervalId = setInterval(checkContext, 2000);
    
    return () => {
      clearInterval(intervalId);
      if (testSoundRef.current) {
        testSoundRef.current.unload();
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      width: '400px',
      maxHeight: '80vh',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>🔊 Audio Debugger</h3>
        <div>Status: <span style={{ color: canPlay ? '#4f8' : '#f88' }}>{status}</span></div>
        <div>Sound Loaded: <span style={{ color: soundLoaded ? '#4f8' : '#f88' }}>{soundLoaded ? 'Yes' : 'No'}</span></div>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={unlockAudio}
          style={{
            padding: '5px 10px',
            margin: '0 5px 5px 0',
            background: '#2a4',
            border: 'none',
            borderRadius: '3px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Unlock Audio
        </button>
        
        <button 
          onClick={() => testSound('808', '808 [100s]')}
          style={{
            padding: '5px 10px',
            margin: '0 5px 5px 0',
            background: '#24a',
            border: 'none',
            borderRadius: '3px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Test 808 Sound
        </button>
        
        <button 
          onClick={() => testSound('Kick', 'Kick [808Fall]')}
          style={{
            padding: '5px 10px',
            margin: '0 5px 5px 0',
            background: '#24a',
            border: 'none',
            borderRadius: '3px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Test Kick Sound
        </button>
        
        <button 
          onClick={() => checkFileExists('808', '808 [100s]')}
          style={{
            padding: '5px 10px',
            margin: '0 5px 5px 0',
            background: '#a42',
            border: 'none',
            borderRadius: '3px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Check 808 File
        </button>
      </div>
      
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <h4 style={{ margin: '0 0 5px 0' }}>Log:</h4>
        {logMessages.map((msg, i) => (
          <div key={i} style={{ 
            fontSize: '11px',
            padding: '3px',
            borderBottom: '1px solid #333',
            whiteSpace: 'normal',
            wordBreak: 'break-word'
          }}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}