import { useRef } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export default function Environment() {
  return (
    <>
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 5, 15]} />
      <EffectComposer>
        <Bloom 
          intensity={1.0} 
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9} 
        />
      </EffectComposer>
    </>
  );
}