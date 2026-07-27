import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  Paper,
  Toolbar,
  Typography,
  IconButton,
  Slider,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import DownloadIcon from '@mui/icons-material/Download';
import { formatTime } from '../../common/util/formatter';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { prefixString } from '../../common/util/stringUtils';
import MapView from '../../map/core/MapView';
import MapGeofence from '../../map/MapGeofence';
import MapRoutePath from '../../map/MapRoutePath';
import MapRoutePoints from '../../map/MapRoutePoints';
import MapPositions from '../../map/MapPositions';
import MapCamera from '../../map/MapCamera';
import MapScale from '../../map/MapScale';
import StatusCard from '../../common/components/StatusCard';

const SPEED_OPTIONS = [1, 1.5, 2, 5, 10];

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
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
    maxWidth: '90vw',
    transition: 'width 0.3s ease',

    '&.expanded': {
      width: 600,
    },

    [theme.breakpoints.down('md')]: {
      width: 'calc(100% - 16px)',
      maxWidth: 'calc(100% - 16px)',
      margin: theme.spacing(1),
      left: 0,
      right: 0,
    },

    [theme.breakpoints.down('sm')]: {
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      left: 0,
      right: 0,
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
  speedControl: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  speedChips: {
    display: 'flex',
    gap: theme.spacing(0.75),
    flexWrap: 'wrap',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(2),
      margin: theme.spacing(1.5),
    },
  },
}));

const interpolatePosition = (pos1, pos2, progress) => ({
  ...pos2,
  latitude: pos1.latitude + (pos2.latitude - pos1.latitude) * progress,
  longitude: pos1.longitude + (pos2.longitude - pos1.longitude) * progress,
  course: pos1.course !== undefined && pos2.course !== undefined
    ? pos1.course + (pos2.course - pos1.course) * progress
    : pos2.course,
});

const ReplayControl = ({
  replayPositions,
  selectedItem,
  deviceName,
  eventPosition,
  onClose,
  showEventType = false,
  initialSpeed = 1,
}) => {
  const t = useTranslation();
  const classes = useStyles();
  const timerRef = useRef();
  const animationRef = useRef();

  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const [interpolatedPosition, setInterpolatedPosition] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const getInterval = () => 500 / speed;

  useEffect(() => {
    if (replayPositions.length > 0) {
      setInterpolatedPosition(replayPositions[0]);
    }
  }, [replayPositions]);

  useEffect(() => {
    if (replayPlaying && replayPositions.length > 0) {
      timerRef.current = setInterval(() => {
        setReplayIndex((index) => {
          const nextIndex = index + 1;
          if (nextIndex >= replayPositions.length - 1) {
            setReplayPlaying(false);
            return nextIndex;
          }
          return nextIndex;
        });
      }, getInterval());
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [replayPlaying, replayPositions, speed]);

  useEffect(() => {
    if (!replayPlaying || replayPositions.length === 0 || replayIndex >= replayPositions.length - 1) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (replayIndex < replayPositions.length) {
        setInterpolatedPosition(replayPositions[replayIndex]);
      }
      return;
    }

    let startTime = null;
    const duration = getInterval();

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (replayIndex < replayPositions.length - 1) {
        const currentPos = replayPositions[replayIndex];
        const nextPos = replayPositions[replayIndex + 1];
        const interpolated = interpolatePosition(currentPos, nextPos, progress);
        setInterpolatedPosition(interpolated);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [replayPlaying, replayIndex, replayPositions, speed]);

  useEffect(() => {
    if (!replayPlaying && replayPositions.length > 0 && replayIndex < replayPositions.length) {
      setInterpolatedPosition(replayPositions[replayIndex]);
    }
  }, [replayIndex, replayPlaying, replayPositions]);

  const onMarkerClick = useCallback(
    (positionId) => {
      setShowCard(!!positionId);
    },
    [setShowCard],
  );

  const onPointClick = useCallback((_, index) => {
    setReplayIndex(index);
    setReplayPlaying(false);
  }, []);

  const handleClose = () => {
    clearInterval(timerRef.current);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onClose();
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  const handleDownload = () => {
    if (!selectedItem) return;
    const query = new URLSearchParams({
      deviceId: selectedItem.deviceId,
      from: replayPositions[0]?.fixTime,
      to: replayPositions[replayPositions.length - 1]?.fixTime,
    });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  return (
    <div className={classes.root}>
      <MapView>
        <MapGeofence />
        <MapRoutePath positions={replayPositions} />
        <MapRoutePoints positions={replayPositions} onClick={onPointClick} />
        {eventPosition && (
          <MapPositions
            positions={[eventPosition]}
            onClick={onMarkerClick}
            titleField="tollName"
            customIcon="event-error"
          />
        )}
        {interpolatedPosition && (
          <MapPositions
            positions={[interpolatedPosition]}
            onClick={onMarkerClick}
          />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={replayPositions} />

      {/* Sidebar */}
      <div
        className={`${classes.sidebar} ${expanded ? 'expanded' : ''}`}
      >
        <Paper elevation={3} square>
          <Toolbar
            sx={{
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'unset',
              paddingTop: 1,
              paddingBottom: 1,
            }}
          >
            <IconButton edge="start" sx={{ mr: 2 }} onClick={handleClose}>
              <ArrowBackIcon />
            </IconButton>
            <Tooltip
              title={`${t('reportReplay')}${deviceName ? ` - ${deviceName}` : ''}`}
              arrow
              placement="bottom"
            >
              <Typography
                variant="subtitle1"
                onClick={() => setExpanded((prev) => !prev)}
                noWrap={!expanded}
                sx={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: expanded ? 'unset' : 'ellipsis',
                  whiteSpace: expanded ? 'normal' : 'nowrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  flexGrow: 1,
                }}
              >
                {t('reportReplay')}
                {deviceName ? ` - ${deviceName}` : ''}
              </Typography>
            </Tooltip>
            <IconButton onClick={handleDownload} disabled={replayPositions.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Toolbar>
        </Paper>

        <Paper className={classes.content} square>
          {/* Speed Control */}
          <Typography
            variant="subtitle1"
            align="center"
            noWrap
            sx={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className={classes.title}
          >
            {showEventType && selectedItem?.type
              ? t(prefixString('event', selectedItem.type))
              : t('reportReplay')}
          </Typography>
          <Box className={classes.speedControl}>
            <Box className={classes.speedChips}>
              {SPEED_OPTIONS.map((speedOption) => (
                <Chip
                  key={speedOption}
                  label={`${speedOption}x`}
                  onClick={() => handleSpeedChange(speedOption)}
                  color={speed === speedOption ? 'primary' : 'default'}
                  variant={speed === speedOption ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ minWidth: 48 }}
                />
              ))}
            </Box>
          </Box>

          {/* Slider */}
          <Slider
            className={classes.slider}
            max={replayPositions.length - 1}
            step={null}
            marks={replayPositions.map((_, index) => ({ value: index }))}
            value={replayIndex}
            onChange={(_, newIndex) => {
              setReplayIndex(newIndex);
              setReplayPlaying(false);
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: -10,
              marginBottom: 8,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              -1hr
            </Typography>
            <Typography variant="caption" color="text.secondary">
              +1hr
            </Typography>
          </div>

          {/* Controls */}
          <div className={classes.controls}>
            <span>{`${replayIndex + 1}/${replayPositions.length}`}</span>
            <IconButton
              onClick={() => {
                setReplayIndex((index) => index - 1);
                setReplayPlaying(false);
              }}
              disabled={replayPlaying || replayIndex <= 0}
            >
              <FastRewindIcon />
            </IconButton>
            <IconButton
              onClick={() => setReplayPlaying(!replayPlaying)}
              disabled={replayIndex >= replayPositions.length - 1}
            >
              {replayPlaying ? <PauseIcon /> : <PlayArrowIcon />}

              <FastForwardIcon />
            </IconButton>
            <span>
              {replayIndex < replayPositions.length
                ? formatTime(replayPositions[replayIndex].fixTime, 'seconds')
                : ''}
            </span>
          </div>
        </Paper>
      </div>

      {/* Status Card */}
      {showCard && replayIndex < replayPositions.length && (
        <StatusCard
          deviceId={selectedItem?.deviceId}
          position={replayPositions[replayIndex]}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayControl;
