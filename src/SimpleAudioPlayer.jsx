// SimpleAudioPlayer.jsx
import React, { useRef, useEffect } from 'react';

export default function SimpleAudioPlayer({ onLoad }) {
  const audioElements = useRef({});
  const audioContext = useRef(null);

  const localSounds = {
    '1': '/Sounds/bubbles.mp3',
    '2': '/Sounds/clay.mp3',
    '3': '/Sounds/confetti.mp3',
    '4': '/Sounds/corona.mp3',
    '5': '/Sounds/dotted-spiral.mp3',
    '6': '/Sounds/flash-1.mp3',
    'q': '/Sounds/flash-2.mp3',
    'w': '/Sounds/flash-3.mp3',
    'e': '/Sounds/glimmer.mp3',
    'r': '/Sounds/moon.mp3',
    'a': '/Sounds/pinwheel.mp3',
    's': '/Sounds/piston-1.mp3',
    'd': '/Sounds/piston-2.mp3',
    'f': '/Sounds/piston-3.mp3',
    't': '/Sounds/piston-3.mp3',
    'g': '/Sounds/prism-1.mp3',
    'h': '/Sounds/prism-2.mp3',
    'i': '/Sounds/prism-3.mp3',
    'j': '/Sounds/splits.mp3',
    'k': '/Sounds/squiggle.mp3',
    'l': '/Sounds/strike.mp3',
    'z': '/Sounds/suspension.mp3',
    'x': '/Sounds/timer.mp3',
    'c': '/Sounds/ufo.mp3',
    'v': '/Sounds/veil.mp3',
    'b': '/Sounds/wipe.mp3',
    'n': '/Sounds/zig-zag.mp3'
  };

  const soundColors = {
    '1': '#FF5733', '2': '#FF9966', '3': '#FFFF99', '4': '#66CCCC', '5': '#99CCFF',
    '6': '#FF6666', 'q': '#FFCC66', 'w': '#FFCCFF', 'e': '#FF99FF', 'r': '#66FF66',
    'a': '#CC99FF', 's': '#FF9966', 'd': '#FF5733', 'f': '#FF6666', 't': '#FF6666',
    'g': '#FF99CC', 'h': '#FFCC99', 'i': '#66CCFF', 'j': '#FFFF66', 'k': '#CCFF66',
    'l': '#FF6699', 'z': '#99FFFF', 'x': '#FFCC33', 'c': '#66FF99', 'v': '#CC66FF',
    'b': '#FF33CC', 'n': '#66CC99'
  };

  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext.current = new AudioContext();
      if (audioContext.current.state !== 'running') {
        audioContext.current.resume();
      }
    } catch (error) {
      console.error('Failed to create audio context:', error);
    }

    const loadAudio = () => {
      Object.entries(localSounds).forEach(([key, url]) => {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';

        audio.addEventListener('canplaythrough', () => {
          console.log(`Sound ${key} (${url}) loaded successfully`);
          audioElements.current[key] = audio; // Only store if it loads
        });

        audio.addEventListener('error', (e) => {
          console.error(`Error loading sound ${key} (${url}):`, e.target.error);
        });

        // Trigger load manually
        audio.load();
      });
    };

    // Delay to ensure context is ready
    setTimeout(loadAudio, 100);

    if (onLoad) {
      onLoad({
        playSound,
        getSoundInfo: (key) => ({
          color: soundColors[key] || '#FFFFFF',
          scale: key.match(/[1-3]/) ? 1.0 : key.match(/[4-6]/) ? 1.2 : 0.8,
          lifetime: key.match(/[aqsdf]/) ? 10000 : 8000,
          pulseSpeed: key.match(/[1-3]/) ? 0.5 : key.match(/[4-6]/) ? 0.8 : 0.3
        })
      });
    }

    return () => {
      Object.values(audioElements.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      if (audioContext.current) audioContext.current.close();
    };
  }, [onLoad]);

  const playSound = (key) => {
    try {
      if (audioContext.current && audioContext.current.state !== 'running') {
        audioContext.current.resume();
      }

      const audio = audioElements.current[key];
      if (!audio) {
        console.error(`No audio element for key ${key}, attempting direct play: ${localSounds[key]}`);
        const fallback = new Audio(localSounds[key]);
        fallback.volume = 0.7 + Math.random() * 0.3;
        fallback.play().catch(err => console.error(`Fallback play failed for ${key}:`, err));
        return fallback;
      }

      const soundClone = new Audio(audio.src);
      soundClone.volume = 0.7 + Math.random() * 0.3;
      soundClone.play().catch(error => {
        console.error(`Error playing sound ${key}:`, error);
      });

      return soundClone;
    } catch (error) {
      console.error(`Error in playSound for key ${key}:`, error);
      return null;
    }
  };

  return null;
}