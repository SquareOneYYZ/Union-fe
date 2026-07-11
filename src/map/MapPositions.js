import {
  useId, useCallback, useEffect, useRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/styles';
import { map } from './core/MapView';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts } from './core/mapUtil';
import { lerp, easeInOutCubic, interpolateRotation } from '../common/util/useAnimation';
import { clustersActions } from '../store/cluster';

const CLUSTER_POPUP_MIN_ZOOM = 9;

const TELEPORT_THRESHOLD_SQ = 0.0045 * 0.0045;
const STALE_GAP_MS = 10000;
const MIN_CHANGE_DEG = 0.000005;

const MapPositions = ({ positions, onClick, showStatus, selectedPosition, titleField }) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;

  const dispatch = useDispatch();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');
  const baseAnimationDuration = useAttributePreference('mapAnimationDuration', 2500);
  const enableSmoothing = useAttributePreference('mapEnableSmoothing', true);
  const useAdaptiveTiming = useAttributePreference('mapAdaptiveTiming', true);

  const animationStateRef = useRef({});
  const animationFrameRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const devicesRef = useRef(devices);
  const selectedDeviceIdRef = useRef(selectedDeviceId);
  const selectedPositionRef = useRef(selectedPosition);
  const lastUpdateTimeRef = useRef({});
  const lastCoordRef = useRef({});

  useEffect(() => {
    devicesRef.current = devices;
    selectedDeviceIdRef.current = selectedDeviceId;
    selectedPositionRef.current = selectedPosition;
  }, [devices, selectedDeviceId, selectedPosition]);

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
    if (map.getSource(id)) updateMapData(); // eslint-disable-line no-use-before-define
  }, [selectedDeviceId]);

  const createFeature = useCallback((devs, position, selectedPositionId) => {
    const device = devs[position.deviceId];
    let showDirection;
    switch (directionType) {
      case 'none': showDirection = false; break;
      case 'all': showDirection = position.course > 0; break;
      default: showDirection = selectedPositionId === position.id && position.course > 0; break;
    }
    return {
      id: position.id,
      deviceId: position.deviceId,
      name: device.name,
      fixTime: formatTime(position.fixTime, 'seconds'),
      category: mapIconKey(device.category),
      color: showStatus ? position.attributes.color || getStatusColor(device.status) : 'neutral',
      rotation: position.course,
      direction: showDirection,
    };
  }, [directionType, showStatus]);

  const calculateAnimationDuration = useCallback((deviceId, now) => {
    if (!useAdaptiveTiming) return baseAnimationDuration;
    const lastUpdate = lastUpdateTimeRef.current[deviceId];
    if (!lastUpdate) return baseAnimationDuration;
    const gap = now - lastUpdate;
    if (gap > STALE_GAP_MS) return 300;
    return Math.max(500, Math.min(gap * 0.8, 5000));
  }, [baseAnimationDuration, useAdaptiveTiming]);

  const updateMapData = useCallback((stateVals) => {
    const vals = stateVals ?? Object.values(animationStateRef.current);
    const currentDevices = devicesRef.current;
    const currentSelectedId = selectedDeviceIdRef.current;
    const currentSelectedPos = selectedPositionRef.current;

    [id, selected].forEach((source) => {
      const sourceObj = map.getSource(source);
      if (!sourceObj) return;

      const features = vals
        .filter((ds) => Object.prototype.hasOwnProperty.call(currentDevices, ds.properties.deviceId))
        .filter((ds) => {
          const isSel = ds.properties.deviceId === currentSelectedId;
          return source === id ? !isSel : isSel;
        })
        .map((ds) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ds.current.longitude, ds.current.latitude] },
          properties: {
            ...createFeature(currentDevices, ds.properties, currentSelectedPos?.id),
            rotation: ds.current.rotation,
          },
        }));

      sourceObj.setData({ type: 'FeatureCollection', features });
    });
  }, [id, selected, createFeature]);

  const animate = useCallback(() => {
    const now = Date.now();
    const stateVals = Object.values(animationStateRef.current);
    let needsUpdate = false;
    let hasTargets = false;

    stateVals.forEach((ds) => {
      if (!ds.target) return;
      hasTargets = true;

      const progress = Math.min((now - ds.startTime) / (ds.duration || baseAnimationDuration), 1);
      const eased = easeInOutCubic(progress);

      ds.current = {
        longitude: lerp(ds.start.longitude, ds.target.longitude, eased),
        latitude: lerp(ds.start.latitude, ds.target.latitude, eased),
        rotation: interpolateRotation(ds.start.rotation, ds.target.rotation, eased),
      };

      if (progress >= 1) {
        ds.current = { ...ds.target };
        ds.target = null;
        ds.start = null;
      }
      needsUpdate = true;
    });

    if (needsUpdate) updateMapData(stateVals);

    if (hasTargets) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      isAnimatingRef.current = false;
      animationFrameRef.current = null;
    }
  }, [baseAnimationDuration, updateMapData]);

  const updateAnimationState = useCallback((newPositions) => {
    const now = Date.now();
    const state = animationStateRef.current;
    let newTargetAdded = false;

    newPositions.forEach((position) => {
      const { deviceId, longitude, latitude, course } = position;
      const rotation = course || 0;
      const lastCoord = lastCoordRef.current[deviceId];

      if (lastCoord) {
        const dLng = Math.abs(lastCoord.lng - longitude);
        const dLat = Math.abs(lastCoord.lat - latitude);
        if (dLng < MIN_CHANGE_DEG && dLat < MIN_CHANGE_DEG) {
          if (state[deviceId]) state[deviceId].properties = position;
          return;
        }
      }

      lastCoordRef.current[deviceId] = { lng: longitude, lat: latitude };
      const currentState = state[deviceId];

      if (!currentState) {
        state[deviceId] = { current: { longitude, latitude, rotation }, target: null, startTime: now, properties: position };
        lastUpdateTimeRef.current[deviceId] = now;
        return;
      }

      const { longitude: cLng, latitude: cLat } = currentState.current;
      const hasMoved = Math.abs(cLng - longitude) > MIN_CHANGE_DEG || Math.abs(cLat - latitude) > MIN_CHANGE_DEG;

      if (!hasMoved) {
        state[deviceId].properties = position;
        lastUpdateTimeRef.current[deviceId] = now;
        return;
      }

      const isJump = (longitude - cLng) ** 2 + (latitude - cLat) ** 2 > TELEPORT_THRESHOLD_SQ;
      if (isJump || !enableSmoothing) {
        state[deviceId] = { current: { longitude, latitude, rotation }, target: null, startTime: now, properties: position };
        lastUpdateTimeRef.current[deviceId] = now;
        return;
      }

      const duration = calculateAnimationDuration(deviceId, now);
      lastUpdateTimeRef.current[deviceId] = now;
      state[deviceId] = {
        ...currentState,
        start: { ...currentState.current },
        target: { longitude, latitude, rotation },
        startTime: now,
        duration,
        properties: position,
      };
      newTargetAdded = true;
    });

    const activeIds = new Set(newPositions.map((p) => p.deviceId));
    Object.keys(state).forEach((key) => {
      const deviceId = Number(key);
      if (!activeIds.has(deviceId)) {
        delete state[deviceId];
        delete lastUpdateTimeRef.current[deviceId];
        delete lastCoordRef.current[deviceId];
      }
    });

    if (newTargetAdded && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [enableSmoothing, calculateAnimationDuration, animate]);

  const onMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
  const onMouseLeave = () => { map.getCanvas().style.cursor = ''; };

  const onMapClick = useCallback((event) => {
    if (!event.defaultPrevented && onClick) onClick(event.lngLat.lat, event.lngLat.lng);
  }, [onClick]);

  const onMarkerClick = useCallback((event) => {
    event.preventDefault();
    const { id: fId, deviceId } = event.features[0].properties;
    if (onClick) onClick(fId, deviceId);
  }, [onClick]);

  const onClusterClick = useCatchCallback(async (event) => {
    event.preventDefault();
    const features = map.queryRenderedFeatures(event.point, {
      layers: [clusters],
    });

    const clusterFeature = features[0];
    const clusterId = clusterFeature.properties.cluster_id;
    const clusterCoords = clusterFeature.geometry.coordinates;
    const pointCount = clusterFeature.properties.point_count; // ← already available

    const metersPerPixel = (156543.03392 * Math.cos((clusterCoords[1] * Math.PI) / 180)) / (2 ** map.getZoom());
    const visibleWidthKm = (map.getCanvas().width * metersPerPixel) / 1000;

    const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);

    if (visibleWidthKm > 739 || pointCount < 10) {
      map.easeTo({ center: clusterCoords, zoom });
      return;
    }

    const clusterPoint = map.project(clusterCoords);
    const radius = 50;
    const bounds = [
      map.unproject([clusterPoint.x - radius, clusterPoint.y - radius]),
      map.unproject([clusterPoint.x + radius, clusterPoint.y + radius]),
    ];

    const clusterPositions = positions.filter((pos) =>
      pos.longitude >= bounds[0].lng &&
      pos.longitude <= bounds[1].lng &&
      pos.latitude <= bounds[0].lat &&
      pos.latitude >= bounds[1].lat
    );

    const clusterDevices = clusterPositions
      .map((pos) => devices[pos.deviceId])
      .filter(Boolean);

    dispatch(clustersActions.showClusterPopup({
      devices: clusterDevices,
      coordinates: clusterCoords,
    }));

    map.easeTo({ center: clusterCoords, zoom });
  }, [clusters, positions, devices]);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    map.addSource(selected, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    [id, selected].forEach((source) => {
      const isSelectedLayer = source === selected;

      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{category}-{color}',
          'icon-size': isSelectedLayer ? iconScale * 1.3 : iconScale,
          'icon-allow-overlap': true,
          'text-field': `{${titleField || 'name'}}`,
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -2 * iconScale],
          'text-font': findFonts(map),
          'text-size': 12,
        },
        paint: {
          'text-halo-color': 'white',
          'text-halo-width': 1,
          'icon-opacity': 1,
        },
      });

      map.addLayer({
        id: `direction-${source}`,
        type: 'symbol',
        source,
        filter: ['all', ['!has', 'point_count'], ['==', 'direction', true]],
        layout: {
          'icon-image': 'direction',
          'icon-size': isSelectedLayer ? iconScale * 1.3 : iconScale,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
        },
      });
      map.on('mouseenter', source, onMouseEnter);
      map.on('mouseleave', source, onMouseLeave);
      map.on('click', source, onMarkerClick);
    });

    map.addLayer({
      id: clusters,
      type: 'symbol',
      source: id,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'background',
        'icon-size': iconScale,
        // without allow-overlap, dense areas collision-cull the cluster icon
        // (large clusters render as bare text and become un-clickable)
        'icon-allow-overlap': true,
        'text-allow-overlap': true,
        'text-field': '{point_count_abbreviated}',
        'text-font': findFonts(map),
        'text-size': 14,
      },
    });
    map.on('mouseenter', clusters, onMouseEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      map.off('mouseenter', clusters, onMouseEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClick);
      if (map.getLayer(clusters)) map.removeLayer(clusters);

      [id, selected].forEach((source) => {
        map.off('mouseenter', source, onMouseEnter);
        map.off('mouseleave', source, onMouseLeave);
        map.off('click', source, onMarkerClick);
        if (map.getLayer(source)) map.removeLayer(source);
        if (map.getLayer(`direction-${source}`)) map.removeLayer(`direction-${source}`);
        if (map.getSource(source)) map.removeSource(source);
      });
    };
  }, [mapCluster, clusters, onMarkerClick, onClusterClick, iconScale, titleField, id, selected, onMapClick]);

  useEffect(() => {
    const filtered = positions.filter((p) => Object.prototype.hasOwnProperty.call(devices, p.deviceId));
    updateAnimationState(filtered);
    updateMapData();
  }, [positions, devices, enableSmoothing, updateAnimationState, updateMapData]);

  useEffect(() => {
    const faded = selectedPosition ? 0.5 : 1;
    if (map.getLayer(id)) {
      map.setPaintProperty(id, 'icon-opacity', faded);
      map.setPaintProperty(`direction-${id}`, 'icon-opacity', faded);
    }
  }, [selectedPosition?.deviceId]);
  return null;
};

export default MapPositions;
