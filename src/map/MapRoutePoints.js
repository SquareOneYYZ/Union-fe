import {
  useId,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { findFonts } from './core/mapUtil';
import { SpeedLegendControl } from './legend/MapSpeedLegend';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { mapInteractionsActions } from '../store';

const MapRoutePoints = ({
  positions,
  onClick,
  useGlobalExpansion = false,
}) => {
  const id = useId();
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');

  const dispatch = useDispatch();

  const shouldShowAllPoints = useSelector((state) => (
    useGlobalExpansion ? state.mapInteractions.showAllRoutePoints : false
  ));

  const clickHandlerRef = useRef(null);

  const { minSpeed, maxSpeed } = useMemo(() => {
    if (!positions.length) {
      return { minSpeed: 0, maxSpeed: 0 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < positions.length; i += 1) {
      const { speed } = positions[i];

      if (speed < min) min = speed;
      if (speed > max) max = speed;
    }

    return {
      minSpeed: min,
      maxSpeed: max,
    };
  }, [positions]);

  const simplifiedPositions = useMemo(() => {
    if (!positions.length) {
      return [];
    }

    return positions.filter(
      (p, i) => i === 0 || i === positions.length - 1 || i % 4 === 0,
    );
  }, [positions]);

  const onMouseEnter = useCallback(() => {
    map.getCanvas().style.cursor = 'pointer';
  }, []);

  const onMouseLeave = useCallback(() => {
    map.getCanvas().style.cursor = '';
  }, []);

  const showAllPoints = useCallback(() => {
    if (!positions.length) return;

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: positions.map((p, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
        properties: {
          index,
          id: p.id,
          rotation: p.course,
          color: getSpeedColor(p.speed, minSpeed, maxSpeed),
          border: p.isReturn ? '#000000' : 'transparent',
        },
      })),
    });
  }, [positions, id, minSpeed, maxSpeed]);

  const showSimplifiedPoints = useCallback(() => {
    if (!positions.length) return;

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: simplifiedPositions.map((p, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
        properties: {
          index,
          id: p.id,
          rotation: p.course,
          color: getSpeedColor(p.speed, minSpeed, maxSpeed),
          border: p.isReturn ? '#000000' : 'transparent',
        },
      })),
    });
  }, [simplifiedPositions, id, minSpeed, maxSpeed]);

  const onMarkerClick = useCallback(
    (event) => {
      event.preventDefault();

      const feature = event.features?.[0];
      if (!feature) return;

      onClick?.(feature.properties.id, feature.properties.index);

      showAllPoints();

      if (useGlobalExpansion) {
        dispatch(mapInteractionsActions.expandRoutePoints());
      }
    },
    [onClick, showAllPoints, useGlobalExpansion, dispatch],
  );

  useEffect(() => {
    clickHandlerRef.current = onMarkerClick;
  }, [onMarkerClick]);

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
      data: {
        type: 'FeatureCollection',
        features: [],
      },
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

    const onMapMarkerClick = (event) => clickHandlerRef.current?.(event);

    map.on('mouseenter', id, onMouseEnter);
    map.on('mouseleave', id, onMouseLeave);
    map.on('click', id, onMapMarkerClick);

    return () => {
      map.off('mouseenter', id, onMouseEnter);
      map.off('mouseleave', id, onMouseLeave);
      map.off('click', id, onMapMarkerClick);

      if (map.getLayer(id)) {
        map.removeLayer(id);
      }

      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [id, onMouseEnter, onMouseLeave]);

  useEffect(() => {
    if (!positions.length) return undefined;

    const control = new SpeedLegendControl(positions, speedUnit, t, maxSpeed, minSpeed);
    map.addControl(control, 'bottom-left');

    showSimplifiedPoints();

    const handleMapClick = (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [id] });

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
      map.off('click', handleMapClick);
      map.removeControl(control);
    };
  }, [
    positions,
    speedUnit,
    t,
    id,
    minSpeed,
    maxSpeed,
    showSimplifiedPoints,
    useGlobalExpansion,
    dispatch,
  ]);

  return null;
};

export default MapRoutePoints;