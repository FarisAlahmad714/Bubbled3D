// FILE: src/components/MultiTrackLooper.jsx
import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { Howl } from 'howler';

const MultiTrackLooper = forwardRef(function MultiTrackLooper({ sceneRef }, ref) {
  const looperAudio = useRef([]);

  function recordKeyPress(key) {
    if (!sceneRef.current) return;
    sceneRef.current.createSphereAndPlaySound(key);
  }

  useImperativeHandle(ref, () => ({
    recordKeyPress
  }));

  return null; // No DOM impact
});

export default MultiTrackLooper;