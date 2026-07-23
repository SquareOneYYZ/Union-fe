/**
 * Prod-faithful integration harness for MapPositions at fleet scale.
 *
 * The write-cadence unit harness (MapPositions.writes.test.jsx) dispatches
 * devicesActions.refresh ONCE and then only re-renders with new positions
 * arrays — so state.devices.items keeps one identity for the whole run. In
 * production every 1.5s throttle flush dispatches a devices update (lastUpdate
 * changes on every fix), giving state.devices.items a new identity per flush.
 * That identity flows into onClusterClick and from there into the structural
 * effect that owns the sources, which is exactly the path that broke in prod
 * while the unit harness stayed green.
 *
 * This harness reproduces the prod sequence per flush:
 *   1. dispatch devicesActions.update(all devices, fresh lastUpdate)  (render 1)
 *   2. deliver the new positions array as a prop                      (render 2,
 *      like MainPage's useFilter effect)
 * and asserts the steady-state write contract per source, per trigger label:
 * zero fleet setData after load, updateData only on lane cadence, zero writes
 * to an unchanged selected source, zero source teardowns.
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
    triggers: [],
    allTriggers: [],
    removeSourceCalls: 0,
    featureStateCalls: [],
    renderedDeviceIds: new Set(),
    reset() { this.writes = []; this.triggers = []; this.featureStateCalls = []; },
    logMapWrite(sourceId, method, count, trigger) {
      const entry = { sourceId, method, count, trigger };
      fake.triggers.push(entry);
      fake.allTriggers.push(entry);
    },
  };
  const fire = (event, payload) => {
    const set = handlers.get(event);
    if (set) [...set].forEach((h) => h(payload));
  };
  const contentEvent = (sourceId) => setTimeout(() => fire('sourcedata', {
    dataType: 'source', sourceDataType: 'content', sourceId, isSourceLoaded: true,
  }), 0);
  const makeSource = (id, def) => ({
    _def: def,
    setData(data) {
      fake.writes.push({ sourceId: id, method: 'setData', count: data.features.length });
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
    removeSource(id) { sources.delete(id); fake.removeSourceCalls += 1; },
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
vi.mock('./core/mapWriteDebug', () => ({
  logMapWrite: (...args) => fake.logMapWrite(...args),
  registerMapWriteDebugSource: () => {},
  unregisterMapWriteDebugSource: () => {},
}));
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

const FLEET = 2900;
const VISIBLE = 150;
const FLUSH_MS = 1500;
// five movers, all in the far off-viewport block: pure invisible motion,
// which must ride the deferred reconcile lane, never per-flush writes
const MOVER_IDS = [301, 311, 321, 331, 341];
const MOVE_STEP = 0.0008; // > MIN_CHANGE_DEG, < teleport threshold

const ALLOWED_TRIGGERS = new Set([
  'load', 'flush-urgent', 'reconcile-15s', 'moveend', 'glide', 'selection', 'hard-reset',
]);

describe('MapPositions prod-faithful flushes (2900 devices, per-flush devices dispatch)', () => {
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

  // one production throttle cycle: devices dispatch (own commit, like the
  // store-driven render), then the positions prop (like useFilter's effect)
  const flush = ({ movers = false } = {}) => {
    simTime += FLUSH_MS;
    if (movers) {
      MOVER_IDS.forEach((deviceId) => { coords[deviceId - 1].lng += MOVE_STEP; });
    }
    act(() => {
      store.dispatch(devicesActions.update(
        deviceList.map((d) => ({ ...d, lastUpdate: new Date(simTime).toISOString() })),
      ));
    });
    render(makePositions());
    act(() => { vi.advanceTimersByTime(FLUSH_MS); });
  };

  const label = (sourceId) => ['fleet', 'selected', 'glide'][fake.sourceOrder.indexOf(sourceId) % 3];
  const writesFor = (name) => fake.writes.filter((w) => label(w.sourceId) === name);
  const triggersFor = (name) => fake.triggers.filter((t) => label(t.sourceId) === name);

  beforeAll(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
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

  it('initial load: one full fleet setData labeled load, no write to the empty selected source', () => {
    render(makePositions());
    act(() => { vi.advanceTimersByTime(50); });
    const fleet = writesFor('fleet');
    expect(fleet.length).toBe(1);
    expect(fleet[0].method).toBe('setData');
    expect(fleet[0].count).toBe(FLEET);
    expect(triggersFor('fleet')[0].trigger).toBe('load');
    expect(writesFor('selected').length).toBe(0);
    fake.reset();
  });

  it('60s of flushes with devices-identity churn: zero fleet setData, deferred-lane diffs only, zero teardowns', () => {
    const teardownsBefore = fake.removeSourceCalls;
    for (let n = 0; n < 40; n += 1) flush({ movers: true });

    expect(fake.removeSourceCalls - teardownsBefore).toBe(0);

    const fleetSetData = writesFor('fleet').filter((w) => w.method === 'setData');
    expect(fleetSetData.length).toBe(0);

    expect(writesFor('selected').length).toBe(0);

    // 5 invisible movers moving every flush must coalesce into the 15s
    // reconcile lane: ~4 writes in 60s, each diff sized by the movers
    const fleetDiffs = writesFor('fleet');
    expect(fleetDiffs.length).toBeGreaterThanOrEqual(2);
    expect(fleetDiffs.length).toBeLessThanOrEqual(6);
    fleetDiffs.forEach((w) => {
      expect(w.method).toBe('updateData');
      expect(w.count).toBeLessThanOrEqual(MOVER_IDS.length * 2);
    });
    triggersFor('fleet').forEach((t) => expect(t.trigger).toBe('reconcile-15s'));

    // off-viewport movers must not surface in the glide source
    expect(writesFor('glide').length).toBe(0);
    fake.reset();
  });

  it('a status change is urgent: written within its flush as a device-sized diff', () => {
    deviceList[500] = { ...deviceList[500], status: 'offline' };
    flush();
    const fleetDiffs = writesFor('fleet');
    expect(fleetDiffs.length).toBe(1);
    expect(fleetDiffs[0].method).toBe('updateData');
    // the status device plus at most the piggybacked deferred backlog
    expect(fleetDiffs[0].count).toBeLessThanOrEqual(1 + MOVER_IDS.length);
    expect(triggersFor('fleet')[0].trigger).toBe('flush-urgent');
    fake.reset();
  });

  it('moveend flushes the deferred backlog with the moveend label', () => {
    flush({ movers: true });
    flush({ movers: true });
    expect(writesFor('fleet').length).toBe(0); // 3s < 15s: still deferred
    act(() => { fake.map.fire('moveend'); });
    const fleetDiffs = writesFor('fleet');
    expect(fleetDiffs.length).toBe(1);
    expect(fleetDiffs[0].method).toBe('updateData');
    expect(triggersFor('fleet')[0].trigger).toBe('moveend');
    fake.reset();
  });

  it('selection swaps one device between sources, labeled selection', () => {
    act(() => { store.dispatch(devicesActions.selectId(MOVER_IDS[0])); });
    const selectedWrites = writesFor('selected');
    expect(selectedWrites.length).toBe(1);
    expect(selectedWrites[0].method).toBe('updateData');
    expect(selectedWrites[0].count).toBe(1);
    expect(triggersFor('selected')[0].trigger).toBe('selection');
    const fleetWrites = writesFor('fleet');
    expect(fleetWrites.length).toBe(1);
    expect(fleetWrites[0].method).toBe('updateData');
    expect(triggersFor('fleet')[0].trigger).toBe('selection');
    act(() => { store.dispatch(devicesActions.selectId(null)); });
    fake.reset();
  });

  it('no write anywhere in the run carried the legacy flush label; all labels are in the taxonomy', () => {
    const flushLabeled = fake.allTriggers.filter((t) => t.trigger === 'flush');
    expect(flushLabeled.length).toBe(0);
    fake.allTriggers.forEach((t) => expect(ALLOWED_TRIGGERS.has(t.trigger)).toBe(true));
  });
});
