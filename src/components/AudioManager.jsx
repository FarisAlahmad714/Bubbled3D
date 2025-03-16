import { createContext, useState, useEffect, useRef, useContext } from 'react';
import * as Tone from 'tone';
import { Howl } from 'howler';

// Create a context for the audio manager
export const AudioManagerContext = createContext();

// Custom hook for using the audio manager
export const useAudioManager = () => useContext(AudioManagerContext);

export function AudioManagerProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [bufferLoadErrors, setBufferLoadErrors] = useState([]);
  
  // Use a single shared audio context
  const audioContext = useRef(null);
  const mainGainNode = useRef(null);
  const recorderRef = useRef(null);
  const bufferCache = useRef({});
  const howlCache = useRef({});
  const useFallbackAudio = useRef(false);
  
  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log("Initializing AudioManager...");
        
        // Create or get AudioContext
        if (Tone.context && Tone.context.state) {
          audioContext.current = Tone.context;
          console.log("Using Tone's audio context");
        } else {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
          console.log("Created new AudioContext");
        }
        
        // Create main gain node
        mainGainNode.current = audioContext.current.createGain();
        mainGainNode.current.connect(audioContext.current.destination);
        
        // Create recorder
        recorderRef.current = new Tone.Recorder();
        Tone.Destination.connect(recorderRef.current);
        
        console.log("Audio system initialized");
        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize audio system:", err);
        useFallbackAudio.current = true;
        
        // Try fallback initialization
        try {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
          mainGainNode.current = audioContext.current.createGain();
          mainGainNode.current.connect(audioContext.current.destination);
          console.log("Fallback audio system initialized");
          setIsReady(true);
        } catch (fallbackErr) {
          console.error("Fallback audio initialization failed:", fallbackErr);
        }
      }
    };
    
    initAudio();
    
    // Cleanup
    return () => {
      // Clean up audio resources
      Object.values(howlCache.current).forEach(howl => {
        howl.unload();
      });
      
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
    };
  }, []);
  
  // Load buffer from URL
  const loadBuffer = async (url) => {
    if (bufferCache.current[url]) {
      return bufferCache.current[url];
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
      
      bufferCache.current[url] = audioBuffer;
      return audioBuffer;
    } catch (err) {
      console.error(`Failed to load buffer for ${url}:`, err);
      setBufferLoadErrors(prev => [...prev, { url, error: err.message }]);
      throw err;
    }
  };
  
  // Load multiple buffers and track progress
  const loadBuffers = async (soundMap) => {
    const urls = [];
    
    // Collect all unique URLs
    Object.values(soundMap).forEach(soundData => {
      if (Array.isArray(soundData.src)) {
        soundData.src.forEach(url => {
          if (!urls.includes(url)) urls.push(url);
        });
      } else if (typeof soundData.src === 'string' && !urls.includes(soundData.src)) {
        urls.push(soundData.src);
      }
    });
    
    let loaded = 0;
    const total = urls.length;
    
    // Load each buffer
    const loadPromises = urls.map(async (url) => {
      try {
        const buffer = await loadBuffer(url);
        loaded++;
        setLoadingProgress(Math.floor((loaded / total) * 100));
        return { url, buffer };
      } catch (err) {
        loaded++;
        setLoadingProgress(Math.floor((loaded / total) * 100));
        console.error(`Error loading ${url}:`, err);
        return { url, error: err };
      }
    });
    
    // Wait for all to complete
    const results = await Promise.allSettled(loadPromises);
    
    // Attach buffers to the sound map
    Object.keys(soundMap).forEach(key => {
      const soundData = soundMap[key];
      const url = Array.isArray(soundData.src) ? soundData.src[0] : soundData.src;
      
      // Find the corresponding buffer
      const result = results.find(r => r.value && r.value.url === url);
      if (result && result.value && result.value.buffer) {
        soundMap[key].buffer = result.value.buffer;
      }
    });
    
    return soundMap;
  };
  
  // Play a sound
  const playSound = (key, soundMap, options = {}) => {
    if (!soundMap[key]) {
      console.error(`No sound data for key: ${key}`);
      return null;
    }
    
    const { trackId, trackBus, volume = 1, pan = 0 } = options;
    
    try {
      // Get the sound source
      const soundSources = Array.isArray(soundMap[key].src) 
        ? soundMap[key].src 
        : [soundMap[key].src];
      
      const selectedSound = soundSources[Math.floor(Math.random() * soundSources.length)];
      
      if (useFallbackAudio.current) {
        return playWithHowler(selectedSound, { volume, pan, trackId });
      } else {
        return playWithTone(selectedSound, key, soundMap, { volume, pan, trackBus, trackId });
      }
    } catch (err) {
      console.error(`Error playing sound ${key}:`, err);
      return playWithHowler(soundMap[key].src, { volume, pan, trackId });
    }
  };
  
  // Play with Tone.js
  const playWithTone = (url, key, soundMap, options) => {
    const { volume, pan, trackBus, trackId } = options;
    
    try {
      // Use cached buffer if available
      if (soundMap[key].buffer) {
        console.log(`Using cached buffer for ${key}`);
        const source = audioContext.current.createBufferSource();
        source.buffer = soundMap[key].buffer;
        
        // Create gain and panner nodes
        const gainNode = audioContext.current.createGain();
        gainNode.gain.value = volume;
        
        const pannerNode = audioContext.current.createStereoPanner();
        pannerNode.pan.value = pan;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(trackBus || mainGainNode.current);
        
        // Start playback
        source.start();
        console.log(`Started playback for ${key} with buffer`);
        
        return source;
      } else {
        // Create a player if no buffer
        const player = new Tone.Player({
          url,
          volume: Tone.gainToDb(volume),
          autostart: true,
          onload: () => console.log(`Tone player loaded for ${key}`),
          onerror: (err) => console.error(`Tone player error for ${key}:`, err)
        });
        
        if (pan !== 0) {
          const panner = new Tone.Panner(pan);
          player.connect(panner);
          panner.connect(trackBus || Tone.Destination);
        } else {
          player.connect(trackBus || Tone.Destination);
        }
        
        // Dispose after playback
        player.onstop = () => player.dispose();
        
        return player;
      }
    } catch (err) {
      console.error(`Error with Tone playback for ${key}:`, err);
      return playWithHowler(url, { volume, pan, trackId });
    }
  };
  
  // Play with Howler (fallback)
  const playWithHowler = (url, options) => {
    const { volume, pan, trackId } = options;
    
    // Check for cached Howl
    if (howlCache.current[url]) {
      const cachedHowl = howlCache.current[url];
      const id = cachedHowl.play();
      cachedHowl.volume(volume, id);
      cachedHowl.stereo(pan, id);
      return cachedHowl;
    }
    
    // Create new Howl
    const howl = new Howl({
      src: [url],
      volume,
      stereo: pan,
      onload: () => console.log(`Howl loaded: ${url}`),
      onloaderror: (id, err) => console.error(`Howl load error: ${url}`, err),
      onplayerror: (id, err) => console.error(`Howl play error: ${url}`, err)
    });
    
    // Cache for future use (limit cache size)
    const cacheKeys = Object.keys(howlCache.current);
    if (cacheKeys.length > 50) {
      // Remove oldest item from cache
      const oldestKey = cacheKeys[0];
      howlCache.current[oldestKey].unload();
      delete howlCache.current[oldestKey];
    }
    
    howlCache.current[url] = howl;
    howl.play();
    return howl;
  };
  
  // Force resume all audio contexts
  const forceResumeAudio = async () => {
    console.log("Attempting to force resume audio contexts...");
    
    // Resume our main audio context
    if (audioContext.current && audioContext.current.state !== "running") {
      try {
        console.log(`Resuming main AudioContext. Current state: ${audioContext.current.state}`);
        await audioContext.current.resume();
        console.log(`Main AudioContext resumed. New state: ${audioContext.current.state}`);
      } catch (err) {
        console.error("Failed to resume main AudioContext:", err);
      }
    }
    
    // Resume Tone.js context
    if (Tone && Tone.context && Tone.context.state !== "running") {
      try {
        console.log(`Resuming Tone.js context. Current state: ${Tone.context.state}`);
        await Tone.context.resume();
        console.log(`Tone.js context resumed. New state: ${Tone.context.state}`);
      } catch (err) {
        console.error("Failed to resume Tone.js context:", err);
      }
    }
    
    // Resume Howler.js context
    if (window.Howler && window.Howler.ctx && window.Howler.ctx.state !== "running") {
      try {
        console.log(`Resuming Howler.js context. Current state: ${window.Howler.ctx.state}`);
        await window.Howler.ctx.resume();
        console.log(`Howler.js context resumed. New state: ${window.Howler.ctx.state}`);
      } catch (err) {
        console.error("Failed to resume Howler.js context:", err);
      }
    }
    
    return true;
  };
  
  // Start recording the master output
  const startRecording = async () => {
    if (!recorderRef.current) {
      console.error("Recorder not initialized");
      return false;
    }
    
    await forceResumeAudio();
    
    try {
      await recorderRef.current.start();
      console.log("Recording started");
      return true;
    } catch (err) {
      console.error("Failed to start recording:", err);
      return false;
    }
  };
  
  // Stop recording and return a blob URL
  const stopRecording = async () => {
    if (!recorderRef.current) {
      console.error("Recorder not initialized");
      return null;
    }
    
    try {
      const recording = await recorderRef.current.stop();
      console.log("Recording stopped, blob created:", recording);
      
      // Create a download URL
      const url = URL.createObjectURL(recording);
      return url;
    } catch (err) {
      console.error("Failed to stop recording:", err);
      return null;
    }
  };
  
  // Export a mix of tracks to WAV
  const exportToWav = async (tracks, soundMap, options = {}) => {
    const {
      durationSeconds = 120,  // 2 minutes by default
      sampleRate = 44100,
      masterVolume = 0,
      onProgress
    } = options;
    
    console.log(`Starting WAV export: ${durationSeconds}s at ${sampleRate}Hz`);
    
    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(2, durationSeconds * sampleRate, sampleRate);
    
    // Create master gain node
    const masterGain = offlineContext.createGain();
    masterGain.gain.value = Math.pow(10, masterVolume / 20); // Convert dB to gain
    masterGain.connect(offlineContext.destination);
    
    // First, ensure all buffers are loaded
    const bufferPromises = [];
    const trackKeys = new Set();
    
    // Collect all unique sound keys used in tracks
    tracks.forEach(track => {
      if (!track.events || track.events.length === 0) return;
      
      track.events.forEach(event => {
        if (!event.isMarker && soundMap[event.key]) {
          trackKeys.add(event.key);
        }
      });
    });
    
    // Update progress
    if (onProgress) onProgress(5); // 5% - Starting buffer loading
    
    // Load all needed buffers to offline context
    for (const key of trackKeys) {
      if (!soundMap[key]) continue;
      
      const soundSource = Array.isArray(soundMap[key].src) ? soundMap[key].src[0] : soundMap[key].src;
      
      if (soundMap[key].buffer) {
        // Use preloaded buffer
        console.log(`Using preloaded buffer for ${key}: ${soundSource}`);
        bufferPromises.push(Promise.resolve({ key, buffer: soundMap[key].buffer }));
      } else {
        // Load buffer
        console.log(`Loading buffer for ${key}: ${soundSource}`);
        const promise = fetch(soundSource)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            return response.arrayBuffer();
          })
          .then(arrayBuffer => offlineContext.decodeAudioData(arrayBuffer))
          .then(audioBuffer => ({ key, buffer: audioBuffer }))
          .catch(err => {
            console.error(`Failed to load buffer for ${key}:`, err);
            return { key, error: err };
          });
        
        bufferPromises.push(promise);
      }
    }
    
    // Wait for all buffers to load
    const bufferResults = await Promise.allSettled(bufferPromises);
    const buffers = {};
    
    bufferResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value && result.value.buffer) {
        buffers[result.value.key] = result.value.buffer;
      }
    });
    
    // Update progress
    if (onProgress) onProgress(30); // 30% - Buffers loaded
    
    console.log(`Loaded ${Object.keys(buffers).length} buffers for rendering`);
    
    // Schedule track events
    let eventsScheduled = 0;
    const activeTracks = tracks.filter(track => {
      // Filter out tracks that are muted or have no events
      if (track.events.length === 0) return false;
      
      const isMuted = track.muted;
      const anySoloed = tracks.some(t => t.soloed);
      const isSoloed = track.soloed;
      
      return !isMuted && (!anySoloed || isSoloed);
    });
    
    console.log(`Scheduling ${activeTracks.length} active tracks for rendering`);
    
    activeTracks.forEach(track => {
      // Create track-level processing nodes
      const trackGain = offlineContext.createGain();
      trackGain.gain.value = Math.pow(10, (track.volume || 0) / 20);
      
      const panner = offlineContext.createStereoPanner();
      panner.pan.value = track.pan || 0;
      
      trackGain.connect(panner);
      panner.connect(masterGain);
      
      // Get playable events
      const playableEvents = track.events.filter(ev => !ev.isMarker && buffers[ev.key]);
      const loopDuration = track.totalDuration / 1000;
      
      if (loopDuration <= 0 || playableEvents.length === 0) {
        console.warn(`Skipping track ${track.id}: Invalid duration or no playable events`);
        return;
      }
      
      console.log(`Track ${track.id}: ${playableEvents.length} events, loop duration ${loopDuration}s`);
      
      // Calculate number of loops to fill the duration
      const loopCount = Math.ceil(durationSeconds / loopDuration);
      
      // Schedule each event for each loop iteration
      for (let i = 0; i < loopCount; i++) {
        playableEvents.forEach(event => {
          const time = (i * loopDuration) + (event.offset / 1000);
          if (time >= durationSeconds) return;
          
          const source = offlineContext.createBufferSource();
          source.buffer = buffers[event.key];
          source.connect(trackGain);
          source.start(time);
          eventsScheduled++;
          
          if (eventsScheduled % 50 === 0) {
            console.log(`Scheduled ${eventsScheduled} events so far`);
          }
        });
      }
    });
    
    // Update progress
    if (onProgress) onProgress(50); // 50% - Events scheduled
    
    console.log(`Total of ${eventsScheduled} events scheduled. Starting rendering...`);
    
    // Start rendering
    let renderedBuffer;
    try {
      renderedBuffer = await offlineContext.startRendering();
      console.log('Rendering complete. Buffer duration:', renderedBuffer.duration);
      
      // Check if the buffer has any audio content
      const channelData = renderedBuffer.getChannelData(0);
      const hasAudio = channelData.some(sample => Math.abs(sample) > 0.001);
      console.log('Buffer has audio:', hasAudio);
      
      if (!hasAudio) {
        console.warn('Warning: Rendered buffer contains no audio!');
      }
      
      // Update progress
      if (onProgress) onProgress(80); // 80% - Rendering complete
    } catch (err) {
      console.error('Rendering failed:', err);
      throw err;
    }
    
    // Convert buffer to WAV
    const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length, sampleRate);
    const url = URL.createObjectURL(wavBlob);
    
    // Update progress
    if (onProgress) onProgress(100); // 100% - Export complete
    
    return {
      url,
      filename: 'MultiTrackLooper_Mix_2min.wav',
      duration: renderedBuffer.duration,
      sampleRate: renderedBuffer.sampleRate,
      numberOfChannels: renderedBuffer.numberOfChannels
    };
  };
  
  // Helper function to convert AudioBuffer to WAV
  function bufferToWave(buffer, len, sampleRate) {
    const numChannels = buffer.numberOfChannels;
    const wavLength = len * numChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(wavLength);
    const view = new DataView(arrayBuffer);
    
    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + len * numChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, len * numChannels * 2, true);
    
    // Write interleaved audio data
    let offset = 44;
    for (let i = 0; i < len; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, value | 0, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  
  // Context value for the provider
  const value = {
    isReady,
    loadingProgress,
    bufferLoadErrors,
    audioContext: audioContext.current,
    loadBuffer,
    loadBuffers,
    playSound,
    forceResumeAudio,
    startRecording,
    stopRecording,
    exportToWav,
    useFallbackAudio: useFallbackAudio.current
  };
  
  return (
    <AudioManagerContext.Provider value={value}>
      {children}
    </AudioManagerContext.Provider>
  );
}

export default AudioManagerProvider;