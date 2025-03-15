import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Single Shooting Star Component (unchanged)
const ShootingStar = ({ startPosition, endPosition, size = 0.5, brightness = 1, duration = 2000 }) => {
  const starRef = useRef();

  useFrame(({ clock }) => {
    if (starRef.current) {
      const elapsed = clock.getElapsedTime() * 1000; // Convert to ms
      const t = Math.min((elapsed % duration) / duration, 1);
      starRef.current.position.lerpVectors(startPosition, endPosition, t);
    }
  });

  return (
    <mesh position={startPosition} ref={starRef}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color="#ffffff" />
      <pointLight intensity={brightness} distance={100} decay={2} color="#ffffff" />
    </mesh>
  );
};

// Shooting Star Manager (updated)
const ShootingStars = () => {
  const [stars, setStars] = useState([]); // Use state instead of local array
  const spawnInterval = 3000; // Spawn every 3 seconds

  useEffect(() => {
    const spawnStar = () => {
      const startX = Math.random() * 200 - 100; // Random X between -100 and 100
      setStars(prev => [
        ...prev,
        {
          start: new THREE.Vector3(startX, 20, -250),
          end: new THREE.Vector3(startX + 50, 20, -250),
        },
      ]);
    };

    spawnStar(); // Initial spawn
    const interval = setInterval(spawnStar, spawnInterval);
    return () => clearInterval(interval);
  }, []);

  // Keystroke Event for Big Bright Stars
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 's') { // Trigger on 's' key
        setStars(prev => [
          ...prev,
          {
            start: new THREE.Vector3(Math.random() * 200 - 100, 20, -250),
            end: new THREE.Vector3(Math.random() * 200 - 100, 20, -250),
            size: 1.5, // Bigger
            brightness: 2, // Brighter
          },
        ]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return stars.map((star, index) => (
    <ShootingStar
      key={index}
      startPosition={star.start}
      endPosition={star.end}
      size={star.size || 0.5}
      brightness={star.brightness || 1}
      duration={2000}
    />
  ));
};

export default ShootingStars; // Export ShootingStars instead of ShootingStar