import { useId, useEffect } from 'react';
import circle from '@turf/circle';
import { useTheme } from '@mui/styles';
import { map } from '../core/MapView';
import { logMapWrite, registerMapWriteDebugSource, unregisterMapWriteDebugSource } from '../core/mapWriteDebug';

const MapAccuracy = ({ positions }) => {
  const id = useId();

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
    const features = positions
      .filter((position) => position.accuracy > 0)
      .map((position) => circle([position.longitude, position.latitude], position.accuracy * 0.001));
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features,
    });
    logMapWrite(id, 'setData', features.length, 'flush');
  }, [positions]);

  return null;
};

export default MapAccuracy;
