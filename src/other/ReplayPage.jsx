import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  IconButton, Paper, Slider, Toolbar, Typography, Box, Chip,
  Tooltip, CircularProgress, LinearProgress,
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
import useReplaySession from '../reports/components/useChunkedReplay';

const SPEED_OPTIONS = [1, 1.5, 2, 5, 10];
const PLAY_TICK_MS = 300;

const useStyles = makeStyles((theme) => ({
  root: { height: '100%' },
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
    '&.expanded': { width: 600 },
    [theme.breakpoints.down('md')]: {
      width: 'calc(100% - 16px)',
      maxWidth: 'calc(100% - 16px)',
      margin: theme.spacing(1),
    },
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      maxWidth: '100%',
      margin: 0,
    },
  },
  title: { flexGrow: 1 },
  slider: { width: '100%' },
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
    justifyContent: 'center',
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
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.75),
    color: theme.palette.text.secondary,
    minHeight: 32,
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: 0.5,
  },
}));

const ReplayPage = () => {
  const t = useTranslation();
  const classes = useStyles();
  const navigate = useNavigate();
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const {
    positions,
    overviewPositions,
    totalCount,
    windowStart,
    isBuffering,
    loadingSession,
    loadingOverview,
    error,
    isLongRangeMode,
    init,
    sliderSeek,
    checkAndPrefetch,
    getStoredSession,
  } = useReplaySession();

  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const [expanded, setExpanded] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [smoothPosition, setSmoothPosition] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [titleExpanded, setTitleExpanded] = useState(false);

  const indexRef = useRef(0);
  const positionsRef = useRef([]);
  const speedRef = useRef(1);
  const windowStartRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { windowStartRef.current = windowStart; }, [windowStart]);

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const d = state.devices.items[selectedDeviceId];
      if (d) return d.name;
    }
    return null;
  });

  useEffect(() => {
    getStoredSession();
  }, []);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setAnimProgress((prev) => {
        const intervalMs = PLAY_TICK_MS / speedRef.current;
        const next = prev + (16 / intervalMs);
        if (next < 1) return next;

        const pos = positionsRef.current;
        const curIdx = indexRef.current;
        const nextIdx = curIdx + 1;

        if (isLongRangeMode) {
          const shouldPause = checkAndPrefetch(nextIdx, () => {
            setPlaying(true);
          });
          if (shouldPause) {
            setPlaying(false);
            return 0;
          }
          const nextLocal = nextIdx - windowStartRef.current;
          if (nextLocal >= pos.length) {
            setPlaying(false);
            return 0;
          }
        } else if (nextIdx >= pos.length) {
          setPlaying(false);
          return 0;
        }

        setIndex(nextIdx);
        indexRef.current = nextIdx;
        return 0;
      });
    }, 16);
  }, [playing]);

  useEffect(() => {
    if (positions.length === 0) return;
    const localIndex = isLongRangeMode ? index - windowStart : index;
    const clamped = Math.min(Math.max(localIndex, 0), positions.length - 1);
    const cur = positions[clamped];
    const nxt = positions[clamped + 1];
    if (cur && nxt) {
      setSmoothPosition({
        ...cur,
        latitude: cur.latitude + (nxt.latitude - cur.latitude) * animProgress,
        longitude: cur.longitude + (nxt.longitude - cur.longitude) * animProgress,
        speed: cur.speed + (nxt.speed - cur.speed) * animProgress,
        course: cur.course + (nxt.course - cur.course) * animProgress,
      });
    } else if (cur) {
      setSmoothPosition(cur);
    }
  }, [positions, index, animProgress, isLongRangeMode, windowStart]);

  const handleSubmit = useCatch(async ({ deviceId, from: f, to: t2 }) => {
    setSelectedDeviceId(deviceId);
    setFrom(f);
    setTo(t2);
    setIndex(0);
    indexRef.current = 0;
    setPlaying(false);
    setSmoothPosition(null);
    setAnimProgress(0);

    const ok = await init(deviceId, f, t2);
    if (ok) setExpanded(false);
  });

  const handleSliderChange = useCallback(async (_, sliderValue) => {
    setPlaying(false);
    setAnimProgress(0);

    if (isLongRangeMode) {
      await sliderSeek(sliderValue);
    }
    setIndex(sliderValue);
    indexRef.current = sliderValue;
  }, [isLongRangeMode, sliderSeek]);

  const onPointClick = useCallback((_, idx) => {
    setIndex(idx);
    indexRef.current = idx;
    setAnimProgress(0);
    setPlaying(false);
  }, []);

  const onMarkerClick = useCallback((positionId) => {
    setShowCard(!!positionId);
  }, []);

  const handlePlayPause = () => {
    setPlaying((p) => !p);
  };

  const handleDownload = () => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  const handleStepBack = () => {
    const ni = Math.max(0, index - 1);
    setIndex(ni);
    indexRef.current = ni;
    setAnimProgress(0);
    setPlaying(false);
  };

  const handleStepForward = () => {
    const maxGlobal = isLongRangeMode ? totalCount - 1 : positions.length - 1;
    const ni = Math.min(maxGlobal, index + 1);
    setIndex(ni);
    indexRef.current = ni;
    setAnimProgress(0);
    setPlaying(false);
  };

  const displayIndex = isLongRangeMode
    ? Math.min(index, Math.max(0, totalCount - 1))
    : Math.min(index, Math.max(0, positions.length - 1));
  const localDisplayIndex = isLongRangeMode
    ? Math.min(Math.max(displayIndex - windowStart, 0), Math.max(0, positions.length - 1))
    : displayIndex;
  const currentPos = positions[localDisplayIndex];
  const knownTotal = totalCount > 0 ? totalCount : positions.length;
  const sliderMax = isLongRangeMode
    ? Math.max(totalCount - 1, 0)
    : Math.max(positions.length - 1, 0);
  const routePositions = isLongRangeMode && overviewPositions.length > 0 ? overviewPositions : positions;
  const loadingAny = loadingSession || loadingOverview;
  const atStart = displayIndex <= 0;
  const atEnd = isLongRangeMode ? displayIndex >= totalCount - 1 : displayIndex >= positions.length - 1;

  return (
    <div className={classes.root}>
      <MapView>
        <MapGeofence />
        <MapRoutePath positions={routePositions} onClick={onPointClick} expandPointsOnClick />
        {!isLongRangeMode && (
          <MapRoutePoints positions={positions} onClick={onPointClick} useGlobalExpansion />
        )}
        {smoothPosition && (
          <MapPositions positions={[smoothPosition]} onClick={onMarkerClick} titleField="fixTime" />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={routePositions} />

      <div className={`${classes.sidebar} ${titleExpanded ? 'expanded' : ''}`}>
        <Paper elevation={3} square>
          <Toolbar sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 'unset', pt: 1, pb: 1 }}>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Tooltip title={`${t('reportReplay')}${deviceName ? ` - ${deviceName}` : ''}`} arrow placement="bottom">
              <Typography
                variant="subtitle1"
                onClick={() => setTitleExpanded((p) => !p)}
                noWrap={!titleExpanded}
                sx={{
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
          {loadingAny && <LinearProgress sx={{ height: 2 }} />}
        </Paper>

        <Paper className={classes.content} square>
          {!expanded ? (
            <>
              {error && (
                <Typography variant="caption" color="error" align="center" sx={{ mb: 1, display: 'block' }}>
                  {error}
                </Typography>
              )}

              <Box className={classes.speedControl}>
                <Box className={classes.speedChips}>
                  {SPEED_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={`${opt}x`}
                      onClick={() => { setSpeed(opt); speedRef.current = opt; }}
                      color={speed === opt ? 'primary' : 'default'}
                      variant={speed === opt ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ minWidth: 46 }}
                    />
                  ))}
                </Box>
              </Box>

              <Slider
                className={classes.slider}
                max={sliderMax}
                step={1}
                marks={!isLongRangeMode && positions.length < 500
                  ? positions.map((_, i) => ({ value: i }))
                  : false}
                value={displayIndex}
                onChange={handleSliderChange}
                disabled={loadingAny || positions.length === 0}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -8, marginBottom: 8 }}>
                <Typography variant="caption" color="text.secondary">
                  {positions[0] ? formatTime(positions[0].fixTime, 'seconds') : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`${positions.length}${totalCount > positions.length ? `/${totalCount}` : ''} pts`}
                </Typography>
              </div>

              <div className={classes.controls}>
                <Typography variant="caption">{`${displayIndex + 1}/${knownTotal}`}</Typography>

                <IconButton
                  onClick={handleStepBack}
                  disabled={playing || isBuffering || atStart}
                >
                  <FastRewindIcon />
                </IconButton>

                <IconButton
                  onClick={handlePlayPause}
                  disabled={isBuffering || loadingAny || positions.length === 0}
                >
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>

                <IconButton
                  onClick={handleStepForward}
                  disabled={playing || isBuffering || atEnd}
                >
                  <FastForwardIcon />
                </IconButton>

                <Typography variant="caption">
                  {currentPos ? formatTime(currentPos.fixTime, 'seconds') : '—'}
                </Typography>
              </div>
            </>
          ) : (
            <ReportFilter handleSubmit={handleSubmit} fullScreen showOnly loading={loadingSession} />
          )}
        </Paper>
      </div>

      {showCard && currentPos && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={currentPos}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayPage;
