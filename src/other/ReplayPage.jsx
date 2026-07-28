import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  IconButton, Paper, Slider, Toolbar, Typography, Box, Chip,
  Tooltip,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
import { formatTime } from '../common/util/formatter';
import ReportFilter from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';

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
    marginTop: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(2),
      margin: theme.spacing(1.5),
    },
  },
}));

const ReplayPage = () => {
  const t = useTranslation();
  const classes = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const [expanded, setExpanded] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smoothPosition, setSmoothPosition] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [titleExpanded, setTitleExpanded] = useState(false);

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const device = state.devices.items[selectedDeviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setAnimationProgress((progress) => {
          const newProgress = progress + 0.02 * speed;
          if (newProgress >= 1) {
            setIndex((prevIndex) => {
              const nextIndex = prevIndex + 1;
              if (nextIndex >= positions.length - 1) {
                setPlaying(false);
                return nextIndex;
              }
              return nextIndex;
            });
            return 0;
          }

          return newProgress;
        });
      }, 16);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [playing, positions, speed]);

  useEffect(() => {
    if (positions.length > 0 && index < positions.length - 1) {
      const currentPos = positions[index];
      const nextPos = positions[index + 1];

      if (currentPos && nextPos) {
        const interpolatedPosition = {
          ...currentPos,
          latitude:
            currentPos.latitude
            + (nextPos.latitude - currentPos.latitude) * animationProgress,
          longitude:
            currentPos.longitude
            + (nextPos.longitude - currentPos.longitude) * animationProgress,
          speed:
            currentPos.speed
            + (nextPos.speed - currentPos.speed) * animationProgress,
          course:
            currentPos.course
            + (nextPos.course - currentPos.course) * animationProgress,
        };

        setSmoothPosition(interpolatedPosition);
      }
    } else if (positions.length > 0 && index < positions.length) {
      setSmoothPosition(positions[index]);
    }
  }, [positions, index, animationProgress]);

  const onPointClick = useCallback(
    (_, index) => {
      setIndex(index);
      setAnimationProgress(0);
      setPlaying(false);
    },
    [setIndex],
  );

  const onMarkerClick = useCallback(
    (positionId) => {
      setShowCard(!!positionId);
    },
    [setShowCard],
  );

  const handleSubmit = useCatch(async ({ deviceId, from, to }) => {
    setLoading(true);
    setSelectedDeviceId(deviceId);
    setFrom(from);
    setTo(to);
    const query = new URLSearchParams({ deviceId, from, to });
    try {
      const response = await fetch(`/api/positions?${query.toString()}`);
      if (response.ok) {
        setIndex(0);
        const positions = await response.json();
        setPositions(positions);
        if (positions.length) {
          setExpanded(false);
        } else {
          throw Error(t('sharedNoData'));
        }
      } else {
        throw Error(await response.text());
      }
    } finally {
      setLoading(false);
    }
  });

  const handleDownload = () => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  return (
    <div className={classes.root}>
      <MapView>
        <MapGeofence />
        <MapRoutePath
          positions={positions}
          onClick={onPointClick}
          expandPointsOnClick
        />
        <MapRoutePoints
          positions={positions}
          onClick={onPointClick}
          useGlobalExpansion
        />
        {smoothPosition && (
          <MapPositions
            positions={[smoothPosition]}
            onClick={onMarkerClick}
            titleField="fixTime"
          />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={positions} />
      <div className={`${classes.sidebar} ${titleExpanded ? 'expanded' : ''}`}>
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
            <IconButton
              edge="start"
              sx={{ mr: 2 }}
              onClick={() => navigate(-1)}
            >
              <ArrowBackIcon />
            </IconButton>
            <Tooltip
              title={`${t('reportReplay')}${deviceName ? ` - ${deviceName}` : ''}`}
              arrow
              placement="bottom"
            >
              <Typography
                variant="subtitle1"
                onClick={() => setTitleExpanded((prev) => !prev)}
                noWrap={!titleExpanded}
                sx={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: titleExpanded ? 'unset' : 'ellipsis',
                  whiteSpace: titleExpanded ? 'normal' : 'nowrap',
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

            {!expanded && (
              <>
                <IconButton onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => setExpanded(true)}>
                  <TuneIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </Paper>
        <Paper className={classes.content} square>
          {!expanded ? (
            <>
              <Box className={classes.speedControl}>
                <Box className={classes.speedChips}>
                  {SPEED_OPTIONS.map((speedOption) => (
                    <Chip
                      key={speedOption}
                      label={`${speedOption}x`}
                      onClick={() => setSpeed(speedOption)}
                      color={speed === speedOption ? 'primary' : 'default'}
                      variant={speed === speedOption ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ minWidth: 48 }}
                    />
                  ))}
                </Box>
              </Box>

              <Slider
                className={classes.slider}
                max={positions.length - 1}
                step={null}
                marks={positions.map((_, index) => ({ value: index }))}
                value={index}
                onChange={(_, newIndex) => {
                  setIndex(newIndex);
                  setAnimationProgress(0);
                  setPlaying(false);
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
              <div className={classes.controls}>
                {`${index + 1}/${positions.length}`}
                <IconButton
                  onClick={() => {
                    setIndex((index) => index - 1);
                    setAnimationProgress(0);
                    setPlaying(false);
                  }}
                  disabled={playing || index <= 0}
                >
                  <FastRewindIcon />
                </IconButton>
                <IconButton
                  onClick={() => setPlaying(!playing)}
                  disabled={index >= positions.length - 1}
                >
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton
                  onClick={() => {
                    setIndex((index) => index + 1);
                    setAnimationProgress(0);
                    setPlaying(false);
                  }}
                  disabled={playing || index >= positions.length - 1}
                >
                  <FastForwardIcon />
                </IconButton>
                {formatTime(positions[index].fixTime, 'seconds')}
              </div>
            </>
          ) : (
            <ReportFilter
              handleSubmit={handleSubmit}
              fullScreen
              showOnly
              loading={loading}
            />
          )}
        </Paper>
      </div>
      {showCard && index < positions.length && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={positions[index]}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayPage;
