import {
  useEffect, useRef, useState, useCallback,
} from 'react';

const usePositionWorker = () => {
  const workerRef = useRef(null);
  const [features, setFeatures] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const callbackRef = useRef(null);
  const accumulatedFeatures = useRef([]);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return undefined;
    }

    workerRef.current = new Worker(
      new URL('./positionWorker.js', import.meta.url),
    );

    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === 'FEATURES_CHUNK') {
        const { features: chunkFeatures, progress: chunkProgress, stats: chunkStats, isFirstChunk } = payload;

        if (isFirstChunk) {
          accumulatedFeatures.current = [];
        }

        accumulatedFeatures.current.push(...chunkFeatures);

        setFeatures([...accumulatedFeatures.current]);
        setStats(chunkStats);
        setProgress(chunkProgress);
        setIsLoading(true);

        if (callbackRef.current) {
          callbackRef.current([...accumulatedFeatures.current]);
        }
      }

      if (type === 'PROCESSING_COMPLETE') {
        setStats(payload.stats);
        setProgress(100);
        setIsLoading(false);
      }

      if (type === 'FEATURES_READY') {
        setFeatures(payload.features);
        setStats(payload.stats);
        setProgress(100);
        setIsLoading(false);

        if (callbackRef.current) {
          callbackRef.current(payload.features);
        }
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const processPositions = useCallback((data, onComplete, skipProgressiveLoad = false) => {
    if (!workerRef.current) return;

    callbackRef.current = onComplete;

    if (!skipProgressiveLoad) {
      accumulatedFeatures.current = [];
      setProgress(0);
      setIsLoading(true);
    }

    workerRef.current.postMessage({
      type: 'PROCESS_POSITIONS',
      payload: { ...data, skipProgressiveLoad },
    });
  }, []);

  const clearCache = useCallback(() => {
    workerRef.current?.postMessage({ type: 'CLEAR_CACHE' });
  }, []);

  return {
    features,
    stats,
    isLoading,
    progress,
    processPositions,
    clearCache,
  };
};

export default usePositionWorker;