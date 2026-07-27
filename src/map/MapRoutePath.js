import { useTheme } from '@mui/styles';
import { useId, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { useAttributePreference } from '../common/util/preferences';
import { mapInteractionsActions } from '../store';

const MapRoutePath = ({
  positions,
  onClick,
  expandPointsOnClick = false,
}) => {
  const id = useId();
  const theme = useTheme();
  const dispatch = useDispatch();

  const mapLineWidth = useAttributePreference('mapLineWidth', 2);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  const reportColor = useSelector((state) => {
    if (!positions?.length) return null;

    const position = positions[0];
    const attributes = state.devices.items[position.deviceId]?.attributes;

    return attributes?.['web.reportColor'] || null;
  });

  const { minSpeed, maxSpeed } = useMemo(() => {
    if (!positions?.length) {
      return { minSpeed: 0, maxSpeed: 0 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < positions.length; i += 1) {
      const speed = positions[i].speed;

      if (speed < min) min = speed;
      if (speed > max) max = speed;
    }

    return {
      minSpeed: min,
      maxSpeed: max,
    };
  }, [positions]);

  const routeFeatures = useMemo(() => {
    if (!positions?.length) return [];

    const features = [];

    for (let i = 0; i < positions.length - 1; i += 1) {
      const current = positions[i];
      const next = positions[i + 1];

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [current.longitude, current.latitude],
            [next.longitude, next.latitude],
          ],
        },
        properties: {
          color: reportColor || getSpeedColor(
            next.speed,
            minSpeed,
            maxSpeed,
          ),
          width: mapLineWidth,
          opacity: mapLineOpacity,
        },
      });
    }

    return features;
  }, [
    positions,
    reportColor,
    minSpeed,
    maxSpeed,
    mapLineWidth,
    mapLineOpacity,
  ]);

  const onLineClick = useCallback((event) => {
    event.preventDefault();

    if (!event.features?.length) {
      return;
    }

    if (onClick) {
      const clickedLngLat = event.lngLat;

      let closestIndex = 0;
      let minDistance = Infinity;

      positions.forEach((position, index) => {
        if (index >= positions.length - 1) return;

        const distance = Math.sqrt(
          (position.longitude - clickedLngLat.lng) ** 2
          + (position.latitude - clickedLngLat.lat) ** 2,
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      onClick(positions[closestIndex].id, closestIndex);
    }

    if (expandPointsOnClick) {
      dispatch(mapInteractionsActions.expandRoutePoints());
    }
  }, [
    positions,
    onClick,
    expandPointsOnClick,
    dispatch,
  ]);

  useEffect(() => {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }

    if (!map.getLayer(`${id}-line`)) {
      map.addLayer({
        id: `${id}-line`,
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
    }

    if (expandPointsOnClick) {
      map.on('click', `${id}-line`, onLineClick);

      map.on('mouseenter', `${id}-line`, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', `${id}-line`, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    return () => {
      if (expandPointsOnClick) {
        map.off('click', `${id}-line`, onLineClick);
        map.off('mouseenter', `${id}-line`);
        map.off('mouseleave', `${id}-line`);
      }

      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }

      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [id, expandPointsOnClick, onLineClick]);

  useEffect(() => {
    const source = map.getSource(id);

    if (!source) return;

    requestAnimationFrame(() => {
      source.setData({
        type: 'FeatureCollection',
        features: routeFeatures,
      });
    });
  }, [id, routeFeatures, theme]);

  return null;
};

export default MapRoutePath;