import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import {
  IconButton, Paper, Slider, Toolbar, Typography, Box, Chip,
  Tooltip,
  useTheme,
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
    position: 'relative',
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
  speedStrip: {
    position: 'fixed',
    bottom: 8,
    left: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 0,
    background: theme.palette.background.paper,
    border: `0.5px solid ${theme.palette.divider}`,
    padding: '5px 8px 4px',
    opacity: 0.93,

    [theme.breakpoints.down('sm')]: {
      bottom: 56,
      left: 10,
      right: 10,
      borderRadius: 0,
    },

    [theme.breakpoints.down('md')]: {
      bottom: 65,
      left: 10,
      right: 10,
    },
  },
  speedStripValue: {
    fontWeight: 500,
    color: theme.palette.warning.dark,
  },
  chartWrapper: {
    position: 'relative',
    width: '100%',
    height: 48,
  },
  playheadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
}));

const ReplayPage = () => {
  const t = useTranslation();
  const classes = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);
  const theme = useTheme();

  const speedGradientStops = {
    high: theme.palette.error.main,
    medium: theme.palette.warning.main,
    low: theme.palette.success.main,
  };

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

  const chartData = useMemo(() => positions.map((pos, i) => ({
    index: i,
    speed: +(pos.speed ?? 0).toFixed(2),
    hasEvent: !!pos.attributes?.alarm,
  })), [positions]);

  // This computes the exact 0–100% position of the playhead across the chart width
  const playheadPercent = useMemo(() => {
    if (!positions.length) return 0;
    const exact = index + animationProgress;
    return (exact / (positions.length - 1)) * 100;
  }, [index, animationProgress, positions.length]);

  const onClick = useCallback((data) => {
    if (data?.activePayload?.[0]) {
      setIndex(data.activePayload[0].payload.index);
      setAnimationProgress(0);
      setPlaying(false);
    }
  }, []);

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
          latitude: currentPos.latitude + (nextPos.latitude - currentPos.latitude) * animationProgress,
          longitude: currentPos.longitude + (nextPos.longitude - currentPos.longitude) * animationProgress,
          speed: currentPos.speed + (nextPos.speed - currentPos.speed) * animationProgress,
          course: currentPos.course + (nextPos.course - currentPos.course) * animationProgress,
        };
        setSmoothPosition(interpolatedPosition);
      }
    } else if (positions.length > 0 && index < positions.length) {
      setSmoothPosition(positions[index]);
    }
  }, [positions, index, animationProgress]);

  useEffect(() => {
    const STRIP_HEIGHT = 82; // match actual height of your strip
    const styleId = 'replay-controls-offset';

    if (!expanded && positions.length > 0) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
      .maplibregl-ctrl-bottom-left {
        bottom: ${STRIP_HEIGHT}px !important;
        transition: bottom 0.2s ease;
      }
    `;
      document.head.appendChild(style);
    }

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [expanded, positions.length]);

  const onPointClick = useCallback((_, i) => {
    setIndex(i);
    setAnimationProgress(0);
    setPlaying(false);
  }, []);

  const onMarkerClick = useCallback((positionId) => {
    setShowCard(!!positionId);
  }, []);

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
        const data = await response.json();
        setPositions(data);
        if (data.length) {
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
        <MapRoutePath positions={positions} onClick={onPointClick} expandPointsOnClick />
        <MapRoutePoints positions={positions} onClick={onPointClick} useGlobalExpansion />
        {smoothPosition && (
          <MapPositions positions={[smoothPosition]} onClick={onMarkerClick} titleField="fixTime" />
        )}
      </MapView>
      <MapScale />

      {!expanded && positions.length > 0 && (
        <Box className={classes.speedStrip}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Speed</Typography>
            <Typography variant="caption" className={classes.speedStripValue}>
              {smoothPosition ? `${Math.round(smoothPosition.speed)} km/h` : '—'}
            </Typography>
          </Box>

          <div className={classes.chartWrapper}>
            <ResponsiveContainer width="100%" height={48}>
              <ComposedChart
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                onClick={onClick}
              >
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={speedGradientStops.high} stopOpacity={0.9} />
                    <stop offset="40%" stopColor={speedGradientStops.medium} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={speedGradientStops.low} stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="speed"
                  fill="url(#speedGrad)"
                  stroke={theme.palette.divider}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                  baseValue={0}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* SVG playhead drawn directly — not through Recharts */}
            <svg
              className={classes.playheadOverlay}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
              <line
                x1={`${playheadPercent}%`}
                y1="0%"
                x2={`${playheadPercent}%`}
                y2="100%"
                stroke={theme.palette.primary.light}
                strokeWidth={3}
              />
            </svg>
          </div>
        </Box>
      )}

      <MapCamera positions={positions} />
      <div className={`${classes.sidebar} ${titleExpanded ? 'expanded' : ''}`}>
        <Paper elevation={3} square>
          <Toolbar sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 'unset', paddingTop: 1, paddingBottom: 1 }}>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
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
                <IconButton onClick={handleDownload}><DownloadIcon /></IconButton>
                <IconButton edge="end" onClick={() => setExpanded(true)}><TuneIcon /></IconButton>
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
                marks={positions.map((_, i) => ({ value: i }))}
                value={index}
                onChange={(_, newIndex) => {
                  setIndex(newIndex);
                  setAnimationProgress(0);
                  setPlaying(false);
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -10, marginBottom: 8 }}>
                <Typography variant="caption" color="text.secondary">-1hr</Typography>
                <Typography variant="caption" color="text.secondary">+1hr</Typography>
              </div>
              <div className={classes.controls}>
                {`${index + 1}/${positions.length}`}
                <IconButton onClick={() => { setIndex((i) => i - 1); setAnimationProgress(0); setPlaying(false); }} disabled={playing || index <= 0}>
                  <FastRewindIcon />
                </IconButton>
                <IconButton onClick={() => setPlaying(!playing)} disabled={index >= positions.length - 1}>
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton onClick={() => { setIndex((i) => i + 1); setAnimationProgress(0); setPlaying(false); }} disabled={playing || index >= positions.length - 1}>
                  <FastForwardIcon />
                </IconButton>
                {formatTime(positions[index].fixTime, 'seconds')}
              </div>
            </>
          ) : (
            <ReportFilter handleSubmit={handleSubmit} fullScreen showOnly loading={loading} />
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
