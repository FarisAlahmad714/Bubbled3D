// src/components/LooperUI.jsx

import React from 'react'

export default function LooperUI({ recordingRef, replayFunctionsRef }) {
  // Start recording: clear old events, note the start time
  function handleStartRecording() {
    recordingRef.current.recordedEvents = []
    recordingRef.current.recordStartTime = performance.now()
    recordingRef.current.isRecording = true
  }

  // Stop recording
  function handleStopRecording() {
    recordingRef.current.isRecording = false
  }

  // Start looping
  function handleStartLoop() {
    if (replayFunctionsRef.current && replayFunctionsRef.current.startLoop) {
      replayFunctionsRef.current.startLoop()
    }
  }

  // Stop looping
  function handleStopLoop() {
    if (replayFunctionsRef.current && replayFunctionsRef.current.stopLoop) {
      replayFunctionsRef.current.stopLoop()
    }
  }

  // We'll just read from the same ref object that Scene is using
  const events = recordingRef.current.recordedEvents || []

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.5)',
        color: '#fff',
        zIndex: 9999,
        width: '300px'
      }}
    >
      <h3>Loop / Record UI</h3>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={handleStartRecording}>Start Recording</button>
        <button onClick={handleStopRecording}>Stop Recording</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={handleStartLoop}>Start Loop</button>
        <button onClick={handleStopLoop}>Stop Loop</button>
      </div>

      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #999', padding: '0.5rem' }}>
        <h4>Recorded Events:</h4>
        {events.length === 0 ? (
          <p style={{ fontStyle: 'italic' }}>No events recorded yet.</p>
        ) : (
          events.map((ev, idx) => (
            <div key={idx} style={{ fontSize: '0.85rem' }}>
              <strong>Key:</strong> {ev.key} &nbsp; 
              <strong>Offset:</strong> {Math.round(ev.offset)} ms
            </div>
          ))
        )}
      </div>
    </div>
  )
}
