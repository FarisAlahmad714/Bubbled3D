import React, {
  useState,
  forwardRef,
  useImperativeHandle
} from 'react'
import { v4 as uuidv4 } from 'uuid'

const MultiTrackLooper = forwardRef(function MultiTrackLooper({ sceneRef }, ref) {
  const [tracks, setTracks] = useState([])
  const [minimized, setMinimized] = useState(false)

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
      isCollapsed: false,
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

  // Toggle minimized state
  function toggleMinimized() {
    setMinimized(!minimized)
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

  // Base container style
  const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: '0.8rem',
    background: 'rgba(10, 15, 30, 0.85)',
    color: '#fff',
    zIndex: 9999,
    width: minimized ? 'auto' : '350px',
    borderRadius: '0 0 8px 0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.3s ease'
  }

  // Header style with gradient
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: minimized ? 0 : '0.8rem',
    padding: '0.3rem 0.5rem',
    background: 'linear-gradient(90deg, rgba(50, 60, 120, 0.5), rgba(80, 70, 140, 0.5))',
    borderRadius: '4px',
    cursor: 'pointer'
  }

  // Button styles
  const buttonStyle = {
    padding: '0.4rem 0.8rem',
    background: 'rgba(60, 80, 170, 0.5)',
    border: '1px solid rgba(80, 120, 220, 0.5)',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  const activeButtonStyle = {
    ...buttonStyle,
    background: 'rgba(80, 120, 220, 0.7)',
    borderColor: 'rgba(100, 160, 255, 0.8)',
    boxShadow: '0 0 8px rgba(100, 150, 255, 0.4)'
  }

  const deleteButtonStyle = {
    ...buttonStyle,
    background: 'rgba(170, 60, 80, 0.5)',
    borderColor: 'rgba(220, 80, 120, 0.5)',
    padding: '0.3rem 0.6rem',
    fontSize: '0.8rem'
  }

  const addTrackButtonStyle = {
    ...buttonStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    margin: '0.5rem 0'
  }

  // Track container style
  const trackStyle = {
    border: '1px solid rgba(80, 120, 220, 0.3)',
    borderRadius: '6px',
    marginTop: '0.8rem',
    padding: '0.5rem',
    background: 'rgba(20, 30, 60, 0.5)'
  }

  // Events container style
  const eventsContainerStyle = {
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    maxHeight: '100px',
    overflowY: 'auto',
    background: 'rgba(10, 15, 25, 0.8)',
    padding: '0.5rem',
    borderRadius: '4px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(80, 120, 220, 0.5) rgba(10, 15, 25, 0.2)'
  }

  const trackHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    background: 'rgba(40, 50, 90, 0.4)'
  }

  const eventItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.2rem 0.4rem',
    margin: '0.2rem 0',
    borderRadius: '3px',
    background: 'rgba(40, 60, 100, 0.4)'
  }

  return (
    <div style={containerStyle}>
      {/* Header with minimize toggle */}
      <div style={headerStyle} onClick={toggleMinimized}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
          Multi-Track Looper
          <span style={{ marginLeft: '0.5rem', opacity: 0.7, fontSize: '0.8rem' }}>
            {minimized ? '(Click to Expand)' : '(Click to Minimize)'}
          </span>
        </h3>
        <div style={{ 
          fontSize: '1rem', 
          fontWeight: 'bold', 
          transform: minimized ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </div>
      </div>

      {/* Only show content when not minimized */}
      {!minimized && (
        <>
          <button 
            onClick={addTrack} 
            style={addTrackButtonStyle}
            onMouseOver={(e) => e.target.style.background = 'rgba(80, 100, 190, 0.7)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(60, 80, 170, 0.5)'}
          >
            <span>+</span> Add Track
          </button>

          {tracks.map((track) => {
            const arrow = track.isCollapsed ? '▶' : '▼'
            return (
              <div key={track.id} style={trackStyle}>
                {/* Title row with expand/collapse toggle + track name + delete */}
                <div 
                  style={trackHeaderStyle}
                  onClick={() => toggleCollapse(track.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '0.5rem' }}>{arrow}</span>
                    <strong>{track.name}</strong>
                    {track.isRecording && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        color: '#ff5555',
                        animation: 'pulse 1s infinite'
                      }}>
                        ● REC
                      </span>
                    )}
                    {track.isLooping && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        color: '#55ff55' 
                      }}>
                        ↻ LOOP
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrack(track.id);
                    }}
                    style={deleteButtonStyle}
                    onMouseOver={(e) => e.target.style.background = 'rgba(190, 80, 100, 0.7)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(170, 60, 80, 0.5)'}
                  >
                    Delete
                  </button>
                </div>

                {/* If collapsed, do not show the rest */}
                {!track.isCollapsed && (
                  <>
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      marginTop: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {/* Recording controls */}
                      {!track.isRecording ? (
                        <button 
                          onClick={() => startRecording(track.id)}
                          style={buttonStyle}
                          onMouseOver={(e) => e.target.style.background = 'rgba(80, 100, 190, 0.7)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(60, 80, 170, 0.5)'}
                        >
                          Start Rec
                        </button>
                      ) : (
                        <button 
                          onClick={() => stopRecording(track.id)}
                          style={activeButtonStyle}
                          onMouseOver={(e) => e.target.style.background = 'rgba(100, 140, 240, 0.8)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(80, 120, 220, 0.7)'}
                        >
                          Stop Rec
                        </button>
                      )}

                      {/* Looping controls */}
                      {!track.isLooping ? (
                        <button
                          onClick={() => startLoop(track.id)}
                          style={buttonStyle}
                          onMouseOver={(e) => e.target.style.background = 'rgba(80, 100, 190, 0.7)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(60, 80, 170, 0.5)'}
                        >
                          Start Loop
                        </button>
                      ) : (
                        <button
                          onClick={() => stopLoop(track.id)}
                          style={activeButtonStyle}
                          onMouseOver={(e) => e.target.style.background = 'rgba(100, 140, 240, 0.8)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(80, 120, 220, 0.7)'}
                        >
                          Stop Loop
                        </button>
                      )}
                    </div>

                    {/* Debug list of events */}
                    <div style={eventsContainerStyle}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                        Events:
                      </div>
                      {track.events.length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '0.8rem', opacity: 0.7, margin: '0.3rem 0' }}>
                          No events recorded
                        </p>
                      )}
                      {track.events.map((ev, idx) => (
                        <div key={idx} style={eventItemStyle}>
                          <span>Key: <strong>{ev.key}</strong></span>
                          <span>Offset: <strong>{Math.round(ev.offset)} ms</strong></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {tracks.length === 0 && (
            <div style={{ 
              padding: '1rem', 
              textAlign: 'center', 
              fontSize: '0.9rem',
              opacity: 0.7,
              fontStyle: 'italic'
            }}>
              Add a track to start recording and looping sounds
            </div>
          )}
        </>
      )}

      {/* Add CSS animation for recording indicator */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  )
})

export default MultiTrackLooper