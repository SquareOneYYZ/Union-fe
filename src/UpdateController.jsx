import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Snackbar, IconButton, Button, Box, Typography, LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSelector, useDispatch } from 'react-redux';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from './common/components/LocalizationProvider';
import { pendingSaveActions } from './store';

const UNDO_WINDOW_MS = 10000;

let pendingApiCall = null;
let pendingRevert = null;
let pendingBeaconData = null;

export const enqueueSave = (dispatch, message, apiCall, revert, beaconData) => {
  if (pendingApiCall) {
    pendingApiCall();
  }
  pendingApiCall = apiCall;
  pendingRevert = revert;
  pendingBeaconData = beaconData;
  dispatch(pendingSaveActions.show(message));
};

const UpdateController = () => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const swUpdateInterval = useSelector(
    (state) => state.session.server.attributes.serviceWorkerUpdateInterval || 3600000,
  );

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, swRegistration) {
      if (swUpdateInterval > 0 && swRegistration) {
        setInterval(async () => {
          if (!(!swRegistration.installing && navigator)) return;
          if (('connection' in navigator) && !navigator.onLine) return;
          const newSW = await fetch(swUrl, {
            cache: 'no-store',
            headers: { cache: 'no-store', 'cache-control': 'no-cache' },
          });
          if (newSW?.status === 200) await swRegistration.update();
        }, swUpdateInterval);
      }
    },
  });

useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (!pendingBeaconData) return;
    e.preventDefault();
    e.returnValue = '';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);

  const saveOpen = useSelector((state) => state.pendingSave.open);
  const saveMessage = useSelector((state) => state.pendingSave.message);

  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
  }, []);

  const fireApiCall = useCallback(() => {
    clearTimers();
    const call = pendingApiCall;
    pendingApiCall = null;
    pendingRevert = null;
    pendingBeaconData = null;
    dispatch(pendingSaveActions.hide());
    if (call) call();
  }, [clearTimers, dispatch]);

  useEffect(() => {
    if (!saveOpen) {
      clearTimers();
      return undefined;
    }

    setProgress(100);
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.max(0, 100 - (elapsed / UNDO_WINDOW_MS) * 100));
    }, 100);

    timerRef.current = setTimeout(fireApiCall, UNDO_WINDOW_MS);

    return () => clearTimers();
  }, [saveOpen, fireApiCall, clearTimers]);

  const handleOk = () => {
    fireApiCall();
  };

  const handleUndo = () => {
    clearTimers();
    const revert = pendingRevert;
    pendingApiCall = null;
    pendingRevert = null;
    pendingBeaconData = null;
    dispatch(pendingSaveActions.hide());
    if (revert) revert();
  };

  return (
    <>
      <Snackbar
        open={needRefresh}
        message={t('settingsUpdateAvailable')}
        action={(
          <IconButton color="inherit" onClick={() => updateServiceWorker(true)}>
            <RefreshIcon />
          </IconButton>
        )}
      />

      <Snackbar
        open={saveOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: 2,
          boxShadow: 6,
          minWidth: 340,
          overflow: 'hidden',
        }}
        >
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 4 }}
          />
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1.5,
            gap: 2,
          }}
          >
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {saveMessage}
            </Typography>
            <Button size="small" color="error" variant="outlined" onClick={handleUndo}>
              Undo
            </Button>
            <Button size="small" color="primary" variant="contained" onClick={handleOk}>
              OK
            </Button>
          </Box>
        </Box>
      </Snackbar>
    </>
  );
};

export default UpdateController;