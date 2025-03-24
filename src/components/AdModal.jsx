// AdModal.jsx - Mobile-optimized version
import React, { useEffect, useState } from 'react';

function AdModal({ onClose, adImage, adLink, adTitle = "Special Offer" }) {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile on mount and when window resizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 10, 30, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'rgba(15, 20, 40, 0.95)',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: isMobile ? '90vh' : '85vh', // Height constraint for mobile
          padding: isMobile ? '20px' : '30px',
          boxShadow: '0 0 30px rgba(0, 150, 255, 0.4), 0 0 60px rgba(0, 200, 255, 0.2)',
          border: '1px solid rgba(80, 120, 220, 0.5)',
          position: 'relative',
          overflow: 'auto', // Make scrollable if content overflows
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effects - more subtle on mobile */}
        <div 
          style={{
            position: 'absolute',
            width: isMobile ? '100px' : '150px',
            height: isMobile ? '100px' : '150px',
            background: 'radial-gradient(circle, rgba(0, 200, 255, 0.4) 0%, transparent 70%)',
            top: '-50px',
            right: '-50px',
            borderRadius: '50%',
            filter: 'blur(20px)',
            pointerEvents: 'none',
            opacity: isMobile ? 0.7 : 1,
          }}
        />
        <div 
          style={{
            position: 'absolute',
            width: isMobile ? '70px' : '100px',
            height: isMobile ? '70px' : '100px',
            background: 'radial-gradient(circle, rgba(0, 255, 200, 0.3) 0%, transparent 70%)',
            bottom: '-30px',
            left: '30px',
            borderRadius: '50%',
            filter: 'blur(15px)',
            pointerEvents: 'none',
            opacity: isMobile ? 0.7 : 1,
          }}
        />
        
        {/* Close button - larger hit area on mobile */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? '10px' : '15px',
            right: isMobile ? '10px' : '15px',
            background: 'rgba(60, 80, 170, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: isMobile ? '36px' : '32px',
            height: isMobile ? '36px' : '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: isMobile ? '22px' : '18px',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(100, 150, 255, 0.3)',
            zIndex: 5, // Ensure it's above other elements
          }}
        >
          ×
        </button>
        
        {/* Modal title */}
        <h2 
          style={{
            color: 'white',
            marginTop: 0,
            marginBottom: isMobile ? '15px' : '20px',
            textAlign: 'center',
            fontSize: isMobile ? '22px' : '24px',
            fontWeight: '600',
            background: 'linear-gradient(to right, #00ffcc, #00ccff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 2px rgba(0, 200, 255, 0.5))',
          }}
        >
          {adTitle}
        </h2>
        
        {/* Ad image - with constrained height for mobile */}
        <div
          style={{
            width: '100%',
            marginBottom: isMobile ? '15px' : '20px',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(80, 120, 220, 0.3)',
            maxHeight: isMobile ? '40vh' : '50vh', // Constrain height on mobile
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img 
            src={adImage} 
            alt="Special Offer" 
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain', // Prevent image from being stretched
              display: 'block',
            }}
          />
        </div>
        
        {/* Warning text */}
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: isMobile ? '13px' : '14px',
            textAlign: 'center',
            margin: '0 0 15px 0',
          }}
        >
          You are about to be redirected to an external website. Continue?
        </p>
        
        {/* Action buttons - adjusted for easier tapping on mobile */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? '10px' : '15px',
            marginTop: 'auto', // Push buttons to bottom of container
            paddingTop: '10px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: isMobile ? '12px 16px' : '10px 20px',
              borderRadius: '6px',
              border: '1px solid rgba(80, 120, 220, 0.5)',
              background: 'rgba(30, 40, 70, 0.6)',
              color: 'white',
              fontSize: isMobile ? '15px' : '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: isMobile ? '80px' : 'auto', // Ensure tappable size
              touchAction: 'manipulation', // Better touch behavior
            }}
          >
            Cancel
          </button>
          
          <a
            href={adLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: isMobile ? '12px 20px' : '10px 30px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(45deg, #00ffaa, #00ccff)',
              color: 'rgba(0, 0, 51, 0.9)',
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 0 15px rgba(0, 200, 255, 0.4)',
              transition: 'all 0.2s',
              minWidth: isMobile ? '100px' : 'auto', // Ensure tappable size
              touchAction: 'manipulation', // Better touch behavior
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Continue
          </a>
        </div>
      </div>
    </div>
  );
}

export default AdModal;