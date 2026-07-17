import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import { useCatch } from '../reactHelper';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatSpeed } from '../common/util/formatter';
import { mapIconKey } from '../map/core/preloadImages';
import { DEVICE_COLORS } from './ReplayStyles';
import useReplaySession from '../reports/components/useChunkedReplay';

const TARGET_PLAYBACK_MS = 60000;

const fetchPositionsDirect = async (deviceId, from, to) => {
  const query = new URLSearchParams({ deviceId, from, to });
  const response = await fetch(`/api/positions?${query.toString()}`);
  if (!response.ok) throw Error(await response.text());
  return response.json();
};

const getSmoothPositionAtTime = (positions, currentTime) => {
  if (!positions || positions.length === 0) return null;

  let lo = 0;
  let hi = positions.length - 1;
  let found = -1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (new Date(positions[mid].fixTime).getTime() <= currentTime) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (found === -1) return null;
  if (found >= positions.length - 1) return positions[positions.length - 1];

  const cur = positions[found];
  const nxt = positions[found + 1];
  const curMs = new Date(cur.fixTime).getTime();
  const nxtMs = new Date(nxt.fixTime).getTime();
  const gap = nxtMs - curMs;
  if (gap <= 0) return cur;

  const t = (currentTime - curMs) / gap;
  return {
    ...cur,
    latitude: cur.latitude + (nxt.latitude - cur.latitude) * t,
    longitude: cur.longitude + (nxt.longitude - cur.longitude) * t,
    speed: cur.speed + (nxt.speed - cur.speed) * t,
    course: cur.course + (nxt.course - cur.course) * t,
  };
};

const useReplayState = () => {
  const timerRef = useRef();
  const currentTimeRef = useRef(0);
  const lastResetKeyRef = useRef(null);
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);
  const devices = useSelector((state) => state.devices.items);

  const replaySession = useReplaySession();

  const [noDataDeviceId, setNoDataDeviceId] = useState(null);
  const [comparePositions, setComparePositions] = useState({});
  const [deviceColors, setDeviceColors] = useState({});
  const [primaryDeviceId, setPrimaryDeviceId] = useState(defaultDeviceId);
  const [compareDeviceIds, setCompareDeviceIds] = useState([]);
  const [pendingCompareId, setPendingCompareId] = useState('');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showCard, setShowCard] = useState(false);
  const [cardDeviceId, setCardDeviceId] = useState(null);

  const primaryName = devices[primaryDeviceId]?.name || null;

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const primaryRouteSource = replaySession.isLongRangeMode
    ? replaySession.overviewPositions
    : replaySession.positions;

  const positionsForRoutes = useMemo(() => {
    const map = { ...comparePositions };
    if (primaryDeviceId && primaryRouteSource && primaryRouteSource.length) {
      map[primaryDeviceId] = primaryRouteSource;
    }
    return map;
  }, [comparePositions, primaryDeviceId, primaryRouteSource]);

  const positionsForMarkers = useMemo(() => {
    const map = { ...comparePositions };
    if (primaryDeviceId && replaySession.positions && replaySession.positions.length) {
      map[primaryDeviceId] = replaySession.positions;
    }
    return map;
  }, [comparePositions, primaryDeviceId, replaySession.positions]);

  const allDeviceIds = useMemo(() => Object.keys(positionsForRoutes), [positionsForRoutes]);
  const usedDeviceIds = useMemo(() => new Set(allDeviceIds), [allDeviceIds]);
  const hasData = allDeviceIds.length > 0;

  const { timelineStart, timelineEnd } = useMemo(() => {
    const allTimes = Object.values(positionsForRoutes)
      .flat()
      .map((p) => new Date(p.fixTime).getTime());
    if (allTimes.length === 0) return { timelineStart: 0, timelineEnd: 0 };
    return {
      timelineStart: Math.min(...allTimes),
      timelineEnd: Math.max(...allTimes),
    };
  }, [positionsForRoutes]);

  const timelineDuration = timelineEnd - timelineStart;

  const sliderValue = useMemo(() => {
    if (!timelineDuration) return 0;
    return ((currentTime - timelineStart) / timelineDuration) * 100;
  }, [currentTime, timelineStart, timelineDuration]);

  const deviceMarkers = useMemo(() => allDeviceIds.map((deviceId) => {
    const positions = positionsForMarkers[deviceId];
    if (!positions || positions.length === 0) return null;

    const color = deviceColors[deviceId] || DEVICE_COLORS[0];
    const colorIndex = Math.max(DEVICE_COLORS.indexOf(color), 0);
    const category = mapIconKey(devices[deviceId]?.category);
    const iconKey = `${category}-replay${colorIndex}`;

    const pos = getSmoothPositionAtTime(positions, currentTime);
    if (!pos) {
      return positions[0]
        ? {
          ...positions[0],
          id: `replay-${deviceId}`,
          deviceId: String(deviceId),
          color,
          iconKey,
          name: devices[deviceId]?.name || `Device ${deviceId}`,
        }
        : null;
    }

    return {
      ...pos,
      id: `replay-${deviceId}`,
      deviceId: String(deviceId),
      color,
      iconKey,
      name: devices[deviceId]?.name || `Device ${deviceId}`,
    };
  }).filter(Boolean), [allDeviceIds, positionsForMarkers, deviceColors, currentTime, devices]);

  const deviceRoutes = useMemo(() => allDeviceIds.map((deviceId) => {
    const positions = positionsForRoutes[deviceId];
    if (!positions || !positions.length) return null;
    return {
      deviceId,
      name: devices[deviceId]?.name || `Device ${deviceId}`,
      coordinates: positions.map((p) => [p.longitude, p.latitude]),
      color: deviceColors[deviceId] || DEVICE_COLORS[0],
    };
  }).filter(Boolean), [allDeviceIds, positionsForRoutes, deviceColors, devices]);

  const allCoordinates = useMemo(() => Object.values(positionsForRoutes)
    .flat()
    .map((p) => [p.longitude, p.latitude]), [positionsForRoutes]);

  const allSpeeds = useMemo(() => deviceMarkers.map((m) => ({
    deviceId: m.deviceId,
    label: devices[m.deviceId]?.name || `Device ${m.deviceId}`,
    speed: m.speed ?? 0,
    formattedSpeed: formatSpeed(m.speed ?? 0, speedUnit, t),
    color: m.color,
  })), [deviceMarkers, devices, speedUnit, t]);

  const compareDeviceList = useMemo(() => compareDeviceIds.map((id) => ({
    deviceId: id,
    name: devices[id]?.name || `Device ${id}`,
    color: deviceColors[id] || DEVICE_COLORS[1],
  })), [compareDeviceIds, deviceColors, devices]);

  const chartData = useMemo(() => {
    if (!timelineDuration) return [];

    const POINTS = 100;
    const result = [];

    for (let i = 0; i <= POINTS; i += 1) {
      const time = timelineStart + (i / POINTS) * timelineDuration;
      const point = { index: i };
      allDeviceIds.forEach((deviceId) => {
        const pos = getSmoothPositionAtTime(positionsForRoutes[deviceId], time);
        point[`speed_${deviceId}`] = pos ? +(pos.speed ?? 0).toFixed(2) : 0;
      });
      result.push(point);
    }
    return result;
  }, [allDeviceIds, positionsForRoutes, timelineStart, timelineDuration]);

  const playheadPercent = sliderValue;

  const currentCardPosition = useMemo(
    () => deviceMarkers.find((m) => m.deviceId === String(cardDeviceId)) || null,
    [deviceMarkers, cardDeviceId],
  );

  const isAtEnd = currentTime >= timelineEnd;

  useEffect(() => {
    const key = `${primaryDeviceId}|${from}|${to}`;
    if (timelineStart && lastResetKeyRef.current !== key) {
      lastResetKeyRef.current = key;
      setCurrentTime(timelineStart);
      setExpanded(false);
    }
  }, [primaryDeviceId, from, to, timelineStart]);

  useEffect(() => {
    if (playing && timelineDuration > 0) {
      timerRef.current = setInterval(() => {
        const prev = currentTimeRef.current;

        if (replaySession.isLongRangeMode && replaySession.totalCount > 0) {
          const progress = (prev - timelineStart) / timelineDuration;
          const approxIndex = Math.max(0, Math.floor(progress * replaySession.totalCount));
          const needsBuffering = replaySession.checkAndPrefetch(approxIndex, () => setPlaying(true));
          if (needsBuffering) {
            setPlaying(false);
            return;
          }
        }

        const increment = 16 * speed * (timelineDuration / TARGET_PLAYBACK_MS);
        const next = prev + increment;
        if (next >= timelineEnd) {
          setPlaying(false);
          setCurrentTime(timelineEnd);
          return;
        }
        setCurrentTime(next);
      }, 16);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, timelineEnd, timelineDuration, timelineStart, replaySession]);

  useEffect(() => {
    const STRIP_HEIGHT = 82;
    const styleId = 'replay-controls-offset';
    if (!expanded && hasData) {
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
  }, [expanded, hasData]);

  const handleSliderChange = useCallback((_, value) => {
    setPlaying(false);
    setCurrentTime(timelineStart + (value / 100) * timelineDuration);

    if (replaySession.isLongRangeMode && replaySession.totalCount > 0) {
      const approxIndex = Math.round((value / 100) * replaySession.totalCount);
      replaySession.sliderSeek(approxIndex);
    }
  }, [timelineStart, timelineDuration, replaySession]);

  const handleStepBack = useCallback(() => {
    setPlaying(false);
    setCurrentTime((prev) => Math.max(timelineStart, prev - 60000));
  }, [timelineStart]);

  const handleStepForward = useCallback(() => {
    setPlaying(false);
    setCurrentTime((prev) => Math.min(timelineEnd, prev + 60000));
  }, [timelineEnd]);

  const handleSubmit = useCatch(async ({ deviceId, from: f, to: t2 }) => {
    setPrimaryDeviceId(deviceId);
    setFrom(f);
    setTo(t2);
    setCompareDeviceIds([]);
    setComparePositions({});
    setDeviceColors({ [deviceId]: DEVICE_COLORS[0] });
    setShowCard(false);
    setCardDeviceId(null);
    setCurrentTime(0);

    const ok = await replaySession.init(deviceId, f, t2);
    if (!ok) {
      throw Error(replaySession.error || t('sharedNoData'));
    }
  });

  const handleAddCompareDevice = useCatch(async () => {
    if (!pendingCompareId || !from || !to) return;

    const data = await fetchPositionsDirect(pendingCompareId, from, to);
    if (!data.length) {
      setNoDataDeviceId(pendingCompareId);
      setPendingCompareId('');
      return;
    }
    const usedCount = compareDeviceIds.length + 1;
    const colorIndex = usedCount % DEVICE_COLORS.length;
    setComparePositions((prev) => ({ ...prev, [pendingCompareId]: data }));
    setDeviceColors((prev) => ({ ...prev, [pendingCompareId]: DEVICE_COLORS[colorIndex] }));
    setCompareDeviceIds((prev) => [...prev, pendingCompareId]);
    setPendingCompareId('');
    setNoDataDeviceId(null);
  });

  const handleRemoveCompareDevice = useCallback((deviceId) => {
    setCompareDeviceIds((prev) => prev.filter((id) => id !== deviceId));
    setComparePositions((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
    setDeviceColors((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
    if (String(deviceId) === String(cardDeviceId)) {
      setShowCard(false);
      setCardDeviceId(null);
    }
  }, [cardDeviceId]);

  const handleDownload = useCallback(() => {
    const query = new URLSearchParams({ deviceId: primaryDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  }, [primaryDeviceId, from, to]);

  const handleMarkerClick = useCallback((positionId, deviceId) => {
    setCardDeviceId(deviceId);
    setShowCard(true);
  }, []);

  const handleCloseCard = useCallback(() => {
    setShowCard(false);
    setCardDeviceId(null);
  }, []);

  return {
    from,
    to,
    expanded,
    setExpanded,
    loading: replaySession.loadingSession,
    buffering: replaySession.isBuffering,
    titleExpanded,
    setTitleExpanded,
    playing,
    setPlaying,
    speed,
    setSpeed,
    currentTime,
    hasData,
    primaryDeviceId,
    primaryName,
    timelineStart,
    timelineEnd,
    sliderValue,
    playheadPercent,
    deviceMarkers,
    deviceRoutes,
    allCoordinates,
    allSpeeds,
    compareDeviceList,
    usedDeviceIds,
    pendingCompareId,
    setPendingCompareId,
    devices,
    handleSliderChange,
    handleStepBack,
    handleStepForward,
    handleSubmit,
    handleAddCompareDevice,
    handleRemoveCompareDevice,
    handleDownload,
    allDeviceIds,
    deviceColors,
    chartData,
    showCard,
    cardDeviceId,
    currentCardPosition,
    handleMarkerClick,
    handleCloseCard,
    noDataDeviceId,
    isAtEnd,
  };
};

export default useReplayState;