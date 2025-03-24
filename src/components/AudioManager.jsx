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
  const formatFallbackCache = useRef({});
  const audioUnlocked = useRef(false);
  
  // Performance optimization: Track audio format support to avoid unnecessary fallbacks
  const audioFormatSupport = useRef({
    wav: null,
    mp3: null
  });
  
  // Buffer cache size limits for performance
  const MAX_BUFFER_CACHE_SIZE = 50;
  const MAX_HOWL_CACHE_SIZE = 30;
  
  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Create or get AudioContext
        if (Tone.context && Tone.context.state) {
          audioContext.current = Tone.context;
        } else {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Create main gain node
        mainGainNode.current = audioContext.current.createGain();
        mainGainNode.current.connect(audioContext.current.destination);
        
        // Create recorder
        recorderRef.current = new Tone.Recorder();
        Tone.Destination.connect(recorderRef.current);
        
        setIsReady(true);
        
        // Test audio format support in background
        checkFormatSupport();
      } catch (err) {
        useFallbackAudio.current = true;
        
        // Try fallback initialization
        try {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
          mainGainNode.current = audioContext.current.createGain();
          mainGainNode.current.connect(audioContext.current.destination);
          setIsReady(true);
        } catch (fallbackErr) {
          // Silently fail, will try HTML5 audio
        }
      }
    };
    
    // Performance optimization: Test format support once
    const checkFormatSupport = async () => {
      if (!audioContext.current) return;
      
      // Test MP3 support
      try {
        const mp3Test = await fetch('/Sounds/drum1.mp3');
        if (mp3Test.ok) {
          const mp3Buffer = await mp3Test.arrayBuffer();
          try {
            await audioContext.current.decodeAudioData(mp3Buffer);
            audioFormatSupport.current.mp3 = true;
          } catch (e) {
            audioFormatSupport.current.mp3 = false;
          }
        }
      } catch (err) {
        audioFormatSupport.current.mp3 = false;
      }
      
      // Test WAV support
      try {
        const wavTest = await fetch('/Sounds/drum1.wav');
        if (wavTest.ok) {
          const wavBuffer = await wavTest.arrayBuffer();
          try {
            await audioContext.current.decodeAudioData(wavBuffer);
            audioFormatSupport.current.wav = true;
          } catch (e) {
            audioFormatSupport.current.wav = false;
          }
        }
      } catch (err) {
        audioFormatSupport.current.wav = false;
      }
    };
    
    initAudio();
    
    // Cleanup
    return () => {
      Object.values(howlCache.current).forEach(howl => {
        if (howl && typeof howl.unload === 'function') {
          howl.unload();
        }
      });
      
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
    };
  }, []);
  
  // Auto-unlock audio on user interaction
  useEffect(() => {
    const unlockAudio = async () => {
      if (audioUnlocked.current) return;
      
      try {
        await forceResumeAudio();
        audioUnlocked.current = true;
      } catch (err) {
        // Silent fail - will try again on next interaction
      }
    };
    
    // Add event listeners for common user interactions
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => window.addEventListener(event, unlockAudio, { once: true }));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, unlockAudio));
    };
  }, []);
  
  // More efficient alternative format selection using format support knowledge
  const getAlternativeFormat = (url) => {
    if (!url) return null;
    
    // Use format support knowledge if available
    if (audioFormatSupport.current.wav !== null && audioFormatSupport.current.mp3 !== null) {
      if (url.endsWith('.wav') && !audioFormatSupport.current.wav && audioFormatSupport.current.mp3) {
        return url.replace('.wav', '.mp3');
      } else if (url.endsWith('.mp3') && !audioFormatSupport.current.mp3 && audioFormatSupport.current.wav) {
        return url.replace('.mp3', '.wav');
      }
    }
    
    // Default fallback logic
    if (url.endsWith('.wav')) {
      return url.replace('.wav', '.mp3');
    } else if (url.endsWith('.mp3')) {
      return url.replace('.mp3', '.wav');
    }
    return null;
  };
  
  // Load buffer with optimized caching
  const loadBuffer = async (url) => {
    if (bufferCache.current[url]) {
      return bufferCache.current[url];
    }
    
    // Check if we know this URL needs format fallback
    const fallbackUrl = formatFallbackCache.current[url];
    if (fallbackUrl) {
      url = fallbackUrl;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
      
      // Manage buffer cache size
      const bufferCacheSize = Object.keys(bufferCache.current).length;
      if (bufferCacheSize >= MAX_BUFFER_CACHE_SIZE) {
        // Remove oldest items
        const oldestKeys = Object.keys(bufferCache.current).slice(0, bufferCacheSize - MAX_BUFFER_CACHE_SIZE + 1);
        oldestKeys.forEach(key => delete bufferCache.current[key]);
      }
      
      bufferCache.current[url] = audioBuffer;
      return audioBuffer;
    } catch (err) {
      // Try alternative format
      const altUrl = getAlternativeFormat(url);
      if (altUrl) {
        try {
          const altResponse = await fetch(altUrl);
          if (!altResponse.ok) throw new Error(`HTTP error: ${altResponse.status}`);
          
          const altArrayBuffer = await altResponse.arrayBuffer();
          const altAudioBuffer = await audioContext.current.decodeAudioData(altArrayBuffer);
          
          // Cache the successful format for future reference
          formatFallbackCache.current[url] = altUrl;
          
          // Manage buffer cache size
          const bufferCacheSize = Object.keys(bufferCache.current).length;
          if (bufferCacheSize >= MAX_BUFFER_CACHE_SIZE) {
            // Remove oldest items
            const oldestKeys = Object.keys(bufferCache.current).slice(0, bufferCacheSize - MAX_BUFFER_CACHE_SIZE + 1);
            oldestKeys.forEach(key => delete bufferCache.current[key]);
          }
          
          bufferCache.current[altUrl] = altAudioBuffer;
          return altAudioBuffer;
        } catch (altErr) {
          // Both formats failed, record the error
          setBufferLoadErrors(prev => [...prev, { url, error: `Both formats failed` }]);
          throw new Error(`Audio loading failed for both ${url} and ${altUrl}`);
        }
      } else {
        // No alternative format, record the original error
        setBufferLoadErrors(prev => [...prev, { url, error: 'Decoding failed' }]);
        throw err;
      }
    }
  };
  
  // Load multiple buffers with optimized progress tracking
  const loadBuffers = async (soundMap) => {
    const urls = [];
    
    // Collect unique URLs, preferring format by browser support
    Object.values(soundMap).forEach(soundData => {
      if (Array.isArray(soundData.src)) {
        // If we know format support, prioritize the supported format
        if (audioFormatSupport.current.wav !== null && audioFormatSupport.current.mp3 !== null) {
          // Find the best format
          let bestUrl = null;
          
          for (const url of soundData.src) {
            if ((url.endsWith('.wav') && audioFormatSupport.current.wav) || 
                (url.endsWith('.mp3') && audioFormatSupport.current.mp3)) {
              bestUrl = url;
              break;
            }
          }
          
          // If we found a preferred format, use only that
          if (bestUrl && !urls.includes(bestUrl)) {
            urls.push(bestUrl);
            return;
          }
        }
        
        // Otherwise add all formats
        soundData.src.forEach(url => {
          if (!urls.includes(url)) urls.push(url);
        });
      } else if (typeof soundData.src === 'string' && !urls.includes(soundData.src)) {
        urls.push(soundData.src);
      }
    });
    
    let loaded = 0;
    const total = urls.length;
    
    // Performance optimization: Batch loading in groups of 5
    const BATCH_SIZE = 5;
    let results = [];
    
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (url) => {
        try {
          const buffer = await loadBuffer(url);
          loaded++;
          setLoadingProgress(Math.floor((loaded / total) * 100));
          return { url, buffer };
        } catch (err) {
          loaded++;
          setLoadingProgress(Math.floor((loaded / total) * 100));
          return { url, error: err };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results = [...results, ...batchResults];
    }
    
    // Attach buffers to the sound map
    Object.keys(soundMap).forEach(key => {
      const soundData = soundMap[key];
      const url = Array.isArray(soundData.src) ? soundData.src[0] : soundData.src;
      
      // Find the corresponding buffer
      const result = results.find(r => r.url === url);
      
      // Also check for fallback format
      const fallbackUrl = formatFallbackCache.current[url];
      const fallbackResult = fallbackUrl ? 
        results.find(r => r.url === fallbackUrl) : null;
      
      if (result && result.buffer) {
        soundMap[key].buffer = result.buffer;
      } else if (fallbackResult && fallbackResult.buffer) {
        soundMap[key].buffer = fallbackResult.buffer;
      }
    });
    
    return soundMap;
  };
  
  // Play sound with optimized format selection
  const playSound = (key, soundMap, options = {}) => {
    if (!soundMap[key]) {
      return null;
    }
    
    const { trackId, trackBus, volume = 1, pan = 0 } = options;
    
    try {
      // Get the sound source with format optimization
      const soundSources = Array.isArray(soundMap[key].src) 
        ? soundMap[key].src 
        : [soundMap[key].src];
      
      // Prioritize format based on browser support
      let selectedSound = null;
      
      if (audioFormatSupport.current.wav !== null && audioFormatSupport.current.mp3 !== null) {
        // Find the best format
        for (const src of soundSources) {
          if ((src.endsWith('.wav') && audioFormatSupport.current.wav) || 
              (src.endsWith('.mp3') && audioFormatSupport.current.mp3)) {
            selectedSound = src;
            break;
          }
        }
      }
      
      // If no preferred format found, use first or random
      if (!selectedSound) {
        selectedSound = soundSources[Math.floor(Math.random() * soundSources.length)];
      }
      
      // Check for known format fallback
      if (formatFallbackCache.current[selectedSound]) {
        selectedSound = formatFallbackCache.current[selectedSound];
      }
      
      if (useFallbackAudio.current) {
        return playWithHowler(selectedSound, { volume, pan, trackId });
      } else {
        return playWithTone(selectedSound, key, soundMap, { volume, pan, trackBus, trackId });
      }
    } catch (err) {
      // Try alternative format
      const soundSource = Array.isArray(soundMap[key].src) 
        ? soundMap[key].src[0] 
        : soundMap[key].src;
      
      const altUrl = getAlternativeFormat(soundSource);
      if (altUrl) {
        return playWithHowler(altUrl, { volume, pan, trackId });
      } else {
        return playWithHowler(soundSource, { volume, pan, trackId });
      }
    }
  };
  
  // Play with Tone.js - optimized
  const playWithTone = (url, key, soundMap, options) => {
    const { volume, pan, trackBus, trackId } = options;
    
    try {
      // Use cached buffer if available for best performance
      if (soundMap[key] && soundMap[key].buffer) {
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
        
        return source;
      } else {
        // Create a player if no buffer
        const player = new Tone.Player({
          url,
          volume: Tone.gainToDb(volume),
          autostart: true,
          onerror: (err) => {
            // Try alternative format
            const altUrl = getAlternativeFormat(url);
            if (altUrl) {
              const altPlayer = new Tone.Player({
                url: altUrl,
                volume: Tone.gainToDb(volume),
                autostart: true
              });
              if (pan !== 0) {
                const panner = new Tone.Panner(pan);
                altPlayer.connect(panner);
                panner.connect(trackBus || Tone.Destination);
              } else {
                altPlayer.connect(trackBus || Tone.Destination);
              }
              return altPlayer;
            }
          }
        });
        
        if (pan !== 0) {
          const panner = new Tone.Panner(pan);
          player.connect(panner);
          panner.connect(trackBus || Tone.Destination);
        } else {
          player.connect(trackBus || Tone.Destination);
        }
        
        // Dispose after playback to prevent memory leaks
        player.onstop = () => player.dispose();
        
        return player;
      }
    } catch (err) {
      // Try alternative format
      const altUrl = getAlternativeFormat(url);
      if (altUrl) {
        return playWithHowler(altUrl, { volume, pan, trackId });
      } else {
        return playWithHowler(url, { volume, pan, trackId });
      }
    }
  };
  
  // Play with Howler - optimized
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
    
    // Check if we should try format fallback
    if (formatFallbackCache.current[url]) {
      url = formatFallbackCache.current[url];
    }
    
    // Create new Howl with optimized settings
    const howl = new Howl({
      src: [url],
      volume,
      stereo: pan,
      html5: true, // Better for mobile
      preload: true, // Performance: preload to avoid stutter
      onloaderror: (id, err) => {
        // Try alternative format
        const altUrl = getAlternativeFormat(url);
        if (altUrl) {
          const altHowl = new Howl({
            src: [altUrl],
            volume,
            stereo: pan,
            html5: true
          });
          
          // Remember this format works better
          if (altHowl.state() === 'loaded') {
            formatFallbackCache.current[url] = altUrl;
          }
          
          // Cache for future use
          howlCache.current[altUrl] = altHowl;
          altHowl.play();
          return altHowl;
        }
      }
    });
    
    // Cache for future use (limit cache size)
    const cacheKeys = Object.keys(howlCache.current);
    if (cacheKeys.length > MAX_HOWL_CACHE_SIZE) {
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
    // Resume our main audio context
    if (audioContext.current && audioContext.current.state !== "running") {
      try {
        await audioContext.current.resume();
        audioUnlocked.current = true;
      } catch (err) {
        // Silent fail
      }
    }
    
    // Resume Tone.js context
    if (Tone && Tone.context && Tone.context.state !== "running") {
      try {
        await Tone.context.resume();
        await Tone.start();
      } catch (err) {
        // Silent fail
      }
    }
    
    // Resume Howler.js context
    if (window.Howler && window.Howler.ctx && window.Howler.ctx.state !== "running") {
      try {
        await window.Howler.ctx.resume();
      } catch (err) {
        // Silent fail
      }
    }
    
    return true;
  };
  
  // Start recording the master output
  const startRecording = async () => {
    if (!recorderRef.current) {
      return false;
    }
    
    await forceResumeAudio();
    
    try {
      await recorderRef.current.start();
      return true;
    } catch (err) {
      return false;
    }
  };
  
  // Stop recording and return a blob URL
  const stopRecording = async () => {
    if (!recorderRef.current) {
      return null;
    }
    
    try {
      const recording = await recorderRef.current.stop();
      
      // Create a download URL
      const url = URL.createObjectURL(recording);
      return url;
    } catch (err) {
      return null;
    }
  };
  
  // Optimized one-shot sound playback
  const playOneShot = (src, options = {}) => {
    const { volume = 0.75, loop = false, onend = null, onload = null, onerror = null } = options;
    
    // First, try to unlock audio
    forceResumeAudio().catch(() => {});
    
    // Try to determine if we should use an alternative format based on browser support
    let actualSrc = src;
    let alternativeSrc = null;
    
    // Use format detection if available
    if (audioFormatSupport.current.wav !== null && audioFormatSupport.current.mp3 !== null) {
      if (src.endsWith('.wav') && !audioFormatSupport.current.wav) {
        actualSrc = src.replace('.wav', '.mp3');
      } else if (src.endsWith('.mp3') && !audioFormatSupport.current.mp3) {
        actualSrc = src.replace('.mp3', '.wav');
      }
    } else {
      // Use known fallbacks
      if (formatFallbackCache.current[src]) {
        actualSrc = formatFallbackCache.current[src];
      }
      alternativeSrc = getAlternativeFormat(src);
    }
    
    try {
      // Create a new dedicated Howl instance for this one-shot
      const sound = new Howl({
        src: [actualSrc, alternativeSrc].filter(Boolean), // Include both formats when available
        volume,
        loop,
        autoplay: true,
        html5: true, // Better for mobile
        onend,
        onload,
        onloaderror: (id, err) => {
          if (alternativeSrc && actualSrc !== alternativeSrc) {
            const altSound = new Howl({
              src: [alternativeSrc],
              volume,
              loop,
              autoplay: true,
              html5: true,
              onend,
              onload: () => {
                // Remember this format works better
                formatFallbackCache.current[src] = alternativeSrc;
                if (onload) onload();
              }
            });
            
            // Store reference for potential stopping
            const soundId = `oneshot_alt_${Date.now()}`;
            howlCache.current[soundId] = altSound;
            
            return altSound;
          }
          
          if (onerror) onerror(err);
        }
      });
      
      // Store reference for potential stopping
      const soundId = `oneshot_${Date.now()}`;
      howlCache.current[soundId] = sound;
      
      return sound;
    } catch (err) {
      // Last resort fallback
      if (alternativeSrc && actualSrc !== alternativeSrc) {
        try {
          const altSound = new Howl({
            src: [alternativeSrc],
            volume,
            loop,
            autoplay: true,
            html5: true,
            onend
          });
          return altSound;
        } catch (altErr) {
          return null;
        }
      }
      
      return null;
    }
  };
  
  // Stop a specific sound
  const stopSound = (src) => {
    // First try to find exact match in howlCache
    if (howlCache.current[src]) {
      howlCache.current[src].stop();
      return true;
    }
    
    // If not found by exact key, try to find by src url
    for (const key in howlCache.current) {
      const howl = howlCache.current[key];
      if (howl._src && (
        howl._src.includes(src) || 
        (getAlternativeFormat(src) && howl._src.includes(getAlternativeFormat(src)))
      )) {
        howl.stop();
        return true;
      }
    }
    
    return false;
  };
  
  // Export a mix of tracks to WAV
  const exportToWav = async (tracks, soundMap, options = {}) => {
    const {
      durationSeconds = 120,
      sampleRate = 44100,
      masterVolume = 0,
      onProgress
    } = options;
    
    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(2, durationSeconds * sampleRate, sampleRate);
    
    // Create master gain node
    const masterGain = offlineContext.createGain();
    masterGain.gain.value = Math.pow(10, masterVolume / 20);
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
    if (onProgress) onProgress(5);
    
    // Load all needed buffers to offline context
    for (const key of trackKeys) {
      if (!soundMap[key]) continue;
      
      const soundSource = Array.isArray(soundMap[key].src) ? soundMap[key].src[0] : soundMap[key].src;
      
      if (soundMap[key].buffer) {
        // Use preloaded buffer
        bufferPromises.push(Promise.resolve({ key, buffer: soundMap[key].buffer }));
      } else {
        // Load buffer with optimized error handling
        const promise = fetch(soundSource)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            return response.arrayBuffer();
          })
          .then(arrayBuffer => offlineContext.decodeAudioData(arrayBuffer))
          .then(audioBuffer => ({ key, buffer: audioBuffer }))
          .catch(err => {
            // Try alternative format
            if (soundSource.endsWith('.wav')) {
              const altSource = soundSource.replace('.wav', '.mp3');
              return fetch(altSource)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => offlineContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => ({ key, buffer: audioBuffer }))
                .catch(altErr => ({ key, error: err }));
            } else if (soundSource.endsWith('.mp3')) {
              const altSource = soundSource.replace('.mp3', '.wav');
              return fetch(altSource)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => offlineContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => ({ key, buffer: audioBuffer }))
                .catch(altErr => ({ key, error: err }));
            }
            
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
    if (onProgress) onProgress(30);
    
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
    
    // Processing tracks in batches for better memory efficiency
    const TRACK_BATCH_SIZE = 3;
    for (let i = 0; i < activeTracks.length; i += TRACK_BATCH_SIZE) {
      const trackBatch = activeTracks.slice(i, i + TRACK_BATCH_SIZE);
      
      trackBatch.forEach(track => {
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
          return;
        }
        
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
          });
        }
      });
    }
    
    // Update progress
    if (onProgress) onProgress(50);
    
    // Start rendering
    let renderedBuffer;
    try {
      renderedBuffer = await offlineContext.startRendering();
      
      // Update progress
      if (onProgress) onProgress(80);
    } catch (err) {
      throw err;
    }
    
    // Convert buffer to WAV
    const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length, sampleRate);
    const url = URL.createObjectURL(wavBlob);
    
    // Update progress
    if (onProgress) onProgress(100);
    
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
    useFallbackAudio: useFallbackAudio.current,
    audioUnlocked: audioUnlocked.current,
    // Add the new methods for welcome audio
    playOneShot,
    stopSound
  };
  
  return (
    <AudioManagerContext.Provider value={value}>
      {children}
    </AudioManagerContext.Provider>
  );
}

export default AudioManagerProvider;