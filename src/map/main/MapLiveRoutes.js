import { useId, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/styles';
import { map } from '../core/MapView';
import { useAttributePreference } from '../../common/util/preferences';

const MapLiveRoutes = () => {
  const id = useId();
  const theme = useTheme();

  const type = useAttributePreference('mapLiveRoutes', 'none');
  const mapLineWidth = useAttributePreference('mapLineWidth', 2);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const history = useSelector((state) => state.session.history);

  // --------------------------------------------
  // Memoized list of deviceIds to render
  // --------------------------------------------
  const deviceIdsToRender = useMemo(() => {
    if (type === 'none') return [];

    return Object.values(devices)
      .map((device) => device.id)
      .filter((devId) => (type === 'selected' ? devId === selectedDeviceId : true))
      .filter((devId) => history[devId] && history[devId].length > 0);
  }, [type, devices, selectedDeviceId, history]);

  // --------------------------------------------
  // Memoized FeatureCollection for Mapbox
  // --------------------------------------------
  const featureCollection = useMemo(() => {
    if (type === 'none') {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = deviceIdsToRender.map((deviceId) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: history[deviceId],
      },
      properties: {
        color:
          devices[deviceId]?.attributes?.['web.reportColor']
          || theme.palette.geometry.main,
        width: mapLineWidth,
        opacity: mapLineOpacity,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [
    type,
    deviceIdsToRender,
    history,
    devices,
    mapLineWidth,
    mapLineOpacity,
    theme,
  ]);

  // --------------------------------------------
  // Setup Map Layer + Cleanup
  // --------------------------------------------
  useEffect(() => {
    if (type === 'none') return;

    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id,
      source: id,
      type: 'line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    });
  }, [id, type]);

  useEffect(() => {
    if (type === 'none') return;
    const source = map.getSource(id);
    if (source) {
      source.setData(featureCollection);
    }
  }, [type, featureCollection, id]);

  return null;
};

export default MapLiveRoutes;
