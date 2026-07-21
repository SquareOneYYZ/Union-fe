import { useState, useCallback, useRef } from 'react';

const useUndoAction = () => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const timerRef = useRef(null);
  const undoCallbackRef = useRef(null);

  const executeWithUndo = useCallback((message, apiCall, revertUpdate) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    undoCallbackRef.current = revertUpdate;

    timerRef.current = setTimeout(() => {
      setSnackbarOpen(false);
      apiCall();
    }, 10000);
  }, []);

  const handleUndo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSnackbarOpen(false);
    if (undoCallbackRef.current) undoCallbackRef.current();
  }, []);

  return {
    executeWithUndo,
    handleUndo,
    snackbarOpen,
    snackbarMessage,
  };
};

export default useUndoAction;
