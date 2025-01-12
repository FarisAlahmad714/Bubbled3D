import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Lighting() {
  const rimLight = useRef();
  const mainLight = useRef();

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    rimLight.current.position.x = Math.sin(time * 0.3) * 10;
    rimLight.current.position.z = Math.cos(time * 0.3) * 10;
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight 
        ref={mainLight}
        position={[0, 5, 0]} 
        intensity={2}
        color="#ffffff"
      />
      <pointLight
        ref={rimLight}
        position={[10, 0, 0]}
        intensity={1.5}
        color="#88ccff"
      />
      <hemisphereLight 
        groundColor="#000033"
        intensity={0.5}
      />
    </>
  );
}