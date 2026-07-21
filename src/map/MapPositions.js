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
import { selectDevicesAndSelected } from '../store/selectors';
import deviceEquality from '../common/util/deviceEquality';
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

  const { devices, selectedDeviceId } = useSelector(
    selectDevicesAndSelected,
    (prev, next) => prev.selectedDeviceId === next.selectedDeviceId
      && deviceEquality(['id', 'name', 'status', 'category'])(prev.devices, next.devices),
  );

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');

  const featureCacheRef = useRef(new Map());
  const featureCacheSelectedRef = useRef(new Map());

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

  const updateMapData = useCallback(() => {
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
      const sourceObj = map?.getSource(source);
      if (!sourceObj) return;

      const cache = source === id ? featureCacheRef.current : featureCacheSelectedRef.current;
      let dirty = false;

      const activeDeviceIds = new Set(
        positions
          .filter((p) => Object.prototype.hasOwnProperty.call(devices, p.deviceId))
          .filter((p) => (source === id
            ? p.deviceId !== selectedDeviceId
            : p.deviceId === selectedDeviceId))
          .map((p) => p.deviceId),
      );

      // Remove stale entries
      cache.forEach((_, deviceId) => {
        if (!activeDeviceIds.has(deviceId)) {
          cache.delete(deviceId);
          dirty = true;
        }
      });

      positions
        .filter((p) => Object.prototype.hasOwnProperty.call(devices, p.deviceId))
        .filter((p) => (source === id
          ? p.deviceId !== selectedDeviceId
          : p.deviceId === selectedDeviceId))
        .forEach((position) => {
          const { deviceId } = position;
          const props = createFeature(devices, position, selectedPosition?.id);
          const lng = position.longitude;
          const lat = position.latitude;

          const existing = cache.get(deviceId);
          const coordChanged = !existing
            || existing.geometry.coordinates[0] !== lng
            || existing.geometry.coordinates[1] !== lat;
          const colorChanged = !existing
            || existing.properties.color !== props.color;
          const directionChanged = !existing
            || existing.properties.direction !== props.direction;

          if (!existing || coordChanged || colorChanged || directionChanged) {
            cache.set(deviceId, {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: props,
            });
            dirty = true;
          }
        });

      if (dirty) {
        sourceObj.setData({
          type: 'FeatureCollection',
          features: Array.from(cache.values()),
        });
      }
    });
  }, [id, selected, positions, devices, selectedDeviceId, selectedPosition, createFeature]);

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
    const currentZoom = map.getZoom();
    const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);

    if (currentZoom < CLUSTER_POPUP_MIN_ZOOM) {
      map.easeTo({ center: clusterCoords, zoom });
      return;
    }

    const source = map.getSource(id);
    const leaves = await source.getClusterLeaves(clusterId, Infinity, 0);

    const clusterDevices = leaves
      .map((feature) => devices[feature.properties.deviceId])
      .filter(Boolean);

    dispatch(clustersActions.showClusterPopup({
      devices: clusterDevices,
      coordinates: clusterCoords,
    }));
  }, [clusters, devices]);

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
          'symbol-sort-key': ['get', 'id'],
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
      featureCacheRef.current.clear();
      featureCacheSelectedRef.current.clear();

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
    // Always push current state to the map sources. The animation loop only
    // runs for devices that moved, so with smoothing enabled the initial
    // positions would otherwise never reach the sources and no markers or
    // clusters would render until something else called updateMapData.
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
