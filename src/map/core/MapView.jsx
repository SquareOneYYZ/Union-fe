import mapboxglRtlTextUrl from '@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { googleProtocol } from 'maplibre-google-maps';
import React, {
  useRef, useLayoutEffect, useEffect, useState, useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SwitcherControl } from '../switcher/switcher';
import { useAttributePreference, usePreference } from '../../common/util/preferences';
import usePersistedState, { savePersistedState } from '../../common/util/usePersistedState';
import { mapImages } from './preloadImages';
import useMapStyles from './useMapStyles';
import { FullScreenControl } from '../controls/MapFullScreen';
import ContextMenu from './ContextMenu';
import measureControlRef from '../controls/MeasureControlRef';
import { devicesActions } from '../../store';

const element = document.createElement('div');
element.style.width = '100%';
element.style.height = '100%';
element.style.boxSizing = 'initial';

maplibregl.setRTLTextPlugin(mapboxglRtlTextUrl);
maplibregl.addProtocol('google', googleProtocol);

export const map = new maplibregl.Map({
  container: element,
});

map.dragRotate.disable();

let ready = false;
const readyListeners = new Set();

const addReadyListener = (listener) => {
  readyListeners.add(listener);
  listener(ready);
};

const removeReadyListener = (listener) => {
  readyListeners.delete(listener);
};

const updateReadyValue = (value) => {
  ready = value;
  readyListeners.forEach((listener) => listener(value));
};

const initMap = async () => {
  if (ready) return;
  if (!map.hasImage('background')) {
    Object.entries(mapImages).forEach(([key, value]) => {
      map.addImage(key, value, {
        pixelRatio: window.devicePixelRatio,
      });
    });
  }
};

map.addControl(new FullScreenControl(), 'top-right');

const switcher = new SwitcherControl(
  () => updateReadyValue(false),
  (styleId) => savePersistedState('selectedMapStyle', styleId),
  () => {
    map.once('styledata', () => {
      const waiting = () => {
        if (!map.loaded()) {
          setTimeout(waiting, 33);
        } else {
          initMap();
          updateReadyValue(true);
        }
      };
      waiting();
    });
  },
);

map.addControl(switcher, 'top-right');

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const MapView = ({ children }) => {
  const containerEl = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [mapReady, setMapReady] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    lngLat: null,
    nearestDeviceName: null,
  });

  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);

  const mapStyles = useMapStyles();
  const activeMapStyles = useAttributePreference('activeMapStyles', 'locationIqStreets,locationIqDark,openFreeMap');
  const [defaultMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', 'locationIqStreets'));
  const mapboxAccessToken = useAttributePreference('mapboxAccessToken');
  const maxZoom = useAttributePreference('web.maxZoom');
  const findNearestPosition = (positions, lat, lng) => {
    let nearest = null;
    let minDist = Infinity;
    Object.values(positions).forEach((pos) => {
      const dist = haversineDistance(lat, lng, pos.latitude, pos.longitude);
      if (dist < minDist) {
        minDist = dist;
        nearest = pos;
      }
    });
    return nearest;
  };
  useEffect(() => {
    map.setMaxZoom(maxZoom || 22);
  }, [maxZoom]);

  useEffect(() => {
    maplibregl.accessToken = mapboxAccessToken;
  }, [mapboxAccessToken]);

  useEffect(() => {
    const filteredStyles = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
    const styles = filteredStyles.length ? filteredStyles : mapStyles.filter((s) => s.id === 'osm');
    switcher.updateStyles(styles, defaultMapStyle);
  }, [mapStyles, defaultMapStyle]);

  useEffect(() => {
    const listener = (r) => setMapReady(r);
    addReadyListener(listener);
    return () => removeReadyListener(listener);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      const rect = containerEl.current?.getBoundingClientRect();
      const { lat, lng } = e.lngLat;

      const nearestPos = findNearestPosition(positions, lat, lng);
      const nearestDeviceName = nearestPos ? (devices[nearestPos.deviceId]?.name ?? null) : null;

      setContextMenu({
        visible: true,
        x: (rect?.left ?? 0) + e.point.x,
        y: (rect?.top ?? 0) + e.point.y,
        lngLat: e.lngLat,
        nearestDeviceName,
      });
    };

    map.on('contextmenu', handleContextMenu);
    return () => map.off('contextmenu', handleContextMenu);
  }, [devices, positions]);

  useEffect(() => {
    let isMiddleDown = false;
    let lastX = 0;
    let lastY = 0;
    const canvas = map.getCanvas();

    const onMouseDown = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        isMiddleDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e) => {
      if (!isMiddleDown) return;
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      map.setBearing(map.getBearing() + deltaX * 0.3);
      map.setPitch(Math.min(85, Math.max(0, map.getPitch() - deltaY * 0.3)));
    };

    const onMouseUp = (e) => {
      if (e.button === 1) {
        isMiddleDown = false;
        canvas.style.cursor = '';
      }
    };

    const onAuxClick = (e) => {
      if (e.button === 1) e.preventDefault();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('auxclick', onAuxClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('auxclick', onAuxClick);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleGeofence = useCallback(() => {
    navigate('/geofences');
  }, [navigate]);

  const handleNearestVehicle = useCallback((lngLat) => {
    const { lat, lng } = lngLat;
    const nearestPos = findNearestPosition(positions, lat, lng);
    if (!nearestPos) return;
    map.flyTo({
      center: [nearestPos.longitude, nearestPos.latitude],
      zoom: Math.max(map.getZoom(), 14),
    });
    dispatch(devicesActions.selectId(nearestPos.deviceId));
  }, [positions, dispatch]);

  const handleMeasure = useCallback((lngLat) => {
    const { lat, lng } = lngLat;
    const nearestPos = findNearestPosition(positions, lat, lng);

    if (!nearestPos || !measureControlRef.current) return;

    measureControlRef.current.startFromPoints([
      [nearestPos.longitude, nearestPos.latitude],
      [lng, lat],
    ]);
  }, [positions]);

  useLayoutEffect(() => {
    const currentEl = containerEl.current;
    currentEl.appendChild(element);
    map.resize();

    const suppressNativeMenu = (e) => e.preventDefault();
    element.addEventListener('contextmenu', suppressNativeMenu);

    const suppressMiddleScroll = (e) => {
      if (e.button === 1) e.preventDefault();
    };
    element.addEventListener('mousedown', suppressMiddleScroll);

    return () => {
      element.removeEventListener('contextmenu', suppressNativeMenu);
      element.removeEventListener('mousedown', suppressMiddleScroll);
      currentEl.removeChild(element);
    };
  }, [containerEl]);

  return (
    <>
      <div style={{ width: '100%', height: '100%' }} ref={containerEl}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type.handlesMapReady) {
            return React.cloneElement(child, { mapReady, map });
          }
          return mapReady ? child : null;
        })}
      </div>

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        lngLat={contextMenu.lngLat}
        nearestDeviceName={contextMenu.nearestDeviceName}
        onClose={handleContextMenuClose}
        onGeofence={handleGeofence}
        onNearestVehicle={handleNearestVehicle}
        onMeasure={handleMeasure}
      />
    </>
  );
};

export default MapView;
