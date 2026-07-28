import { useTheme } from '@mui/styles';
import { useId, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { useAttributePreference } from '../common/util/preferences';
import { mapInteractionsActions } from '../store';

const MapRoutePath = ({ positions, onClick, expandPointsOnClick = false }) => {
  const id = useId();
  const theme = useTheme();
  const dispatch = useDispatch();

  const reportColor = useSelector((state) => {
    const position = positions?.find(() => true);
    if (position) {
      const attributes = state.devices.items[position.deviceId]?.attributes;
      if (attributes) {
        const color = attributes['web.reportColor'];
        if (color) {
          return color;
        }
      }
    }
    return null;
  });

  const mapLineWidth = useAttributePreference('mapLineWidth', 2);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  const onLineClick = useCallback((event) => {
    event.preventDefault();
    const feature = event.features[0];

    if (feature) {
      if (onClick) {
        const clickedLngLat = event.lngLat;
        let closestIndex = 0;
        let minDistance = Infinity;

        positions.forEach((pos, index) => {
          if (index >= positions.length - 1) return;

          const distance = Math.sqrt(
            (pos.longitude - clickedLngLat.lng) ** 2
            + (pos.latitude - clickedLngLat.lat) ** 2,
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
    }
  }, [positions, onClick, expandPointsOnClick, dispatch]);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    });

    map.addLayer({
      source: id,
      id: `${id}-line`,
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

      if (map.getLayer(`${id}-title`)) {
        map.removeLayer(`${id}-title`);
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
    if (!positions || positions.length === 0) return;

    const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);
    const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);
    const features = [];

    for (let i = 0; i < positions.length - 1; i += 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[positions[i].longitude, positions[i].latitude], [positions[i + 1].longitude, positions[i + 1].latitude]],
        },
        properties: {
          color: reportColor || getSpeedColor(
            positions[i + 1].speed,
            minSpeed,
            maxSpeed,
          ),
          width: mapLineWidth,
          opacity: mapLineOpacity,
        },
      });
    }

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [theme, positions, reportColor, id, mapLineWidth, mapLineOpacity]);

  return null;
};

export default MapRoutePath;
