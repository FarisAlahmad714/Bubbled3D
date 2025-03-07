import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as Tone from 'tone';
import { Howl } from 'howler';

const MultiTrackLooper = forwardRef(function MultiTrackLooper({ sceneRef }, ref) {
  const [tracks, setTracks] = useState([]);
  const [trackOrder, setTrackOrder] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0); // 0 dB = normal volume
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'player'
  const [selectedTrack, setSelectedTrack] = useState(null);
  
  // Refs for audio-related objects to avoid re-renders
  const players = useRef({});
  const tracksRef = useRef([]);
  const patterns = useRef({});
  const audioContext = useRef(null);
  const mainBus = useRef(null);
  const trackBuses = useRef({});
  const playbackPositions = useRef({});
  
  // Flags and tracking
  const useFallbackAudio = useRef(false);
  const playingSounds = useRef(new Set());
  const patternInProgress = useRef(new Set()); // Track patterns that are already playing to prevent duplicates

  // Sync tracksRef with tracks state
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Update track order if needed
  useEffect(() => {
    if (tracks.length > 0 && trackOrder.length === 0) {
      setTrackOrder(tracks.map(t => t.id));
    }
  }, [tracks, trackOrder]);

  // Sound mappings
  const keyData = {
    '1': { src: '/Sounds/confetti.mp3' },
    '2': { src: '/Sounds/clay.mp3' },
    '3': { src: '/Sounds/corona.mp3' },
    '4': { src: '/Sounds/loop.mp3' },
    '5': { src: '/Sounds/glimmer.mp3' },
    '6': { src: '/Sounds/moon.mp3' },
    'q': { src: '/Sounds/flash-1.mp3' },
    'w': { src: '/Sounds/pinwheel.mp3' },
    'e': { src: '/Sounds/piston-1.mp3' },
    'r': { src: '/Sounds/piston-2.mp3' },
    't': { src: '/Sounds/piston-3.mp3' },
    'a': { src: '/Sounds/prism-1.mp3' },
    's': { src: '/Sounds/prism-2.mp3' },
    'd': { src: '/Sounds/prism-3.mp3' },
    'f': { src: '/Sounds/splits.mp3' },
    // Add longer tunes
    'z': { src: '/Sounds/long-tune-1.mp3', duration: 8000 },
    'x': { src: '/Sounds/long-tune-2.mp3', duration: 12000 },
    'c': { src: '/Sounds/long-tune-3.mp3', duration: 16000 },
  };

  // Initialize audio on mount
  useEffect(() => {
    initializeAudio();
    return cleanup;
  }, []);

  // Update master volume
  useEffect(() => {
    if (audioInitialized && mainBus.current) {
      mainBus.current.volume.value = masterVolume;
    }
  }, [masterVolume, audioInitialized]);

  // Update BPM
  useEffect(() => {
    if (audioInitialized) {
      Tone.Transport.bpm.value = bpm;
      console.log('Updated BPM to:', bpm);
    }
  }, [bpm, audioInitialized]);

  // Update tracks when track order changes
  useEffect(() => {
    if (trackOrder.length > 0 && tracks.length > 0) {
      // Reorder tracks based on trackOrder
      const orderedTracks = [...tracks].sort((a, b) => {
        return trackOrder.indexOf(a.id) - trackOrder.indexOf(b.id);
      });
      
      if (JSON.stringify(orderedTracks.map(t => t.id)) !== JSON.stringify(tracks.map(t => t.id))) {
        setTracks(orderedTracks);
      }
    }
  }, [trackOrder]);

  // Update playback positions for visual tracking
  useEffect(() => {
    let frameId;
    
    const updatePlaybackPositions = () => {
      if (audioInitialized && Tone.Transport.state === 'started') {
        const transportPosition = Tone.Transport.seconds;
        
        tracks.forEach(track => {
          if (track.isLooping && track.events.length > 0) {
            const loopEndMarker = track.events.find(ev => ev.isMarker && ev.key === 'loop-end');
            const loopDuration = loopEndMarker ? loopEndMarker.offset / 1000 : track.totalDuration / 1000;
            
            if (loopDuration > 0) {
              // Calculate position within the loop (0 to 1)
              const position = (transportPosition % loopDuration) / loopDuration;
              playbackPositions.current[track.id] = position;
            }
          }
        });
        
        // Request next frame
        frameId = requestAnimationFrame(updatePlaybackPositions);
      }
    };
    
    if (tracks.some(t => t.isLooping)) {
      frameId = requestAnimationFrame(updatePlaybackPositions);
    }
    
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [tracks, audioInitialized]);

  // Audio initialization
  async function initializeAudio() {
    try {
      await Tone.start();
      audioContext.current = Tone.getContext();
      Tone.Transport.bpm.value = bpm;

      // Set up main output bus
      mainBus.current = new Tone.Channel({
        volume: masterVolume,
      }).toDestination();

      try {
        const testPlayer = new Tone.Player().toDestination();
        testPlayer.dispose();
      } catch (err) {
        console.log('Tone.js issues detected, using fallback');
        useFallbackAudio.current = true;
      }

      if (useFallbackAudio.current) {
        Object.keys(keyData).forEach((key) => {
          const soundSource = Array.isArray(keyData[key].src) ? keyData[key].src[0] : keyData[key].src;
          new Howl({ src: [soundSource], preload: true, autoplay: false });
        });
      } else {
        Object.keys(keyData).forEach((key) => {
          if (!players.current[key]) {
            const soundSource = Array.isArray(keyData[key].src) ? keyData[key].src[0] : keyData[key].src;
            players.current[key] = new Tone.Player({
              url: soundSource,
              onload: () => {
                console.log(`Player loaded for ${key}: ${soundSource}`);
                players.current[key].loaded = true;
              },
              fadeOut: 0.01,
              volume: 0,
              autostart: false
            }).connect(mainBus.current); // Connect to main bus instead of destination
          }
        });
      }

      setAudioInitialized(true);
      console.log('Audio initialized. Context state:', Tone.context.state);
    } catch (err) {
      console.error('Error initializing audio:', err);
      useFallbackAudio.current = true;
    }
  }

  // Cleanup on unmount
  function cleanup() {
    console.log('Cleaning up audio resources...');
    cleanupAllTracks();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    
    // Clean up patterns
    Object.values(patterns.current).forEach(pattern => {
      if (pattern && typeof pattern.dispose === 'function') {
        try {
          pattern.dispose();
        } catch (err) {
          console.error('Error disposing pattern:', err);
        }
      }
    });
    patterns.current = {};
    
    // Clean up track buses
    Object.values(trackBuses.current).forEach(bus => {
      if (bus && typeof bus.dispose === 'function') {
        try {
          bus.dispose();
        } catch (err) {
          console.error('Error disposing track bus:', err);
        }
      }
    });
    trackBuses.current = {};
    
    // Clean up main bus
    if (mainBus.current && typeof mainBus.current.dispose === 'function') {
      try {
        mainBus.current.dispose();
      } catch (err) {
        console.error('Error disposing main bus:', err);
      }
    }
    
    // Clean up players
    Object.values(players.current).forEach(player => {
      if (player && typeof player.dispose === 'function') {
        try {
          player.dispose();
        } catch (err) {
          console.error('Error disposing player:', err);
        }
      }
    });
    players.current = {};
    playingSounds.current.clear();
    patternInProgress.current.clear();
  }

  function cleanupAllTracks() {
    tracksRef.current.forEach(track => {
      if (track.isLooping && track.loopId) clearTrackLoop(track);
    });
  }

  function clearTrackLoop(track) {
    if (!track) return;
    if (patterns.current[track.id]) {
      try {
        patterns.current[track.id].stop();
        patterns.current[track.id].dispose();
        delete patterns.current[track.id];
        patternInProgress.current.delete(track.id);
      } catch (err) {
        console.error(`Error clearing pattern for track ${track.id}:`, err);
      }
    }
    if (track.loopId) {
      try {
        Tone.Transport.clear(track.loopId);
      } catch (err) {
        console.error(`Error clearing transport schedule for track ${track.id}:`, err);
      }
    }
    if (sceneRef && sceneRef.current) {
      try {
        sceneRef.current.clearSoundsForTrack(track.id);
      } catch (err) {
        console.error(`Error clearing scene for track ${track.id}:`, err);
      }
    }
  }

  function addTrack() {
    const newTrackId = uuidv4();
    const newTrack = {
      id: newTrackId,
      name: `Track ${tracks.length + 1}`,
      events: [],
      isRecording: false,
      recordStartTime: 0,
      isLooping: false,
      loopId: null,
      isCollapsed: false,
      volume: 0,
      pan: 0,
      activeHowls: new Set(),
      muted: false,
      soloed: false,
      // Add position property for layering
      position: tracks.length // Each new track goes on top
    };
    
    // Create a bus for this track
    if (!useFallbackAudio.current) {
      trackBuses.current[newTrackId] = new Tone.Channel({
        volume: 0,
        pan: 0
      }).connect(mainBus.current);
    }
    
    setTracks(prev => [...prev, newTrack]);
    setTrackOrder(prev => [...prev, newTrackId]);
    return newTrackId;
  }

  function removeTrack(trackId) {
    const trackToRemove = tracks.find(t => t.id === trackId);
    if (trackToRemove) {
      if (trackToRemove.isLooping && trackToRemove.loopId) clearTrackLoop(trackToRemove);
      
      // Clean up track bus
      if (trackBuses.current[trackId]) {
        try {
          trackBuses.current[trackId].dispose();
          delete trackBuses.current[trackId];
        } catch (err) {
          console.error(`Error disposing bus for track ${trackId}:`, err);
        }
      }
      
      setTracks(prev => {
        const newTracks = prev.filter(t => t.id !== trackId);
        if (!newTracks.some(t => t.isLooping) && Tone.Transport.state === 'started') {
          Tone.Transport.stop();
        }
        return newTracks;
      });
      
      // Update track order
      setTrackOrder(prev => prev.filter(id => id !== trackId));
      
      // Clear selected track if it's the one being removed
      if (selectedTrack === trackId) {
        setSelectedTrack(null);
      }
    }
  }
  
  function moveTrackUp(trackId) {
    setTrackOrder(prev => {
      const index = prev.indexOf(trackId);
      if (index > 0) {
        const newOrder = [...prev];
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        return newOrder;
      }
      return prev;
    });
  }

  function moveTrackDown(trackId) {
    setTrackOrder(prev => {
      const index = prev.indexOf(trackId);
      if (index < prev.length - 1) {
        const newOrder = [...prev];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        return newOrder;
      }
      return prev;
    });
  }

  function toggleCollapse(trackId) {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, isCollapsed: !track.isCollapsed } : track
    ));
  }
  
  function toggleMute(trackId) {
    setTracks(prev => {
      return prev.map(track => {
        if (track.id === trackId) {
          const newMutedState = !track.muted;
          
          // Update the track bus if available
          if (trackBuses.current[trackId]) {
            trackBuses.current[trackId].mute = newMutedState;
          }
          
          return { ...track, muted: newMutedState };
        }
        return track;
      });
    });
  }
  
  function toggleSolo(trackId) {
    setTracks(prev => {
      // First check if we're toggling solo on or off
      const targetTrack = prev.find(t => t.id === trackId);
      const newSoloState = !targetTrack.soloed;
      
      // Update all tracks based on solo state
      const updatedTracks = prev.map(track => {
        if (track.id === trackId) {
          return { ...track, soloed: newSoloState };
        }
        return track;
      });
      
      // Check if any track is soloed
      const anySoloed = updatedTracks.some(t => t.soloed);
      
      // Update the buses based on solo state
      updatedTracks.forEach(track => {
        if (trackBuses.current[track.id]) {
          if (anySoloed) {
            // If any track is soloed, only soloed tracks are heard
            trackBuses.current[track.id].mute = !track.soloed;
          } else {
            // If no tracks are soloed, return to regular mute states
            trackBuses.current[track.id].mute = track.muted;
          }
        }
      });
      
      return updatedTracks;
    });
  }

  function updateTrackVolume(trackId, volume) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        // Update track bus if available
        if (trackBuses.current[trackId]) {
          trackBuses.current[trackId].volume.value = volume;
        }
        return { ...track, volume };
      }
      return track;
    }));
  }
  
  function updateTrackPan(trackId, pan) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        // Update track bus if available
        if (trackBuses.current[trackId]) {
          trackBuses.current[trackId].pan.value = pan;
        }
        return { ...track, pan };
      }
      return track;
    }));
  }

  function renameTrack(trackId, newName) {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, name: newName } : track
    ));
  }

  async function ensureAudioInitialized() {
    if (!audioInitialized || Tone.context.state !== 'running') {
      try {
        await Tone.start();
        if (!audioInitialized) await initializeAudio();
        return true;
      } catch (err) {
        console.error('Error starting audio:', err);
        return false;
      }
    }
    return true;
  }

  function startRecording(trackId) {
    ensureAudioInitialized().then(ready => {
      if (!ready) return;
      const measureDurationMs = 4 * (60000 / bpm);
      setTracks(prev => prev.map(track => 
        track.id === trackId ? {
          ...track,
          events: [],
          isRecording: true,
          recordStartTime: performance.now(),
          recordingMaxTime: performance.now() + (measureDurationMs * 16), // Allow for longer recordings
        } : track
      ));
    });
  }

  function stopRecording(trackId) {
    const recordEndTime = performance.now();
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (!track || !track.isRecording) return prev;
      const events = [...track.events];
      if (events.length === 0) {
        return prev.map(t => t.id === trackId ? { ...t, isRecording: false } : t);
      }
      const measureDurationMs = 4 * (60000 / bpm);
      const lastEventTime = events.length > 0 ? Math.max(...events.map(e => e.offset)) : 0;
      
      // For longer recordings, ensure we round to a multiple of measures
      const minDuration = Math.max(lastEventTime + 1000, measureDurationMs);
      const measuresNeeded = Math.ceil(minDuration / measureDurationMs);
      
      // Ensure at least 4 measures for short recordings
      const finalMeasures = Math.max(measuresNeeded, 4);
      const roundedDuration = finalMeasures * measureDurationMs;
      
      const loopEndEvent = { key: 'loop-end', offset: roundedDuration, isMarker: true };
      
      return prev.map(t => 
        t.id === trackId ? { 
          ...t, 
          isRecording: false, 
          recordEndTime, 
          events: [...events, loopEndEvent], 
          totalDuration: roundedDuration 
        } : t
      );
    });
  }

  function playSound(key, trackId, time, skipVisual = false) {
    if (!keyData[key]) return false;
    
    // Get sound data
    const soundSources = Array.isArray(keyData[key].src) ? keyData[key].src : [keyData[key].src];
    const selectedSound = soundSources[Math.floor(Math.random() * soundSources.length)];
    const soundEventId = time ? `${trackId}_${key}_${Math.floor(time * 1000)}` : `${trackId}_${key}_${Math.floor(performance.now())}`;
    const duration = keyData[key].duration || 1000; // Default duration 1 second for short sounds

    // Prevent duplicate playback
    if (playingSounds.current.has(soundEventId)) return false;
    playingSounds.current.add(soundEventId);
    setTimeout(() => playingSounds.current.delete(soundEventId), duration);

    // Get the track bus if available
    const trackBus = trackBuses.current[trackId];
    const track = tracks.find(t => t.id === trackId);
    if (!track) return false;
    
    // Check mute/solo status
    const isMuted = track.muted || false;
    const anySoloed = tracks.some(t => t.soloed);
    const isSoloed = track.soloed || false;
    
    // Check if track should be heard
    const shouldBeSilent = isMuted || (anySoloed && !isSoloed);
    if (shouldBeSilent && !time) {
      // For immediate playback we respect mute/solo
      // For scheduled playback, we'll let Tone.js handle this through bus muting
      return false;
    }

    // Create visual feedback (if needed)
    if (!skipVisual && sceneRef && sceneRef.current) {
      if (time !== undefined) {
        Tone.Draw.schedule(() => {
          try {
            sceneRef.current.createSphereAndPlaySound(key, trackId, false);
          } catch (err) {
            console.error('Error creating visual feedback:', err);
          }
        }, time);
      } else {
        try {
          sceneRef.current.createSphereAndPlaySound(key, trackId, false);
        } catch (err) {
          console.error('Error creating visual feedback:', err);
        }
      }
    }

    if (useFallbackAudio.current) {
      return playWithHowler();
    } else if (time !== undefined) {
      try {
        const player = players.current[key];
        if (player && player.loaded) {
          // Create a temporary gain node to adjust volume for this specific sound
          const tempGain = new Tone.Gain(1).connect(trackBus || mainBus.current);
          player.connect(tempGain);
          
          player.start(time);
          setTimeout(() => {
            try {
              player.disconnect(tempGain);
              tempGain.dispose();
            } catch (err) {
              console.warn('Error cleaning up temporary connections:', err);
            }
          }, duration + 1000); // Clean up after the sound has played
          
          return true;
        }
        return playWithHowler();
      } catch (err) {
        console.warn(`Tone.js failed for ${key}, using Howler:`, err);
        return playWithHowler();
      }
    } else {
      try {
        const volume = track.volume || 0;
        const pan = track.pan || 0;
        
        const tempPlayer = new Tone.Player({
          url: selectedSound,
          volume: volume,
          onload: () => {
            if (trackBus) {
              tempPlayer.connect(trackBus);
            } else {
              tempPlayer.connect(mainBus.current);
            }
            tempPlayer.start();
            setTimeout(() => {
              try {
                tempPlayer.dispose();
              } catch (err) {
                console.warn('Error disposing temp player:', err);
              }
            }, duration + 1000);
          }
        });
        
        return true;
      } catch (err) {
        console.warn(`Tone.js immediate play failed for ${key}, using Howler:`, err);
        return playWithHowler();
      }
    }

    function playWithHowler() {
      try {
        // Apply track volume and pan to howler
        const volume = track ? (shouldBeSilent ? 0 : Math.pow(10, track.volume/20)) : 0.8;
        const pan = track ? track.pan : 0;
        
        const howl = new Howl({ 
          src: [selectedSound], 
          autoplay: true, 
          volume: volume,
          stereo: pan
        });
        
        if (trackId) {
          setTracks(prev => prev.map(t => 
            t.id === trackId ? { 
              ...t, 
              activeHowls: new Set([...(t.activeHowls || new Set()), howl]) 
            } : t
          ));
        }
        
        return true;
      } catch (err) {
        console.error(`Howler failed for ${key}:`, err);
        return false;
      }
    }
  }

  function createEventPattern(events, trackId) {
    if (!events || !events.length) return null;
    const playableEvents = events.filter(ev => !ev.isMarker);
    if (playableEvents.length === 0) return null;

    // Check if pattern already exists to prevent duplicates
    if (patternInProgress.current.has(trackId)) {
      console.log(`Pattern already exists for track ${trackId}`);
      return patterns.current[trackId];
    }

    const pattern = new Tone.Part((time, event) => {
      // Only play sound if not already playing
      playSound(event.key, trackId, time, false);
    }, playableEvents.map(ev => [ev.offset / 1000, { key: ev.key, offset: ev.offset }]));
    
    pattern.loop = true;
    const loopEndMarker = events.find(ev => ev.isMarker && ev.key === 'loop-end');
    pattern.loopEnd = (loopEndMarker ? loopEndMarker.offset : events[events.length - 1].offset) / 1000 + 0.05;
    
    // Register this pattern to prevent duplicates
    patternInProgress.current.add(trackId);
    
    return pattern;
  }

  async function startLoop(trackId) {
    const ready = await ensureAudioInitialized();
    if (!ready) return;
    
    // Stop if already looping
    if (patternInProgress.current.has(trackId)) {
      console.log(`Track ${trackId} is already looping`);
      return;
    }
    
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (!track || !track.events.length) return prev;
      const events = [...track.events];
      const durationMs = events[events.length - 1].offset;
      if (durationMs <= 0) return prev;

      const pattern = createEventPattern(events, trackId);
      if (!pattern) return prev;
      patterns.current[trackId] = pattern;

      if (Tone.Transport.state !== 'started') {
        Tone.Transport.position = 0;
        Tone.Transport.start();
      }
      pattern.start(0);

      return prev.map(t => 
        t.id === trackId ? { ...t, isLooping: true, loopId: pattern.id, activeHowls: t.activeHowls || new Set() } : t
      );
    });
  }

  function stopLoop(trackId) {
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (track && track.isLooping) clearTrackLoop(track);
      
      // Remove from tracking set
      patternInProgress.current.delete(trackId);
      
      const updatedTracks = prev.map(t => 
        t.id === trackId && t.isLooping ? { ...t, isLooping: false, loopId: null } : t
      );
      
      // Stop transport if no tracks are looping
      if (!updatedTracks.some(t => t.isLooping) && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
      }
      
      return updatedTracks;
    });
  }

  // Start or stop all loops
  function toggleAllLoops() {
    const anyLooping = tracks.some(t => t.isLooping);
    
    if (anyLooping) {
      // Stop all loops
      tracks.forEach(track => {
        if (track.isLooping) {
          stopLoop(track.id);
        }
      });
    } else {
      // Start all loops that have events
      tracks.forEach(track => {
        if (track.events.length > 0 && !track.isLooping) {
          startLoop(track.id);
        }
      });
    }
  }

  // Clone a track with all its events
  function cloneTrack(trackId) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    const newTrackId = addTrack();
    
    // Copy events and settings
    setTracks(prev => prev.map(t => 
      t.id === newTrackId ? {
        ...t,
        name: `${track.name} (Copy)`,
        events: [...track.events],
        volume: track.volume,
        pan: track.pan,
        totalDuration: track.totalDuration
      } : t
    ));
  }

  // Handle key press from parent
  useImperativeHandle(ref, () => ({
    recordKeyPress(key) {
      const now = performance.now();
      setTracks(prev => prev.map(track => {
        if (!track.isRecording) return track;
        const offset = now - track.recordStartTime;
        return { ...track, events: [...track.events, { offset, key }] };
      }));
      
      // Also play the sound for feedback during recording
      const recordingTrack = tracks.find(t => t.isRecording);
      if (recordingTrack) {
        playSound(key, recordingTrack.id);
      }
    },
    
    // Add method to add a track and return its ID
    addNewTrack() {
      return addTrack();
    },
    
    // Add method to trigger an event programmatically
    triggerEvent(key, trackId) {
      return playSound(key, trackId || null);
    }
  }));

  function toggleMinimized() {
    setMinimized(!minimized);
  }

  async function handleButtonClick(callback) {
    await ensureAudioInitialized();
    if (callback) callback();
  }

  // Styles
  const containerStyle = { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    padding: '0.8rem', 
    background: 'rgba(10, 15, 30, 0.85)', 
    color: '#fff', 
    zIndex: 9999, 
    width: minimized ? 'auto' : '500px', // Wider for better timeline view
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: '0 0 8px 0', 
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', 
    backdropFilter: 'blur(8px)', 
    transition: 'all 0.3s ease' 
  };
  
  const headerStyle = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: minimized ? 0 : '0.8rem', 
    padding: '0.3rem 0.5rem', 
    background: 'linear-gradient(90deg, rgba(50, 60, 120, 0.5), rgba(80, 70, 140, 0.5))', 
    borderRadius: '4px', 
    cursor: 'pointer' 
  };
  
  const buttonStyle = { 
    padding: '0.4rem 0.8rem', 
    background: 'rgba(60, 80, 170, 0.5)', 
    borderWidth: 1, 
    borderStyle: 'solid', 
    borderColor: 'rgba(80, 120, 220, 0.5)', 
    borderRadius: '4px', 
    color: 'white', 
    fontSize: '0.85rem', 
    cursor: 'pointer', 
    transition: 'all 0.2s ease' 
  };
  
  const activeButtonStyle = { 
    ...buttonStyle, 
    background: 'rgba(80, 120, 220, 0.7)', 
    borderColor: 'rgba(100, 160, 255, 0.8)', 
    boxShadow: '0 0 8px rgba(100, 150, 255, 0.4)' 
  };
  
  const deleteButtonStyle = { 
    ...buttonStyle, 
    background: 'rgba(170, 60, 80, 0.5)', 
    borderColor: 'rgba(220, 80, 120, 0.5)', 
    padding: '0.3rem 0.6rem', 
    fontSize: '0.8rem' 
  };
  
  const addTrackButtonStyle = { 
    ...buttonStyle, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '0.3rem', 
    margin: '0.5rem 0' 
  };
  
  const trackStyle = { 
    borderWidth: 1, 
    borderStyle: 'solid', 
    borderColor: 'rgba(80, 120, 220, 0.3)', 
    borderRadius: '6px', 
    marginTop: '0.8rem', 
    padding: '0.5rem', 
    background: 'rgba(20, 30, 60, 0.5)' 
  };
  
  const trackHeaderStyle = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    cursor: 'pointer', 
    padding: '0.2rem 0.4rem', 
    borderRadius: '4px', 
    background: 'rgba(40, 50, 90, 0.4)' 
  };
  
  const trackControlButtonStyle = { 
    ...buttonStyle, 
    padding: '0.1rem 0.3rem', 
    fontSize: '0.7rem', 
    margin: '0 0.1rem' 
  };
  
  const mutedButtonStyle = { 
    ...trackControlButtonStyle, 
    background: 'rgba(170, 60, 60, 0.7)', 
    borderColor: 'rgba(220, 80, 80, 0.7)' 
  };
  
  const soloedButtonStyle = { 
    ...trackControlButtonStyle, 
    background: 'rgba(60, 170, 60, 0.7)', 
    borderColor: 'rgba(80, 220, 80, 0.7)' 
  };
  
  const tabButtonStyle = {
    padding: '0.3rem 0.6rem',
    background: 'rgba(40, 50, 90, 0.4)',
    border: 'none',
    borderRadius: '4px 4px 0 0',
    color: 'white',
    fontSize: '0.8rem',
    cursor: 'pointer',
    marginRight: '0.3rem'
  };
  
  const activeTabButtonStyle = {
    ...tabButtonStyle,
    background: 'rgba(80, 100, 190, 0.6)',
    fontWeight: 'bold'
  };

  // Rendering functions
  function renderTrackTimelineView(track) {
    const maxDuration = track.totalDuration || (track.events.length > 0 ? Math.max(...track.events.map(e => e.offset)) : 2000);
    const measureDurationMs = 4 * (60000 / bpm);
    const numMeasures = Math.ceil(maxDuration / measureDurationMs);
    const measureWidthPercent = 100 / numMeasures;
    const loopEndMarker = track.events.find(ev => ev.isMarker && ev.key === 'loop-end');
    const soundEvents = track.events.filter(ev => !ev.isMarker);
    const position = playbackPositions.current[track.id] || 0;

    return (
      <div style={{ marginTop: '0.8rem', background: 'rgba(20, 25, 40, 0.8)', borderRadius: '6px', padding: '0.8rem', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
            {soundEvents.length} Events · {track.events.length > 0 ? `${(maxDuration / 1000).toFixed(2)}s Duration` : 'No events recorded'}
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px', 
            background: track.isLooping ? 'rgba(50, 205, 50, 0.2)' : 'rgba(150, 150, 150, 0.2)', 
            color: track.isLooping ? '#5f5' : '#aaa' 
          }}>
            {track.isLooping ? 'PLAYING' : 'STOPPED'}
          </div>
        </div>
        
        <div style={{ 
          position: 'relative', 
          height: '80px', // Taller for better visibility
          background: 'rgba(30, 35, 50, 0.6)', 
          borderRadius: '4px', 
          margin: '0.5rem 0', 
          overflow: 'hidden', 
          border: '1px solid rgba(80, 120, 220, 0.3)' 
        }}>
          {track.events.length === 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%', 
              color: '#888', 
              fontStyle: 'italic', 
              fontSize: '0.8rem' 
            }}>
              Press keys to record sound events
            </div>
          )}
          
          {/* Measure grid */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundImage: `repeating-linear-gradient(90deg, rgba(70, 90, 160, 0.1) 0px, rgba(70, 90, 160, 0.1) 1px, transparent 1px, transparent calc(${measureWidthPercent}%))`, 
            zIndex: 1 
          }} />
          
          {/* Beat grid */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundImage: `repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 1px, transparent 1px, transparent calc(${measureWidthPercent / 4}%))`, 
            zIndex: 1 
          }} />
          
          {/* Loop end marker */}
          {loopEndMarker && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: `${(loopEndMarker.offset / maxDuration) * 100}%`, 
              height: '100%', 
              width: '2px', 
              background: 'rgba(100, 255, 100, 0.5)', 
              boxShadow: '0 0 8px rgba(100, 255, 100, 0.5)', 
              zIndex: 3 
            }}>
              <div style={{ 
                position: 'absolute', 
                right: '-25px', 
                top: '5px', 
                fontSize: '8px', 
                color: 'rgba(100, 255, 100, 0.8)', 
                textShadow: '0 0 3px rgba(0, 0, 0, 0.8)' 
              }}>END</div>
            </div>
          )}
          
          {/* Sound events */}
          {soundEvents.sort((a, b) => a.offset - b.offset).map((ev, idx) => {
            const positionPercent = (ev.offset / maxDuration) * 100;
            const keyColors = { 
              q: '#FF5555', w: '#FFAA55', e: '#FFFF55', r: '#55FF55', t: '#55FFFF', 
              a: '#5555FF', s: '#AA55FF', d: '#FF55FF', f: '#FF55AA', 
              z: '#FFAAFF', x: '#AAFFAA', c: '#AAAAFF',
              '1': '#AAFFAA', '2': '#AAAAFF', '3': '#FFAAFF', '4': '#FFFFAA', '5': '#AAFFFF', '6': '#FFAAAA'
            };
            const color = keyColors[ev.key] || '#FFFFFF';
            const duration = keyData[ev.key]?.duration || 500;
            const width = Math.max(4, (duration / maxDuration) * 100);
            
            return (
              <div 
                key={idx} 
                style={{ 
                  position: 'absolute', 
                  left: `${positionPercent}%`, 
                  top: '10px', 
                  width: `${width}%`, 
                  height: '60px', // Taller for better visibility
                  minWidth: '4px',
                  background: color, 
                  borderRadius: '2px', 
                  transform: 'translateX(-2px)', 
                  boxShadow: `0 0 8px ${color}`, 
                  zIndex: 2,
                  opacity: 0.7
                }} 
                title={`Key: ${ev.key}, Offset: ${ev.offset}ms`}
              >
                <div style={{ 
                  position: 'absolute', 
                  top: '5px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  fontSize: '10px', 
                  color: '#000', 
                  fontWeight: 'bold',
                  textShadow: '0 0 2px rgba(255,255,255,0.8)' 
                }}>{ev.key}</div>
              </div>
            );
          })}
          
          {/* Playhead */}
          {track.isLooping && track.events.length > 0 && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: `${position * 100}%`, 
              height: '100%', 
              width: '2px', 
              background: 'rgba(255, 255, 255, 0.9)', 
              boxShadow: '0 0 10px #fff',
              zIndex: 4
            }} />
          )}
        </div>
        
        {/* Sound key legend */}
        {soundEvents.length > 0 && (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.5rem', 
            marginTop: '0.5rem', 
            fontSize: '0.7rem'
          }}>
            {[...new Set(soundEvents.map(e => e.key))].map(key => {
              const keyColors = { 
                q: '#FF5555', w: '#FFAA55', e: '#FFFF55', r: '#55FF55', t: '#55FFFF', 
                a: '#5555FF', s: '#AA55FF', d: '#FF55FF', f: '#FF55AA', 
                z: '#FFAAFF', x: '#AAFFAA', c: '#AAAAFF',
                '1': '#AAFFAA', '2': '#AAAAFF', '3': '#FFAAFF', '4': '#FFFFAA', '5': '#AAFFFF', '6': '#FFAAAA'
              };
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: keyColors[key] || '#FFFFFF', 
                    boxShadow: `0 0 4px ${keyColors[key] || '#FFFFFF'}` 
                  }}></div>
                  <span>{key}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderTrackPlayerView(track) {
    // Get unique keys in this track
    const soundEvents = track.events.filter(ev => !ev.isMarker);
    const uniqueKeys = [...new Set(soundEvents.map(e => e.key))];
    
    return (
      <div style={{ marginTop: '0.8rem', background: 'rgba(20, 25, 40, 0.8)', borderRadius: '6px', padding: '0.8rem', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)' }}>
        <div style={{ marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Sound Pad
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {Object.keys(keyData).map(key => {
            const isInTrack = uniqueKeys.includes(key);
            const keyColors = { 
              q: '#FF5555', w: '#FFAA55', e: '#FFFF55', r: '#55FF55', t: '#55FFFF', 
              a: '#5555FF', s: '#AA55FF', d: '#FF55FF', f: '#FF55AA', 
              z: '#FFAAFF', x: '#AAFFAA', c: '#AAAAFF',
              '1': '#AAFFAA', '2': '#AAAAFF', '3': '#FFAAFF', '4': '#FFFFAA', '5': '#AAFFFF', '6': '#FFAAAA'
            };
            
            return (
              <button 
                key={key}
                onClick={() => handleButtonClick(() => playSound(key, track.id))}
                style={{ 
                  width: '100%',
                  height: '40px',
                  background: isInTrack 
                    ? `linear-gradient(to bottom, rgba(60, 80, 170, 0.8), ${keyColors[key] || 'rgba(40, 60, 150, 0.8)'})`
                    : 'rgba(40, 50, 90, 0.5)',
                  border: `1px solid ${isInTrack ? keyColors[key] || 'rgba(100, 140, 255, 0.8)' : 'rgba(80, 120, 220, 0.4)'}`,
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: isInTrack ? `0 0 8px ${keyColors[key] || 'rgba(100, 140, 255, 0.4)'}` : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {key.toUpperCase()}
              </button>
            );
          })}
        </div>
        
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>
          Click a button to play sound, or press key on keyboard
        </div>
      </div>
    );
  }

  function renderTrackData(track) {
    if (viewMode === 'timeline') {
      return renderTrackTimelineView(track);
    } else {
      return renderTrackPlayerView(track);
    }
  }

  function renderTrackControls(track) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {!track.isRecording ? (
          <button 
            onClick={() => handleButtonClick(() => startRecording(track.id))} 
            style={buttonStyle}
            title="Start recording key presses"
          >
            Record
          </button>
        ) : (
          <button 
            onClick={() => stopRecording(track.id)} 
            style={{
              ...activeButtonStyle,
              background: 'rgba(220, 60, 60, 0.7)',
              borderColor: 'rgba(255, 80, 80, 0.8)',
              animation: 'pulse 1s infinite'
            }}
            title="Stop recording"
          >
            Stop Rec
          </button>
        )}
        
        {!track.isLooping ? (
          <button 
            onClick={() => handleButtonClick(() => startLoop(track.id))} 
            style={{...buttonStyle, opacity: track.events.length ? 1 : 0.5}}
            disabled={track.events.length === 0}
            title={track.events.length ? "Start loop playback" : "Record something first"}
          >
            Play
          </button>
        ) : (
          <button 
            onClick={() => stopLoop(track.id)} 
            style={activeButtonStyle}
            title="Stop loop playback"
          >
            Stop
          </button>
        )}
        
        <button
          onClick={() => handleButtonClick(() => cloneTrack(track.id))}
          style={buttonStyle}
          title="Create a copy of this track with all events"
        >
          Duplicate
        </button>
      </div>
    );
  }

  function renderVolumeControls(track) {
    return (
      <div style={{ marginTop: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ width: '40px', fontSize: '0.8rem' }}>Vol:</label>
          <input 
            type="range" 
            min="-40" 
            max="6" 
            step="0.5"
            value={track.volume || 0} 
            onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
            style={{ 
              flexGrow: 1,
              accentColor: 'rgba(80, 120, 220, 0.7)'
            }}
          />
          <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem', width: '45px', textAlign: 'right' }}>
            {track.volume > 0 ? '+' : ''}{track.volume || 0} dB
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '40px', fontSize: '0.8rem' }}>Pan:</label>
          <input 
            type="range" 
            min="-1" 
            max="1" 
            step="0.1"
            value={track.pan || 0} 
            onChange={(e) => updateTrackPan(track.id, parseFloat(e.target.value))}
            style={{ 
              flexGrow: 1,
              accentColor: 'rgba(80, 120, 220, 0.7)'
            }}
          />
          <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem', width: '45px', textAlign: 'right' }}>
            {track.pan > 0 ? 'R ' : track.pan < 0 ? 'L ' : ''}{Math.abs(Math.round((track.pan || 0) * 100))}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={toggleMinimized}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
          Multi-Track Looper
          <span style={{ marginLeft: '0.5rem', opacity: 0.7, fontSize: '0.8rem' }}>
            {minimized ? '(Click to Expand)' : '(Click to Minimize)'}
          </span>
          {!audioInitialized && (
            <span style={{
              borderRadius: '4px', 
              padding: '0.2rem 0.5rem', 
              fontSize: '0.7rem', 
              fontWeight: 'bold', 
              marginLeft: '0.5rem', 
              background: 'rgba(255, 165, 0, 0.8)'
            }}>
              Click to Initialize Audio
            </span>
          )}
        </h3>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', transform: minimized ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>▼</div>
      </div>
      
      {!minimized && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>BPM:</label>
              <input 
                type="number" 
                min="60" 
                max="240" 
                value={bpm} 
                onChange={(e) => setBpm(Math.min(240, Math.max(60, parseInt(e.target.value) || 120)))} 
                style={{ 
                  width: '60px', 
                  padding: '0.3rem', 
                  background: 'rgba(40, 50, 90, 0.8)', 
                  color: 'white', 
                  borderWidth: 0, 
                  borderRadius: '4px' 
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>Master:</label>
              <input 
                type="range" 
                min="-40" 
                max="6" 
                value={masterVolume} 
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))} 
                style={{ 
                  width: '100px',
                  accentColor: 'rgba(80, 120, 220, 0.7)'
                }}
              />
              <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem' }}>
                {masterVolume > 0 ? '+' : ''}{masterVolume} dB
              </span>
            </div>
            
            <div>
              <button
                onClick={() => handleButtonClick(toggleAllLoops)}
                style={tracks.some(t => t.isLooping) ? activeButtonStyle : buttonStyle}
                title={tracks.some(t => t.isLooping) ? "Stop All Loops" : "Play All Loops"}
              >
                {tracks.some(t => t.isLooping) ? "Stop All" : "Play All"}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', marginBottom: '0.8rem' }}>
            <button 
              style={viewMode === 'timeline' ? activeTabButtonStyle : tabButtonStyle}
              onClick={() => setViewMode('timeline')}
            >
              Timeline View
            </button>
            <button 
              style={viewMode === 'player' ? activeTabButtonStyle : tabButtonStyle}
              onClick={() => setViewMode('player')}
            >
              Player View
            </button>
          </div>
          
          <button 
            style={addTrackButtonStyle}
            onClick={() => handleButtonClick(addTrack)}
          >
            <span>+</span> Add Track
          </button>
          
          {tracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
              No tracks yet. Click "Add Track" to begin.
            </div>
          )}
          
          {tracks.map((track, index) => (
            <div key={track.id} style={{
              ...trackStyle,
              borderColor: track.isLooping ? 'rgba(80, 220, 120, 0.5)' : 'rgba(80, 120, 220, 0.3)'
            }}>
              <div
                style={trackHeaderStyle}
                onClick={() => toggleCollapse(track.id)}
              >
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    transform: track.isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', 
                    transition: 'transform 0.2s ease', 
                    display: 'inline-block', 
                    marginRight: '0.4rem' 
                  }}>▼</span>
                  
                  <span 
                    style={{ cursor: 'text' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt('Enter new track name:', track.name);
                      if (newName) renameTrack(track.id, newName);
                    }}
                    title="Click to rename track"
                  >
                    {track.name}
                  </span>
                  
                  {track.isRecording && (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      color: '#ff5555', 
                      fontSize: '0.8rem',
                      animation: 'pulse 1s infinite'
                    }}>● Recording</span>
                  )}
                  
                  {track.isLooping && (
                    <span style={{ marginLeft: '0.5rem', color: '#55ff55', fontSize: '0.8rem' }}>⟳ Looping</span>
                  )}
                </div>
                
                <div>
                  <button 
                    style={track.muted ? mutedButtonStyle : trackControlButtonStyle}
                    onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
                    title={track.muted ? "Unmute track" : "Mute track"}
                  >
                    M
                  </button>
                  
                  <button 
                    style={track.soloed ? soloedButtonStyle : trackControlButtonStyle}
                    onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
                    title={track.soloed ? "Unsolo track" : "Solo track (mutes other tracks)"}
                  >
                    S
                  </button>
                  
                  <button 
                    style={trackControlButtonStyle}
                    onClick={(e) => { e.stopPropagation(); moveTrackUp(track.id); }}
                    disabled={index === 0}
                    title="Move track up"
                  >
                    ↑
                  </button>
                  
                  <button 
                    style={trackControlButtonStyle}
                    onClick={(e) => { e.stopPropagation(); moveTrackDown(track.id); }}
                    disabled={index === tracks.length - 1}
                    title="Move track down"
                  >
                    ↓
                  </button>
                  
                  <button 
                    style={deleteButtonStyle}
                    onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                    title="Delete track"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {!track.isCollapsed && (
                <div style={{ padding: '0.5rem', marginTop: '0.4rem' }}>
                  {renderTrackControls(track)}
                  {renderVolumeControls(track)}
                  {renderTrackData(track)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
      
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
});

export default MultiTrackLooper;