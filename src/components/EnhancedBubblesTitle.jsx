import React, { useEffect, useRef } from 'react';

const EnhancedBubblesTitle = () => {
  const titleContainerRef = useRef(null);
  
  // Create small decorative bubbles around the title that won't reset
  useEffect(() => {
    if (!titleContainerRef.current) return;
    
    const container = titleContainerRef.current;
    const titleBubbles = document.createElement('div');
    titleBubbles.className = 'title-bubbles';
    
    // Create 8 small decorative bubbles around the title
    for (let i = 0; i < 8; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'title-bubble';
      
      // Randomize bubble properties
      const size = 6 + Math.random() * 15; // 6px to 21px
      const top = 10 + Math.random() * 80; // Position around the title
      const left = 10 + Math.random() * 80;
      const delay = Math.random() * 5;
      
      // Set random movement variables
      const moveX = -20 + Math.random() * 40;
      const moveY = -20 + Math.random() * 40;
      const moveX2 = -20 + Math.random() * 40;
      const moveY2 = -20 + Math.random() * 40;
      const moveX3 = -20 + Math.random() * 40;
      const moveY3 = -20 + Math.random() * 40;
      
      // Apply styles
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.top = `${top}%`;
      bubble.style.left = `${left}%`;
      bubble.style.animationDelay = `${delay}s`;
      bubble.style.setProperty('--move-x', `${moveX}px`);
      bubble.style.setProperty('--move-y', `${moveY}px`);
      bubble.style.setProperty('--move-x2', `${moveX2}px`);
      bubble.style.setProperty('--move-y2', `${moveY2}px`);
      bubble.style.setProperty('--move-x3', `${moveX3}px`);
      bubble.style.setProperty('--move-y3', `${moveY3}px`);
      
      titleBubbles.appendChild(bubble);
    }
    
    container.appendChild(titleBubbles);
    
    // Cleanup function
    return () => {
      if (container.contains(titleBubbles)) {
        container.removeChild(titleBubbles);
      }
    };
  }, []);
  
  return (
    <div className="title-container" ref={titleContainerRef}>
      <h1 className="title">
        {'Bubbled Nebula'.split('').map((char, index) => {
          // Special styling for 'B' and 'd' characters to look like bubbles
          const isBubbleChar = char === 'B' || char === 'd';
          return (
            <span 
              key={index} 
              className={isBubbleChar ? 'bubble-char' : ''}
              style={{ '--index': index }}
            >
              {char}
            </span>
          );
        })}
      </h1>
    </div>
  );
};

export default EnhancedBubblesTitle;