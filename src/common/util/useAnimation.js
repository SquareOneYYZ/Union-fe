export const lerp = (a, b, t) => a + (b - a) * t;

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const interpolateRotation = (start, end, p) => {
  let diff = end - start;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  let r = start + diff * p;
  if (r < 0) r += 360;
  if (r >= 360) r -= 360;
  return r;
};
