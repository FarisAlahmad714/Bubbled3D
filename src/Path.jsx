// This component will help determine if your sound paths are correct
// Add this to your project and mount it temporarily in App.jsx to diagnose

import React, { useState, useEffect } from 'react';

export default function SoundPathAnalyzer() {
  const [paths, setPaths] = useState([]);
  const [results, setResults] = useState({});
  const [checking, setChecking] = useState(false);
  
  const basePaths = [
    '/sounds/kit/808/808 [100s].mp3',
    './sounds/kit/808/808 [100s].mp3',
    'sounds/kit/808/808 [100s].mp3',
    '../sounds/kit/808/808 [100s].mp3',
    'public/sounds/kit/808/808 [100s].mp3',
    '/public/sounds/kit/808/808 [100s].mp3',
    '/Sounds/kit/808/808 [100s].mp3',  // Capital S
    '/sounds/Kit/808/808 [100s].mp3',  // Capital K
  ];
  
  const checkAllPaths = async () => {
    setChecking(true);
    const newResults = {};
    
    for (const path of basePaths) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        newResults[path] = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };
        console.log(`Path check - ${path}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        newResults[path] = {
          error: error.message,
          ok: false
        };
        console.error(`Path check error - ${path}: ${error.message}`);
      }
    }
    
    setResults(newResults);
    setChecking(false);
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      width: '400px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3>Sound Path Analyzer</h3>
      
      <button 
        onClick={checkAllPaths}
        disabled={checking}
        style={{
          padding: '5px 10px',
          margin: '5px 0',
          backgroundColor: checking ? '#555' : '#4a8',
          border: 'none',
          borderRadius: '3px',
          color: 'white',
          cursor: checking ? 'default' : 'pointer'
        }}
      >
        {checking ? 'Checking...' : 'Check All Paths'}
      </button>
      
      <div style={{maxHeight: '300px', overflowY: 'auto', marginTop: '10px'}}>
        {Object.entries(results).map(([path, result]) => (
          <div key={path} style={{
            padding: '5px',
            borderBottom: '1px solid #444',
            color: result.ok ? '#4f8' : '#f88'
          }}>
            <div>{path}</div>
            <div style={{fontSize: '10px'}}>
              {result.ok 
                ? `✅ Status: ${result.status} ${result.statusText}` 
                : `❌ ${result.error || `Status: ${result.status} ${result.statusText}`}`}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{marginTop: '15px', fontSize: '11px', color: '#aaa'}}>
        <p>
          Looking for audio files in the following potential locations. 
          The green entries indicate where your audio files are correctly found.
        </p>
      </div>
    </div>
  );
}