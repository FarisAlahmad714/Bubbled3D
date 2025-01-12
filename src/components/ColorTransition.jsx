export const lerpColor = (color1, color2, t) => {
  const c1 = {
    r: parseInt(color1.slice(1,3), 16),
    g: parseInt(color1.slice(3,5), 16),
    b: parseInt(color1.slice(5,7), 16),
  };
  const c2 = {
    r: parseInt(color2.slice(1,3), 16),
    g: parseInt(color2.slice(3,5), 16),
    b: parseInt(color2.slice(5,7), 16),
  };
  
  return `#${Math.round(c1.r + (c2.r - c1.r) * t).toString(16).padStart(2, '0')}${
    Math.round(c1.g + (c2.g - c1.g) * t).toString(16).padStart(2, '0')}${
    Math.round(c1.b + (c2.b - c1.b) * t).toString(16).padStart(2, '0')}`;
};
