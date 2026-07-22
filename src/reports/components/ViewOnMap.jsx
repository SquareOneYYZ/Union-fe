import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  IconButton, Typography, Box, Chip,
  Popover, List, ListItem, ListItemText, Divider,
  ToggleButtonGroup, ToggleButton, Tooltip,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import EventIcon from '@mui/icons-material/Event';
import MapIcon from '@mui/icons-material/Map';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView from '../../map/core/MapView';
import MapGeofence from '../../map/MapGeofence';
import MapPositions from '../../map/MapPositions';
import MapCamera from '../../map/MapCamera';
import MapScale from '../../map/MapScale';
import { formatTime } from '../../common/util/formatter';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { prefixString } from '../../common/util/stringUtils';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 2),
    gap: theme.spacing(1.5),
    minHeight: 52,
    borderBottom: '1px solid rgba(0,0,0,0.08)',
  },
  topBarTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    flexGrow: 1,
    color: theme.palette.text.primary,
  },
  topBarMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  mapContainer: {
    position: 'fixed',
    top: 52,
    left: 0,
    right: 0,
    bottom: 140,
    zIndex: 1,
  },
  bottomPanel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: 'rgba(18,18,28,0.97)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    height: 140,
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1, 2, 1.5, 2),
    gap: theme.spacing(0.75),
    userSelect: 'none',
  },
  timeLabelsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.62rem',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  heatmapWrapper: {
    position: 'relative',
    height: 38,
    borderRadius: 6,
    overflow: 'visible',
    cursor: 'crosshair',
    border: '1px solid rgba(255,255,255,0.06)',
    marginTop: 6,
  },
  heatmapInner: {
    position: 'absolute',
    inset: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  heatmapCanvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    background: 'linear-gradient(to bottom, #ffffff 60%, rgba(255,255,255,0.3))',
    boxShadow: '0 0 8px rgba(255,255,255,0.7), 0 0 2px #fff',
    borderRadius: 2,
    pointerEvents: 'none',
    transition: 'left 0.08s linear',
    zIndex: 5,
  },
  playheadKnob: {
    position: 'absolute',
    top: -5,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 10,
    height: 10,
    background: '#fff',
    borderRadius: '50%',
    boxShadow: '0 0 6px rgba(255,255,255,0.95)',
  },
  playheadTime: {
    position: 'absolute',
    top: -26,
    transform: 'translateX(-50%)',
    background: 'rgba(20,20,30,0.95)',
    color: '#fff',
    fontSize: '0.63rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    letterSpacing: '0.03em',
    zIndex: 6,
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  controlBtn: {
    color: '#fff',
    padding: 4,
    '&:disabled': { color: 'rgba(255,255,255,0.25)' },
  },
  currentTimeText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '0.78rem',
    minWidth: 140,
  },
  counterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.72rem',
    marginLeft: 'auto',
    fontFamily: 'monospace',
  },
  speedChips: {
    display: 'flex',
    gap: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
    flexWrap: 'wrap',
  },
  legendRow: {
    display: 'flex',
    gap: theme.spacing(0.5),
    alignItems: 'center',
    overflowX: 'auto',
    flexWrap: 'nowrap',
    paddingBottom: 2,
    borderTop: '1px solid rgba(255,255,255,0.07)',
    paddingTop: theme.spacing(0.5),
    '&::-webkit-scrollbar': { height: 2 },
    '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: 1 },
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    padding: '2px 6px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    transition: 'background 0.15s',
    '&.active': {
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.2)',
    },
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.6rem',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  legendLabelActive: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 600,
  },
  legendCount: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.58rem',
    fontFamily: 'monospace',
  },
  modeToggle: {
    '& .MuiToggleButton-root': {
      padding: '2px 8px',
      fontSize: '0.65rem',
      color: 'rgba(255,255,255,0.5)',
      borderColor: 'rgba(255,255,255,0.15)',
      textTransform: 'none',
      lineHeight: 1.6,
      '&.Mui-selected': {
        color: '#fff',
        background: 'rgba(255,255,255,0.12)',
      },
    },
  },
}));

const SPEED_OPTIONS = [0.5, 0.75, 1, 2, 5, 10];
const TICK_MS = 16;

const EVENT_COLOR_MAP = {
  deviceOverspeed: '#c62828',
  geofenceEnter: '#2e7d32',
  geofenceExit: '#e65100',
  deviceStopped: '#1565c0',
  deviceMoving: '#00838f',
  alarm: '#ad1457',
  ignitionOn: '#558b2f',
  ignitionOff: '#6a1b9a',
  default: '#f9a825',
};

const getEventColor = (type) => EVENT_COLOR_MAP[type] || EVENT_COLOR_MAP.default;

// Full legend — all possible event types with display labels
const ALL_EVENT_LEGEND = [
  { type: 'deviceOverspeed', label: 'Overspeed' },
  { type: 'alarm', label: 'Alarm' },
  { type: 'geofenceEnter', label: 'Geo Enter' },
  { type: 'geofenceExit', label: 'Geo Exit' },
  { type: 'deviceMoving', label: 'Moving' },
  { type: 'deviceStopped', label: 'Stopped' },
  { type: 'ignitionOn', label: 'Ign. On' },
  { type: 'ignitionOff', label: 'Ign. Off' },
];

const lerpAngle = (a, b, t) => {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
};

const getActiveIndex = (sortedEvs, time) => {
  let idx = 0;
  for (let i = 0; i < sortedEvs.length; i += 1) {
    if (new Date(sortedEvs[i].eventTime).getTime() <= time) idx = i;
    else break;
  }
  return idx;
};

const HeatmapBar = ({
  events, minTime, maxTime, currentTime, onSeek, classes,
}) => {
  const canvasRef = useRef(null);
  const totalMs = maxTime - minTime;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !events.length || totalMs <= 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || canvas.width;
    const H = canvas.offsetHeight || canvas.height;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    const BUCKETS = Math.max(120, Math.floor(W / 4));
    const buckets = new Array(BUCKETS).fill(0);
    const bucketColors = new Array(BUCKETS).fill(null);

    events.forEach((ev) => {
      const ts = new Date(ev.eventTime).getTime();
      const idx = Math.floor(((ts - minTime) / totalMs) * (BUCKETS - 1));
      if (idx >= 0 && idx < BUCKETS) {
        buckets[idx] += 1;
        bucketColors[idx] = getEventColor(ev.type);
      }
    });

    const SPREAD = Math.max(5, Math.floor(BUCKETS / 30));
    const smoothedBuckets = new Array(BUCKETS).fill(0);
    const smoothedColors = new Array(BUCKETS).fill(null);
    const sigma = SPREAD / 2;

    for (let i = 0; i < BUCKETS; i += 1) {
      if (buckets[i] === 0) continue; // eslint-disable-line no-continue
      for (let d = -SPREAD; d <= SPREAD; d += 1) {
        const j = i + d;
        if (j < 0 || j >= BUCKETS) continue; // eslint-disable-line no-continue
        const weight = Math.exp(-(d * d) / (2 * sigma * sigma));
        smoothedBuckets[j] += buckets[i] * weight;
        if (!smoothedColors[j]) smoothedColors[j] = bucketColors[i];
      }
    }

    const fallbackColor = bucketColors.find(Boolean) || '#f9a825';
    const maxDensity = Math.max(...smoothedBuckets, 1);
    const MIN_INTENSITY = 0.15;

    for (let i = 0; i < BUCKETS; i += 1) {
      if (smoothedBuckets[i] === 0) continue; // eslint-disable-line no-continue
      const x = (i / BUCKETS) * W;
      const bw = Math.max(W / BUCKETS, 1.5);
      const raw = smoothedBuckets[i] / maxDensity;
      const intensity = Math.max(MIN_INTENSITY, raw);
      const baseColor = smoothedColors[i] || fallbackColor;
      const alphaTop = Math.floor(intensity * 40).toString(16).padStart(2, '0');

      const grad = ctx.createLinearGradient(x, H, x, 0);
      grad.addColorStop(0, `${baseColor}ff`);
      grad.addColorStop(0.4, `${baseColor}bb`);
      grad.addColorStop(0.75, `${baseColor}55`);
      grad.addColorStop(1, `${baseColor}${alphaTop}`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, bw + 0.5, H);

      const accentAlpha = Math.floor(200 + raw * 55).toString(16).padStart(2, '0');
      ctx.fillStyle = `${baseColor}${accentAlpha}`;
      ctx.fillRect(x, H - Math.max(3, raw * H * 0.22), bw + 0.5, Math.max(3, raw * H * 0.22));
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let g = 0; g <= 4; g += 1) {
      const gx = (g / 4) * W;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
  }, [events, minTime, maxTime, totalMs]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || totalMs <= 0 || e.clientX === undefined) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(minTime + ratio * totalMs);
  }, [onSeek, minTime, totalMs]);

  const playheadPct = totalMs > 0 ? ((currentTime - minTime) / totalMs) * 100 : 0;

  return (
    <div
      className={classes.heatmapWrapper}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
      role="slider"
      aria-label="Seek timeline"
      aria-valuemin={minTime}
      aria-valuemax={maxTime}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      <div className={classes.heatmapInner}>
        <canvas ref={canvasRef} className={classes.heatmapCanvas} />
      </div>
      <div
        className={classes.playhead}
        style={{ left: `${Math.max(0, Math.min(100, playheadPct))}%` }}
      >
        <div className={classes.playheadKnob} />
        <span className={classes.playheadTime}>
          {currentTime ? new Date(currentTime).toLocaleTimeString() : ''}
        </span>
      </div>
    </div>
  );
};

const ViewOnMap = () => {
  const t = useTranslation();
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const { events = [], deviceId, deviceName: passedDeviceName } = location.state || {};

  const deviceNameFromStore = useSelector((state) => (
    deviceId && state.devices?.items[deviceId]
      ? state.devices.items[deviceId].name
      : null
  ));

  const deviceName = passedDeviceName || deviceNameFromStore || 'Device';

  const validEvents = useMemo(
    () => events.filter((ev) => ev.positionId && ev.eventTime),
    [events],
  );

  const sortedEvents = useMemo(
    () => [...validEvents].sort(
      (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime(),
    ),
    [validEvents],
  );

  const { minTime, maxTime } = useMemo(() => {
    if (!sortedEvents.length) return { minTime: 0, maxTime: 0 };
    const times = sortedEvents.map((ev) => new Date(ev.eventTime).getTime());
    return { minTime: Math.min(...times), maxTime: Math.max(...times) };
  }, [sortedEvents]);

  const [positionMap, setPositionMap] = useState({});
  const [fetchLoading, setFetchLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'replay'
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [smoothPosition, setSmoothPosition] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [popoverEvent, setPopoverEvent] = useState(null);

  const timerRef = useRef(null);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    if (minTime) {
      setCurrentTime(minTime);
      currentTimeRef.current = minTime;
    }
  }, [minTime]);

  useEffect(() => {
    if (!validEvents.length) return undefined;
    const fetchPositions = async () => {
      setFetchLoading(true);
      try {
        const uniqueIds = [...new Set(validEvents.map((ev) => ev.positionId))];
        const chunks = [];
        for (let i = 0; i < uniqueIds.length; i += 20) chunks.push(uniqueIds.slice(i, i + 20));
        const results = {};
        await Promise.all(
          chunks.map(async (chunk) => {
            const query = chunk.map((id) => `id=${id}`).join('&');
            const res = await fetch(`/api/positions?${query}`);
            if (res.ok) {
              const data = await res.json();
              data.forEach((pos) => { results[pos.id] = pos; });
            }
          }),
        );
        setPositionMap(results);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchPositions();
    return () => {
      setPositionMap({});
    };
  }, [validEvents]);

  useEffect(() => {
    if (playing && maxTime > minTime) {
      timerRef.current = setInterval(() => {
        const next = currentTimeRef.current + (TICK_MS * speed * ((maxTime - minTime) / 60000));
        if (next >= maxTime) {
          setCurrentTime(maxTime);
          currentTimeRef.current = maxTime;
          setPlaying(false);
        } else {
          setCurrentTime(next);
          currentTimeRef.current = next;
        }
      }, TICK_MS);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, minTime, maxTime]);

  useEffect(() => {
    if (!sortedEvents.length || !Object.keys(positionMap).length) return;
    const activeIdx = getActiveIndex(sortedEvents, currentTime);
    const curr = sortedEvents[activeIdx];
    const next = sortedEvents[activeIdx + 1];
    const currPos = curr ? positionMap[curr.positionId] : null;
    const nextPos = next ? positionMap[next.positionId] : null;

    if (currPos && nextPos) {
      const t0 = new Date(curr.eventTime).getTime();
      const t1 = new Date(next.eventTime).getTime();
      const alpha = t1 > t0 ? Math.min(1, Math.max(0, (currentTime - t0) / (t1 - t0))) : 0;
      setSmoothPosition({
        ...currPos,
        latitude: currPos.latitude + (nextPos.latitude - currPos.latitude) * alpha,
        longitude: currPos.longitude + (nextPos.longitude - currPos.longitude) * alpha,
        speed: currPos.speed + (nextPos.speed - currPos.speed) * alpha,
        course: lerpAngle(currPos.course || 0, nextPos.course || 0, alpha),
      });
    } else if (currPos) {
      setSmoothPosition(currPos);
    }
  }, [currentTime, sortedEvents, positionMap]);

  const activeIndex = useMemo(
    () => getActiveIndex(sortedEvents, currentTime),
    [sortedEvents, currentTime],
  );

  const trailPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i <= activeIndex; i += 1) {
      const ev = sortedEvents[i];
      if (ev && positionMap[ev.positionId]) {
        positions.push({
          ...positionMap[ev.positionId],
          eventType: ev.type,
          eventColor: getEventColor(ev.type),
          iconKey: `event-${ev.type}`,
          isCurrent: false,
        });
      }
    }
    return positions;
  }, [sortedEvents, activeIndex, positionMap]);

  // All events as positions (for overview mode)
  const allEventPositions = useMemo(() => sortedEvents.map((ev, i) => {
    const pos = positionMap[ev.positionId];
    if (!pos) return null;
    return {
      ...pos,
      eventType: ev.type,
      eventColor: getEventColor(ev.type),
      iconKey: `event-${ev.type}`,
      isCurrent: i === activeIndex,
    };
  }).filter(Boolean), [sortedEvents, positionMap, activeIndex]);

  const allVisiblePositions = useMemo(() => {
    if (viewMode === 'overview') {
      return allEventPositions;
    }
    // replay mode — progressive trail + smooth current
    if (!smoothPosition) return trailPositions;
    return [
      ...trailPositions,
      {
        ...smoothPosition,
        eventType: sortedEvents[activeIndex]?.type,
        eventColor: getEventColor(sortedEvents[activeIndex]?.type),
        iconKey: `event-${sortedEvents[activeIndex]?.type || 'default'}`,
        isCurrent: true,
      },
    ];
  }, [viewMode, allEventPositions, trailPositions, smoothPosition, sortedEvents, activeIndex]);

  const currentEvent = sortedEvents[activeIndex] || null;

  const handleSeek = useCallback((seekTime) => {
    const clamped = Math.max(minTime, Math.min(maxTime, seekTime));
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;
    setPlaying(false);
  }, [minTime, maxTime]);

  const handlePrev = useCallback(() => {
    const idx = Math.max(0, activeIndex - 1);
    const ts = new Date(sortedEvents[idx].eventTime).getTime();
    setCurrentTime(ts);
    currentTimeRef.current = ts;
    setPlaying(false);
  }, [activeIndex, sortedEvents]);

  const handleNext = useCallback(() => {
    const idx = Math.min(sortedEvents.length - 1, activeIndex + 1);
    const ts = new Date(sortedEvents[idx].eventTime).getTime();
    setCurrentTime(ts);
    currentTimeRef.current = ts;
    setPlaying(false);
  }, [activeIndex, sortedEvents]);

  const eventTypeSummary = useMemo(() => {
    const map = {};
    validEvents.forEach((ev) => { map[ev.type] = (map[ev.type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [validEvents]);

  const timeLabels = useMemo(() => {
    if (!minTime || !maxTime) return [];
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(minTime + (i / 4) * (maxTime - minTime));
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
  }, [minTime, maxTime]);

  return (
    <div className={classes.root}>
      <div className={classes.topBar}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'text.primary' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <EventIcon fontSize="small" sx={{ color: 'primary.main' }} />
        <Typography className={classes.topBarTitle} noWrap>
          {`Events on Map${deviceName ? ` — ${deviceName}` : ''}`}
        </Typography>
        <div className={classes.topBarMeta}>
          <Chip
            size="small"
            label={fetchLoading ? 'Loading…' : `${validEvents.length} Events`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
          {sortedEvents.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
              {new Date(minTime).toLocaleDateString()}
            </Typography>
          )}
        </div>
        <ToggleButtonGroup
          className={classes.modeToggle}
          value={viewMode}
          exclusive
          size="small"
          onChange={(_, v) => { if (v) setViewMode(v); }}
        >
          <Tooltip title="Show all markers at once">
            <ToggleButton value="overview">
              <MapIcon sx={{ fontSize: '0.85rem', mr: 0.5 }} />
              Overview
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Progressive replay mode">
            <ToggleButton value="replay">
              <PlayCircleOutlineIcon sx={{ fontSize: '0.85rem', mr: 0.5 }} />
              Replay
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </div>

      <div className={classes.mapContainer}>
        <MapView>
          <MapGeofence />
          {allVisiblePositions.length > 0 && (
            <MapPositions positions={allVisiblePositions} titleField="fixTime" customCategory="event" />
          )}
        </MapView>
        <MapScale />
        {smoothPosition && (
          <MapCamera latitude={smoothPosition.latitude} longitude={smoothPosition.longitude} />
        )}
      </div>

      <div className={classes.bottomPanel}>
        <div className={classes.timeLabelsRow}>
          {timeLabels.map((label) => (
            <Typography key={label} className={classes.timeLabel}>{label}</Typography>
          ))}
        </div>

        {sortedEvents.length > 0 && (
          <HeatmapBar
            events={sortedEvents}
            minTime={minTime}
            maxTime={maxTime}
            currentTime={currentTime}
            onSeek={handleSeek}
            classes={classes}
          />
        )}

        <div className={classes.controlsRow}>
          <IconButton
            className={classes.controlBtn}
            size="small"
            disabled={playing || activeIndex <= 0}
            onClick={handlePrev}
          >
            <SkipPreviousIcon fontSize="small" />
          </IconButton>

          <IconButton
            className={classes.controlBtn}
            size="small"
            disabled={sortedEvents.length === 0}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>

          <IconButton
            className={classes.controlBtn}
            size="small"
            disabled={playing || activeIndex >= sortedEvents.length - 1}
            onClick={handleNext}
          >
            <SkipNextIcon fontSize="small" />
          </IconButton>

          <Typography className={classes.currentTimeText}>
            {currentEvent ? formatTime(currentEvent.eventTime, 'seconds') : '—'}
          </Typography>

          <div className={classes.speedChips}>
            {SPEED_OPTIONS.map((s) => (
              <Chip
                key={s}
                label={`${s}×`}
                size="small"
                onClick={() => setSpeed(s)}
                color={speed === s ? 'primary' : 'default'}
                variant={speed === s ? 'filled' : 'outlined'}
                sx={{
                  fontSize: '0.65rem',
                  height: 20,
                  color: speed === s ? undefined : 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>

          <Typography className={classes.counterText}>
            {sortedEvents.length > 0 ? `${activeIndex + 1} / ${sortedEvents.length}` : '0 / 0'}
          </Typography>
        </div>

        <div className={classes.legendRow}>
          {ALL_EVENT_LEGEND.map(({ type, label }) => {
            const count = eventTypeSummary.find(([k]) => k === type)?.[1] ?? 0;
            const isActive = count > 0;
            return (
              <div
                key={type}
                className={`${classes.legendItem}${isActive ? ' active' : ''}`}
              >
                <span
                  className={classes.legendDot}
                  style={{ background: getEventColor(type), opacity: isActive ? 1 : 0.35 }}
                />
                <span className={`${classes.legendLabel}${isActive ? ` ${classes.legendLabelActive}` : ''}`}>
                  {label}
                </span>
                {isActive && (
                  <span className={classes.legendCount}>{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={() => { setPopoverAnchor(null); setPopoverEvent(null); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {popoverEvent && (
          <List dense sx={{ minWidth: 200 }}>
            <ListItem>
              <ListItemText
                primary={t(prefixString('event', popoverEvent.type))}
                secondary={formatTime(popoverEvent.eventTime, 'seconds')}
              />
            </ListItem>
            <Divider />
            {popoverEvent.attributes?.alarm && (
              <ListItem>
                <ListItemText primary="Alarm" secondary={popoverEvent.attributes.alarm} />
              </ListItem>
            )}
          </List>
        )}
      </Popover>
    </div>
  );
};

export default ViewOnMap;
