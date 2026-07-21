// eslint-disable-next-line import/no-unresolved
import mapboxglRtlTextUrl from '@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { googleProtocol } from 'maplibre-google-maps';
import React, {
  useRef, useLayoutEffect, useEffect, useState,
} from 'react';
import { useTheme } from '@mui/material/styles';
import { SwitcherControl } from '../switcher/switcher';
import { useAttributePreference, usePreference } from '../../common/util/preferences';
import usePersistedState, { savePersistedState } from '../../common/util/usePersistedState';
import { mapImages } from './preloadImages';
import useMapStyles, { mapBackgroundColor } from './useMapStyles';
import { FullScreenControl } from '../controls/MapFullScreen';

const element = document.createElement('div');
element.style.width = '100%';
element.style.height = '100%';
element.style.boxSizing = 'initial';

if (document.documentElement.dir === 'rtl' || document.documentElement.lang?.startsWith('ar') || document.documentElement.lang?.startsWith('he')) {
  maplibregl.setRTLTextPlugin(mapboxglRtlTextUrl);
}
maplibregl.addProtocol('google', googleProtocol);

const initialCamera = (() => {
  try {
    const saved = JSON.parse(window.localStorage.getItem('mapCamera'));
    if (saved
      && Number.isFinite(saved.longitude) && Math.abs(saved.longitude) <= 180
      && Number.isFinite(saved.latitude) && Math.abs(saved.latitude) <= 90
      && Number.isFinite(saved.zoom) && saved.zoom >= 1 && saved.zoom <= 24) {
      return saved;
    }
  } catch (error) {
    // ignore invalid persisted camera
  }
  return null;
})();

export const restoredCamera = initialCamera;

export const map = new maplibregl.Map({
  container: element,
  // Live position updates rewrite the marker sources every batch (and every
  // animation frame while devices move), which restarts the default 300ms
  // symbol fade on affected markers and makes the whole fleet pulse/blink.
  // Disable symbol fading so markers always render at full opacity.
  fadeDuration: 0,
  ...(initialCamera && {
    center: [initialCamera.longitude, initialCamera.latitude],
    zoom: initialCamera.zoom,
  }),
});

map.on('moveend', () => {
  const zoom = map.getZoom();
  // resize() also fires moveend, so skip the pre-initialization world view to
  // avoid persisting it before the camera has ever been positioned
  if (zoom >= 1) {
    const center = map.getCenter();
    try {
      savePersistedState('mapCamera', {
        longitude: center.lng,
        latitude: center.lat,
        zoom,
      });
    } catch (error) {
      // storage failures must not propagate into maplibre event dispatch
    }
  }
});

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

const MapView = ({ children }) => {
  const containerEl = useRef(null);
  const switcherRef = useRef(null);
  const theme = useTheme();
  const [mapReady, setMapReady] = useState(false);

  const mapStyles = useMapStyles();
  const activeMapStyles = useAttributePreference('activeMapStyles', 'locationIqStreets,locationIqDark,openFreeMap');
  const [defaultMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', 'locationIqStreets'));
  const mapboxAccessToken = useAttributePreference('mapboxAccessToken');
  const maxZoom = useAttributePreference('web.maxZoom');

  useEffect(() => {
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
    switcherRef.current = switcher;
    map.addControl(switcher, 'top-right');
    return () => map.removeControl(switcher);
  }, []);

  useEffect(() => {
    if (!switcherRef.current) return;
    const filteredStyles = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
    const styles = filteredStyles.length ? filteredStyles : mapStyles.filter((s) => s.available);
    switcherRef.current.updateStyles(styles, defaultMapStyle);
  }, [mapStyles, defaultMapStyle, activeMapStyles]);

  useEffect(() => {
    const fullScreenControl = new FullScreenControl();
    map.addControl(fullScreenControl, 'top-right');
    return () => map.removeControl(fullScreenControl);
  }, []);

  useEffect(() => {
    if (maxZoom) {
      map.setMaxZoom(maxZoom);
    }
  }, [maxZoom]);

  useEffect(() => {
    maplibregl.accessToken = mapboxAccessToken;
  }, [mapboxAccessToken]);

  useEffect(() => {
    const listener = (ready) => setMapReady(ready);
    addReadyListener(listener);
    return () => {
      removeReadyListener(listener);
    };
  }, []);

  useLayoutEffect(() => {
    // shown where the canvas is transparent (before a style loads and during
    // style switches); raster tile gaps are covered by each style's own
    // background layer instead
    element.style.background = theme.palette.mode === 'dark' ? theme.palette.grey[900] : mapBackgroundColor;
  }, [theme]);

  useLayoutEffect(() => {
    const currentEl = containerEl.current;
    currentEl.appendChild(element);
    map.resize();
    return () => {
      currentEl.removeChild(element);
    };
  }, [containerEl]);

  return (
    <div style={{ width: '100%', height: '100%' }} ref={containerEl}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type.handlesMapReady) {
          return React.cloneElement(child, { mapReady });
        }
        return mapReady ? child : null;
      })}
    </div>
  );
};

export default MapView;
