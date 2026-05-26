import { describe, it, expect } from 'vitest';
import { lerp, easeInOutCubic, interpolateRotation } from './useAnimation';

// lerp(a, b, t) — your exact signature
describe('lerp', () => {
  it('returns start at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns end at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('handles negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

// easeInOutCubic(t) — t < 0.5 uses 4t³, else 1 - (-2t+2)³/2
describe('easeInOutCubic', ()=> {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('returns 0.5 at midpoint t=0.5', () => {
    // At t=0.5 → branch: 1 - (-2*0.5+2)³/2 = 1 - 1³/2 = 0.5 ✓
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

// interpolateRotation(start, end, p) — normalizes diff to [-180,180]
// then clamps result to [0,360)
describe('interpolateRotation', () => {
  it('interpolates a simple rotation forward', () => {
    // 0→90 at p=0.5: diff=90, r=0+90*0.5=45 ✓
    expect(interpolateRotation(0, 90, 0.5)).toBeCloseTo(45);
  });
   it('wraps forward across 360° boundary', () => {
    // 350→10: diff=10-350=-340 → -340+360=20
    // r = 350 + 20*0.5 = 360 → r-=360 → 0
    expect(interpolateRotation(350, 10, 0.5)).toBeCloseTo(0);
  });

  it('wraps backward across 360° boundary', () => {
    // 10→350: diff=350-10=340 → 340-360=-20
    // r = 10 + (-20)*0.5 = 0 (no wrap needed)
    expect(interpolateRotation(10, 350, 0.5)).toBeCloseTo(0);
  });

  it('returns start at p=0', () => {
    expect(interpolateRotation(45, 180, 0)).toBeCloseTo(45);
  });

  it('returns end at p=1', () => {
    expect(interpolateRotation(45, 180, 1)).toBeCloseTo(180);
  });
}); 