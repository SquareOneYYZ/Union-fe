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

const TARGET_PLAYBACK_MS = 60000;

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
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);
  const devices = useSelector((state) => state.devices.items);
  const [noDataDeviceId, setNoDataDeviceId] = useState(null);
  const [devicePositions, setDevicePositions] = useState({});
  const [deviceColors, setDeviceColors] = useState({});
  const [primaryDeviceId, setPrimaryDeviceId] = useState(defaultDeviceId);
  const [compareDeviceIds, setCompareDeviceIds] = useState([]);
  const [pendingCompareId, setPendingCompareId] = useState('');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showCard, setShowCard] = useState(false);
  const [cardDeviceId, setCardDeviceId] = useState(null);
  const hasData = Object.keys(devicePositions).length > 0;
  const primaryName = devices[primaryDeviceId]?.name || null;
  const allDeviceIds = useMemo(() => Object.keys(devicePositions), [devicePositions]);
  const usedDeviceIds = useMemo(() => new Set(allDeviceIds), [allDeviceIds]);
  const { timelineStart, timelineEnd } = useMemo(() => {
    const allTimes = Object.values(devicePositions)
      .flat()
      .map((p) => new Date(p.fixTime).getTime());
    if (allTimes.length === 0) return { timelineStart: 0, timelineEnd: 0 };
    return {
      timelineStart: Math.min(...allTimes),
      timelineEnd: Math.max(...allTimes),
    };
  }, [devicePositions]);

  const timelineDuration = timelineEnd - timelineStart;

  const sliderValue = useMemo(() => {
    if (!timelineDuration) return 0;
    return ((currentTime - timelineStart) / timelineDuration) * 100;
  }, [currentTime, timelineStart, timelineDuration]);

  const deviceMarkers = useMemo(() => allDeviceIds.map((deviceId) => {
    const positions = devicePositions[deviceId];
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
  }).filter(Boolean), [allDeviceIds, devicePositions, deviceColors, currentTime, devices]);

  const deviceRoutes = useMemo(() => allDeviceIds.map((deviceId) => {
    const positions = devicePositions[deviceId];
    if (!positions) return null;
    return {
      deviceId,
      name: devices[deviceId]?.name || `Device ${deviceId}`,
      coordinates: positions.map((p) => [p.longitude, p.latitude]),
      color: deviceColors[deviceId] || DEVICE_COLORS[0],
    };
  }).filter(Boolean), [allDeviceIds, devicePositions, deviceColors, devices]);

  const allCoordinates = useMemo(() => Object.values(devicePositions)
    .flat()
    .map((p) => [p.longitude, p.latitude]), [devicePositions]);

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
        const pos = getSmoothPositionAtTime(devicePositions[deviceId], time);
        point[`speed_${deviceId}`] = pos ? +(pos.speed ?? 0).toFixed(2) : 0;
      });
      result.push(point);
    }
    return result;
  }, [allDeviceIds, devicePositions, timelineStart, timelineDuration]);

  const playheadPercent = sliderValue;

  const currentCardPosition = useMemo(
    () => deviceMarkers.find((m) => m.deviceId === String(cardDeviceId)) || null,
    [deviceMarkers, cardDeviceId],
  );

  useEffect(() => {
    if (playing && timelineDuration > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const increment = 16 * speed * (timelineDuration / TARGET_PLAYBACK_MS);
          const next = prev + increment;
          if (next >= timelineEnd) {
            setPlaying(false);
            return timelineEnd;
          }
          return next;
        });
      }, 16);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, timelineEnd, timelineDuration]);

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
  }, [timelineStart, timelineDuration]);

  const handleStepBack = useCallback(() => {
    setPlaying(false);
    setCurrentTime((prev) => Math.max(timelineStart, prev - 60000));
  }, [timelineStart]);

  const handleStepForward = useCallback(() => {
    setPlaying(false);
    setCurrentTime((prev) => Math.min(timelineEnd, prev + 60000));
  }, [timelineEnd]);

  const handleSubmit = useCatch(async ({ deviceId, from: f, to: t2 }) => {
    setLoading(true);
    setPrimaryDeviceId(deviceId);
    setFrom(f);
    setTo(t2);
    setCompareDeviceIds([]);
    setShowCard(false);
    setCardDeviceId(null);

    try {
      const query = new URLSearchParams({ deviceId, from: f, to: t2 });
      const response = await fetch(`/api/positions?${query.toString()}`);
      if (!response.ok) throw Error(await response.text());
      const data = await response.json();

      if (!data.length) throw Error(t('sharedNoData'));

      setDevicePositions({ [deviceId]: data });
      setDeviceColors({ [deviceId]: DEVICE_COLORS[0] });

      const times = data.map((p) => new Date(p.fixTime).getTime());
      setCurrentTime(Math.min(...times));
      setExpanded(false);
    } finally {
      setLoading(false);
    }
  });

const handleAddCompareDevice = useCatch(async () => {
    if (!pendingCompareId || !from || !to) return;

    const query = new URLSearchParams({ deviceId: pendingCompareId, from, to });
    const response = await fetch(`/api/positions?${query.toString()}`);
    if (!response.ok) throw Error(await response.text());
    const data = await response.json();
    if (!data.length) {
      setNoDataDeviceId(pendingCompareId);
      setPendingCompareId('');
      return;
    }
    const usedCount = compareDeviceIds.length + 1;
    const colorIndex = usedCount % DEVICE_COLORS.length;
    const colorReused = usedCount >= DEVICE_COLORS.length;
    setDevicePositions((prev) => ({ ...prev, [pendingCompareId]: data }));
    setDeviceColors((prev) => ({ ...prev, [pendingCompareId]: DEVICE_COLORS[colorIndex] }));
    setCompareDeviceIds((prev) => [...prev, pendingCompareId]);
    setPendingCompareId('');
    if (colorReused) {
      setNoDataDeviceId(null);
    }
  });

  const handleRemoveCompareDevice = useCallback((deviceId) => {
    setCompareDeviceIds((prev) => prev.filter((id) => id !== deviceId));
    setDevicePositions((prev) => {
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
    loading,
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
  };
};

export default useReplayState;
