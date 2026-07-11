/* eslint-disable no-console */

// Instrumentation for correlating visible marker blinks with GeoJSON source
// writes. Off by default; when off every exported hook is a single boolean
// check. Enable with ?mapWriteDebug=1 (persisted to localStorage) or from the
// console with mapWriteDebug.enable(); disable with mapWriteDebug.disable().
//
// When enabled it records, with timestamps:
//  - every source write (setData/updateData): source label, feature count,
//    trigger — one of 'load' (first full write after source creation),
//    'flush-urgent' (visible change written within its flush),
//    'reconcile-15s' (deferred invisible-motion backlog on its interval),
//    'moveend', 'selection', 'glide', 'hard-reset' (derived-prop change or
//    fleet-size branch crossing forced a full rewrite);
//  - every 'sourcedata' event with sourceDataType === 'content' for the
//    registered sources (one fires when the worker acknowledges each write);
//  - every registered source add/remove (register/unregister run right where
//    addSource/removeSource do), so "zero teardowns in steady state" is
//    directly observable instead of inferred from blink character;
//  - an on-screen flash indicator so blink moments can be matched to write
//    moments by eye. The ring buffer is at mapWriteDebug.events.

const STORAGE_KEY = 'mapWriteDebug';
const RING_LIMIT = 2000;

const SOURCE_COLORS = {
  fleet: '#e53935',
  selected: '#fb8c00',
  glide: '#1e88e5',
  accuracy: '#8e24aa',
};

const readInitialFlag = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(STORAGE_KEY) === '1') {
      window.localStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (params.get(STORAGE_KEY) === '0') {
      window.localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const state = {
  enabled: false,
  map: null,
  attached: false,
  registry: new Map(), // sourceId -> label
  events: [],
  indicator: null,
  indicatorTimer: null,
};

const wallClock = () => new Date().toISOString().slice(11, 23);

const record = (entry) => {
  state.events.push(entry);
  if (state.events.length > RING_LIMIT) {
    state.events.splice(0, state.events.length - RING_LIMIT);
  }
};

const flashIndicator = (label, text) => {
  if (!state.indicator) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:10000;'
      + 'font:11px/1.4 monospace;color:#fff;background:#616161;padding:2px 8px;'
      + 'border-radius:4px;pointer-events:none;opacity:0.9;';
    document.body.appendChild(el);
    state.indicator = el;
  }
  state.indicator.style.background = SOURCE_COLORS[label] || '#616161';
  state.indicator.textContent = text;
  if (state.indicatorTimer) clearTimeout(state.indicatorTimer);
  state.indicatorTimer = setTimeout(() => {
    if (state.indicator) state.indicator.style.background = '#333';
  }, 250);
};

const onSourceData = (event) => {
  if (!state.enabled) return;
  if (event.dataType !== 'source' || event.sourceDataType !== 'content') return;
  const label = state.registry.get(event.sourceId);
  if (!label) return;
  const t = performance.now();
  record({ t, wall: wallClock(), kind: 'content', source: label, loaded: event.isSourceLoaded });
  console.log(`[mapwrite] ${wallClock()} content   ${label} (isSourceLoaded=${event.isSourceLoaded})`);
};

const attach = () => {
  if (state.attached || !state.map) return;
  state.map.on('sourcedata', onSourceData);
  state.attached = true;
};

// Called once from MapView after the map singleton is created.
export const attachMapWriteDebug = (map) => {
  state.map = map;
  if (state.enabled) attach();
};

// Sources register a stable human label ('fleet', 'selected', 'glide', ...)
// so log lines and sourcedata events are readable despite useId-based ids.
// Registration doubles as the source-lifecycle log: components call these in
// the same effect that runs addSource/removeSource.
export const registerMapWriteDebugSource = (sourceId, label) => {
  state.registry.set(sourceId, label);
  if (!state.enabled) return;
  record({ t: performance.now(), wall: wallClock(), kind: 'lifecycle', source: label, event: 'add' });
  console.log(`[mapwrite] ${wallClock()} addSource ${label}`);
};

export const unregisterMapWriteDebugSource = (sourceId) => {
  const label = state.registry.get(sourceId) || sourceId;
  state.registry.delete(sourceId);
  if (!state.enabled) return;
  record({ t: performance.now(), wall: wallClock(), kind: 'lifecycle', source: label, event: 'remove' });
  console.log(`[mapwrite] ${wallClock()} removeSource ${label}`);
};

// The single hot-path hook: call at every setData/updateData call site.
export const logMapWrite = (sourceId, method, featureCount, trigger) => {
  if (!state.enabled) return;
  const label = state.registry.get(sourceId) || sourceId;
  const t = performance.now();
  record({ t, wall: wallClock(), kind: 'write', source: label, method, featureCount, trigger });
  console.log(`[mapwrite] ${wallClock()} ${method.padEnd(10)}${label} n=${featureCount} (${trigger})`);
  flashIndicator(label, `${label} ${method} n=${featureCount} ${trigger}`);
};

const summary = (sinceSeconds = 60) => {
  const cutoff = performance.now() - sinceSeconds * 1000;
  const recent = state.events.filter((e) => e.t >= cutoff);
  const writes = recent.filter((e) => e.kind === 'write');
  const bySource = {};
  writes.forEach((e) => {
    const key = `${e.source}/${e.method}`;
    bySource[key] = bySource[key] || { writes: 0, features: 0, triggers: {} };
    bySource[key].writes += 1;
    bySource[key].features += e.featureCount;
    bySource[key].triggers[e.trigger] = (bySource[key].triggers[e.trigger] || 0) + 1;
  });
  // steady state must show zero entries here; any '<label>/remove' means the
  // structural effect tore a source down mid-session
  const lifecycle = {};
  recent.filter((e) => e.kind === 'lifecycle').forEach((e) => {
    const key = `${e.source}/${e.event}`;
    lifecycle[key] = (lifecycle[key] || 0) + 1;
  });
  return { windowSeconds: sinceSeconds, totalWrites: writes.length, bySource, lifecycle };
};

const controls = {
  enable: () => {
    state.enabled = true;
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode */ }
    attach();
    console.log('[mapwrite] enabled');
  },
  disable: () => {
    state.enabled = false;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
    console.log('[mapwrite] disabled');
  },
  summary,
  get events() { return state.events; },
};

if (typeof window !== 'undefined') {
  window.mapWriteDebug = controls;
  state.enabled = readInitialFlag();
}

export default controls;
