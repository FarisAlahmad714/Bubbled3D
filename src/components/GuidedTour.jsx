// GuidedTour.jsx - Mobile-optimized version
import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../App.css';

// Tour steps with selectors to find the actual elements
// Add mobile-specific instructions and positions
const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Bubbles 3D',
    description: 'This interactive experience lets you create music and visuals. Tap through to explore the main features!',
    selector: null, // No specific element, full-screen intro
    position: 'center',
  },
  {
    id: 'multitracklooper',
    title: 'Multi-Track Looper',
    description: 'Create musical loops by recording sound sequences. Layer multiple tracks to build compositions.',
    selector: '[data-tour-target="multitracklooper"]',
    position: 'bottom',
    skipHighlight: true, // Skip the expensive highlight for this step
  },
  {
    id: 'camera-mode',
    title: 'Camera Controls',
    description: 'Change your view with different camera modes. "Orbit" circles the scene, "Follow" tracks moving elements.',
    selector: 'button', // Will look for buttons containing "Camera:"
    buttonText: 'Camera:',
    position: 'bottom',
  },
  {
    id: 'camera-speed',
    title: 'Camera Speed',
    description: 'Adjust how quickly the camera moves through the environment.',
    selector: 'input[type="range"]', // The slider element
    position: 'bottom',
  },
  {
    id: 'visual-mode',
    title: 'Visual Themes',
    description: 'Switch between different visual themes that change colors and effects.',
    selector: 'button', // Will look for buttons containing "Visual:"
    buttonText: 'Visual:',
    position: 'bottom',
  },
  {
    id: 'performance',
    title: 'Performance Settings',
    description: 'Optimize for your device by adjusting quality. Choose "Low" for better performance or "High" for better visuals.',
    selector: 'div[title="Performance Settings"]', // The settings gear
    position: 'left',
  },
  {
    id: 'keyboard',
    title: 'Sound Controls',
    description: 'Tap buttons on the virtual keyboard or press keys (1-6, Q-W-E, A-S-D-F) to create sounds and visual elements.',
    selector: null, // No specific element for keyboard controls
    position: 'center',
  },
  {
    id: 'conclusion',
    title: 'Ready to Begin!',
    description: 'Experiment, create, and enjoy the experience. You can revisit this guide anytime by tapping the Help (?) button.',
    selector: null, 
    position: 'center',
  },
];

const GuidedTour = ({ isFirstVisit, onComplete, isMobile = false }) => {
  // Define all hooks at the top level - NEVER conditionally
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetElement, setTargetElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });
  const [elementRect, setElementRect] = useState(null);
  
  // Refs for positioning calculations
  const tooltipRef = useRef(null);
  const highlightRef = useRef(null);
  const positioningTimeoutRef = useRef(null);
  
  // Detect if we're on a mobile device if not explicitly provided
  const detectMobile = useMemo(() => {
    if (typeof isMobile === 'boolean') return isMobile;
    return window.innerWidth <= 768 || ('ontouchstart' in window);
  }, [isMobile]);
  
  // Initialize on mount and when isFirstVisit changes
  useEffect(() => {
    console.log('GuidedTour: Setting visibility based on isFirstVisit =', isFirstVisit);
    setVisible(isFirstVisit);
  }, [isFirstVisit]);
  
  // Find and highlight the current target element
  useEffect(() => {
    if (!visible) return;
    
    const step = TOUR_STEPS[currentStep];
    console.log('Processing step:', step.id);
    
    // Reset target element
    setTargetElement(null);
    setElementRect(null);
    
    // Clear any existing timeout
    if (positioningTimeoutRef.current) {
      clearTimeout(positioningTimeoutRef.current);
    }
    
    // Position for center steps
    const centerTooltip = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // For mobile, position tooltip slightly higher from center to account for bottom navigation
      const tooltipWidth = detectMobile ? windowWidth * 0.9 : 350;
      const verticalOffset = detectMobile ? -windowHeight * 0.1 : 0;
      
      setTooltipPosition({
        left: windowWidth / 2 - tooltipWidth / 2,
        top: windowHeight / 2 - 100 + verticalOffset,
      });
    };
    
    // No element to highlight for intro/center steps
    if (!step.selector || step.position === 'center') {
      centerTooltip();
      return;
    }
    
    // Use a small delay before trying to find the element
    // This can help reduce continuous DOM queries
    positioningTimeoutRef.current = setTimeout(() => {
      // Try to find the element
      let element = null;
      
      // Special case for buttons with specific text
      if (step.buttonText) {
        const buttons = document.querySelectorAll(step.selector);
        for (const button of buttons) {
          if (button.textContent.includes(step.buttonText)) {
            element = button;
            break;
          }
        }
      } 
      // Handle array of selectors (try multiple selectors)
      else if (Array.isArray(step.selector)) {
        for (const selector of step.selector) {
          const foundElement = document.querySelector(selector);
          if (foundElement) {
            element = foundElement;
            console.log('Found element with selector:', selector);
            break;
          }
        }
      }
      else {
        // Standard selector
        element = document.querySelector(step.selector);
      }
      
      if (element) {
        console.log('Found element:', element);
        setTargetElement(element);
        
        // Get element position - only do this once and save the result
        const rect = element.getBoundingClientRect();
        setElementRect(rect);
        
        // Calculate tooltip position
        // Adjust width for mobile screens
        const tooltipWidth = detectMobile ? Math.min(rect.width * 1.2, window.innerWidth * 0.9) : 350;
        const tooltipHeight = detectMobile ? 200 : 180; // Slightly larger for mobile
        const padding = detectMobile ? 15 : 20; // Slightly smaller padding for mobile
        
        // Calculate tooltip position based on specified position
        let left, top;
        
        // On mobile, prefer bottom or top positioning to avoid edge clipping
        const mobilePosition = detectMobile ? (rect.top > window.innerHeight / 2 ? 'top' : 'bottom') : step.position;
        
        switch (mobilePosition) {
          case 'top':
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            top = rect.top - tooltipHeight - padding;
            break;
          case 'bottom':
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            top = rect.bottom + padding;
            break;
          case 'left':
            // For mobile, if element is too close to left edge, position on bottom
            if (detectMobile && rect.left < tooltipWidth + padding * 2) {
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              top = rect.bottom + padding;
            } else {
              left = rect.left - tooltipWidth - padding;
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
            }
            break;
          case 'right':
            // For mobile, if element is too close to right edge, position on bottom
            if (detectMobile && window.innerWidth - rect.right < tooltipWidth + padding * 2) {
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              top = rect.bottom + padding;
            } else {
              left = rect.right + padding;
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
            }
            break;
          default:
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            top = rect.bottom + padding;
        }
        
        // Keep tooltip within window bounds
        left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));
        top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));
        
        setTooltipPosition({ left, top });
      } else {
        console.log('Element not found for selector:', step.selector);
        // Fallback to center position
        centerTooltip();
      }
    }, 50); // Small delay to reduce impact
    
    return () => {
      if (positioningTimeoutRef.current) {
        clearTimeout(positioningTimeoutRef.current);
      }
    };
  }, [currentStep, visible, detectMobile]);
  
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
    console.log('GuidedTour: Tour completed');
    setVisible(false);
    if (onComplete) onComplete();
  };

  // Only render the content if visible
  if (!visible) {
    return null;
  }

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Determine if this is a full-screen/center step
  const isCenterStep = step.position === 'center' || !step.selector;

  // Should we show the highlight (expensive)
  const shouldShowHighlight = targetElement && !isCenterStep && !step.skipHighlight && elementRect;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        pointerEvents: 'none', // Let clicks through by default
      }}
    >
      {/* Semi-transparent backdrop - less expensive than a massive box-shadow */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 5, 20, 0.75)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'auto', // Capture clicks on the backdrop
        }}
        onClick={handleComplete}
      />
      
      {/* Highlight around target element if one exists - performance optimized */}
      {shouldShowHighlight && (
        <div
          ref={highlightRef}
          style={{
            position: 'absolute',
            top: elementRect.top - 5,
            left: elementRect.left - 5,
            width: elementRect.width + 10,
            height: elementRect.height + 10,
            borderRadius: '5px',
            border: '2px solid rgba(120, 180, 255, 0.8)',
            // Use a simpler box-shadow without the massive spread
            boxShadow: '0 0 15px rgba(120, 180, 255, 0.8)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />
      )}
      
      {/* Optional cutout for target elements instead of massive box-shadow */}
      {targetElement && !isCenterStep && step.skipHighlight && elementRect && (
        <div
          style={{
            position: 'absolute',
            top: elementRect.top - 10,
            left: elementRect.left - 10,
            width: elementRect.width + 20,
            height: elementRect.height + 20,
            border: '2px dashed rgba(120, 180, 255, 0.8)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />
      )}
      
      {/* Tooltip with step information - adjusted for mobile */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          left: `${tooltipPosition.left}px`,
          top: `${tooltipPosition.top}px`,
          width: detectMobile ? '90%' : '350px',
          maxWidth: '90vw',
          backgroundColor: 'rgba(15, 25, 50, 0.95)',
          borderRadius: '8px',
          padding: detectMobile ? '20px' : '16px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(100, 150, 255, 0.4)',
          zIndex: 10001,
          pointerEvents: 'auto', // Make tooltip interactive
        }}
        onClick={(e) => e.stopPropagation()} // Prevent clicks from closing the tour
      >
        <h2 
          style={{
            color: 'rgba(120, 180, 255, 1)',
            margin: '0 0 12px 0',
            fontSize: detectMobile ? '20px' : '18px',
            fontWeight: 600,
          }}
        >
          {step.title}
        </h2>
        
        <p 
          style={{
            color: 'white',
            fontSize: detectMobile ? '16px' : '14px',
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
            flexDirection: detectMobile ? 'column' : 'row',
            gap: detectMobile ? '15px' : '0',
          }}
        >
          <div 
            style={{
              display: 'flex',
              gap: '6px',
              width: detectMobile ? '100%' : 'auto',
              justifyContent: detectMobile ? 'center' : 'flex-start',
            }}
          >
            {TOUR_STEPS.map((_, index) => (
              <div 
                key={index}
                style={{
                  width: detectMobile ? '12px' : '8px',
                  height: detectMobile ? '12px' : '8px',
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
          
          <div 
            style={{
              display: 'flex',
              gap: '8px',
              width: detectMobile ? '100%' : 'auto',
              justifyContent: detectMobile ? 'space-between' : 'flex-start',
            }}
          >
            {!isFirstStep && (
              <button 
                style={{
                  backgroundColor: 'rgba(40, 60, 100, 0.6)',
                  color: 'white',
                  border: '1px solid rgba(100, 150, 255, 0.4)',
                  borderRadius: '4px',
                  padding: detectMobile ? '10px 15px' : '6px 12px',
                  cursor: 'pointer',
                  fontSize: detectMobile ? '16px' : '13px',
                  flex: detectMobile ? '1' : 'none',
                  minWidth: detectMobile ? '100px' : 'auto',
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
                padding: detectMobile ? '10px 15px' : '6px 12px',
                cursor: 'pointer',
                fontSize: detectMobile ? '16px' : '13px',
                fontWeight: isLastStep ? 500 : 400,
                flex: detectMobile ? '1' : 'none',
                minWidth: detectMobile ? '100px' : 'auto',
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
            marginTop: detectMobile ? '20px' : '16px',
            backgroundColor: 'transparent',
            color: 'rgba(150, 180, 255, 0.7)',
            border: 'none',
            cursor: 'pointer',
            fontSize: detectMobile ? '15px' : '13px',
            textAlign: 'center',
            padding: detectMobile ? '10px' : '5px',
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