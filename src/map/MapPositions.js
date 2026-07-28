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
import { logMapWrite, registerMapWriteDebugSource, unregisterMapWriteDebugSource } from './core/mapWriteDebug';

const CLUSTER_POPUP_MIN_ZOOM = 9;

const TELEPORT_THRESHOLD_SQ = 0.0045 * 0.0045;
const STALE_GAP_MS = 10000;
const MIN_CHANGE_DEG = 0.000005;

// Every content write to a GeoJSON source — setData AND updateData alike in
// maplibre-gl 4.7.1 — re-tiles the whole source in the worker and restarts
// symbol placement (SourceCache.reload reloads every tile on any 'content'
// event), which reads as fleet-wide marker flicker. The only real lever is
// writing the fleet source less. Above this fleet size, writes go through a
// diff mirror: a write is skipped entirely when nothing render-relevant
// changed, visible changes (adds/removes/status/jumps) flush within the
// animation interval, and invisible geometry churn (clustered, off-viewport,
// hidden gliding twins) batches into one reconcile write per deferred
// interval, on moveend, or when motion stops. updateData carries the diffs so
// the remaining writes serialize only changed features.
const PER_FRAME_WRITE_MAX_FLEET = 300;
const ANIMATION_WRITE_INTERVAL_MS = 1000;
const DEFERRED_RECONCILE_INTERVAL_MS = 15000;

// Smooth glide for large fleets: devices with a fresh position glide through a
// small dedicated GeoJSON source written at ~15fps (cost is O(gliding devices),
// not fleet size), while their static twin in the full source is hidden via
// feature-state — a paint-only change with no worker round-trip. Only devices
// rendered individually inside the padded viewport participate; everything
// else keeps stepping at the reconcile cadence.
const GLIDE_WRITE_INTERVAL_MS = 66;
const GLIDE_VIEWPORT_PAD = 0.2;

const hiddenWhenAnimating = (visible) => ['case', ['boolean', ['feature-state', 'animating'], false], 0, visible];

// Render-relevant equality for the diff mirror. properties.id (per-fix
// position id) and properties.fixTime are deliberately excluded: they refresh
// on every fix even for a parked device, and comparing them would turn every
// flush into a full-fleet rewrite — the exact symptom this diff exists to
// remove. Neither is rendered on the live map (labels use titleField, default
// 'name'); they ride along whenever a device is written for a real change.
const propsRenderEqual = (a, b, titleKey) => a.properties.name === b.properties.name
  && a.properties.category === b.properties.category
  && a.properties.color === b.properties.color
  && a.properties.direction === b.properties.direction
  && a.properties[titleKey] === b.properties[titleKey];

// Field-verification trigger taxonomy: writes caused by a selection change or
// a pan keep that label; anything else is labeled by the lane it took —
// urgent diffs as 'flush-urgent', pure deferred backlog as 'reconcile-15s'.
const laneTrigger = (reason, urgentHere) => {
  if (reason === 'selection' || reason === 'moveend') return reason;
  return urgentHere ? 'flush-urgent' : 'reconcile-15s';
};

const renderEquals = (a, b, titleKey) => propsRenderEqual(a, b, titleKey)
  && a.geometry.coordinates[0] === b.geometry.coordinates[0]
  && a.geometry.coordinates[1] === b.geometry.coordinates[1]
  && a.properties.rotation === b.properties.rotation;

const MapPositions = ({ positions, onClick, showStatus, selectedPosition, titleField }) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;
  const animating = `${id}-animating`;

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
  const lastMapWriteRef = useRef(0);
  const fixTimeCacheRef = useRef({});
  // deviceId -> 'entering' | 'active' | 'landed' | 'reconciling'
  const glidePhaseRef = useRef({});
  const glideLastWriteRef = useRef(0);
  const writeGlideSourceRef = useRef(() => {});
  // per-source Map<deviceId, feature> mirroring what the map sources hold;
  // null means the source content is unknown (small-fleet path wrote it)
  const lastWrittenRef = useRef(null);
  // truthy = the mirror's features can't be trusted for diffing and the next
  // large-fleet write must rewrite fully; the value is the trigger label
  // ('load' after source creation, 'hard-reset' after derived-prop changes)
  const fullRewriteReasonRef = useRef('load');
  const lastDeferredWriteRef = useRef(0);
  const updateMapDataRef = useRef(() => {});
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    devicesRef.current = devices;
    selectedDeviceIdRef.current = selectedDeviceId;
    selectedPositionRef.current = selectedPosition;
  }, [devices, selectedDeviceId, selectedPosition]);

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
    if (map.getSource(id)) updateMapData(undefined, 'selection'); // eslint-disable-line no-use-before-define
  }, [selectedDeviceId]);

  const createFeature = useCallback((devs, position, selectedPositionId) => {
    const device = devs[position.deviceId];
    let showDirection;
    switch (directionType) {
      case 'none': showDirection = false; break;
      case 'all': showDirection = position.course > 0; break;
      default: showDirection = selectedPositionId === position.id && position.course > 0; break;
    }
    // formatTime parses the ISO string through dayjs and Intl on every call;
    // at fleet scale this dominates the main thread, so only re-format when
    // the device actually has a new fix time.
    const cache = fixTimeCacheRef.current;
    let fixTimeEntry = cache[position.deviceId];
    if (!fixTimeEntry || fixTimeEntry.raw !== position.fixTime) {
      fixTimeEntry = { raw: position.fixTime, formatted: formatTime(position.fixTime, 'seconds') };
      cache[position.deviceId] = fixTimeEntry;
    }
    return {
      id: position.id,
      deviceId: position.deviceId,
      name: device.name,
      fixTime: fixTimeEntry.formatted,
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

  const setTwinHidden = useCallback((deviceId, hidden) => {
    [id, selected].forEach((source) => {
      if (!map.getSource(source)) return;
      if (hidden) {
        map.setFeatureState({ source, id: deviceId }, { animating: true });
      } else {
        map.removeFeatureState({ source, id: deviceId }, 'animating');
      }
    });
  }, [id, selected]);

  const glideEligibleIds = useCallback((candidateIds) => {
    const bounds = map.getBounds();
    const padLng = (bounds.getEast() - bounds.getWest()) * GLIDE_VIEWPORT_PAD;
    const padLat = (bounds.getNorth() - bounds.getSouth()) * GLIDE_VIEWPORT_PAD;
    const within = (coord) => coord
      && coord.longitude >= bounds.getWest() - padLng && coord.longitude <= bounds.getEast() + padLng
      && coord.latitude >= bounds.getSouth() - padLat && coord.latitude <= bounds.getNorth() + padLat;
    const layersToQuery = [id, selected].filter((layer) => map.getLayer(layer));
    const rendered = layersToQuery.length
      ? new Set(map.queryRenderedFeatures({ layers: layersToQuery }).map((f) => f.properties.deviceId))
      : new Set();
    return candidateIds.filter((deviceId) => {
      const ds = animationStateRef.current[deviceId];
      if (!ds || !(within(ds.current) || within(ds.target))) return false;
      // devices absorbed into a cluster are not individually visible; let them
      // snap at the reconcile cadence instead of surfacing a transient marker.
      // Already-gliding devices stay eligible: their twin is transparent but
      // still placed, and feature-state keeps it out of the rendered check.
      return glidePhaseRef.current[deviceId] ? true : rendered.has(deviceId);
    });
  }, [id, selected]);

  const writeGlideSource = useCallback(() => {
    const sourceObj = map.getSource(animating);
    if (!sourceObj) return;
    const currentDevices = devicesRef.current;
    const currentSelectedId = selectedDeviceIdRef.current;
    const currentSelectedPos = selectedPositionRef.current;

    const features = Object.keys(glidePhaseRef.current)
      .map((key) => animationStateRef.current[key])
      .filter((ds) => ds && Object.prototype.hasOwnProperty.call(currentDevices, ds.properties.deviceId))
      .map((ds) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ds.current.longitude, ds.current.latitude] },
        properties: {
          ...createFeature(currentDevices, ds.properties, currentSelectedPos?.id),
          rotation: ds.current.rotation,
          selected: ds.properties.deviceId === currentSelectedId,
        },
      }));

    sourceObj.setData({ type: 'FeatureCollection', features });
    logMapWrite(animating, 'setData', features.length, 'glide');
    glideLastWriteRef.current = Date.now();
  }, [animating, createFeature]);

  useEffect(() => {
    writeGlideSourceRef.current = writeGlideSource;
  }, [writeGlideSource]);

  // 'reason' is the call site's cause ('data' for a positions/devices flush,
  // 'animation'/'landing' from the loop, 'selection', 'moveend'); the logged
  // trigger is derived from the lane a write actually takes: load,
  // flush-urgent, reconcile-15s, moveend, selection, hard-reset.
  const updateMapData = useCallback((stateVals, reason = 'data') => {
    const vals = stateVals ?? Object.values(animationStateRef.current);
    const currentDevices = devicesRef.current;
    const currentSelectedId = selectedDeviceIdRef.current;
    const currentSelectedPos = selectedPositionRef.current;

    if (vals.length <= PER_FRAME_WRITE_MAX_FLEET) {
      // small fleets and replay keep the original per-frame full-write path;
      // it writes outside the mirror, so a later large-fleet write must
      // rebuild without trusting it
      const smallTrigger = lastMapWriteRef.current === 0 && reason === 'data'
        ? 'load' : laneTrigger(reason, true);
      lastWrittenRef.current = null;
      fullRewriteReasonRef.current = 'hard-reset';
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
        logMapWrite(source, 'setData', features.length, smallTrigger);
      });

      Object.keys(glidePhaseRef.current).forEach((key) => {
        if (glidePhaseRef.current[key] === 'landed') {
          glidePhaseRef.current[key] = 'reconciling';
        }
      });

      lastMapWriteRef.current = Date.now();
      return;
    }

    // Large-fleet incremental path. Stamp the attempt (not just the write) so
    // the animation loop diffs at most once per ANIMATION_WRITE_INTERVAL_MS.
    const now = Date.now();
    lastMapWriteRef.current = now;
    const titleKey = titleField || 'name';
    const phases = glidePhaseRef.current;
    const mirror = lastWrittenRef.current;
    const fullReason = fullRewriteReasonRef.current;
    // diff only when the mirror exists AND still matches the sources; after a
    // hard reset its features are stale, but its per-source sizes still say
    // which sources hold content (used to skip empty->empty rewrites below)
    const diffable = !!mirror && !fullReason;
    const next = { [id]: new Map(), [selected]: new Map() };
    const urgent = { [id]: [], [selected]: [] };
    const deferred = { [id]: [], [selected]: [] };
    const removes = { [id]: [], [selected]: [] };
    const jumpedDs = [];
    let urgentCount = 0;
    let deferredCount = 0;

    vals.forEach((ds) => {
      const position = ds.properties;
      const { deviceId } = position;
      if (!Object.prototype.hasOwnProperty.call(currentDevices, deviceId)) return;
      const sourceKey = deviceId === currentSelectedId ? selected : id;
      const feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ds.current.longitude, ds.current.latitude] },
        properties: {
          ...createFeature(currentDevices, position, currentSelectedPos?.id),
          rotation: ds.current.rotation,
        },
      };
      const prev = diffable ? mirror[sourceKey].get(deviceId) : undefined;
      if (prev && renderEquals(prev, feature, titleKey)) {
        next[sourceKey].set(deviceId, prev);
        return;
      }
      const phase = phases[deviceId];
      if (prev && (phase === 'entering' || phase === 'active')) {
        // twin hidden, copy rendering live from the glide source: writing
        // intermediate coordinates would be invisible churn
        next[sourceKey].set(deviceId, prev);
        return;
      }
      if (prev && sourceKey === id && !ds.jumped && propsRenderEqual(prev, feature, titleKey)) {
        // pure motion of something not individually visible (clustered,
        // off-viewport, or a hidden landed twin): slow reconcile lane
        deferred[sourceKey].push(feature);
        next[sourceKey].set(deviceId, prev);
        deferredCount += 1;
        return;
      }
      urgent[sourceKey].push(feature);
      next[sourceKey].set(deviceId, feature);
      urgentCount += 1;
      if (ds.jumped) jumpedDs.push(ds);
    });

    if (diffable) {
      [id, selected].forEach((sourceKey) => {
        mirror[sourceKey].forEach((feature, deviceId) => {
          if (!next[sourceKey].has(deviceId)) {
            removes[sourceKey].push(deviceId);
            urgentCount += 1;
          }
        });
      });
    }

    // 'landing' (fleet-wide quiescence) deliberately does NOT force the flush:
    // the throttle middleware synchronizes flushes, so glides finish together
    // between flushes and quiescence recurs every cycle — forcing here would
    // reinstate a per-cycle full re-tile. Parked glide copies render the exact
    // final coordinates until the interval (or a pan) reconciles them.
    const deferredDue = deferredCount > 0 && (
      reason === 'moveend'
      || now - lastDeferredWriteRef.current >= DEFERRED_RECONCILE_INTERVAL_MS
    );
    if (diffable && urgentCount === 0 && !deferredDue) return;

    // any write flushes the deferred backlog too: the re-tile happens anyway
    [id, selected].forEach((sourceKey) => {
      deferred[sourceKey].forEach((feature) => next[sourceKey].set(feature.properties.deviceId, feature));
    });
    lastDeferredWriteRef.current = now;

    [id, selected].forEach((sourceKey) => {
      const sourceObj = map.getSource(sourceKey);
      if (!sourceObj) return;
      if (!diffable) {
        const features = [...next[sourceKey].values()];
        // rewriting a known-empty source with zero features would re-tile for
        // nothing (this was the recurring 0-feature write on the selected
        // source); a null mirror means content is unknown, so still write
        if (!features.length && mirror && mirror[sourceKey].size === 0) return;
        sourceObj.setData({ type: 'FeatureCollection', features });
        logMapWrite(sourceKey, 'setData', features.length, fullReason || 'hard-reset');
        return;
      }
      const add = urgent[sourceKey].concat(deferred[sourceKey]);
      const remove = removes[sourceKey];
      if (!add.length && !remove.length) return; // untouched source: no re-tile
      // 'add' with an existing promoteId (deviceId) replaces that feature
      sourceObj.updateData({ add, remove });
      const urgentHere = urgent[sourceKey].length + remove.length;
      logMapWrite(sourceKey, 'updateData', add.length + remove.length, laneTrigger(reason, urgentHere));
    });

    lastWrittenRef.current = next;
    fullRewriteReasonRef.current = null;
    jumpedDs.forEach((ds) => { ds.jumped = false; });

    // landed gliders are part of this write; once it is loaded their twin
    // shows the exact final position and the copy can be swapped out
    Object.keys(phases).forEach((key) => {
      if (phases[key] === 'landed') {
        phases[key] = 'reconciling';
      }
    });
  }, [id, selected, createFeature, titleField]);

  useEffect(() => {
    updateMapDataRef.current = updateMapData;
    // feature properties are derived through createFeature/titleField; when
    // those change the mirror's features no longer match the sources, so the
    // next write rebuilds fully (the mirror maps are kept: their sizes still
    // say which sources hold content). On mount this runs before the source
    // effect, which overwrites the reason with 'load'.
    fullRewriteReasonRef.current = 'hard-reset';
  }, [updateMapData]);

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
        const { deviceId } = ds.properties;
        const phase = glidePhaseRef.current[deviceId];
        if (phase === 'entering') {
          // the twin was never hidden, so just drop out of the glide source
          delete glidePhaseRef.current[deviceId];
        } else if (phase === 'active') {
          glidePhaseRef.current[deviceId] = 'landed';
        }
      }
      needsUpdate = true;
    });

    if (needsUpdate) {
      const stillAnimating = stateVals.some((ds) => ds.target);
      const writeInterval = stateVals.length > PER_FRAME_WRITE_MAX_FLEET ? ANIMATION_WRITE_INTERVAL_MS : 0;
      if (!stillAnimating || now - lastMapWriteRef.current >= writeInterval) {
        updateMapData(stateVals, stillAnimating ? 'animation' : 'landing');
      }
      if (Object.keys(glidePhaseRef.current).length
        && (!stillAnimating || now - glideLastWriteRef.current >= GLIDE_WRITE_INTERVAL_MS)) {
        // the !stillAnimating write parks every copy at its exact final
        // coordinates for the reconcile handoff
        writeGlideSource();
      }
    }

    if (hasTargets) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      isAnimatingRef.current = false;
      animationFrameRef.current = null;
    }
  }, [baseAnimationDuration, updateMapData, writeGlideSource]);

  const updateAnimationState = useCallback((newPositions) => {
    const now = Date.now();
    const state = animationStateRef.current;
    let newTargetAdded = false;
    const targetedIds = [];

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
        // jumped: a discontinuous (or unsmoothed) move may be visible, so the
        // incremental writer treats it as urgent instead of deferring it
        state[deviceId] = { current: { longitude, latitude, rotation }, target: null, startTime: now, properties: position, jumped: true };
        lastUpdateTimeRef.current[deviceId] = now;
        const phase = glidePhaseRef.current[deviceId];
        if (phase === 'entering') {
          delete glidePhaseRef.current[deviceId];
        } else if (phase === 'active') {
          glidePhaseRef.current[deviceId] = 'landed';
        }
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
      targetedIds.push(deviceId);
    });

    const activeIds = new Set(newPositions.map((p) => p.deviceId));
    Object.keys(state).forEach((key) => {
      const deviceId = Number(key);
      if (!activeIds.has(deviceId)) {
        delete state[deviceId];
        delete lastUpdateTimeRef.current[deviceId];
        delete lastCoordRef.current[deviceId];
        delete fixTimeCacheRef.current[deviceId];
        if (glidePhaseRef.current[deviceId]) {
          setTwinHidden(deviceId, false);
          delete glidePhaseRef.current[deviceId];
        }
      }
    });

    if (targetedIds.length && Object.keys(state).length > PER_FRAME_WRITE_MAX_FLEET) {
      let entered = false;
      glideEligibleIds(targetedIds).forEach((deviceId) => {
        const phase = glidePhaseRef.current[deviceId];
        if (!phase) {
          glidePhaseRef.current[deviceId] = 'entering';
          entered = true;
        } else if (phase === 'landed' || phase === 'reconciling') {
          // re-glide before the reconcile swap finished: the twin is still
          // hidden, so the copy just keeps moving
          glidePhaseRef.current[deviceId] = 'active';
        }
      });
      if (entered) {
        // write the copy immediately so its features exist before the loaded
        // event that hides the twins; until then both render at the same spot
        writeGlideSource();
      }
    }

    if (newTargetAdded && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [enableSmoothing, calculateAnimationDuration, animate, glideEligibleIds, setTwinHidden, writeGlideSource]);

  const onMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
  const onMouseLeave = () => { map.getCanvas().style.cursor = ''; };

  // These handlers are dependencies of the structural effect that owns the
  // sources and layers. They read everything per-render state through refs so
  // their identities never change: if any of them picked up a new identity on
  // a WS flush (the devices selector changes every flush), the structural
  // effect would tear down and recreate the sources each cycle, destroying
  // the diff mirror and re-tiling the fleet — the prod blink.
  const onMapClick = useCallback((event) => {
    if (!event.defaultPrevented && onClickRef.current) onClickRef.current(event.lngLat.lat, event.lngLat.lng);
  }, []);

  const onMarkerClick = useCallback((event) => {
    event.preventDefault();
    const { id: fId, deviceId } = event.features[0].properties;
    if (onClickRef.current) onClickRef.current(fId, deviceId);
  }, []);

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
      .map((feature) => devicesRef.current[feature.properties.deviceId])
      .filter(Boolean);

    dispatch(clustersActions.showClusterPopup({
      devices: clusterDevices,
      coordinates: clusterCoords,
    }));
  }, [clusters, dispatch]);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
      // stable per-device feature ids so feature-state can hide gliding twins
      promoteId: 'deviceId',
    });
    map.addSource(selected, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'deviceId',
    });
    map.addSource(animating, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    registerMapWriteDebugSource(id, 'fleet');
    registerMapWriteDebugSource(selected, 'selected');
    registerMapWriteDebugSource(animating, 'glide');
    // sources were just (re)created empty: start from a known-empty mirror so
    // the first write is a 'load' setData and empty sources are never written
    lastWrittenRef.current = { [id]: new Map(), [selected]: new Map() };
    fullRewriteReasonRef.current = 'load';

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
          'icon-opacity': hiddenWhenAnimating(1),
          'text-opacity': hiddenWhenAnimating(1),
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
        paint: {
          'icon-opacity': hiddenWhenAnimating(1),
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

    // mirror of the marker layers fed by the small glide source; inserted
    // below the clusters layer so stacking matches the static markers
    map.addLayer({
      id: animating,
      type: 'symbol',
      source: animating,
      layout: {
        'icon-image': '{category}-{color}',
        'icon-size': ['case', ['==', ['get', 'selected'], true], iconScale * 1.3, iconScale],
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
      },
    }, clusters);
    map.addLayer({
      id: `direction-${animating}`,
      type: 'symbol',
      source: animating,
      filter: ['==', 'direction', true],
      layout: {
        'icon-image': 'direction',
        'icon-size': ['case', ['==', ['get', 'selected'], true], iconScale * 1.3, iconScale],
        'icon-allow-overlap': true,
        'icon-rotate': ['get', 'rotation'],
        'icon-rotation-alignment': 'map',
      },
    }, clusters);
    map.on('mouseenter', animating, onMouseEnter);
    map.on('mouseleave', animating, onMouseLeave);
    map.on('click', animating, onMarkerClick);

    const onGlideSourceData = (event) => {
      if (!event.isSourceLoaded) return;
      const phases = glidePhaseRef.current;
      if (event.sourceId === animating) {
        // the copy is rendered from here on; hiding the twin in the same
        // frame swaps them without a gap
        Object.keys(phases).forEach((key) => {
          if (phases[key] === 'entering') {
            setTwinHidden(Number(key), true);
            phases[key] = 'active';
          }
        });
      } else if ((event.sourceId === id || event.sourceId === selected)
        && map.getSource(id) && map.isSourceLoaded(id)
        && map.getSource(selected) && map.isSourceLoaded(selected)) {
        let removed = false;
        Object.keys(phases).forEach((key) => {
          if (phases[key] === 'reconciling') {
            setTwinHidden(Number(key), false);
            delete phases[key];
            removed = true;
          }
        });
        if (removed) writeGlideSourceRef.current();
      }
    };
    map.on('sourcedata', onGlideSourceData);

    const onGlideMoveEnd = () => {
      const phases = glidePhaseRef.current;
      const state = animationStateRef.current;
      if (Object.keys(state).length <= PER_FRAME_WRITE_MAX_FLEET) return;
      let changed = false;
      // gliders that left the padded viewport swap back invisibly off-screen
      const eligibleNow = new Set(glideEligibleIds(Object.keys(phases).map(Number)));
      Object.keys(phases).map(Number).forEach((deviceId) => {
        if (!eligibleNow.has(deviceId)) {
          setTwinHidden(deviceId, false);
          delete phases[deviceId];
          changed = true;
        }
      });
      // mid-glide devices that scrolled into view join the glide source
      const midGlide = Object.keys(state)
        .map(Number)
        .filter((deviceId) => state[deviceId].target && !phases[deviceId]);
      glideEligibleIds(midGlide).forEach((deviceId) => {
        phases[deviceId] = 'entering';
        changed = true;
      });
      if (changed) writeGlideSourceRef.current();
      // the pan/zoom may have revealed devices whose deferred coordinates are
      // stale; flush the backlog while the repaint masks the re-tile
      updateMapDataRef.current(undefined, 'moveend');
    };
    map.on('moveend', onGlideMoveEnd);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      unregisterMapWriteDebugSource(id);
      unregisterMapWriteDebugSource(selected);
      unregisterMapWriteDebugSource(animating);
      map.off('sourcedata', onGlideSourceData);
      map.off('moveend', onGlideMoveEnd);
      map.off('mouseenter', clusters, onMouseEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClick);
      if (map.getLayer(clusters)) map.removeLayer(clusters);

      map.off('mouseenter', animating, onMouseEnter);
      map.off('mouseleave', animating, onMouseLeave);
      map.off('click', animating, onMarkerClick);
      if (map.getLayer(animating)) map.removeLayer(animating);
      if (map.getLayer(`direction-${animating}`)) map.removeLayer(`direction-${animating}`);
      if (map.getSource(animating)) map.removeSource(animating);
      glidePhaseRef.current = {};
      glideLastWriteRef.current = 0;
      lastWrittenRef.current = null;

      [id, selected].forEach((source) => {
        map.off('mouseenter', source, onMouseEnter);
        map.off('mouseleave', source, onMouseLeave);
        map.off('click', source, onMarkerClick);
        if (map.getLayer(source)) map.removeLayer(source);
        if (map.getLayer(`direction-${source}`)) map.removeLayer(`direction-${source}`);
        if (map.getSource(source)) {
          map.removeFeatureState({ source });
          map.removeSource(source);
        }
      });
    };
  }, [mapCluster, clusters, onMarkerClick, onClusterClick, iconScale, titleField, id, selected, animating, onMapClick, setTwinHidden, glideEligibleIds]);

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
      map.setPaintProperty(id, 'icon-opacity', hiddenWhenAnimating(faded));
      map.setPaintProperty(`direction-${id}`, 'icon-opacity', hiddenWhenAnimating(faded));
    }
    if (map.getLayer(animating)) {
      // the glide source mixes selected and non-selected devices; dim to match
      const copyFaded = ['case', ['==', ['get', 'selected'], true], 1, faded];
      map.setPaintProperty(animating, 'icon-opacity', copyFaded);
      map.setPaintProperty(`direction-${animating}`, 'icon-opacity', copyFaded);
    }
  }, [selectedPosition?.deviceId]);
  return null;
};

export default MapPositions;
