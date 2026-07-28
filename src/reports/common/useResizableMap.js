import {
  useState, useRef, useCallback, useEffect,
} from 'react';

const useResizableMap = (initialHeight = 60, min = 20, max = 80) => {
  const [mapHeight, setMapHeight] = useState(initialHeight);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    if (newHeight >= min && newHeight <= max) {
      setMapHeight(newHeight);
    }
  }, [min, max]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return { containerRef, mapHeight, handleMouseDown, setMapHeight };
};

export default useResizableMap;
