/**
 * Contract tests for the mapWriteDebug instrument: off by default with zero
 * DOM and zero console output, ?mapWriteDebug=1 enables the current session
 * WITHOUT persisting, persistence only via enable({ persist: true }), and
 * disable() removes the indicator immediately and clears storage.
 *
 * readInitialFlag runs at module load, so every scenario imports a fresh
 * module instance after arranging the URL and localStorage.
 */
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';

const STORAGE_KEY = 'mapWriteDebug';
const INDICATOR = '[data-mapwrite-indicator]';

let logSpy;

const mapwriteLogs = () => logSpy.mock.calls.filter((c) => String(c[0]).startsWith('[mapwrite]'));

const freshModule = async ({ search = '', storage = null } = {}) => {
  vi.resetModules();
  window.history.replaceState({}, '', `/${search}`);
  window.localStorage.clear();
  if (storage !== null) window.localStorage.setItem(STORAGE_KEY, storage);
  return import('./mapWriteDebug');
};

// a steady-state-shaped sequence: sources registered, then a run of writes
const simulateFlushSequence = (mod) => {
  mod.registerMapWriteDebugSource('src-1', 'fleet');
  mod.registerMapWriteDebugSource('src-2', 'selected');
  mod.registerMapWriteDebugSource('src-3', 'glide');
  for (let n = 0; n < 40; n += 1) {
    mod.logMapWrite('src-1', 'updateData', 4, 'flush-urgent');
    mod.logMapWrite('src-3', 'setData', 1, 'glide');
  }
};

describe('mapWriteDebug enablement contract', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    document.querySelectorAll(INDICATOR).forEach((el) => el.remove());
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    logSpy.mockRestore();
    vi.useRealTimers();
  });

  it('disabled by default: a full flush sequence produces zero DOM nodes, zero console output, clean storage', async () => {
    const mod = await freshModule();
    simulateFlushSequence(mod);
    vi.runAllTimers();
    expect(document.querySelector(INDICATOR)).toBeNull();
    expect(mapwriteLogs().length).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('?mapWriteDebug=1 enables this session only and does NOT persist', async () => {
    const mod = await freshModule({ search: '?mapWriteDebug=1' });
    simulateFlushSequence(mod);
    expect(document.querySelector(INDICATOR)).not.toBeNull();
    expect(mapwriteLogs().length).toBeGreaterThan(0);
    // the regression: this used to write '1' and re-enable every later session
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('a previously persisted opt-in still enables at boot', async () => {
    const mod = await freshModule({ storage: '1' });
    simulateFlushSequence(mod);
    expect(document.querySelector(INDICATOR)).not.toBeNull();
  });

  it('enable() is session-only; enable({ persist: true }) is the explicit opt-in', async () => {
    const mod = await freshModule();
    mod.default.enable();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    mod.default.enable({ persist: true });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('disable() removes the indicator immediately, clears storage, and silences further writes', async () => {
    const mod = await freshModule();
    mod.default.enable({ persist: true });
    simulateFlushSequence(mod);
    expect(document.querySelector(INDICATOR)).not.toBeNull();

    mod.default.disable();
    expect(document.querySelector(INDICATOR)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    const logsAfterDisable = mapwriteLogs().length;
    simulateFlushSequence(mod);
    vi.runAllTimers();
    expect(document.querySelector(INDICATOR)).toBeNull();
    expect(mapwriteLogs().length).toBe(logsAfterDisable);
  });
});
