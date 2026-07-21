import { useRef, useCallback } from 'react';

const TELEPORT_THRESHOLD_SQ = 0.0045 * 0.0045;
const STALE_GAP_MS = 10000;
const MIN_CHANGE_DEG = 0.000005;

const lerp = (a, b, t) => a + (b - a) * t;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

const interpolateRotation = (start, end, p) => {
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

const useMapAnimation = ({
  baseAnimationDuration = 2500,
  enableSmoothing = true,
  useAdaptiveTiming = true,
  onFrame,
}) => {
  const animationStateRef = useRef({});
  const animationFrameRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const lastUpdateTimeRef = useRef({});
  const lastCoordRef = useRef({});

  const calculateDuration = useCallback((deviceId, now) => {
    if (!useAdaptiveTiming) return baseAnimationDuration;
    const lastUpdate = lastUpdateTimeRef.current[deviceId];
    if (!lastUpdate) return baseAnimationDuration;
    const gap = now - lastUpdate;
    if (gap > STALE_GAP_MS) return 300;
    return Math.max(500, Math.min(gap * 0.8, 5000));
  }, [baseAnimationDuration, useAdaptiveTiming]);

  const animate = useCallback(() => {
    const now = Date.now();
    const stateVals = Object.values(animationStateRef.current);
    let needsUpdate = false;
    let hasTargets = false;

    stateVals.forEach((ds) => {
      if (!ds.target) return;
      hasTargets = true;

      const progress = Math.min(
        (now - ds.startTime) / (ds.duration || baseAnimationDuration),
        1,
      );
      const eased = easeInOutCubic(progress);

      ds.current = {
        longitude: lerp(ds.start.longitude, ds.target.longitude, eased),
        latitude: lerp(ds.start.latitude, ds.target.latitude, eased),
        rotation: interpolateRotation(ds.start.rotation, ds.target.rotation, eased),
      };

      if (progress >= 1) {
        ds.current = { ...ds.target };
        ds.target = null;
        ds.start = null;
      }
      needsUpdate = true;
    });

    if (needsUpdate && onFrame) {
      onFrame(stateVals);
    }

    if (hasTargets) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      isAnimatingRef.current = false;
      animationFrameRef.current = null;
    }
  }, [baseAnimationDuration, onFrame]);

  const updatePositions = useCallback((newPositions) => {
    const now = Date.now();
    const state = animationStateRef.current;
    let newTargetAdded = false;

    newPositions.forEach((position) => {
      const {
        deviceId, longitude, latitude, course,
      } = position;
      const rotation = course || 0;
      const lastCoord = lastCoordRef.current[deviceId];

      if (lastCoord) {
        const dLng = Math.abs(lastCoord.lng - longitude);
        const dLat = Math.abs(lastCoord.lat - latitude);
        if (dLng < MIN_CHANGE_DEG && dLat < MIN_CHANGE_DEG) {
          if (state[deviceId]) state[deviceId].properties = position;
          return;
        }
      }

      lastCoordRef.current[deviceId] = { lng: longitude, lat: latitude };
      const currentState = state[deviceId];

      if (!currentState) {
        state[deviceId] = {
          current: { longitude, latitude, rotation },
          target: null,
          startTime: now,
          properties: position,
        };
        lastUpdateTimeRef.current[deviceId] = now;
        return;
      }

      const { longitude: cLng, latitude: cLat } = currentState.current;
      const hasMoved = Math.abs(cLng - longitude) > MIN_CHANGE_DEG
        || Math.abs(cLat - latitude) > MIN_CHANGE_DEG;

      if (!hasMoved) {
        state[deviceId].properties = position;
        lastUpdateTimeRef.current[deviceId] = now;
        return;
      }

      const isJump = ((longitude - cLng) ** 2) + ((latitude - cLat) ** 2) > TELEPORT_THRESHOLD_SQ;
      if (isJump || !enableSmoothing) {
        state[deviceId] = {
          current: { longitude, latitude, rotation },
          target: null,
          startTime: now,
          properties: position,
        };
        lastUpdateTimeRef.current[deviceId] = now;
        return;
      }

      const duration = calculateDuration(deviceId, now);
      lastUpdateTimeRef.current[deviceId] = now;
      state[deviceId] = {
        ...currentState,
        start: { ...currentState.current },
        target: { longitude, latitude, rotation },
        startTime: now,
        duration,
        properties: position,
      };
      newTargetAdded = true;
    });

    const activeIds = new Set(newPositions.map((p) => p.deviceId));
    Object.keys(state).forEach((key) => {
      const deviceId = Number(key);
      if (!activeIds.has(deviceId)) {
        delete state[deviceId];
        delete lastUpdateTimeRef.current[deviceId];
        delete lastCoordRef.current[deviceId];
      }
    });

    if (newTargetAdded && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [enableSmoothing, calculateDuration, animate]);

  const cancel = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isAnimatingRef.current = false;
    animationStateRef.current = {};
    lastUpdateTimeRef.current = {};
    lastCoordRef.current = {};
  }, []);

  const getState = useCallback(() => animationStateRef.current, []);
  return { updatePositions, cancel, getState };
};

export default useMapAnimation;
