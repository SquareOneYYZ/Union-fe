import { useState, useEffect, useRef } from 'react';

/**
 * Hook to progressively load large datasets in chunks
 * @param {Array} data - Full dataset to load
 * @param {number} chunkSize - Items per chunk (default: 200)
 * @param {number} chunkDelay - Delay between chunks in ms (default: 16ms ~= 60fps)
 */

const useProgressiveLoad = (data, chunkSize = 200, chunkDelay = 16) => {
  const [loadedData, setLoadedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (loadingRef.current) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      loadingRef.current = false;
    }

    if (!data || data.length === 0) {
      setLoadedData([]);
      setProgress(0);
      setIsLoading(false);
      return undefined;
    }

    if (data.length <= chunkSize) {
      setLoadedData(data);
      setProgress(100);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    loadingRef.current = true;

    let currentIndex = 0;

    const loadNextChunk = () => {
      if (!loadingRef.current) return undefined;

      const chunk = data.slice(currentIndex, currentIndex + chunkSize);
      currentIndex += chunkSize;

      setLoadedData((prev) => [...prev, ...chunk]);

      const progressPercent = Math.min(
        100,
        Math.round((currentIndex / data.length) * 100),
      );

      setProgress(progressPercent);

      if (currentIndex < data.length) {
        timeoutRef.current = setTimeout(loadNextChunk, chunkDelay);
      } else {
        setIsLoading(false);
        loadingRef.current = false;
      }

      return undefined;
    };

    setLoadedData([]);
    setProgress(0);
    loadNextChunk();

    return () => {
      loadingRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, chunkSize, chunkDelay]);

  return { loadedData, isLoading, progress };
};

export default useProgressiveLoad;
