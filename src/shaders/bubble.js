export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying float vDistFromCenter;
  
  uniform float time;
  uniform float pulseSpeed;
  uniform float soundIntensity;
  
  void main() {
    // Get the UV coordinates
    vUv = uv;
    
    // Calculate the distance from the center of the mesh
    vDistFromCenter = length(position.xyz);
    
    // Get the base normal
    vec3 baseNormal = normal;
    
    // Apply wave displacement to normal based on time and sound intensity
    float normalWave = sin(time * pulseSpeed * 5.0 + position.y * 2.0) * 0.1 * soundIntensity;
    
    // Dynamic normal modification for ripple effects
    vec3 modifiedNormal = normalize(baseNormal + vec3(
      sin(position.z * 4.0 + time * pulseSpeed) * 0.05 * (1.0 + soundIntensity),
      sin(position.x * 4.0 + time * pulseSpeed) * 0.05 * (1.0 + soundIntensity),
      sin(position.y * 4.0 + time * pulseSpeed) * 0.05 * (1.0 + soundIntensity)
    ));
    
    // Set the normal and add slight motion with time
    vNormal = normalize(normalMatrix * modifiedNormal);
    
    // Get the view position for rim lighting
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    // Add subtle vertex displacement for more organic look
    vec3 displacement = position * (
      1.0 + 
      sin(time * pulseSpeed + position.x * 5.0) * 0.01 * (1.0 + soundIntensity * 2.0) +
      sin(time * pulseSpeed * 0.7 + position.z * 5.0) * 0.01 * (1.0 + soundIntensity * 2.0)
    );
    
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
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying float vDistFromCenter;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Enhanced rim lighting with wave pattern
    float rimBase = 1.0 - abs(dot(viewDir, normal));
    float rimWave = sin(time * pulseSpeed * 3.0 + vUv.y * 10.0) * 0.1 * (1.0 + soundIntensity);
    float rim = pow(rimBase + rimWave, rimPower);
    
    // Add time-based color pulsing
    vec3 pulseColor = color + vec3(
      sin(time * pulseSpeed) * 0.1,
      cos(time * pulseSpeed) * 0.1,
      sin(time * pulseSpeed * 1.3) * 0.1
    ) * (1.0 + soundIntensity);
    
    // Add color shift based on age - yellow to cyan to purple
    vec3 shiftedColor;
    if (colorShift < 0.25) {
      // Interpolate from base color to yellow
      float t = colorShift * 4.0;
      shiftedColor = mix(pulseColor, vec3(1.0, 1.0, 0.5), t);
    } else if (colorShift < 0.5) {
      // Interpolate from yellow to cyan
      float t = (colorShift - 0.25) * 4.0;
      shiftedColor = mix(vec3(1.0, 1.0, 0.5), vec3(0.5, 1.0, 1.0), t);
    } else if (colorShift < 0.75) {
      // Interpolate from cyan to purple
      float t = (colorShift - 0.5) * 4.0;
      shiftedColor = mix(vec3(0.5, 1.0, 1.0), vec3(0.8, 0.5, 1.0), t);
    } else {
      // Interpolate from purple to white (fading)
      float t = (colorShift - 0.75) * 4.0;
      shiftedColor = mix(vec3(0.8, 0.5, 1.0), vec3(1.0, 1.0, 1.0), t);
    }
    
    // Add iridescence effect - rainbow colors based on viewing angle
    float iridescence = 0.2 * (1.0 + soundIntensity);
    vec3 iridescenceColor = vec3(
      0.5 + 0.5 * sin(rimBase * 5.0),
      0.5 + 0.5 * sin(rimBase * 5.0 + 2.0),
      0.5 + 0.5 * sin(rimBase * 5.0 + 4.0)
    );
    
    // Add bubble thickness variation
    float thickness = 0.8 + 0.2 * sin(vUv.x * 10.0 + time * pulseSpeed) * sin(vUv.y * 10.0 + time * pulseSpeed * 0.7);
    
    // Calculate interior glow
    float glow = 1.0 - vDistFromCenter;
    glow = pow(glow, 2.0) * (0.5 + soundIntensity * 0.5);
    vec3 glowColor = mix(shiftedColor, vec3(1.0, 1.0, 1.0), glow * 0.5);
    
    // Combine all effects
    vec3 finalColor = mix(glowColor, iridescenceColor, iridescence * rimBase) * thickness;
    
    // Apply rim lighting
    vec3 rimColor = vec3(1.0, 1.0, 1.0);  // White rim
    
    // Add a subtle circular pattern
    float pattern = (
      sin(vUv.x * 20.0 + time * pulseSpeed) * 
      sin(vUv.y * 20.0 + time * pulseSpeed)
    ) * 0.05 * (1.0 + soundIntensity);
    
    // Final color with rim and transparency that increases with sound
    gl_FragColor = vec4(
      finalColor + rim * rimColor + pattern, 
      0.7 + rim * 0.3 + soundIntensity * 0.3
    );
  }
`;