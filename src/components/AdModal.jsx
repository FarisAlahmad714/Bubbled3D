// AdModal.jsx - Separate component for the advertisement modal
import React from 'react';

function AdModal({ onClose, adImage, adLink, adTitle = "Special Offer" }) {
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
          padding: '30px',
          boxShadow: '0 0 30px rgba(0, 150, 255, 0.4), 0 0 60px rgba(0, 200, 255, 0.2)',
          border: '1px solid rgba(80, 120, 220, 0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effects */}
        <div 
          style={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(0, 200, 255, 0.4) 0%, transparent 70%)',
            top: '-50px',
            right: '-50px',
            borderRadius: '50%',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        <div 
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(0, 255, 200, 0.3) 0%, transparent 70%)',
            bottom: '-30px',
            left: '30px',
            borderRadius: '50%',
            filter: 'blur(15px)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(60, 80, 170, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(100, 150, 255, 0.3)',
          }}
        >
          ×
        </button>
        
        {/* Modal title */}
        <h2 
          style={{
            color: 'white',
            marginTop: '0',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: '600',
            background: 'linear-gradient(to right, #00ffcc, #00ccff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 2px rgba(0, 200, 255, 0.5))',
          }}
        >
          {adTitle}
        </h2>
        
        {/* Ad image */}
        <div
          style={{
            width: '100%',
            marginBottom: '20px',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(80, 120, 220, 0.3)',
          }}
        >
          <img 
            src={adImage} 
            alt="Special Offer" 
            style={{
              width: '100%',
              display: 'block',
            }}
          />
        </div>
        
        {/* Warning text */}
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            textAlign: 'center',
            margin: '0 0 20px 0',
          }}
        >
          You are about to be redirected to an external website. Continue?
        </p>
        
        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid rgba(80, 120, 220, 0.5)',
              background: 'rgba(30, 40, 70, 0.6)',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Cancel
          </button>
          
          <a
            href={adLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 30px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(45deg, #00ffaa, #00ccff)',
              color: 'rgba(0, 0, 51, 0.9)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 0 15px rgba(0, 200, 255, 0.4)',
              transition: 'all 0.2s',
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