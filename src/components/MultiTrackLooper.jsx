import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as Tone from 'tone';
import { useAudioManager } from './AudioManager';
// Import Firebase tracking functions
import { trackRecording, trackDownload } from './FirebaseAnalytics';

const MultiTrackLooper = forwardRef(function MultiTrackLooper({ sceneRef }, ref) {
  const [tracks, setTracks] = useState([]);
  const [trackOrder, setTrackOrder] = useState([]);
  const [minimized, setMinimized] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [masterVolume, setMasterVolume] = useState(0);
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [quantize, setQuantize] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  
  // Track played sound events to prevent duplicates during recording
  const recentSoundEvents = useRef(new Map());

  // Get audio manager from context
  const audioManager = useAudioManager();
  
  const keyData = sceneRef.current?.getKeyData() || {};
  const tracksRef = useRef([]);
  const patterns = useRef({});
  const playbackPositions = useRef({});
  const patternInProgress = useRef(new Set());
  const isFirstKeyInRecording = useRef(true);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    if (tracks.length > 0 && trackOrder.length === 0) {
      setTrackOrder(tracks.map(t => t.id));
    }
  }, [tracks, trackOrder]);

  useEffect(() => {
    return cleanup;
  }, []);

  // Master volume is now handled by the AudioManager
  useEffect(() => {
    if (audioManager.isReady) {
      // Update global volume when master volume changes
      Tone.Destination.volume.value = masterVolume;
    }
  }, [masterVolume, audioManager.isReady]);

  useEffect(() => {
    if (audioManager.isReady) {
      Tone.Transport.bpm.value = bpm;
      console.log('Updated BPM to:', bpm);
    }
  }, [bpm, audioManager.isReady]);

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
      if (audioManager.isReady && Tone.Transport.state === 'started') {
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
  }, [tracks, audioManager.isReady]);

  function cleanup() {
    console.log('Cleaning up audio resources...');
    cleanupAllTracks();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Object.values(patterns.current).forEach(pattern => pattern.dispose && pattern.dispose());
    patterns.current = {};
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
      muted: false,
      soloed: false,
      totalDuration: 0,
    };
    
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
        return { ...track, muted: newMutedState };
      }
      return track;
    }));
  }

  function toggleSolo(trackId) {
    setTracks(prev => {
      const targetTrack = prev.find(t => t.id === trackId);
      const newSoloState = !targetTrack.soloed;
      return prev.map(track => 
        track.id === trackId ? { ...track, soloed: newSoloState } : track
      );
    });
  }

  function updateTrackVolume(trackId, volume) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        return { ...track, volume };
      }
      return track;
    }));
  }

  function updateTrackPan(trackId, pan) {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
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
    if (!audioManager.isReady) {
      await audioManager.forceResumeAudio();
    }
    return audioManager.isReady;
  }

  function startRecording(trackId) {
    ensureAudioInitialized().then(ready => {
      if (!ready) return;
      
      // Reset first key flag when starting a new recording
      isFirstKeyInRecording.current = true;
      
      // Track recording event with Firebase Analytics
      trackRecording();
      console.log('Recording event tracked with Firebase Analytics');
      
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
    
    // Clear recent sound events cache after recording stops
    recentSoundEvents.current.clear();
  }

  // In MultiTrackLooper.jsx
function playSound(key, trackId, time = undefined, skipVisual = false) {
  if (!keyData[key]) {
    console.error(`No sound data found for key: ${key}`);
    return false;
  }
  
  try {
    // Get track if available
    const track = tracks.find(t => t.id === trackId);
    if (!track) {
      console.warn(`No track found for ID ${trackId}, playing without track context`);
      return audioManager.playSound(key, keyData, {});
    }

    const isMuted = track.muted;
    const anySoloed = tracks.some(t => t.soloed);
    const isSoloed = track.soloed;
    const shouldBeSilent = isMuted || (anySoloed && !isSoloed);
    if (shouldBeSilent && !time) return false;

    // Handle visual effects - always create visual regardless of audio
    if (!skipVisual && sceneRef && sceneRef.current) {
      if (time !== undefined) {
        Tone.Draw.schedule(() => sceneRef.current.createSphereAndPlaySound(key, trackId, false), time);
      } else {
        sceneRef.current.createSphereAndPlaySound(key, trackId, false);
      }
    }

    // Play the sound (this is now the ONLY place audio gets played)
    if (time !== undefined) {
      // For scheduled sounds, use Tone.js transport
      const scheduledTime = Tone.now() + time;
      Tone.Transport.schedule(() => {
        if (!shouldBeSilent) {
          audioManager.playSound(key, keyData, {
            trackId,
            volume: Math.pow(10, track.volume / 20),
            pan: track.pan || 0
          });
        }
      }, scheduledTime);
      return true;
    } else {
      // For immediate playback
      return audioManager.playSound(key, keyData, {
        trackId,
        volume: shouldBeSilent ? 0 : Math.pow(10, track.volume / 20),
        pan: track.pan || 0
      });
    }
  } catch (err) {
    console.error(`Unexpected error in playSound for ${key}:`, err);
    return false;
  }
}

  // In MultiTrackLooper.jsx, modify the createEventPattern function
function createEventPattern(events, trackId) {
  if (!events || !events.length) return null;
  const playableEvents = events.filter(ev => !ev.isMarker);
  if (playableEvents.length === 0) return null;

  if (patternInProgress.current.has(trackId)) {
    console.log(`Pattern already exists for track ${trackId}, reusing`);
    return patterns.current[trackId];
  }

  // Use Tone.js precise scheduling instead of setTimeout
  const pattern = new Tone.Part((time, event) => {
    playSound(event.key, trackId, time, false);
  }, playableEvents.map(ev => [ev.offset / 1000, { key: ev.key, offset: ev.offset }]));
  
  pattern.loop = true;
  
  // Make sure loop duration is precisely calculated
  const loopEndMarker = events.find(ev => ev.isMarker && ev.key === 'loop-end');
  const loopDuration = (loopEndMarker ? loopEndMarker.offset : events[events.length - 1].offset) / 1000;
  pattern.loopEnd = loopDuration + 0.01; // Add a tiny buffer
  
  // For more precise timing, set start position to exactly 0
  pattern.start(0);
  
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
    if (!audioManager.isReady) {
      await ensureAudioInitialized();
      if (!audioManager.isReady) {
        console.error("Audio system not ready for export");
        return;
      }
    }

    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // Track download event with Firebase Analytics
      trackDownload('wav', tracks.length > 0 ? 120 : 0); // Track format and duration
      console.log('Download event tracked with Firebase Analytics');
      
      // Use the AudioManager to export to WAV
      const result = await audioManager.exportToWav(tracks, keyData, {
        durationSeconds: 120, // 2 minutes
        sampleRate: 44100,
        masterVolume,
        onProgress: setExportProgress
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // We can keep the URL around for a while in case the user wants to download again
      setTimeout(() => {
        URL.revokeObjectURL(result.url);
      }, 60000); // Clean up after 1 minute
      
      console.log('Download started');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export mix. See console for details.');
    } finally {
      setIsExporting(false);
    }
  }

  useImperativeHandle(ref, () => ({
    // Then update recordKeyPress function
    recordKeyPress(key) {
      const now = performance.now();
      
      // Focus solely on recording the event - don't worry about audio
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
      
      // Find recording track
      const recordingTrack = tracks.find(t => t.isRecording);
      if (recordingTrack) {
        // Always have Scene handle both visuals AND audio
        // Make Scene the single source of truth for sound playback
        if (sceneRef && sceneRef.current) {
          sceneRef.current.createSphereAndPlaySound(key, recordingTrack.id, false, false);
        }
      }
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

  // Progress indicator for export
  const ExportProgressIndicator = () => {
    if (!isExporting) return null;
    
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'rgba(0, 0, 0, 0.7)', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div style={{ 
          color: 'white', 
          marginBottom: '1rem', 
          fontSize: '1.2rem' 
        }}>
          Exporting WAV Mix: {exportProgress}%
        </div>
        <div style={{ 
          width: '300px', 
          height: '20px', 
          background: 'rgba(40, 40, 40, 0.8)', 
          borderRadius: '10px', 
          overflow: 'hidden', 
          border: '1px solid #555' 
        }}>
          <div style={{ 
            width: `${exportProgress}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, #4466ff, #aa44ff)', 
            transition: 'width 0.3s ease'
          }}/>
        </div>
        <div style={{ 
          color: '#aaa', 
          marginTop: '1rem', 
          fontSize: '0.9rem', 
          maxWidth: '400px', 
          textAlign: 'center' 
        }}>
          Please wait while your mix is being processed. This may take a moment for longer compositions.
        </div>
      </div>
    );
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
    <>
       <div 
      data-tour-target="multitracklooper"
      style={containerStyle}
    >
        <div style={headerStyle} onClick={toggleMinimized}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
            Multi-Track Looper
            <span style={{ marginLeft: '0.5rem', opacity: 0.7, fontSize: '0.8rem' }}>
              {minimized ? '(Click to Expand)' : '(Click to Minimize)'}
            </span>
            {!audioManager.isReady && (
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
                style={{ 
                  ...buttonStyle, 
                  background: isExporting ? 'rgba(100, 100, 100, 0.5)' : 'rgba(40, 150, 40, 0.5)', 
                  borderColor: isExporting ? 'rgba(120, 120, 120, 0.5)' : 'rgba(60, 200, 60, 0.5)',
                  cursor: isExporting ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !isExporting && handleButtonClick(downloadMix)}
                disabled={isExporting || tracks.every(t => t.events.length === 0)}
                title={isExporting ? "Export in progress..." : "Download a 2-minute mix of all tracks"}
              >
                {isExporting ? `Exporting... ${exportProgress}%` : "Download 2-Min Mix"}
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
      
      <ExportProgressIndicator />
    </>
  );
});

export default MultiTrackLooper;