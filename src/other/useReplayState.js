import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useCatch } from '../reactHelper';
import { DEVICE_COLORS } from './replayStyles';

function getSmoothPositionAtTime(positions, currentTime) {
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
}

export function useReplayState() {
    const timerRef = useRef();
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
        if (!positions || positions.length === 0) return null;   // guard empty arrays too

        const pos = getSmoothPositionAtTime(positions, currentTime);
        if (!pos) return positions[0]   // fallback to first position instead of null
            ? {
                ...positions[0],
                id: `replay-${deviceId}`,
                deviceId: String(deviceId),
                color: deviceColors[deviceId] || DEVICE_COLORS[0],
                name: devices[deviceId]?.name || `Device ${deviceId}`,
            }
            : null;

        return {
            ...pos,
            id: `replay-${deviceId}`,
            deviceId: String(deviceId),
            color: deviceColors[deviceId] || DEVICE_COLORS[0],
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
        label: devices[m.deviceId]?.name || `Device ${m.deviceId}`,
        speed: m.speed ?? 0,
        color: m.color,
    })), [deviceMarkers, devices]);

    const compareDeviceList = useMemo(() => compareDeviceIds.map((id) => ({
        deviceId: id,
        name: devices[id]?.name || `Device ${id}`,
        color: deviceColors[id] || DEVICE_COLORS[1],
    })), [compareDeviceIds, deviceColors, devices]);

    const primaryPositions = devicePositions[primaryDeviceId] || [];
    const chartData = useMemo(() => primaryPositions.map((pos, i) => ({
        index: i,
        speed: +(pos.speed ?? 0).toFixed(2),
    })), [primaryPositions]);

    const playheadPercent = sliderValue;

    useEffect(() => {
        if (playing && timelineDuration > 0) {
            timerRef.current = setInterval(() => {
                setCurrentTime((prev) => {
                    const next = prev + 16 * speed;
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

        try {
            const query = new URLSearchParams({ deviceId, from: f, to: t2 });
            const response = await fetch(`/api/positions?${query.toString()}`);
            if (!response.ok) throw Error(await response.text());
            const data = await response.json();

            if (!data.length) throw Error('sharedNoData');

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
        const colorIndex = (compareDeviceIds.length + 1) % DEVICE_COLORS.length;
        setDevicePositions((prev) => ({ ...prev, [pendingCompareId]: data }));
        setDeviceColors((prev) => ({ ...prev, [pendingCompareId]: DEVICE_COLORS[colorIndex] }));
        setCompareDeviceIds((prev) => [...prev, pendingCompareId]);
        setPendingCompareId('');
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
    }, []);

    const handleDownload = useCallback(() => {
        const query = new URLSearchParams({ deviceId: primaryDeviceId, from, to });
        window.location.assign(`/api/positions/kml?${query.toString()}`);
    }, [primaryDeviceId, from, to]);

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
        chartData,
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
    };
}