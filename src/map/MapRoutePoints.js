import {
  useId, useCallback, useEffect, useMemo,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { findFonts } from './core/mapUtil';
import { SpeedLegendControl } from './legend/MapSpeedLegend';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { mapInteractionsActions } from '../store';

const MapRoutePoints = ({ positions, onClick, useGlobalExpansion = false }) => {
  const id = useId();
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');
  const dispatch = useDispatch();

  const shouldShowAllPoints = useSelector((state) => (useGlobalExpansion ? state.mapInteractions.showAllRoutePoints : false));

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const { simplifiedPositions } = useMemo(() => {
    if (!positions.length) return { simplifiedPositions: [] };

    const simplified = positions.filter(
      (p, i) => i === 0 || i === positions.length - 1 || i % 4 === 0,
    );

    return { simplifiedPositions: simplified };
  }, [positions]);

  const showAllPoints = useCallback(() => {
    if (!positions.length) return;

    const maxSpeed = Math.max(...positions.map((pt) => pt.speed));
    const minSpeed = Math.min(...positions.map((pt) => pt.speed));

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: positions.map((p, index) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          index,
          id: p.id,
          rotation: p.course,
          color: getSpeedColor(p.speed, minSpeed, maxSpeed),
          border: p.isReturn ? '#000000' : 'transparent',
        },
      })),
    });
  }, [positions, id]);

  const showSimplifiedPoints = useCallback(() => {
    if (!positions.length) return;

    const maxSpeed = positions.reduce((a, b) => Math.max(a, b.speed), -Infinity);
    const minSpeed = positions.reduce((a, b) => Math.min(a, b.speed), Infinity);

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: simplifiedPositions.map((p, index) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          index,
          id: p.id,
          rotation: p.course,
          color: getSpeedColor(p.speed, minSpeed, maxSpeed),
          border: p.isReturn ? '#000000' : 'transparent',
        },
      })),
    });
  }, [positions, simplifiedPositions, id]);

  const onMarkerClick = useCallback(
    (event) => {
      event.preventDefault();
      const feature = event.features[0];

      if (feature) {
        if (onClick) {
          onClick(feature.properties.id, feature.properties.index);
        }

        showAllPoints();

        if (useGlobalExpansion) {
          dispatch(mapInteractionsActions.expandRoutePoints());
        }
      }
    },
    [onClick, showAllPoints, useGlobalExpansion, dispatch],
  );

  useEffect(() => {
    if (useGlobalExpansion) {
      if (shouldShowAllPoints) {
        showAllPoints();
      } else {
        showSimplifiedPoints();
      }
    }
  }, [shouldShowAllPoints, useGlobalExpansion, showAllPoints, showSimplifiedPoints]);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': ['get', 'border'],
        'text-halo-width': 1.2,
      },
      layout: {
        'text-font': findFonts(map),
        'text-field': '▲',
        'text-allow-overlap': true,
        'text-rotate': ['get', 'rotation'],
      },
    });

    map.on('mouseenter', id, onMouseEnter);
    map.on('mouseleave', id, onMouseLeave);
    map.on('click', id, onMarkerClick);

    return () => {
      map.off('mouseenter', id, onMouseEnter);
      map.off('mouseleave', id, onMouseLeave);
      map.off('click', id, onMarkerClick);

      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [onMarkerClick, id]);

  useEffect(() => {
    if (!positions.length) {
      return () => {};
    }

    const maxSpeed = positions.reduce((a, b) => Math.max(a, b.speed), -Infinity);
    const minSpeed = positions.reduce((a, b) => Math.min(a, b.speed), Infinity);

    const control = new SpeedLegendControl(
      positions,
      speedUnit,
      t,
      maxSpeed,
      minSpeed,
    );
    map.addControl(control, 'bottom-left');

    showSimplifiedPoints();

    const handleMapClick = (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [id] });

      if (!features.length) {
        if (useGlobalExpansion) {
          dispatch(mapInteractionsActions.collapseRoutePoints());
        } else {
          showSimplifiedPoints();
        }
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.removeControl(control);
      map.off('click', handleMapClick);
    };
  }, [positions, simplifiedPositions, speedUnit, t, id, showSimplifiedPoints, useGlobalExpansion, dispatch]);

  return null;
};

export default MapRoutePoints;
