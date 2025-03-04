import React, { createContext, useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Create a context so we can share the Tone setup
export const AudioManagerContext = createContext();

export function AudioManagerProvider({ children }) {
  // We'll store references to players here
  const [isReady, setIsReady] = useState(false);
  const recorderRef = useRef(null);

  useEffect(() => {
    // Create a Tone.Recorder to let us record the master output
    recorderRef.current = new Tone.Recorder();
    // Route everything to Tone.Destination, which also connects to the recorder
    Tone.Destination.connect(recorderRef.current);

    // We can also set a default BPM, etc.
    Tone.Transport.bpm.value = 120;
    setIsReady(true);
  }, []);

  // A function to preview a sample file
  async function previewSample(url) {
    try {
      await Tone.start();
      console.log("Audio context started");
      const player = new Tone.Player({
        url,
        onload: () => {
          console.log("Player loaded:", url);
          player.start();
        },
        onerror: (err) => console.error("Player error:", err),
      }).toDestination();
      console.log("Player created for:", url);
    } catch (err) {
      console.error("Preview failed:", err);
    }
  }
  // Start the recorder
  async function startRecording() {
    if (!recorderRef.current) return;
    await recorderRef.current.start();
  }

  // Stop the recorder and return a download URL
  async function stopRecording() {
    if (!recorderRef.current) return null;
    const recording = await recorderRef.current.stop();
    // `recording` is a Blob. Let's create a blob URL for download
    const url = URL.createObjectURL(recording);
    return url;
  }

  const value = {
    isReady,
    previewSample,
    startRecording,
    stopRecording,
  };

  return (
    <AudioManagerContext.Provider value={value}>
      {children}
    </AudioManagerContext.Provider>
  );
}
