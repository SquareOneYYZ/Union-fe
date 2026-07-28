/**
 * Write-cadence harness for MapPositions at fleet scale.
 *
 * Drives the real component against a recording fake map with fake timers:
 * 2,700 devices, one throttled flush every 1.5s, ~10% moving, ~150 devices
 * individually rendered in the viewport (the rest clustered/off-screen).
 *
 * Every setData/updateData call on the fleet source re-tiles the whole source
 * and restarts symbol placement in MapLibre (SourceCache.reload reloads every
 * tile on any content update), so the steady-state contract asserted here is
 * write AVOIDANCE: a flush where no render-relevant datum changed must produce
 * zero fleet-source writes, and pure-motion churn must coalesce into rare
 * deferred reconcile writes whose diff size is proportional to the number of
 * changed devices, never the fleet.
 */
import React, { act } from 'react';
import {
  describe, it, expect, beforeAll, afterAll, vi,
} from 'vitest';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';

const { fake } = vi.hoisted(() => {
  const handlers = new Map();
  const sources = new Map();
  const layers = new Map();
  const fake = {
    sourceOrder: [],
    writes: [],
    featureStateCalls: [],
    renderedDeviceIds: new Set(),
    reset() { this.writes = []; this.featureStateCalls = []; },
  };
  const fire = (event, payload) => {
    const set = handlers.get(event);
    if (set) [...set].forEach((h) => h(payload));
  };
  // real MapLibre acknowledges a write asynchronously after the worker
  // round-trip; firing synchronously would let handlers observe state from
  // before the write completed
  const contentEvent = (sourceId) => setTimeout(() => fire('sourcedata', {
    dataType: 'source', sourceDataType: 'content', sourceId, isSourceLoaded: true,
  }), 0);
  const makeSource = (id, def) => ({
    _def: def,
    setData(data) {
      fake.writes.push({ sourceId: id, method: 'setData', count: data.features.length, features: data.features });
      contentEvent(id);
    },
    updateData(diff) {
      const count = (diff.add?.length || 0) + (diff.update?.length || 0) + (diff.remove?.length || 0);
      fake.writes.push({ sourceId: id, method: 'updateData', count, diff });
      contentEvent(id);
    },
  });
  fake.map = {
    addSource(id, def) { sources.set(id, makeSource(id, def)); fake.sourceOrder.push(id); },
    getSource(id) { return sources.get(id); },
    removeSource(id) { sources.delete(id); },
    addLayer(def) { layers.set(def.id, def); },
    getLayer(id) { return layers.get(id); },
    removeLayer(id) { layers.delete(id); },
    on(event, a, b) {
      const key = b ? `${event}:${a}` : event;
      if (!handlers.has(key)) handlers.set(key, new Set());
      handlers.get(key).add(b || a);
    },
    off(event, a, b) {
      const key = b ? `${event}:${a}` : event;
      handlers.get(key)?.delete(b || a);
    },
    fire,
    getBounds: () => ({
      getWest: () => -10, getEast: () => 10, getSouth: () => -10, getNorth: () => 10,
    }),
    queryRenderedFeatures: () => [...fake.renderedDeviceIds].map((deviceId) => ({ properties: { deviceId } })),
    setFeatureState(target, stateObj) { fake.featureStateCalls.push({ op: 'set', target, stateObj }); },
    removeFeatureState(target, key) { fake.featureStateCalls.push({ op: 'remove', target, key }); },
    isSourceLoaded: () => true,
    getZoom: () => 10,
    getCanvas: () => ({ style: {} }),
    setPaintProperty: () => {},
    easeTo: () => {},
  };
  return { fake };
});

vi.mock('./core/MapView', () => ({ map: fake.map }));
vi.mock('./core/preloadImages', () => ({ mapIconKey: (category) => category || 'default' }));
vi.mock('./core/mapUtil', () => ({ findFonts: () => ['Roboto Regular'] }));
vi.mock('../common/util/preferences', () => ({
  useAttributePreference: (key, defaultValue) => ({
    mapCluster: true,
    mapDirection: 'selected',
    mapAnimationDuration: 2500,
    mapEnableSmoothing: true,
    mapAdaptiveTiming: true,
    iconScale: 0.75,
  }[key] ?? defaultValue),
}));
vi.mock('@mui/material', () => ({ useMediaQuery: () => true }));
vi.mock('@mui/styles', () => ({ useTheme: () => ({ breakpoints: { up: () => 'md' } }) }));

/* eslint-disable import/first */
import MapPositions from './MapPositions';
import { devicesReducer as devices, devicesActions } from '../store/devices';
import { sessionReducer as session } from '../store/session';
import { errorsReducer as errors } from '../store/errors';
import { clustersReducer as clusters } from '../store/cluster';
/* eslint-enable import/first */

window.IS_REACT_ACT_ENVIRONMENT = true;

const FLEET = 2700;
const VISIBLE = 150;
const FLUSH_MS = 1500;
const MOVER_STRIDE = 10; // every 10th device moves => 270 movers, 15 of them visible
const MOVE_STEP = 0.0008; // > MIN_CHANGE_DEG, < teleport threshold

describe('MapPositions steady-state write cadence (2700 devices)', () => {
  let store;
  let root;
  let container;
  let posId = 1;
  let simTime;
  const coords = [];

  const deviceList = Array.from({ length: FLEET }, (_, i) => ({
    id: i + 1,
    name: `Device ${i + 1}`,
    category: 'car',
    status: 'online',
  }));

  const makePositions = () => deviceList.map((device, i) => ({
    id: (posId += 1),
    deviceId: device.id,
    longitude: coords[i].lng,
    latitude: coords[i].lat,
    course: 0,
    accuracy: 0,
    fixTime: new Date(simTime).toISOString(),
    attributes: {},
  }));

  // stable like MainMap's memoized handler; an inline closure would re-run
  // the structural effect (source teardown/re-add) on every render
  const onClick = () => {};

  const render = (positions, selectedPosition = null) => {
    act(() => {
      root.render(
        <Provider store={store}>
          <MapPositions positions={positions} onClick={onClick} showStatus selectedPosition={selectedPosition} />
        </Provider>,
      );
    });
  };

  const flush = ({ movers = false } = {}) => {
    simTime += FLUSH_MS;
    if (movers) {
      for (let i = 0; i < FLEET; i += MOVER_STRIDE) coords[i].lng += MOVE_STEP;
    }
    render(makePositions());
    act(() => { vi.advanceTimersByTime(FLUSH_MS); });
  };

  const writesFor = (sourceId) => fake.writes.filter((w) => w.sourceId === sourceId);
  const summarize = (label) => {
    const bySource = {};
    fake.writes.forEach((w) => {
      const name = { 0: 'fleet', 1: 'selected', 2: 'glide' }[fake.sourceOrder.indexOf(w.sourceId)] || w.sourceId;
      const key = `${name}/${w.method}`;
      bySource[key] = bySource[key] || { writes: 0, features: 0, maxFeatures: 0 };
      bySource[key].writes += 1;
      bySource[key].features += w.count;
      bySource[key].maxFeatures = Math.max(bySource[key].maxFeatures, w.count);
    });
    // eslint-disable-next-line no-console
    console.log(`[write-cadence] ${label}`, JSON.stringify(bySource));
    return bySource;
  };

  beforeAll(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    vi.setSystemTime(new Date('2026-07-09T12:00:00Z'));
    simTime = Date.now();

    for (let i = 0; i < FLEET; i += 1) {
      if (i < VISIBLE) {
        coords.push({ lng: -5 + (i % 15) * 0.5, lat: -4 + Math.floor(i / 15) * 0.7 });
      } else {
        coords.push({ lng: 50 + (i % 50) * 0.5, lat: 20 + Math.floor(i / 50) * 0.3 });
      }
    }
    for (let i = 0; i < VISIBLE; i += 1) fake.renderedDeviceIds.add(i + 1);

    store = configureStore({ reducer: combineReducers({ devices, session, errors, clusters }) });
    store.dispatch(devicesActions.refresh(deviceList));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterAll(() => {
    act(() => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
  });

  it('initial load performs one full setData per marker source', () => {
    render(makePositions());
    act(() => { vi.advanceTimersByTime(50); });
    const fleet = writesFor(fake.sourceOrder[0]);
    summarize('initial');
    expect(fleet.length).toBeGreaterThanOrEqual(1);
    expect(fleet[0].method).toBe('setData');
    expect(fleet[0].count).toBe(FLEET);
    fake.reset();
  });

  it('30s of stationary fleet with fresh fixTime/position ids produces zero marker-source writes', () => {
    for (let n = 0; n < 20; n += 1) flush();
    const stats = summarize('static-30s');
    expect(writesFor(fake.sourceOrder[0]).length).toBe(0);
    expect(writesFor(fake.sourceOrder[1]).length).toBe(0);
    expect(stats).toBeDefined();
    fake.reset();
  });

  it('30s with 10% moving coalesces fleet writes into rare diffs proportional to changed devices', () => {
    for (let n = 0; n < 20; n += 1) flush({ movers: true });
    summarize('moving-30s');
    const fleetWrites = writesFor(fake.sourceOrder[0]);
    // deferred reconcile cadence: ~2 writes in 30s, not one per flush/second
    expect(fleetWrites.length).toBeGreaterThanOrEqual(1);
    expect(fleetWrites.length).toBeLessThanOrEqual(4);
    fleetWrites.forEach((w) => {
      expect(w.method).toBe('updateData');
      // diff size ~ number of movers (270), never the fleet
      expect(w.count).toBeLessThanOrEqual(FLEET / 4);
    });
    // motion still renders: the glide source carried the visible movers
    expect(writesFor(fake.sourceOrder[2]).length).toBeGreaterThan(0);
    fake.reset();
  });

  it('selecting a device moves exactly one feature between sources as a diff', () => {
    // drain the deferred backlog left by the moving phase so the selection
    // write is not also carrying piggybacked reconcile features
    for (let n = 0; n < 12; n += 1) flush();
    fake.reset();
    act(() => { store.dispatch(devicesActions.selectId(3)); });
    const selectedWrites = writesFor(fake.sourceOrder[1]);
    const fleetWrites = writesFor(fake.sourceOrder[0]);
    summarize('selection');
    expect(selectedWrites.length).toBe(1);
    expect(selectedWrites[0].method).toBe('updateData');
    expect(selectedWrites[0].count).toBe(1);
    expect(fleetWrites.length).toBe(1);
    expect(fleetWrites[0].method).toBe('updateData');
    expect(fleetWrites[0].count).toBe(1);
    act(() => { store.dispatch(devicesActions.selectId(null)); });
    fake.reset();
  });

  it('when motion stops, the landing flush reconciles and empties the glide source', () => {
    // one more moving flush, then quiet flushes so every glide lands
    flush({ movers: true });
    for (let n = 0; n < 14; n += 1) flush();
    summarize('stop-motion');
    const glideWrites = writesFor(fake.sourceOrder[2]);
    expect(glideWrites.length).toBeGreaterThan(0);
    expect(glideWrites[glideWrites.length - 1].count).toBe(0);
    // twins were unhidden after the reconcile write landed
    expect(fake.featureStateCalls.some((c) => c.op === 'remove')).toBe(true);
    fake.reset();
  });
});
