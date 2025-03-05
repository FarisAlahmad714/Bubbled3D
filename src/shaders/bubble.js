export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  uniform float time;
  uniform float pulseSpeed;
  uniform float soundIntensity;
  
  void main() {
    // Get the UV coordinates
    vUv = uv;
    
    // Get the base normal
    vec3 baseNormal = normal;
    
    // Apply simplified wave displacement to normal
    float normalWave = sin(time * pulseSpeed * 3.0 + position.y * 2.0) * 0.05 * soundIntensity;
    vec3 modifiedNormal = normalize(baseNormal + vec3(normalWave));
    
    // Set the normal
    vNormal = normalize(normalMatrix * modifiedNormal);
    
    // Get the view position for rim lighting
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    // Simplified vertex displacement
    vec3 displacement = position * (1.0 + sin(time * pulseSpeed * 0.5) * 0.01 * (1.0 + soundIntensity));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacement, 1.0);
  }
`;

export const fragmentShader = `
  uniform vec3 color;
  uniform float rimPower;
  uniform float time;
  uniform float pulseSpeed;
  uniform float soundIntensity;
  uniform float colorShift;
  uniform float opacity;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Improved rim lighting calculation
    float rimBase = 1.0 - abs(dot(viewDir, normal));
    float rim = pow(rimBase, rimPower);
    
    // Simplified color calculation with better aesthetics
    vec3 baseColor = color;
    
    // Subtle color variation based on viewing angle
    vec3 iridescence = vec3(
      0.5 + 0.5 * sin(rimBase * 3.0),
      0.5 + 0.5 * sin(rimBase * 3.0 + 2.0),
      0.5 + 0.5 * sin(rimBase * 3.0 + 4.0)
    );
    
    // Simpler color shift calculation
    vec3 shiftedColor = mix(baseColor, vec3(0.85, 0.95, 1.0), colorShift);
    
    // Add subtle pulse
    shiftedColor += vec3(sin(time * pulseSpeed) * 0.05) * soundIntensity;
    
    // Mix in iridescence at the edges
    vec3 finalColor = mix(shiftedColor, iridescence, rim * 0.3);
    
    // Add smooth, subtle gradient
    finalColor = mix(finalColor, vec3(1.0), rim * 0.5);
    
    // Final color with transparency
    gl_FragColor = vec4(finalColor, opacity * (0.7 + rim * 0.3));
  }
`;