import React, {
  useEffect, useRef, useCallback, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '@mui/material';
import { devicesActions, sessionActions } from './store';
import { useEffectAsync } from './reactHelper';
import { snackBarDurationLongMs } from './common/util/duration';
import alarm from './resources/alarm.mp3';
import { eventsActions } from './store/events';
import useFeatures from './common/util/useFeatures';
import { useAttributePreference } from './common/util/preferences';

const logoutCode = 4000;
const alarmAudio = new Audio(alarm);

const SocketController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const authenticated = useSelector((state) => !!state.session.user);
  const includeLogs = useSelector((state) => state.session.includeLogs);

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  const soundEvents = useAttributePreference('soundEvents', '');
  const soundAlarms = useAttributePreference('soundAlarms', 'sos');

  const features = useFeatures();

  const closeSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close(logoutCode);
      socketRef.current = null;
    }
  }, []);

  const connectSocket = useCallback(() => {
    closeSocket();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(sessionActions.updateSocket(true));
      socket.send(JSON.stringify({ logs: includeLogs }));
    };

    socket.onclose = async (event) => {
      dispatch(sessionActions.updateSocket(false));
      if (event.code !== logoutCode) {
        try {
          const [devicesResponse, positionsResponse] = await Promise.all([
            fetch('/api/devices'),
            fetch('/api/positions'),
          ]);
          if (devicesResponse.ok) {
            dispatch(devicesActions.update(await devicesResponse.json()));
          }
          if (positionsResponse.ok) {
            dispatch(sessionActions.updatePositions(await positionsResponse.json()));
          }
          if (devicesResponse.status === 401 || positionsResponse.status === 401) {
            navigate('/login');
            return;
          }
        } catch (error) {
          // ignore fetch errors during reconnect
        }
        reconnectTimerRef.current = setTimeout(() => connectSocket(), 60000);
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
        const newNotifications = [];
        data.events.forEach((e) => {
          newNotifications.push({ id: e.id, message: e.attributes.message, show: true });
          if (
            soundEvents.includes(e.type)
            || (e.type === 'alarm' && soundAlarms.includes(e.attributes.alarm))
          ) {
            alarmAudio.currentTime = 0;
            alarmAudio.play();
          }
        });
        setNotifications(newNotifications);
      }
      if (data.logs) {
        dispatch(sessionActions.updateLogs(data.logs));
      }
    };
  }, [dispatch, navigate, features, soundEvents, soundAlarms, includeLogs, closeSocket]);

  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ logs: includeLogs }));
    }
  }, [includeLogs]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const socket = socketRef.current;
        if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
          connectSocket();
        }
      }
    };
    const handleOnline = () => connectSocket();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [connectSocket]);

  useEffectAsync(async () => {
    if (authenticated) {
      const [devicesResponse, positionsResponse] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/positions'),
      ]);

      if (devicesResponse.ok) {
        dispatch(devicesActions.refresh(await devicesResponse.json()));
      } else {
        throw Error(await devicesResponse.text());
      }

      if (positionsResponse.ok) {
        dispatch(sessionActions.updatePositions(await positionsResponse.json()));
      }

      connectSocket();
      return () => closeSocket();
    }
    return null;
  }, [authenticated]);

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.show}
          message={notification.message}
          autoHideDuration={snackBarDurationLongMs}
          onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
        />
      ))}
    </>
  );
};

export default SocketController;
