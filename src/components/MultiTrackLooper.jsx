import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as Tone from 'tone';
import { Howl } from 'howler';

const MultiTrackLooper = forwardRef(function MultiTrackLooper({ sceneRef }, ref) {
  const [tracks, setTracks] = useState([]);
  const [trackOrder, setTrackOrder] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0);
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [quantize, setQuantize] = useState(false);

  const keyData = sceneRef.current?.getKeyData() || {};
  const players = useRef({});
  const tracksRef = useRef([]);
  const patterns = useRef({});
  const audioContext = useRef(null);
  const mainBus = useRef(null);
  const trackBuses = useRef({});
  const playbackPositions = useRef({});
  const useFallbackAudio = useRef(false);
  const playingSounds = useRef(new Set());
  const patternInProgress = useRef(new Set());

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    if (tracks.length > 0 && trackOrder.length === 0) {
      setTrackOrder(tracks.map(t => t.id));
    }
  }, [tracks, trackOrder]);


  useEffect(() => {
    initializeAudio();
    return cleanup;
  }, []);

  useEffect(() => {
    if (audioInitialized && mainBus.current) {
      mainBus.current.volume.value = masterVolume;
    }
  }, [masterVolume, audioInitialized]);

  useEffect(() => {
    if (audioInitialized) {
      Tone.Transport.bpm.value = bpm;
      console.log('Updated BPM to:', bpm);
    }
  }, [bpm, audioInitialized]);

  useEffect(() => {
    if (trackOrder.length > 0 && tracks.length > 0) {
      const orderedTracks = [...tracks].sort((a, b) => {
        return trackOrder.indexOf(a.id) - trackOrder.indexOf(b.id);
      });
      if (JSON.stringify(orderedTracks.map(t => t.id)) !== JSON.stringify(tracks.map(t => t.id))) {
        setTracks(orderedTracks);
      }
    }
  }, [trackOrder]);

  useEffect(() => {
    let frameId;
    const updatePlaybackPositions = () => {
      if (audioInitialized && Tone.Transport.state === 'started') {
        const transportPosition = Tone.Transport.seconds;
        tracks.forEach(track => {
          if (track.isLooping && track.events.length > 0) {
            const loopDuration = track.totalDuration / 1000;
            if (loopDuration > 0) {
              const position = (transportPosition % loopDuration) / loopDuration;
              playbackPositions.current[track.id] = position;
            }
          }
        });
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

  async function initializeAudio() {
    try {
      console.log("Starting audio initialization...");
      await Tone.start();
      audioContext.current = Tone.getContext();
      Tone.Transport.bpm.value = bpm;
      mainBus.current = new Tone.Channel({ volume: masterVolume }).toDestination();
      
      console.log("Tone context state:", Tone.context.state);
      console.log("AudioContext state:", audioContext.current.state);
  
      try {
        const testPlayer = new Tone.Player().toDestination();
        testPlayer.dispose();
      } catch (err) {
        console.log('Tone.js issues detected, using fallback:', err);
        useFallbackAudio.current = true;
      }
  
      const keyData = sceneRef.current?.getKeyData() || {};
      console.log(`Loading ${Object.keys(keyData).length} sound sources`);
      
      if (useFallbackAudio.current) {
        Object.keys(keyData).forEach((key) => {
          const soundSource = Array.isArray(keyData[key].src) ? keyData[key].src[0] : keyData[key].src;
          console.log(`Setting up Howl for ${key}: ${soundSource}`);
          new Howl({ 
            src: [soundSource], 
            preload: true, 
            autoplay: false,
            onloaderror: (id, err) => console.error(`Howl load error for ${key}: ${soundSource}`, err),
            onplayerror: (id, err) => console.error(`Howl play error for ${key}: ${soundSource}`, err)
          });
        });
      } else {
        Object.keys(keyData).forEach((key) => {
          if (!players.current[key]) {
            const soundSource = Array.isArray(keyData[key].src) ? keyData[key].src[0] : keyData[key].src;
            console.log(`Setting up Tone.Player for ${key}: ${soundSource}`);
            players.current[key] = new Tone.Player({
              url: soundSource,
              onload: () => {
                console.log(`Player loaded for ${key}: ${soundSource}`);
                players.current[key].loaded = true;
              },
              onerror: (err) => {
                console.error(`Error loading ${key}: ${soundSource}`, err);
              },
              fadeOut: 0.01,
              volume: 0,
              autostart: false
            }).connect(mainBus.current);
          }
        });
      }
  
      setAudioInitialized(true);
      console.log('Audio initialized. Context state:', Tone.context.state);
    } catch (err) {
      console.error('Error initializing audio:', err);
      console.error('Stack trace:', err.stack);
      useFallbackAudio.current = true;
      // Try to continue with fallback mode
      try {
        if (!audioContext.current) {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const keyData = sceneRef.current?.getKeyData() || {};
        Object.keys(keyData).forEach((key) => {
          const soundSource = Array.isArray(keyData[key].src) ? keyData[key].src[0] : keyData[key].src;
          console.log(`Setting up fallback Howl for ${key}: ${soundSource}`);
          new Howl({ 
            src: [soundSource], 
            preload: true, 
            autoplay: false,
            onloaderror: (id, err) => console.error(`Fallback Howl load error for ${key}: ${soundSource}`, err),
            onplayerror: (id, err) => console.error(`Fallback Howl play error for ${key}: ${soundSource}`, err)
          });
        });
        setAudioInitialized(true);
      } catch (fallbackErr) {
        console.error('Fallback audio initialization also failed:', fallbackErr);
      }
    }
  }

  async function forceResumeAudio() {
    console.log("Attempting to force resume audio contexts...");
    
    // Resume Tone.js context
    if (Tone && Tone.context) {
      if (Tone.context.state !== "running") {
        try {
          console.log("Resuming Tone.js context. Current state:", Tone.context.state);
          await Tone.context.resume();
          console.log("Tone.js context resumed. New state:", Tone.context.state);
        } catch (err) {
          console.error("Failed to resume Tone.js context:", err);
        }
      } else {
        console.log("Tone.js context already running");
      }
    }
    
    // Check if the main AudioContext is running
    if (audioContext.current && audioContext.current.state !== "running") {
      try {
        console.log("Resuming main AudioContext. Current state:", audioContext.current.state);
        await audioContext.current.resume();
        console.log("Main AudioContext resumed. New state:", audioContext.current.state);
      } catch (err) {
        console.error("Failed to resume main AudioContext:", err);
      }
    }
    
    // For Howler.js (it uses its own AudioContext internally)
    if (window.Howler && window.Howler.ctx) {
      if (window.Howler.ctx.state !== "running") {
        try {
          console.log("Resuming Howler.js context. Current state:", window.Howler.ctx.state);
          await window.Howler.ctx.resume();
          console.log("Howler.js context resumed. New state:", window.Howler.ctx.state);
        } catch (err) {
          console.error("Failed to resume Howler.js context:", err);
        }
      } else {
        console.log("Howler.js context already running");
      }
    }
    
    // Verify file accessibility
    if (sceneRef && sceneRef.current) {
      const keyData = sceneRef.current.getKeyData() || {};
      const sampleKey = Object.keys(keyData)[0];
      if (sampleKey && keyData[sampleKey]) {
        const sampleSrc = Array.isArray(keyData[sampleKey].src) 
          ? keyData[sampleKey].src[0] 
          : keyData[sampleKey].src;
        
        try {
          console.log(`Testing file accessibility for ${sampleSrc}`);
          const response = await fetch(sampleSrc, { method: 'HEAD' });
          if (response.ok) {
            console.log(`File ${sampleSrc} is accessible`);
          } else {
            console.error(`File ${sampleSrc} returned status ${response.status}`);
          }
        } catch (err) {
          console.error(`Cannot access file ${sampleSrc}:`, err);
        }
      }
    }
    
    // Reset audio initialization state to force reinitialize
    setAudioInitialized(false);
    useFallbackAudio.current = false;
    await initializeAudio();
    
    return "Audio context force resumed and re-initialized";
  }

  function testAudio() {
    console.log("Running audio test...");
    ensureAudioInitialized().then(ready => {
      if (!ready) {
        console.error("Audio initialization failed");
        return;
      }
      
      // Test playback with both libraries
      const keyData = sceneRef.current?.getKeyData() || {};
      const keys = Object.keys(keyData);
      if (keys.length === 0) {
        console.error("No sound data available");
        return;
      }
      
      const testKey = keys[0];
      console.log(`Testing playback for key: ${testKey}`);
      
      // Test with Tone.js
      if (!useFallbackAudio.current) {
        try {
          const player = new Tone.Player({
            url: keyData[testKey].src,
            autostart: true,
            onload: () => console.log("Tone test player loaded"),
            onerror: (err) => console.error("Tone test player error:", err)
          }).toDestination();
          
          setTimeout(() => {
            player.dispose();
          }, 2000);
        } catch (err) {
          console.error("Tone.js test playback failed:", err);
        }
      }
      
      // Test with Howler
      try {
        const howl = new Howl({
          src: [keyData[testKey].src],
          autoplay: true,
          volume: 0.5,
          onload: () => console.log("Howl test loaded successfully"),
          onloaderror: (id, err) => console.error("Howl test load error:", err),
          onplay: () => console.log("Howl test playing"),
          onplayerror: (id, err) => console.error("Howl test play error:", err)
        });
      } catch (err) {
        console.error("Howler test playback failed:", err);
      }
    });
  }

  function cleanup() {
    console.log('Cleaning up audio resources...');
    cleanupAllTracks();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Object.values(patterns.current).forEach(pattern => pattern.dispose && pattern.dispose());
    patterns.current = {};
    Object.values(trackBuses.current).forEach(bus => bus.dispose && bus.dispose());
    trackBuses.current = {};
    mainBus.current?.dispose && mainBus.current.dispose();
    Object.values(players.current).forEach(player => player.dispose && player.dispose());
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
        console.log(`Cleared pattern for track ${track.id}`);
      } catch (err) {
        console.error(`Error clearing pattern for track ${track.id}:`, err);
      }
    }
    if (track.loopId) {
      try {
        Tone.Transport.clear(track.loopId);
        console.log(`Cleared transport schedule for track ${track.id}`);
      } catch (err) {
        console.error(`Error clearing transport schedule for track ${track.id}:`, err);
      }
    }
    if (track.activeHowls && track.activeHowls.size > 0) {
      track.activeHowls.forEach(howl => {
        howl.stop();
        howl.unload();
      });
      track.activeHowls.clear();
      console.log(`Cleared Howls for track ${track.id}`);
    }
    if (sceneRef && sceneRef.current) {
      try {
        sceneRef.current.clearSoundsForTrack(track.id);
        console.log(`Cleared scene sounds for track ${track.id}`);
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
      totalDuration: 0,
    };
    if (!useFallbackAudio.current) {
      trackBuses.current[newTrackId] = new Tone.Channel({ volume: 0, pan: 0 }).connect(mainBus.current);
    }
    setTracks(prev => [...prev, newTrack]);
    setTrackOrder(prev => [...prev, newTrackId]);
    console.log(`Added new track ${newTrackId}`);
    return newTrackId;
  }

  function removeTrack(trackId) {
    const trackToRemove = tracks.find(t => t.id === trackId);
    if (trackToRemove) {
      console.log(`Removing track ${trackId}`);
      if (trackToRemove.isLooping && trackToRemove.loopId) clearTrackLoop(trackToRemove);
      
      if (trackBuses.current[trackId]) {
        try {
          trackBuses.current[trackId].mute = true;
          trackBuses.current[trackId].dispose();
          delete trackBuses.current[trackId];
          console.log(`Disposed track bus for ${trackId}`);
        } catch (err) {
          console.error(`Error disposing bus for track ${trackId}:`, err);
        }
      }

      if (patterns.current[trackId]) {
        try {
          patterns.current[trackId].stop();
          patterns.current[trackId].dispose();
          delete patterns.current[trackId];
          console.log(`Forcefully cleared pattern for ${trackId}`);
        } catch (err) {
          console.error(`Error forcefully clearing pattern for ${trackId}:`, err);
        }
      }
      patternInProgress.current.delete(trackId);

      setTracks(prev => {
        const newTracks = prev.filter(t => t.id !== trackId);
        if (!newTracks.some(t => t.isLooping) && Tone.Transport.state === 'started') {
          Tone.Transport.stop();
          console.log('Stopped Transport as no tracks are looping');
        }
        console.log(`Remaining tracks: ${newTracks.map(t => t.id).join(', ')}`);
        return newTracks;
      });
      
      setTrackOrder(prev => {
        const newOrder = prev.filter(id => id !== trackId);
        console.log(`Updated track order: ${newOrder.join(', ')}`);
        return newOrder;
      });
      
      if (selectedTrack === trackId) setSelectedTrack(null);
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
    console.log(`Toggled collapse for track ${trackId}`);
  }

  function toggleMute(trackId) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        const newMutedState = !track.muted;
        if (trackBuses.current[trackId]) trackBuses.current[trackId].mute = newMutedState;
        return { ...track, muted: newMutedState };
      }
      return track;
    }));
  }

  function toggleSolo(trackId) {
    setTracks(prev => {
      const targetTrack = prev.find(t => t.id === trackId);
      const newSoloState = !targetTrack.soloed;
      const updatedTracks = prev.map(track => 
        track.id === trackId ? { ...track, soloed: newSoloState } : track
      );
      const anySoloed = updatedTracks.some(t => t.soloed);
      updatedTracks.forEach(track => {
        if (trackBuses.current[track.id]) {
          trackBuses.current[track.id].mute = anySoloed ? !track.soloed : track.muted;
        }
      });
      return updatedTracks;
    });
  }

  function updateTrackVolume(trackId, volume) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        if (trackBuses.current[trackId]) trackBuses.current[trackId].volume.value = volume;
        return { ...track, volume };
      }
      return track;
    }));
  }

  function updateTrackPan(trackId, pan) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        if (trackBuses.current[trackId]) trackBuses.current[trackId].pan.value = pan;
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
    console.log("Ensuring audio is initialized...");
    try {
      if (!audioInitialized || 
          (Tone.context && Tone.context.state !== 'running') || 
          (audioContext.current && audioContext.current.state !== 'running')) {
        
        console.log("Audio needs initialization or resuming");
        console.log("Tone context state:", Tone.context ? Tone.context.state : "N/A");
        console.log("AudioContext state:", audioContext.current ? audioContext.current.state : "N/A");
        
        try {
          await Tone.start();
          console.log("Tone started successfully");
        } catch (toneErr) {
          console.error("Error starting Tone:", toneErr);
        }
        
        if (Tone.context && Tone.context.state !== 'running') {
          try {
            console.log("Attempting to resume Tone context");
            await Tone.context.resume();
            console.log("Tone context resumed, state:", Tone.context.state);
          } catch (resumeErr) {
            console.error("Error resuming Tone context:", resumeErr);
          }
        }
        
        if (audioContext.current && audioContext.current.state !== 'running') {
          try {
            console.log("Attempting to resume AudioContext");
            await audioContext.current.resume();
            console.log("AudioContext resumed, state:", audioContext.current.state);
          } catch (resumeErr) {
            console.error("Error resuming AudioContext:", resumeErr);
          }
        }
        
        if (!audioInitialized) {
          console.log("Initializing audio from scratch");
          await initializeAudio();
        }
        
        console.log("Audio initialization complete");
        return true;
      }
      return true;
    } catch (err) {
      console.error("Error in ensureAudioInitialized:", err);
      return false;
    }
  }

  function startRecording(trackId) {
    ensureAudioInitialized().then(ready => {
      if (!ready) return;
      setTracks(prev => prev.map(track => 
        track.id === trackId ? {
          ...track,
          events: [],
          isRecording: true,
          recordStartTime: performance.now(),
        } : track
      ));
      console.log(`Started recording on track ${trackId}`);
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

      const actualDuration = recordEndTime - track.recordStartTime;
      let finalDuration = actualDuration;

      if (quantize) {
        const beatDurationMs = 60000 / bpm;
        const beats = Math.ceil(actualDuration / beatDurationMs);
        finalDuration = beats * beatDurationMs;
      }

      const loopEndEvent = { key: 'loop-end', offset: finalDuration, isMarker: true };

      console.log(`Stopped recording on track ${trackId}. Duration: ${finalDuration}ms, Events: ${events.length}`);
      return prev.map(t => 
        t.id === trackId ? { 
          ...t, 
          isRecording: false, 
          recordEndTime, 
          events: [...events, loopEndEvent], 
          totalDuration: finalDuration 
        } : t
      );
    });
  }

  function playSound(key, trackId, time, skipVisual = false) {
    if (!keyData[key]) {
      console.error(`No sound data found for key: ${key}`);
      return false;
    }
    
    try {
      const soundSources = Array.isArray(keyData[key].src) ? keyData[key].src : [keyData[key].src];
      const selectedSound = soundSources[Math.floor(Math.random() * soundSources.length)];
      const soundEventId = time ? `${trackId}_${key}_${Math.floor(time * 1000)}` : `${trackId}_${key}_${Math.floor(performance.now())}`;
      const duration = keyData[key].duration || 1000;
  
      if (playingSounds.current.has(soundEventId)) return false;
      playingSounds.current.add(soundEventId);
      setTimeout(() => playingSounds.current.delete(soundEventId), duration);
  
      const trackBus = trackBuses.current[trackId];
      const track = tracks.find(t => t.id === trackId);
      if (!track) {
        console.warn(`No track found for ID ${trackId}, playing without track context`);
        return playImmediateSound(key);
      }
  
      const isMuted = track.muted;
      const anySoloed = tracks.some(t => t.soloed);
      const isSoloed = track.soloed;
      const shouldBeSilent = isMuted || (anySoloed && !isSoloed);
      if (shouldBeSilent && !time) return false;
  
      if (!skipVisual && sceneRef && sceneRef.current) {
        if (time !== undefined) {
          Tone.Draw.schedule(() => sceneRef.current.createSphereAndPlaySound(key, trackId, false), time);
        } else {
          sceneRef.current.createSphereAndPlaySound(key, trackId, false);
        }
      }
  
      console.log(`Playing sound ${key} on track ${trackId}${time !== undefined ? ` at time ${time}` : ''}`);
      
      if (useFallbackAudio.current) {
        return playWithHowler();
      } else if (time !== undefined) {
        const player = players.current[key];
        if (player && player.loaded) {
          try {
            const tempGain = new Tone.Gain(1).connect(trackBus || mainBus.current);
            player.connect(tempGain);
            player.start(time);
            setTimeout(() => {
              player.disconnect(tempGain);
              tempGain.dispose();
            }, duration + 1000);
            return true;
          } catch (err) {
            console.error(`Error playing Tone.Player for ${key}:`, err);
            return playWithHowler();
          }
        }
        console.warn(`Tone.Player not loaded for ${key}, falling back to Howler`);
        return playWithHowler();
      } else {
        return playImmediateSound(key, track);
      }
  
      function playImmediateSound(key, trackContext) {
        try {
          const volume = trackContext ? trackContext.volume || 0 : 0;
          const pan = trackContext ? trackContext.pan || 0 : 0;
          const tempPlayer = new Tone.Player({
            url: selectedSound,
            volume,
            onload: () => {
              try {
                if (trackBus) tempPlayer.connect(trackBus);
                else tempPlayer.connect(mainBus.current);
                tempPlayer.start();
                setTimeout(() => tempPlayer.dispose(), duration + 1000);
                console.log(`Successfully started Tone.Player for ${key}`);
              } catch (playErr) {
                console.error(`Error starting Tone.Player for ${key}:`, playErr);
                playWithHowler(); // Fallback if starting fails
              }
            },
            onerror: (err) => {
              console.error(`Error loading Tone.Player for ${key}:`, err);
              playWithHowler(); // Fallback if loading fails
            }
          });
          return true;
        } catch (err) {
          console.error(`Error creating Tone.Player for ${key}:`, err);
          return playWithHowler(); // Fallback if creation fails
        }
      }
  
      function playWithHowler() {
        try {
          const volume = track ? (shouldBeSilent ? 0 : Math.pow(10, track.volume / 20)) : 0.8;
          const pan = track ? track.pan : 0;
          console.log(`Creating Howl for ${key}, src: ${selectedSound}, volume: ${volume}, pan: ${pan}`);
          
          const howl = new Howl({ 
            src: [selectedSound], 
            autoplay: true, 
            volume,
            stereo: pan,
            onloaderror: (id, err) => console.error(`Howl load error for ${key}:`, err),
            onplayerror: (id, err) => console.error(`Howl play error for ${key}:`, err)
          });
          
          howl.once('play', () => {
            console.log(`Howl successfully playing for ${key}`);
          });
          
          if (trackId) {
            setTracks(prev => prev.map(t => 
              t.id === trackId ? { ...t, activeHowls: new Set([...t.activeHowls, howl]) } : t
            ));
          }
          return true;
        } catch (err) {
          console.error(`Error playing with Howler for ${key}:`, err);
          return false;
        }
      }
    } catch (err) {
      console.error(`Unexpected error in playSound for ${key}:`, err);
      return false;
    }
  }

  function createEventPattern(events, trackId) {
    if (!events || !events.length) return null;
    const playableEvents = events.filter(ev => !ev.isMarker);
    if (playableEvents.length === 0) return null;

    if (patternInProgress.current.has(trackId)) {
      console.log(`Pattern already exists for track ${trackId}, reusing`);
      return patterns.current[trackId];
    }

    const pattern = new Tone.Part((time, event) => {
      playSound(event.key, trackId, time, false);
    }, playableEvents.map(ev => [ev.offset / 1000, { key: ev.key, offset: ev.offset }]));
    
    pattern.loop = true;
    const loopEndMarker = events.find(ev => ev.isMarker && ev.key === 'loop-end');
    pattern.loopEnd = (loopEndMarker ? loopEndMarker.offset : events[events.length - 1].offset) / 1000 + 0.05;
    patternInProgress.current.add(trackId);
    
    console.log(`Created pattern for track ${trackId} with ${playableEvents.length} events, loopEnd: ${pattern.loopEnd}s`);
    return pattern;
  }

  async function startLoop(trackId) {
    const ready = await ensureAudioInitialized();
    if (!ready) return;
    
    if (patternInProgress.current.has(trackId)) {
      console.log(`Track ${trackId} is already looping`);
      return;
    }
    
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (!track || !track.events.length) return prev;
      const events = [...track.events];
      const durationMs = track.totalDuration;
      if (durationMs <= 0) return prev;

      const pattern = createEventPattern(events, trackId);
      if (!pattern) return prev;
      patterns.current[trackId] = pattern;

      if (Tone.Transport.state !== 'started') {
        Tone.Transport.position = 0;
        Tone.Transport.start();
      }
      pattern.start(0);

      console.log(`Started loop for track ${trackId}`);
      return prev.map(t => 
        t.id === trackId ? { ...t, isLooping: true, loopId: pattern.id } : t
      );
    });
  }

  function stopLoop(trackId) {
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (track && track.isLooping) clearTrackLoop(track);
      patternInProgress.current.delete(trackId);
      const updatedTracks = prev.map(t => 
        t.id === trackId && t.isLooping ? { ...t, isLooping: false, loopId: null } : t
      );
      if (!updatedTracks.some(t => t.isLooping) && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
        console.log('Stopped Transport as no tracks are looping');
      }
      console.log(`Stopped loop for track ${trackId}`);
      return updatedTracks;
    });
  }

  function toggleAllLoops() {
    const anyLooping = tracks.some(t => t.isLooping);
    if (anyLooping) {
      tracks.forEach(track => track.isLooping && stopLoop(track.id));
    } else {
      tracks.forEach(track => track.events.length > 0 && !track.isLooping && startLoop(track.id));
    }
  }

  function cloneTrack(trackId) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const newTrackId = addTrack();
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

  async function downloadMix() {
  if (!audioInitialized) {
    await ensureAudioInitialized();
  }

  const durationSeconds = 120; // 2 minutes
  const sampleRate = 44100;
  const offlineContext = new OfflineAudioContext(2, durationSeconds * sampleRate, sampleRate);

  const masterGain = offlineContext.createGain();
  masterGain.gain.value = Math.pow(10, masterVolume / 20);
  masterGain.connect(offlineContext.destination);

  // Get keyData from Scene
  const keyData = sceneRef.current?.getKeyData() || {};
  const soundBuffers = {};

  // Use preloaded buffers or load them if missing
  for (const key of Object.keys(keyData)) {
    if (keyData[key].buffer) {
      soundBuffers[key] = keyData[key].buffer;
      console.log(`Using preloaded buffer for ${key}: ${keyData[key].src}`);
    } else {
      console.warn(`No preloaded buffer for ${key}. Loading now...`);
      try {
        const response = await fetch(keyData[key].src);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);
        soundBuffers[key] = audioBuffer;
        console.log(`Loaded buffer for ${key}`);
      } catch (err) {
        console.error(`Failed to load buffer for ${key}:`, err);
      }
    }
  }

 

  // Schedule track events
  tracks.forEach(track => {
    if (track.events.length === 0) return;

    const isMuted = track.muted;
    const anySoloed = tracks.some(t => t.soloed);
    const isSoloed = track.soloed;
    if (isMuted || (anySoloed && !isSoloed)) return;

    const trackGain = offlineContext.createGain();
    trackGain.gain.value = Math.pow(10, track.volume / 20);
    const panner = offlineContext.createStereoPanner();
    panner.pan.value = track.pan;
    trackGain.connect(panner);
    panner.connect(masterGain);

    const playableEvents = track.events.filter(ev => !ev.isMarker && soundBuffers[ev.key]);
    const loopDuration = track.totalDuration / 1000;

    if (loopDuration <= 0 || playableEvents.length === 0) {
      console.warn(`Skipping track ${track.id}: Invalid duration or no playable events`);
      return;
    }

    console.log(`Track ${track.id}: ${playableEvents.length} events, loop duration ${loopDuration}s`);
    const loopCount = Math.ceil(durationSeconds / loopDuration);

    for (let i = 0; i < loopCount; i++) {
      playableEvents.forEach(event => {
        const time = (i * loopDuration) + (event.offset / 1000);
        if (time >= durationSeconds) return;

        const source = offlineContext.createBufferSource();
        source.buffer = soundBuffers[event.key];
        source.connect(trackGain);
        source.start(time);
        console.log(`Scheduled ${event.key} at ${time}s on track ${track.id}`);
      });
    }
  });

  console.log('Starting offline rendering...');
  let buffer;
  try {
    buffer = await offlineContext.startRendering();
    console.log('Rendering complete. Buffer duration:', buffer.duration);
  } catch (err) {
    console.error('Rendering failed:', err);
    throw err;
  }

  const channelData = buffer.getChannelData(0);
  const hasAudio = channelData.some(sample => Math.abs(sample) > 0);
  console.log('Buffer has audio:', hasAudio);

  const wavBlob = bufferToWave(buffer, buffer.length, sampleRate);
  const url = URL.createObjectURL(wavBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'MultiTrackLooper_Mix_2min.wav';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('Download started');
}

  function bufferToWave(buffer, len, sampleRate) {
    const numChannels = buffer.numberOfChannels;
    const wavLength = len * numChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(wavLength);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + len * numChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, len * numChannels * 2, true);

    for (let i = 0; i < len; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(44 + (i * numChannels + channel) * 2, value | 0, true);
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  useImperativeHandle(ref, () => ({
    recordKeyPress(key) {
      const now = performance.now();
      setTracks(prev => prev.map(track => {
        if (!track.isRecording) return track;
        let offset = now - track.recordStartTime;
        if (quantize) {
          const beatDurationMs = 60000 / bpm;
          offset = Math.round(offset / beatDurationMs) * beatDurationMs;
        }
        console.log(`Recorded key ${key} on track ${track.id} at offset ${offset}ms`);
        return { ...track, events: [...track.events, { offset, key }] };
      }));
      const recordingTrack = tracks.find(t => t.isRecording);
      if (recordingTrack) playSound(key, recordingTrack.id);
    },
    addNewTrack() {
      return addTrack();
    },
    triggerEvent(key, trackId) {
      return playSound(key, trackId || null);
    }
  }));

  function toggleMinimized() {
    setMinimized(prev => !prev);
    console.log(`Looper UI ${minimized ? 'expanded' : 'minimized'}`);
  }

  async function handleButtonClick(callback) {
    await ensureAudioInitialized();
    if (callback) callback();
  }

  const containerStyle = { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    padding: minimized ? '0.5rem' : '0.8rem', 
    background: 'rgba(10, 15, 30, 0.85)', 
    color: '#fff', 
    zIndex: 9999, 
    width: minimized ? 'auto' : '500px', 
    maxHeight: minimized ? 'auto' : '90vh', 
    overflowY: minimized ? 'hidden' : 'auto', 
    borderRadius: '0 0 8px 0', 
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', 
    backdropFilter: 'blur(8px)', 
    transition: 'all 0.3s ease' 
  };
  
  const headerStyle = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
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
          height: '80px',
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
          
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundImage: `repeating-linear-gradient(90deg, rgba(70, 90, 160, 0.1) 0px, rgba(70, 90, 160, 0.1) 1px, transparent 1px, transparent calc(${measureWidthPercent}%))`, 
            zIndex: 1 
          }} />
          
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundImage: `repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 1px, transparent 1px, transparent calc(${measureWidthPercent / 4}%))`, 
            zIndex: 1 
          }} />
          
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
                  height: '60px',
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
      </div>
    );
  }

  function renderTrackPlayerView(track) {
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
    return viewMode === 'timeline' ? renderTrackTimelineView(track) : renderTrackPlayerView(track);
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
      <div style={{ 
        position: 'absolute', 
        top: '0.5rem', 
        right: '0.5rem', 
        padding: '0.5rem', 
        background: 'rgba(255, 50, 50, 0.7)', 
        borderRadius: '4px',
        cursor: 'pointer',
        zIndex: 10000
      }} onClick={() => forceResumeAudio().then(testAudio)}>
        Debug Audio
      </div>
      
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleButtonClick(toggleAllLoops)}
                style={tracks.some(t => t.isLooping) ? activeButtonStyle : buttonStyle}
                title={tracks.some(t => t.isLooping) ? "Stop All Loops" : "Play All Loops"}
              >
                {tracks.some(t => t.isLooping) ? "Stop All" : "Play All"}
              </button>
              <label style={{ fontSize: '0.9rem' }}>
                Quantize:
                <input 
                  type="checkbox" 
                  checked={quantize} 
                  onChange={(e) => setQuantize(e.target.checked)} 
                  style={{ marginLeft: '0.3rem' }}
                />
              </label>
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
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <button 
              style={addTrackButtonStyle}
              onClick={() => handleButtonClick(addTrack)}
            >
              <span>+</span> Add Track
            </button>
            <button 
              style={{ ...buttonStyle, background: 'rgba(40, 150, 40, 0.5)', borderColor: 'rgba(60, 200, 60, 0.5)' }}
              onClick={() => handleButtonClick(downloadMix)}
              disabled={tracks.every(t => t.events.length === 0)}
              title="Download a 2-minute mix of all tracks"
            >
              Download 2-Min Mix
            </button>
          </div>
          
          {tracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', opacity: '0.7', fontSize: '0.9rem' }}>
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
                    transform: track.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
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