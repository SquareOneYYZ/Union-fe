import maplibregl from 'maplibre-gl';
import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { usePreference } from '../../common/util/preferences';
import { map, restoredCamera } from '../core/MapView';

// A restored camera only suppresses fit-to-devices when it is an actual
// place the user was looking at; below this zoom it is a world/continent
// view (e.g. a session that ended before any camera fit), and fitting to
// the devices is strictly better than restoring it.
const MIN_RESTORED_ZOOM_TO_SKIP_FIT = 4;

const MapDefaultCamera = ({ mapReady }) => {
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const defaultLatitude = usePreference('latitude');
  const defaultLongitude = usePreference('longitude');
  const defaultZoom = usePreference('zoom', 0);
  const [initialized, setInitialized] = useState(false);

  const markInitialized = useCallback(() => {
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    if (initialized) return;

    if (selectedDeviceId) {
      markInitialized();
      return;
    }

    const hasDefaults = defaultLatitude && defaultLongitude;
    if (hasDefaults) {
      map.jumpTo({
        center: [defaultLongitude, defaultLatitude],
        zoom: defaultZoom,
      });
      markInitialized();
      return;
    }

    if (restoredCamera && restoredCamera.zoom >= MIN_RESTORED_ZOOM_TO_SKIP_FIT) {
      // Camera was already restored from persisted state when the map was
      // created, so late position data must not re-fit the whole viewport.
      markInitialized();
      return;
    }

    const coords = Object.values(positions).map((p) => [p.longitude, p.latitude]);
    if (coords.length > 1) {
      const bounds = coords.reduce(
        (acc, c) => acc.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );
      const canvas = map.getCanvas();
      map.fitBounds(bounds, {
        duration: 0,
        padding: Math.min(canvas.width, canvas.height) * 0.1,
      });
      markInitialized();
      return;
    }

    if (coords.length === 1) {
      map.jumpTo({
        center: coords[0],
        zoom: Math.max(map.getZoom(), 10),
      });
      markInitialized();
    }
  }, [
    initialized,
    mapReady,
    selectedDeviceId,
    defaultLatitude,
    defaultLongitude,
    defaultZoom,
    positions,
    markInitialized,
  ]);

  return null;
};

MapDefaultCamera.handlesMapReady = true;

export default MapDefaultCamera;
