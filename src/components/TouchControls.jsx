// TouchControls.jsx - Fixed version
import React, { useState, useEffect, useRef } from 'react';

const TouchControls = ({ sceneRef, containerRef, deviceInfo }) => {
  const touchStartRef = useRef(null);
  const touchTimerRef = useRef(null);
  const [lastTriggeredKey, setLastTriggeredKey] = useState(null);
  
  useEffect(() => {
    if (!containerRef?.current) return;
    
    const container = containerRef.current;
    
    const handleTouchStart = (e) => {
      // Store touch start position
      touchStartRef.current = {
        x: e.touches[0].clientX / window.innerWidth,
        y: e.touches[0].clientY / window.innerHeight,
        time: Date.now()
      };
      
      // Clear any existing timers
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
      
      // Start a timer to trigger sound if holding
      touchTimerRef.current = setTimeout(() => {
        triggerSoundBasedOnPosition(touchStartRef.current.x, touchStartRef.current.y);
      }, 300); // Hold for 300ms to trigger
    };
    
    const handleTouchMove = (e) => {
      // If moving significantly, cancel the timer
      if (touchStartRef.current && touchTimerRef.current) {
        const currentX = e.touches[0].clientX / window.innerWidth;
        const currentY = e.touches[0].clientY / window.innerHeight;
        
        const distance = Math.sqrt(
          Math.pow(currentX - touchStartRef.current.x, 2) + 
          Math.pow(currentY - touchStartRef.current.y, 2)
        );
        
        // If moved more than a threshold, cancel timer
        if (distance > 0.03) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      }
    };
    
    const handleTouchEnd = (e) => {
      // If touch was quick (tap), trigger sound
      if (touchStartRef.current && (Date.now() - touchStartRef.current.time) < 300) {
        triggerSoundBasedOnPosition(
          touchStartRef.current.x, 
          touchStartRef.current.y
        );
      }
      
      // Clear timer and reference
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      
      touchStartRef.current = null;
    };
    
    // Map screen position to a key
    const triggerSoundBasedOnPosition = (x, y) => {
      // Skip if scene reference isn't available
      if (!sceneRef?.current?.createSphereAndPlaySound) return;
      
      // FIX: Get keyData from scene instead of direct reference
      const keyData = sceneRef.current.getKeyData ? sceneRef.current.getKeyData() : {};
      if (!keyData || Object.keys(keyData).length === 0) {
        console.warn('TouchControls: No key data available from Scene');
        return;
      }
      
      // Convert position to a key based on screen quadrants
      let key;
      
      // Top left quadrant
      if (x < 0.33 && y < 0.33) {
        key = '1';
      } 
      // Top middle
      else if (x >= 0.33 && x < 0.66 && y < 0.33) {
        key = '2';
      } 
      // Top right
      else if (x >= 0.66 && y < 0.33) {
        key = '3';
      }
      // Middle left
      else if (x < 0.33 && y >= 0.33 && y < 0.66) {
        key = 'q';
      }
      // Center
      else if (x >= 0.33 && x < 0.66 && y >= 0.33 && y < 0.66) {
        key = 'w';
      }
      // Middle right
      else if (x >= 0.66 && y >= 0.33 && y < 0.66) {
        key = 'e';
      }
      // Bottom left
      else if (x < 0.33 && y >= 0.66) {
        key = 'a';
      }
      // Bottom middle
      else if (x >= 0.33 && x < 0.66 && y >= 0.66) {
        key = 's';
      }
      // Bottom right
      else {
        key = 'd';
      }
      
      // Don't trigger the same key in quick succession
      if (key === lastTriggeredKey) {
        const now = Date.now();
        if (now - lastTriggerTime < 300) {
          return; // Debounce rapid taps
        }
      }
      
      // Trigger the sound via Scene
      sceneRef.current.createSphereAndPlaySound(key);
      setLastTriggeredKey(key);
      lastTriggerTime = Date.now();
    };
    
    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);
    
    // Variable to track last trigger time for debouncing
    let lastTriggerTime = 0;
    
    // Clean up
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, [sceneRef, containerRef]);
  
  // No visible UI, just event handlers
  return null;
};

export default TouchControls;