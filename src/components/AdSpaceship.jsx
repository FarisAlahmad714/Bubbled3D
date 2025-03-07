// src/components/AdSpaceship.jsx
import { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

export default function AdSpaceship({
  modelPath,
  bannerUrl,
  speedFactor = 1.0,
  animationType = 'none',
  positionOffset = [0, 0, 0],
}) {
  const spaceshipRef = useRef();
  const bannerRef = useRef();
  const pathRef = useRef();
  const timeRef = useRef(0);

  // Load spaceship model and ad texture
  const obj = useLoader(OBJLoader, modelPath);
  const bannerTexture = useLoader(THREE.TextureLoader, bannerUrl);

  useEffect(() => {
    // Clone the OBJ to avoid shared references
    const spaceship = obj.clone();
    spaceshipRef.current.add(spaceship);

    // Create banner plane
    const bannerGeometry = new THREE.PlaneGeometry(2, 1);
    const bannerMaterial = new THREE.MeshBasicMaterial({
      map: bannerTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    banner.position.set(0, 1, -1); // Position behind spaceship
    bannerRef.current.add(banner);

    // Define circular path (radius 10-15 units)
    const radius = 10 + Math.random() * 5;
    const height = 2 + Math.random() * 3;
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        )
      );
    }
    pathRef.current = new THREE.CatmullRomCurve3(points, true);

    // Cleanup
    return () => {
      spaceship.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      bannerGeometry.dispose();
      bannerMaterial.dispose();
      bannerTexture.dispose();
    };
  }, [obj, bannerTexture, modelPath, bannerUrl]);

  useFrame(({ clock, camera }) => {
    const elapsed = clock.getElapsedTime();
    timeRef.current += 0.005 * speedFactor;
    const t = timeRef.current % 1;

    // Move along path
    const position = pathRef.current.getPointAt(t);
    position.add(new THREE.Vector3(...positionOffset));
    spaceshipRef.current.position.copy(position);
    const tangent = pathRef.current.getTangentAt(t);
    spaceshipRef.current.lookAt(position.clone().add(tangent));

    // Billboard effect for banner
    bannerRef.current.lookAt(camera.position);

    // Special animations
    if (animationType === 'rotate') {
      bannerRef.current.rotation.z += 0.01;
    } else if (animationType === 'pulse') {
      const scale = 1 + Math.sin(elapsed * 2) * 0.1;
      bannerRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group ref={spaceshipRef}>
      <group ref={bannerRef} />
    </group>
  );
}