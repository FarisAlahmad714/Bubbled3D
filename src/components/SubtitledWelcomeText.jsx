    // src/components/SubtitledWelcomeText.jsx
    import React, { useState, useEffect } from 'react';

    export default function SubtitledWelcomeText({ duration = 21, onComplete = () => {} }) {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    
    // , your keyboard? It’s a starship console, blasting, symphonies, and galactic grooves.  Ready to leave your sonic fingerprint on the universe ?
//Hit “Begin Journey” and warp into the unknown.
    const textSegments = [
        { text: "Prepare for sonic lift Space-Ranger. ", time: 0 },
        { text: "The Bubbled Nebula is alive with unexplored sound . ", time: 3 },
        { text: "your keyboard?  ", time: 7 },
        { text: "It’s a starship console, blasting, symphonies, and galactic grooves.", time: 8 },
        { text: " Ready to leave your sonic fingerprint on the universe ? ", time: 13 },
        { text: "Hit “Begin Journey”, ", time: 16 },
        { text: "and warp into the unknown..", time: 17 },
        
    ];
    
    useEffect(() => {
        console.log("SubtitledWelcomeText mounted");
        // Clear any existing text
        setDisplayText("");
        
        // Set up timeouts for each segment
        const timeouts = [];
        
        textSegments.forEach((segment) => {
        const timeout = setTimeout(() => {
            console.log(`Adding segment: ${segment.text}`);
            setDisplayText(prev => prev + segment.text);
        }, segment.time * 1000);
        
        timeouts.push(timeout);
        });
        
        // Final completion timeout
        const completeTimeout = setTimeout(() => {
        setIsComplete(true);
        if (onComplete) onComplete();
        console.log("Subtitles complete");
        }, duration * 1000);
        
        timeouts.push(completeTimeout);
        
        // Clean up timeouts on unmount
        return () => {
        console.log("Cleaning up subtitles timeouts");
        timeouts.forEach(timeout => clearTimeout(timeout));
        };
    }, []); // Empty dependency array to run only once
    
    return (
        <div className="subtitled-text-container">
        <p className="subtitled-text">
            {displayText}
            {!isComplete && <span className="blinking-cursor">|</span>}
        </p>
        </div>
    );
    }