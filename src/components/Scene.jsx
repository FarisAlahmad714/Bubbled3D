import React, { useEffect, useState } from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Howl } from 'howler';
import { v4 as uuidv4 } from 'uuid'; // for truly unique IDs
import Sphere from './Sphere';
import Environment from './Environment';
import ParticleField from './ParticleField';
import ParticleInteraction from './ParticleInteraction';
import Lighting from './Lighting';

export default function Scene() {
  const [spheres, setSpheres] = useState([]);

  // Each key maps to a color and an array of sound file paths
  const keyData = {
    '1': { color: '#d0f0c0', src: ['/Sounds/confetti.mp3'] },
    '2': { color: '#e6e6fa', src: ['/Sounds/clay.mp3'] },
    '3': { color: '#00ffff', src: ['/Sounds/corona.mp3'] },
    '4': { color: '#d8bfd8', src: ['/Sounds/dotted-spiral.mp3'] },
    '5': { color: '#ba99dd', src: ['/Sounds/glimmer.mp3'] },
    '6': { color: '#EF5350', src: ['/Sounds/moon.mp3'] },
    'q': { color: '#FF5733', src: ['/Sounds/flash-1.mp3'] },
    'w': { color: '#FF8333', src: ['/Sounds/pinwheel.mp3'] },
    'e': { color: '#FFAE33', src: ['/Sounds/piston-1.mp3'] },
  };

  function createSphereAndPlaySound(key) {
    const position = [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    ];

    // Create new sphere object
    const newSphere = {
      position,
      color: keyData[key].color,
      id: uuidv4(), // use a unique ID
    };

    // Cap the number of spheres to 50 (remove oldest if limit is reached)
    setSpheres(prev => {
      const next = [...prev, newSphere];
      if (next.length > 50) next.shift(); // remove the oldest
      return next;
    });

    // Play sound
    const sound = new Howl({
      src: keyData[key].src,
      // volume: 1.0,
    });
    sound.play();
  }

  function handleKeyDown(event) {
    if (keyData[event.key]) {
      createSphereAndPlaySound(event.key);
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Callback to remove a sphere from the array
  function removeSphereFromState(sphereId) {
    setSpheres(prev => prev.filter(s => s.id !== sphereId));
  }

  return (
    <>
      <Environment />
      <PerspectiveCamera makeDefault position={[0, 5, 10]} />
      <OrbitControls enableZoom={false} />
      <Lighting />
      <pointLight position={[10, 10, 10]} />
      <ParticleField />
      <ParticleInteraction spheres={spheres} />

      {spheres.map(sphere => (
        <Sphere
          key={sphere.id}
          sphereId={sphere.id}
          position={sphere.position}
          color={sphere.color}
          removeSphere={removeSphereFromState}
        />
      ))}
    </>
  );
}
