import React, { useEffect, useRef } from 'react';

const TouchControls = ({ sceneRef, containerRef, deviceInfo }) => {
  const touchStartPositionRef = useRef({ x: 0, y: 0 });
  const lastTouchPositionRef = useRef({ x: 0, y: 0 });
  const isTouchingRef = useRef(false);
  const touchStartTimeRef = useRef(0);
  
  useEffect(() => {
    if (!containerRef?.current) return;
    
    const container = containerRef.current;
    
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        // Single touch - start rotation or interaction
        const touch = e.touches[0];
        touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
        lastTouchPositionRef.current = { x: touch.clientX, y: touch.clientY };
        isTouchingRef.current = true;
        touchStartTimeRef.current = Date.now();
      }
      else if (e.touches.length === 2) {
        // Double touch - pinch zoom
        // Implementation depends on your OrbitControls setup
      }
    };
    
    const handleTouchMove = (e) => {
      if (!isTouchingRef.current) return;
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchPositionRef.current.x;
        const deltaY = touch.clientY - lastTouchPositionRef.current.y;
        
        // If scene supports camera rotation by touch
        if (sceneRef.current?.rotateCameraByTouch) {
          sceneRef.current.rotateCameraByTouch(deltaX * 0.01, deltaY * 0.01);
        }
        
        lastTouchPositionRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };
    
    const handleTouchEnd = (e) => {
      // Check if it was a quick tap (less than 300ms)
      const touchDuration = Date.now() - touchStartTimeRef.current;
      
      if (touchDuration < 300 && isTouchingRef.current) {
        // Calculate touch movement distance
        const startPos = touchStartPositionRef.current;
        const endPos = lastTouchPositionRef.current;
        const distance = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) + 
          Math.pow(endPos.y - startPos.y, 2)
        );
        
        // If it's a tap (minimal movement) and not a drag
        if (distance < 10) {
          // Create a sphere at touch point
          const x = (startPos.x / window.innerWidth) * 2 - 1;
          const y = -(startPos.y / window.innerHeight) * 2 + 1;
          
          if (sceneRef.current?.createSphereAtPosition) {
            sceneRef.current.createSphereAtPosition(x, y);
          }
          
          // Trigger a random sound
          const keys = Object.keys(keyData);
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          
          if (sceneRef.current?.createSphereAndPlaySound) {
            sceneRef.current.createSphereAndPlaySound(randomKey);
          }
        }
      }
      
      isTouchingRef.current = false;
    };
    
    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sceneRef, containerRef, deviceInfo]);
  
  return null; // This is a non-visual component
};

export default TouchControls;