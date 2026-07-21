import React, {
  useCallback, useState, useRef, useEffect,
} from 'react';
import {
  Typography,
  AppBar,
  Toolbar,
  Tooltip,
  IconButton,
  Paper,
  Slider,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffectAsync, useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import MapView from '../map/core/MapView';
import MapCamera from '../map/MapCamera';
import MapPositions from '../map/MapPositions';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import { formatNotificationTitle, formatTime } from '../common/util/formatter';
import MapScale from '../map/MapScale';
import ReplayControl from '../reports/components/ReplayControl';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  toolbar: {
    zIndex: 1,
  },
  mapContainer: {
    flexGrow: 1,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    margin: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
    },
  },
  title: {
    flexGrow: 1,
  },
  slider: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formControlLabel: {
    height: '100%',
    width: '100%',
    paddingRight: theme.spacing(1),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      margin: theme.spacing(1),
    },
    [theme.breakpoints.up('md')]: {
      marginTop: theme.spacing(1),
    },
  },
}));

const EventPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();
  const { id } = useParams();

  const [event, setEvent] = useState();
  const [position, setPosition] = useState();
  const [showCard, setShowCard] = useState(false);

  const [replayMode, setReplayMode] = useState(false);
  const [replayPositions, setReplayPositions] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [eventPosition, setEventPosition] = useState(null);
  const [device, setDevice] = useState(null);
  const timerRef = useRef();

  const formatType = (event) => formatNotificationTitle(t, {
    type: event.type,
    attributes: {
      alarms: event.attributes.alarm,
    },
  });

  const onMarkerClick = useCallback((positionId) => {
    setShowCard(!!positionId);
  }, []);

  useEffect(() => {
    if (replayPlaying && replayPositions.length > 0) {
      timerRef.current = setInterval(() => {
        setReplayIndex((i) => i + 1);
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [replayPlaying, replayPositions]);

  useEffect(() => {
    if (replayIndex >= replayPositions.length - 1) {
      clearInterval(timerRef.current);
      setReplayPlaying(false);
    }
  }, [replayIndex, replayPositions]);

  useEffectAsync(async () => {
    if (id) {
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        setEvent(await response.json());
      } else {
        throw Error(await response.text());
      }
    }
  }, [id]);

  useEffectAsync(async () => {
    if (event && event.positionId) {
      const response = await fetch(`/api/positions?id=${event.positionId}`);
      if (response.ok) {
        const positions = await response.json();
        if (positions.length > 0) {
          setPosition(positions[0]);
        }
      } else {
        throw Error(await response.text());
      }
    }
  }, [event]);

  useEffectAsync(async () => {
    if (event && event.deviceId) {
      const response = await fetch(`/api/devices?id=${event.deviceId}`);
      if (response.ok) {
        const devices = await response.json();
        if (devices.length > 0) {
          setDevice(devices[0]);
        }
      }
    }
  }, [event]);

  const findClosestPositionIndex = (positions, eventTime) => {
    if (!positions || positions.length === 0) return 0;
    const eventTimestamp = new Date(eventTime).getTime();
    let closestIndex = 0;
    let minDiff = Math.abs(
      new Date(positions[0].fixTime).getTime() - eventTimestamp,
    );
    for (let i = 1; i < positions.length; i += 1) {
      const diff = Math.abs(
        new Date(positions[i].fixTime).getTime() - eventTimestamp,
      );
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const handleReplayStart = useCatch(async () => {
    if (!event) return;

    setReplayMode(true);

    const eventTime = new Date(event.eventTime);
    const fromTime = new Date(eventTime.getTime() - 60 * 60 * 1000);
    const toTime = new Date(eventTime.getTime() + 60 * 60 * 1000);

    const query = new URLSearchParams({
      deviceId: event.deviceId,
      from: fromTime.toISOString(),
      to: toTime.toISOString(),
    });

    const response = await fetch(`/api/positions?${query.toString()}`);
    if (response.ok) {
      const positions = await response.json();
      setReplayPositions(positions);

      const eventIndex = findClosestPositionIndex(positions, event.eventTime);
      setReplayIndex(eventIndex);

      const eventPosRes = await fetch(`/api/positions?id=${event.positionId}`);
      if (eventPosRes.ok) {
        const eventPositions = await eventPosRes.json();
        if (eventPositions.length > 0) {
          setEventPosition(eventPositions[0]);
        }
      }
    }
  });

  const handleReplayStop = () => {
    setReplayMode(false);
    setReplayPositions([]);
    setReplayIndex(0);
    setReplayPlaying(false);
    setEventPosition(null);
    clearInterval(timerRef.current);
  };

  const onPointClick = useCallback((_, index) => {
    setReplayIndex(index);
  }, []);

  if (replayMode) {
    return (
      <ReplayControl
        replayPositions={replayPositions}
        deviceName={device ? device.name : ''}
        selectedItem={{ deviceId: event.deviceId, type: event.type }}
        eventPosition={eventPosition}
        onClose={handleReplayStop}
        showEventType
        initialSpeed={1}
      />
    );
  }

  return (
    <div className={classes.root}>
      <AppBar color="inherit" position="static" className={classes.toolbar}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 2 }}
            onClick={() => navigate('/')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">
            {event && formatType(event)}
            {device && ` - ${device.name}`}
          </Typography>
          {event && (
            <Tooltip title="Start replay">
              <IconButton onClick={handleReplayStart}>
                <ReplayIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      <div className={classes.mapContainer}>
        <MapView>
          <MapGeofence />
          {position && (
            <MapPositions
              positions={[position]}
              onClick={onMarkerClick}
              titleField="fixTime"
              customIcon="event-error"
            />
          )}
        </MapView>
        <MapScale />
        {position && (
          <MapCamera
            latitude={position.latitude}
            longitude={position.longitude}
          />
        )}
        {position && showCard && (
          <StatusCard
            deviceId={position.deviceId}
            position={position}
            onClose={() => setShowCard(false)}
            disableActions
          />
        )}
      </div>
    </div>
  );
};

export default EventPage;
