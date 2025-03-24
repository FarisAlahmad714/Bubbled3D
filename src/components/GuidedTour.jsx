// GuidedTour.jsx - Ultra-lightweight performance version
import React, { useState, useEffect } from 'react';

// Simplified tour steps without selectors
const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Bubbles 3D',
    description: 'This interactive experience lets you create music and visuals. Let\'s explore the main features!',
    position: 'center'
  },
  {
    id: 'multitracklooper',
    title: 'Multi-Track Looper',
    description: 'Create musical loops by recording sequences of keypresses. Layer multiple tracks to build complex compositions.',
    position: 'bottom'
  },
  {
    id: 'camera-mode',
    title: 'Camera Controls',
    description: 'Change your perspective with different camera modes. "Orbit" circles the scene, "Follow" tracks moving elements.',
    position: 'top'
  },
  {
    id: 'camera-speed',
    title: 'Camera Speed',
    description: 'Adjust how quickly the camera moves and rotates through the environment.',
    position: 'top'
  },
  {
    id: 'visual-mode',
    title: 'Visual Themes',
    description: 'Switch between different visual themes that change colors and effects.',
    position: 'top'
  },
  {
    id: 'performance',
    title: 'Performance Settings',
    description: 'Optimize for your device by adjusting graphics quality. Choose "Low" for better performance or "High" for maximum visual quality.',
    position: 'left'
  },
  {
    id: 'keyboard',
    title: 'Keyboard Controls',
    description: 'Press keys 1-6, Q-W-E, and A-S-D-F to create sounds and visual elements. Each key plays a different sound and creates unique spheres in the scene.',
    position: 'center'
  },
  {
    id: 'conclusion',
    title: 'Ready to Begin!',
    description: 'Experiment, create, and enjoy the experience. You can revisit this guide anytime by clicking the Help (?) button.',
    position: 'center'
  },
];

// Predefined positions for tooltips (no dynamic positioning)
const POSITIONS = {
  'center': { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' },
  'top': { top: '80px', left: '50%', transform: 'translateX(-50%)' },
  'bottom': { bottom: '80px', left: '50%', transform: 'translateX(-50%)' },
  'left': { top: '40%', left: '80px', transform: 'translateY(-50%)' }
};

const GuidedTour = ({ isFirstVisit, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  
  // Initialize visibility
  useEffect(() => {
    setVisible(isFirstVisit);
  }, [isFirstVisit]);
  
  const handleNextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prevStep => prevStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prevStep => prevStep - 1);
    }
  };

  const handleComplete = () => {
    setVisible(false);
    if (onComplete) onComplete();
  };

  // Only render if visible
  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const position = POSITIONS[step.position];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 5, 20, 0.75)',
        zIndex: 9999,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
      onClick={handleComplete}
    >
      {/* Simple tooltip with fixed positioning */}
      <div
        style={{
          position: 'absolute',
          ...position,
          width: '300px',
          backgroundColor: 'rgba(15, 25, 50, 0.9)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(100, 150, 255, 0.4)',
          zIndex: 10001,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 
          style={{
            color: 'rgba(120, 180, 255, 1)',
            margin: '0 0 12px 0',
            fontSize: '18px',
          }}
        >
          {step.title}
        </h2>
        
        <p 
          style={{
            color: 'white',
            fontSize: '14px',
            lineHeight: 1.5,
            marginBottom: '16px',
          }}
        >
          {step.description}
        </p>
        
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Simple dots for step indication */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {TOUR_STEPS.map((_, index) => (
              <div 
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: index === currentStep 
                    ? 'rgba(100, 170, 255, 1)' 
                    : 'rgba(100, 150, 255, 0.3)',
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirstStep && (
              <button 
                style={{
                  backgroundColor: 'rgba(40, 60, 100, 0.6)',
                  color: 'white',
                  border: '1px solid rgba(100, 150, 255, 0.4)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onClick={handlePreviousStep}
              >
                Previous
              </button>
            )}
            
            <button 
              style={{
                backgroundColor: 'rgba(60, 100, 200, 0.8)',
                color: 'white',
                border: '1px solid rgba(100, 150, 255, 0.4)',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              onClick={handleNextStep}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
        
        <button 
          style={{
            display: 'block',
            width: '100%',
            marginTop: '16px',
            backgroundColor: 'transparent',
            color: 'rgba(150, 180, 255, 0.7)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            textAlign: 'center',
          }}
          onClick={handleComplete}
        >
          Skip Tour
        </button>
      </div>
    </div>
  );
};

export default GuidedTour;