import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '@mui/material';
import { devicesActions, sessionActions } from './store';
import { useEffectAsync } from './reactHelper';
import { useTranslation } from './common/components/LocalizationProvider';
import { snackBarDurationLongMs } from './common/util/duration';
import alarm from './resources/alarm.mp3';
import { eventsActions } from './store/events';
import useFeatures from './common/util/useFeatures';
import { useAttributePreference } from './common/util/preferences';

const logoutCode = 4000;
const BEEP_RATE_LIMIT_MS = 5000;

const SocketController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const authenticated = useSelector((state) => !!state.session.user);
  const devices = useSelector((state) => state.devices.items);
  const includeLogs = useSelector((state) => state.session.includeLogs);

  const socketRef = useRef();
  const reconnectAttempts = useRef(0);
  const audioRef = useRef(new Audio(alarm));
  const lastBeepRef = useRef(0);

  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const soundEvents = useAttributePreference('soundEvents', '');
  const soundAlarms = useAttributePreference('soundAlarms', 'sos');

  const features = useFeatures();

  const connectSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(sessionActions.updateSocket(true));
      reconnectAttempts.current = 0;
    };

    socket.onclose = async (event) => {
      dispatch(sessionActions.updateSocket(false));
      if (event.code !== logoutCode) {
        try {
          const devicesResponse = await fetch('/api/devices');
          if (devicesResponse.ok) {
            dispatch(devicesActions.update(await devicesResponse.json()));
          }
          const positionsResponse = await fetch('/api/positions');
          if (positionsResponse.ok) {
            dispatch(sessionActions.updatePositions(await positionsResponse.json()));
          }
          if (devicesResponse.status === 401 || positionsResponse.status === 401) {
            navigate('/login');
          }
        } catch (error) {
          // ignore errors
        }

        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current += 1;
        setTimeout(() => connectSocket(), delay);
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.devices) {
        dispatch(devicesActions.update(data.devices));
      }
      if (data.positions) {
        dispatch(sessionActions.updatePositions(data.positions));
      }
      if (data.events) {
        if (!features.disableEvents) {
          dispatch(eventsActions.add(data.events));
        }
        setEvents((prev) => [...prev, ...data.events]);
      }
      if (data.logs) {
        dispatch(sessionActions.updateLogs(data.logs));
      }
    };
  };

  useEffect(() => {
    socketRef.current?.send(JSON.stringify({ logs: includeLogs }));
  }, [socketRef, includeLogs]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetch('/api/devices');
      if (response.ok) {
        dispatch(devicesActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
      connectSocket();
      return () => {
        const socket = socketRef.current;
        if (socket) {
          socket.close(logoutCode);
        }
      };
    }
    return null;
  }, [authenticated]);

  useEffect(() => {
    const handleOnline = () => {
      if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
        reconnectAttempts.current = 0;
        connectSocket();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
          reconnectAttempts.current = 0;
          connectSocket();
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    setNotifications(events.map((event) => ({
      id: event.id,
      message: event.attributes.message,
      show: true,
    })));
  }, [events]);

  useEffect(() => {
    const shouldBeep = events.some((event) => (
      soundEvents.includes(event.type)
      || (event.type === 'alarm' && soundAlarms.includes(event.attributes.alarm))
    ));
    if (shouldBeep) {
      const now = Date.now();
      if (now - lastBeepRef.current > BEEP_RATE_LIMIT_MS) {
        audioRef.current.play();
        lastBeepRef.current = now;
      }
    }
  }, [events, soundEvents, soundAlarms]);

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.show}
          message={notification.message}
          autoHideDuration={snackBarDurationLongMs}
          onClose={() => setEvents((prev) => prev.filter((e) => e.id !== notification.id))}
        />
      ))}
    </>
  );
};

export default connect()(SocketController);