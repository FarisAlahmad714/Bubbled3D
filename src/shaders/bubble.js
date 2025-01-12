export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = `
  uniform vec3 color;
  uniform float rimPower;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float rim = pow(1.0 - abs(dot(viewDir, normal)), rimPower);
    gl_FragColor = vec4(color, 1.0) + vec4(rim);
  }
`;
