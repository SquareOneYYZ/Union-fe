import { useState, useEffect, useMemo } from 'react';
import { map } from './core/MapView';

/**
 * Hook to prioritize loading positions within viewport first
 * @param {Array} positions - All positions
 * @param {Object} devices - Device lookup object
 */
export const useViewportPriority = (positions, devices) => {
  const [prioritizedPositions, setPrioritizedPositions] = useState([]);

  useEffect(() => {
    if (!positions || positions.length === 0) {
      setPrioritizedPositions([]);
      return;
    }

    // Get current viewport bounds
    const bounds = map.getBounds();
    const viewport = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };

    // Partition positions into visible and non-visible
    const visible = [];
    const nonVisible = [];

    positions.forEach((position) => {
      if (!devices[position.deviceId]) return;

      const lat = position.latitude;
      const lng = position.longitude;

      const isInViewport = lat >= viewport.south
        && lat <= viewport.north
        && lng >= viewport.west
        && lng <= viewport.east;

      if (isInViewport) {
        visible.push(position);
      } else {
        nonVisible.push(position);
      }
    });

    // Prioritize visible positions first
    setPrioritizedPositions([...visible, ...nonVisible]);
  }, [positions, devices]);

  return prioritizedPositions;
};

/**
 * Combined hook: viewport priority + progressive loading
 */
export const useViewportProgressiveLoad = (
  positions,
  devices,
  visibleChunkSize = 500, // Load all visible at once
  nonVisibleChunkSize = 100, // Load non-visible in smaller chunks
  chunkDelay = 16,
) => {
  const [loadedPositions, setLoadedPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!positions || positions.length === 0) {
      setLoadedPositions([]);
      setProgress(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Get viewport bounds
    const bounds = map.getBounds();
    const viewport = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };

    // Partition positions
    const visible = [];
    const nonVisible = [];

    positions.forEach((position) => {
      if (!devices[position.deviceId]) return;

      const lat = position.latitude;
      const lng = position.longitude;

      const isInViewport = lat >= viewport.south
        && lat <= viewport.north
        && lng >= viewport.west
        && lng <= viewport.east;

      if (isInViewport) {
        visible.push(position);
      } else {
        nonVisible.push(position);
      }
    });

    // Load visible markers immediately (first frame)
    requestAnimationFrame(() => {
      setLoadedPositions(visible);
      setProgress(Math.round((visible.length / positions.length) * 100));

      // Then progressively load non-visible markers
      if (nonVisible.length === 0) {
        setIsLoading(false);
        setProgress(100);
        return;
      }

      let currentIndex = 0;
      const loadNextChunk = () => {
        const chunk = nonVisible.slice(currentIndex, currentIndex + nonVisibleChunkSize);
        currentIndex += nonVisibleChunkSize;

        setLoadedPositions((prev) => [...prev, ...chunk]);
        const totalLoaded = visible.length + currentIndex;
        const progressPercent = Math.min(100, Math.round((totalLoaded / positions.length) * 100));
        setProgress(progressPercent);

        if (currentIndex < nonVisible.length) {
          setTimeout(loadNextChunk, chunkDelay);
        } else {
          setIsLoading(false);
          setProgress(100);
        }
      };

      setTimeout(loadNextChunk, chunkDelay);
    });
  }, [positions, devices, visibleChunkSize, nonVisibleChunkSize, chunkDelay]);

  return { loadedPositions, isLoading, progress };
};
