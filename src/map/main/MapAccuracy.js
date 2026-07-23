import { useId, useEffect, useRef } from 'react';
import circle from '@turf/circle';
import { useTheme } from '@mui/styles';
import { map } from '../core/MapView';
import { logMapWrite, registerMapWriteDebugSource, unregisterMapWriteDebugSource } from '../core/mapWriteDebug';

const MapAccuracy = ({ positions }) => {
  const id = useId();
  // starts as the signature of an empty collection: a fleet with no accuracy
  // circles never writes at all (the source is created empty already)
  const lastSignatureRef = useRef('');
  const hasWrittenRef = useRef(false);

  const theme = useTheme();

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    registerMapWriteDebugSource(id, 'accuracy');
    map.addLayer({
      source: id,
      id,
      type: 'fill',
      filter: [
        'all',
        ['==', '$type', 'Polygon'],
      ],
      paint: {
        'fill-color': theme.palette.geometry.main,
        'fill-outline-color': theme.palette.geometry.main,
        'fill-opacity': 0.25,
      },
    });

    return () => {
      unregisterMapWriteDebugSource(id);
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, []);

  useEffect(() => {
    // the positions array gets a new identity every WS flush even when no
    // device moved; every setData re-tiles the source, so skip the write (and
    // the turf circle generation) unless an accuracy circle actually changed
    const relevant = positions.filter((position) => position.accuracy > 0);
    const signature = relevant
      .map((p) => `${p.deviceId}:${p.longitude}:${p.latitude}:${p.accuracy}`)
      .join('|');
    if (signature === lastSignatureRef.current) return;
    const sourceObj = map.getSource(id);
    if (!sourceObj) return;
    lastSignatureRef.current = signature;
    const features = relevant
      .map((position) => circle([position.longitude, position.latitude], position.accuracy * 0.001));
    sourceObj.setData({
      type: 'FeatureCollection',
      features,
    });
    logMapWrite(id, 'setData', features.length, hasWrittenRef.current ? 'flush-urgent' : 'load');
    hasWrittenRef.current = true;
  }, [positions]);

  return null;
};

export default MapAccuracy;
