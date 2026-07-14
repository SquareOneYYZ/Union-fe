import {
  useState, useEffect, useCallback, useRef,
} from 'react';
import { useSelector } from 'react-redux';

const CACHE_TTL_MS = 90 * 1000;
const HOVER_DEBOUNCE_MS = 200;

const useGeofenceTooltip = (map, layerId = 'geofences-fill') => {
  const devices = useSelector((state) => state.devices.items);

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    geofenceName: '',
    entries: null,
    exits: null,
    lastVehicle: null,
    loading: false,
  });

  const cache = useRef({});
  const hoveredId = useRef(null);
  const sourceId = useRef(null);
  const debounceTimerRef = useRef(null);

  const getTodayRange = () => {
    const now = new Date();
    const from = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0,
    )).toISOString();
    const to = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999,
    )).toISOString();
    return { from, to };
  };

  const fetchActivity = useCallback(async (geofenceId) => {
    const cached = cache.current[geofenceId];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const { from, to } = getTodayRange();
    const params = new URLSearchParams({ from, to, geofenceId });
    params.append('type', 'geofenceEnter');
    params.append('type', 'geofenceExit');

    const response = await fetch(`/api/reports/events?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const events = await response.json();
    const entries = events.filter((e) => e.type === 'geofenceEnter').length;
    const exits = events.filter((e) => e.type === 'geofenceExit').length;
    const sorted = [...events].sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
    const lastDeviceId = sorted[0]?.deviceId ?? null;

    const result = { entries, exits, lastDeviceId };
    cache.current[geofenceId] = { data: result, timestamp: Date.now() };
    return result;
  }, []);

  const clearHoveredFeature = useCallback(() => {
    if (hoveredId.current !== null && sourceId.current) {
      map.setFeatureState(
        { source: sourceId.current, id: hoveredId.current },
        { hovered: false },
      );
    }
  }, [map]);

  const resetTooltip = useCallback(() => {
    setTooltip({
      visible: false,
      x: 0,
      y: 0,
      geofenceName: '',
      entries: null,
      exits: null,
      lastVehicle: null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (!map) return undefined;

    const handleMouseMove = (e) => {
      const x = e.originalEvent.clientX;
      const y = e.originalEvent.clientY;

      const feature = e.features?.[0];

      if (!feature) {
        if (hoveredId.current !== null) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          clearHoveredFeature();
          hoveredId.current = null;
          map.getCanvas().style.cursor = '';
          resetTooltip();
        }
        return;
      }

      const featureId = feature.id;
      const geofenceId = feature.properties.id;
      const geofenceName = feature.properties.name;
      sourceId.current = feature.layer.source;

      if (hoveredId.current === featureId) {
        setTooltip((prev) => ({ ...prev, x, y }));
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      clearHoveredFeature();
      map.setFeatureState(
        { source: sourceId.current, id: featureId },
        { hovered: true },
      );

      hoveredId.current = featureId;
      map.getCanvas().style.cursor = 'pointer';

      setTooltip({
        visible: true,
        x,
        y,
        geofenceName,
        entries: null,
        exits: null,
        lastVehicle: null,
        loading: true,
      });

      debounceTimerRef.current = setTimeout(async () => {
        debounceTimerRef.current = null;
        try {
          const { entries, exits, lastDeviceId } = await fetchActivity(geofenceId);

          if (hoveredId.current !== featureId) return;

          const lastVehicle = lastDeviceId
            ? (devices[lastDeviceId]?.name ?? `Device ${lastDeviceId}`)
            : null;

          setTooltip((prev) => ({
            ...prev, entries, exits, lastVehicle, loading: false,
          }));
        } catch {
          if (hoveredId.current !== featureId) return;
          setTooltip((prev) => ({ ...prev, loading: false, entries: 0, exits: 0 }));
        }
      }, HOVER_DEBOUNCE_MS);
    };

    const handleMouseLeave = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      clearHoveredFeature();
      hoveredId.current = null;
      map.getCanvas().style.cursor = '';
      resetTooltip();
    };

    map.on('mousemove', layerId, handleMouseMove);
    map.on('mouseleave', layerId, handleMouseLeave);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      map.off('mousemove', layerId, handleMouseMove);
      map.off('mouseleave', layerId, handleMouseLeave);
    };
  }, [map, layerId, fetchActivity, devices, clearHoveredFeature, resetTooltip]);

  return tooltip;
};

export default useGeofenceTooltip;