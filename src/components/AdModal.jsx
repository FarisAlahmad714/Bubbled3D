// AdModal.jsx - With Firebase tracking for ad clicks
import React, { useEffect, useState } from 'react';

function AdModal({ onClose, adImage, adLink, adTitle = "Special Offer", onAdClick }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  // Check device orientation and size
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape && mobile); // Only set landscape if also mobile
    };
    
    // Initial check
    checkDevice();
    
    // Add resize listener with debounce
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDevice, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Handle ad click with tracking
  const handleAdClick = (e) => {
    // If onAdClick callback exists, call it for Firebase tracking
    if (onAdClick && typeof onAdClick === 'function') {
      onAdClick(adTitle);
      console.log(`Ad click tracked: ${adTitle}`);
    }
    
    // Don't prevent default behavior - let the link work normally
    return true;
  };

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
          width: isLandscape ? '90%' : '90%',
          maxWidth: isLandscape ? '90%' : '500px',
          maxHeight: isLandscape ? '80vh' : (isMobile ? '90vh' : '85vh'),
          padding: isLandscape ? '15px' : (isMobile ? '20px' : '30px'),
          boxShadow: '0 0 30px rgba(0, 150, 255, 0.4), 0 0 60px rgba(0, 200, 255, 0.2)',
          border: '1px solid rgba(80, 120, 220, 0.5)',
          position: 'relative',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effects - reduced in landscape */}
        {!isLandscape && (
          <>
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
          </>
        )}
        
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isLandscape ? '5px' : (isMobile ? '10px' : '15px'),
            right: isLandscape ? '5px' : (isMobile ? '10px' : '15px'),
            background: 'rgba(60, 80, 170, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: isLandscape ? '30px' : (isMobile ? '36px' : '32px'),
            height: isLandscape ? '30px' : (isMobile ? '36px' : '32px'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: isLandscape ? '18px' : (isMobile ? '22px' : '18px'),
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(100, 150, 255, 0.3)',
            zIndex: 5,
          }}
        >
          ×
        </button>
        
        {/* Content container - switches to horizontal layout in landscape */}
        <div style={{
          display: 'flex',
          flexDirection: isLandscape ? 'row' : 'column',
          flex: 1,
          gap: isLandscape ? '15px' : '0',
          height: isLandscape ? 'calc(80vh - 30px)' : 'auto'
        }}>
          {/* Left side in landscape: Image */}
          <div
            style={{
              width: isLandscape ? '50%' : '100%',
              marginBottom: isLandscape ? '0' : (isMobile ? '15px' : '20px'),
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(80, 120, 220, 0.3)',
              maxHeight: isLandscape ? 'calc(80vh - 30px)' : (isMobile ? '40vh' : '50vh'),
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <img 
              src={adImage} 
              alt="Special Offer" 
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          
          {/* Right side in landscape: Text and buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: isLandscape ? '50%' : '100%',
            height: isLandscape ? '100%' : 'auto',
            justifyContent: 'space-between'
          }}>
            {/* Modal title */}
            <h2 
              style={{
                color: 'white',
                marginTop: 0,
                marginBottom: isLandscape ? '10px' : (isMobile ? '15px' : '20px'),
                textAlign: 'center',
                fontSize: isLandscape ? '20px' : (isMobile ? '22px' : '24px'),
                fontWeight: '600',
                background: 'linear-gradient(to right, #00ffcc, #00ccff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 2px rgba(0, 200, 255, 0.5))',
              }}
            >
              {adTitle}
            </h2>
            
            {/* Warning text */}
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: isLandscape ? '12px' : (isMobile ? '13px' : '14px'),
                textAlign: 'center',
                margin: isLandscape ? '10px 0' : '0 0 15px 0',
              }}
            >
              You are about to be redirected to an external website. Continue?
            </p>
            
            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: isLandscape ? '8px' : (isMobile ? '10px' : '15px'),
                marginTop: isLandscape ? '10px' : 'auto',
                paddingTop: isLandscape ? '0' : '10px',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: isLandscape ? '8px 12px' : (isMobile ? '12px 16px' : '10px 20px'),
                  borderRadius: '6px',
                  border: '1px solid rgba(80, 120, 220, 0.5)',
                  background: 'rgba(30, 40, 70, 0.6)',
                  color: 'white',
                  fontSize: isLandscape ? '14px' : (isMobile ? '15px' : '16px'),
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: isLandscape ? '70px' : (isMobile ? '80px' : 'auto'),
                  touchAction: 'manipulation',
                }}
              >
                Cancel
              </button>
              
              <a
                href={adLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAdClick} // Add click tracking
                style={{
                  padding: isLandscape ? '8px 16px' : (isMobile ? '12px 20px' : '10px 30px'),
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(45deg, #00ffaa, #00ccff)',
                  color: 'rgba(0, 0, 51, 0.9)',
                  fontSize: isLandscape ? '14px' : (isMobile ? '15px' : '16px'),
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: '0 0 15px rgba(0, 200, 255, 0.4)',
                  transition: 'all 0.2s',
                  minWidth: isLandscape ? '80px' : (isMobile ? '100px' : 'auto'),
                  touchAction: 'manipulation',
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
      </div>
    </div>
  );
}

export default AdModal;