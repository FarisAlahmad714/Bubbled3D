import React, {
    useState,
    forwardRef,
    useImperativeHandle
  } from 'react'
  import { v4 as uuidv4 } from 'uuid'
  
  const MultiTrackLooper = forwardRef(function MultiTrackLooper({ sceneRef }, ref) {
    const [tracks, setTracks] = useState([])
  
    // Add a brand-new empty track
    function addTrack() {
      const newTrack = {
        id: uuidv4(),
        name: `Track ${tracks.length + 1}`,
        events: [],
        isRecording: false,
        recordStartTime: 0,
        isLooping: false,
        loopIntervalId: null,
        isCollapsed: false,      // <-- new property for collapsing
      }
      setTracks((prev) => [...prev, newTrack])
    }
  
    // Remove a track by ID (and stop its loop if active)
    function removeTrack(trackId) {
      // First stop loop if it's looping
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId && track.isLooping && track.loopIntervalId) {
            clearInterval(track.loopIntervalId)
          }
          return track
        })
      )
      // Then remove from state
      setTracks((prev) => prev.filter((track) => track.id !== trackId))
    }
  
    // Toggle collapse/expand
    function toggleCollapse(trackId) {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId) {
            return { ...track, isCollapsed: !track.isCollapsed }
          }
          return track
        })
      )
    }
  
    // Start/stop recording
    function startRecording(trackId) {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId) {
            return {
              ...track,
              events: [],
              isRecording: true,
              recordStartTime: performance.now()
            }
          }
          return track
        })
      )
    }
  
    function stopRecording(trackId) {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId) {
            return { ...track, isRecording: false }
          }
          return track
        })
      )
    }
  
    // Play track events once, returning total duration
    function playTrackEventsOnce(track) {
      if (!track.events.length) return 0
      const totalDuration = track.events[track.events.length - 1].offset
      track.events.forEach((ev) => {
        setTimeout(() => {
          sceneRef.current?.createSphereAndPlaySound(ev.key)
        }, ev.offset)
      })
      return totalDuration
    }
  
    // Start/stop looping
    function startLoop(trackId) {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId) {
            if (track.isLooping) return track
            const duration = playTrackEventsOnce(track)
            if (duration <= 0) return track
            const intervalId = setInterval(() => {
              playTrackEventsOnce(track)
            }, duration)
            return {
              ...track,
              isLooping: true,
              loopIntervalId: intervalId
            }
          }
          return track
        })
      )
    }
  
    function stopLoop(trackId) {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId && track.isLooping) {
            clearInterval(track.loopIntervalId)
            return { ...track, isLooping: false, loopIntervalId: null }
          }
          return track
        })
      )
    }
  
    // The parent calls "looperRef.current.recordKeyPress(key)" on valid keypress
    useImperativeHandle(ref, () => ({
      recordKeyPress(key) {
        setTracks((prevTracks) =>
          prevTracks.map((track) => {
            if (!track.isRecording) return track
            const now = performance.now()
            const offset = now - track.recordStartTime
            return {
              ...track,
              events: [...track.events, { offset, key }]
            }
          })
        )
      }
    }))
  
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.6)',
          color: '#fff',
          zIndex: 9999,
          width: '350px',
          maxHeight: '100%',
          overflowY: 'auto'
        }}
      >
        <h3>Multi-Track Looper</h3>
        <button onClick={addTrack}>+ Add Track</button>
  
        {tracks.map((track) => {
          const arrow = track.isCollapsed ? '▶' : '▼'
          return (
            <div
              key={track.id}
              style={{
                border: '1px solid #555',
                marginTop: '1rem',
                padding: '0.5rem'
              }}
            >
              {/* Title row with expand/collapse toggle + track name + delete */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCollapse(track.id)}
                >
                  <strong>{arrow} {track.name}</strong>
                </div>
                <button
                  onClick={() => removeTrack(track.id)}
                  style={{ marginLeft: '1rem' }}
                >
                  Delete
                </button>
              </div>
  
              {/* If collapsed, do not show the rest */}
              {!track.isCollapsed && (
                <>
                  {/* Recording controls */}
                  {!track.isRecording ? (
                    <button onClick={() => startRecording(track.id)}>
                      Start Rec
                    </button>
                  ) : (
                    <button onClick={() => stopRecording(track.id)}>
                      Stop Rec
                    </button>
                  )}
  
                  {/* Looping controls */}
                  {!track.isLooping ? (
                    <button
                      onClick={() => startLoop(track.id)}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      Start Loop
                    </button>
                  ) : (
                    <button
                      onClick={() => stopLoop(track.id)}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      Stop Loop
                    </button>
                  )}
  
                  {/* Debug list of events */}
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.9rem',
                      maxHeight: '100px',
                      overflowY: 'auto',
                      background: '#222',
                      padding: '0.5rem'
                    }}
                  >
                    <strong>Events:</strong>
                    {track.events.length === 0 && (
                      <p style={{ fontStyle: 'italic' }}>No events recorded</p>
                    )}
                    {track.events.map((ev, idx) => (
                      <div key={idx}>
                        Key: {ev.key}, Offset: {Math.round(ev.offset)} ms
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  })
  
  export default MultiTrackLooper
  