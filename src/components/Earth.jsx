// Create Earth function - add this after createBluePlanet and before the Scene component
function createEarth(scene, position = [0, -800, 0], scale = 750) {
    // Create the base Earth sphere
    const earthGeometry = new THREE.SphereGeometry(scale, 64, 64);
    
    // Create TextureLoader for loading all textures
    const textureLoader = new THREE.TextureLoader();
    
    // Use canvas to create Earth texture if image loading fails
    const createEarthCanvasTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Create a gradient for oceans
      const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      oceanGradient.addColorStop(0, '#0077be');
      oceanGradient.addColorStop(1, '#00308f');
      
      // Fill the background with ocean
      ctx.fillStyle = oceanGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some continents (simplified)
      ctx.fillStyle = '#228B22'; // Forest green
      
      // North America
      ctx.beginPath();
      ctx.moveTo(200, 150);
      ctx.bezierCurveTo(220, 120, 280, 130, 320, 180);
      ctx.bezierCurveTo(350, 220, 330, 280, 280, 280);
      ctx.bezierCurveTo(240, 280, 180, 240, 200, 150);
      ctx.fill();
      
      // South America
      ctx.beginPath();
      ctx.moveTo(300, 300);
      ctx.bezierCurveTo(320, 280, 350, 290, 340, 380);
      ctx.bezierCurveTo(320, 420, 280, 410, 290, 350);
      ctx.bezierCurveTo(280, 320, 290, 300, 300, 300);
      ctx.fill();
      
      // Europe & Africa
      ctx.beginPath();
      ctx.moveTo(450, 150);
      ctx.bezierCurveTo(480, 130, 520, 150, 540, 200);
      ctx.bezierCurveTo(560, 280, 540, 350, 500, 380);
      ctx.bezierCurveTo(460, 360, 450, 280, 470, 230);
      ctx.bezierCurveTo(440, 200, 440, 160, 450, 150);
      ctx.fill();
      
      // Asia & Australia
      ctx.beginPath();
      ctx.moveTo(600, 150);
      ctx.bezierCurveTo(650, 130, 750, 160, 780, 220);
      ctx.bezierCurveTo(760, 280, 700, 260, 650, 240);
      ctx.bezierCurveTo(620, 230, 580, 200, 600, 150);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(700, 320);
      ctx.bezierCurveTo(730, 310, 780, 330, 790, 370);
      ctx.bezierCurveTo(770, 400, 720, 390, 710, 350);
      ctx.fill();
      
      // Add some clouds (scattered white ovals)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const w = 30 + Math.random() * 100;
        const h = 20 + Math.random() * 60;
        
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    // Create a normal map using canvas
    const createNormalMapTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Fill with a neutral normal value (pointing straight out)
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add random terrain bumps
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = 10 + Math.random() * 50;
        
        const gradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, radius
        );
        
        // Brighter in center = bump, darker = depression
        if (Math.random() > 0.5) {
          gradient.addColorStop(0, '#b0b0ff');
          gradient.addColorStop(1, '#8080ff');
        } else {
          gradient.addColorStop(0, '#6060ff');
          gradient.addColorStop(1, '#8080ff');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    // Create a fallback cloud map
    const createCloudTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some clouds (white with transparent background)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const w = 40 + Math.random() * 120;
        const h = 30 + Math.random() * 60;
        
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    // Create a night lights texture
    const createNightLightsTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Black background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw city lights as tiny bright dots
      ctx.fillStyle = '#FFF';
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2 + 1;
        
        // Skip some areas to represent oceans
        if (Math.random() < 0.7) { 
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Add some larger city clusters
        if (Math.random() < 0.05) {
          const clusterSize = Math.random() * 10 + 5;
          const numDots = Math.floor(Math.random() * 20) + 10;
          
          for (let j = 0; j < numDots; j++) {
            const angleOffset = Math.random() * Math.PI * 2;
            const radiusOffset = Math.random() * clusterSize;
            const dotSize = Math.random() * 1.5 + 0.5;
            
            const dotX = x + Math.cos(angleOffset) * radiusOffset;
            const dotY = y + Math.sin(angleOffset) * radiusOffset;
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    // Try loading textures, with fallbacks to canvas textures
    let earthTexture, normalMap, cloudsTexture, nightLightsTexture;
    
    // Use fallback textures created with canvas
    earthTexture = createEarthCanvasTexture();
    normalMap = createNormalMapTexture();
    cloudsTexture = createCloudTexture();
    nightLightsTexture = createNightLightsTexture();
    
    // Attempt to load real textures instead, but use canvas if needed
    textureLoader.load(
      '/textures/earth_daymap.jpg',
      (texture) => {
        earthTexture = texture;
        earthMaterial.map = texture;
        earthMaterial.needsUpdate = true;
      },
      undefined,
      () => console.log('Using canvas Earth texture as fallback')
    );
    
    textureLoader.load(
      '/textures/earth_normal_map.jpg',
      (texture) => {
        normalMap = texture;
        earthMaterial.normalMap = texture;
        earthMaterial.needsUpdate = true;
      },
      undefined,
      () => console.log('Using canvas normal map as fallback')
    );
    
    textureLoader.load(
      '/textures/earth_clouds.png',
      (texture) => {
        cloudsTexture = texture;
        cloudsMaterial.map = texture;
        cloudsMaterial.alphaMap = texture;
        cloudsMaterial.needsUpdate = true;
      },
      undefined,
      () => console.log('Using canvas clouds texture as fallback')
    );
    
    textureLoader.load(
      '/textures/earth_nightlights.jpg',
      (texture) => {
        nightLightsTexture = texture;
        nightLightsMaterial.map = texture;
        nightLightsMaterial.needsUpdate = true;
      },
      undefined,
      () => console.log('Using canvas night lights texture as fallback')
    );
    
    // Create Earth material with normal map for terrain detail
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      specularMap: nightLightsTexture,
      shininess: 15,
      bumpMap: normalMap,
      bumpScale: 0.1
    });
    
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    
    // Add cloud layer
    const cloudsGeometry = new THREE.SphereGeometry(scale * 1.02, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.8,
      alphaMap: cloudsTexture,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earth.add(clouds);
    
    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(scale * 1.1, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x8ab8ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earth.add(atmosphere);
    
    // Add night lights (visible on dark side)
    const nightLightsGeometry = new THREE.SphereGeometry(scale * 1.01, 64, 64);
    const nightLightsMaterial = new THREE.MeshBasicMaterial({
      map: nightLightsTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.6,
      side: THREE.FrontSide,
      depthWrite: false
    });
    
    const nightLights = new THREE.Mesh(nightLightsGeometry, nightLightsMaterial);
    earth.add(nightLights);
    
    // Position the Earth
    earth.position.set(position[0], position[1], position[2]);
    earth.rotation.y = Math.PI; // Initial rotation to show an interesting part of Earth
    earth.name = "earth"; // Specific name to avoid conflicts
    
    // Add to scene
    scene.add(earth);
    
    // Add a directional light specifically to illuminate Earth
    const earthLight = new THREE.DirectionalLight(0xffffff, 1.5);
    earthLight.position.set(0, 0, 1000);
    earthLight.target = earth;
    scene.add(earthLight);
    
    console.log("Earth added to scene at position:", position);
    return {
      earth: earth,
      clouds: clouds,
      atmosphere: atmosphere,
      nightLights: nightLights,
      earthLight: earthLight
    };
  }