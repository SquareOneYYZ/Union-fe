import { describe, it, expect } from 'vitest';
import { sessionReducer, sessionActions } from './session';

// initialState is not exported — reconstruct it here.
// updatePositions reads user.attributes and server.attributes immediately,
// so both must be non-null in every test state.
const makeState = (overrides = {}) => ({
  server: { attributes: { mapLiveRoutes: 'simple', 'web.liveRouteLength': 10 } },
  user: { attributes: {} },
  socket: null,
  includeLogs: false,
  logs: [],
  positions: {},
  history: {},
  ...overrides,
});

// Helper: dispatch updatePositions with an array of position objects
const dispatch = (state, positions) => sessionReducer(state, sessionActions.updatePositions(positions));

// A minimal position object — only the fields updatePositions actually reads
const pos = (deviceId, longitude, latitude) => ({ deviceId, longitude, latitude });

describe('session reducer — updatePositions / history', () => {
  it('appends a new position to history', () => {
    const state = dispatch(makeState(), [pos(1, 10, 20)]);
    expect(state.history[1]).toEqual([[10, 20]]); // stored as [lng, lat]
  });

  it('also stores the full position object in positions', () => {
    const p = pos(1, 10, 20);
    const state = dispatch(makeState(), [p]);
    expect(state.positions[1]).toEqual(p);
  });

  it('deduplicates identical points (same lng AND lat)', () => {
    const s1 = dispatch(makeState(), [pos(1, 10, 20)]);
    const s2 = dispatch(s1, [pos(1, 10, 20)]);
    // Condition: last[0] !== lng && last[1] !== lat  →  both differ to append
    // Same point → condition false → skip → still length 1
    expect(s2.history[1]).toHaveLength(1);
  });

  it('appends when longitude differs (even if latitude is the same)', () => {
    const s1 = dispatch(makeState(), [pos(1, 10, 20)]);
    const s2 = dispatch(s1, [pos(1, 99, 20)]); // lng changed
    expect(s2.history[1]).toHaveLength(2);
  });

  it('appends when latitude differs (even if longitude is the same)', () => {
    const s1 = dispatch(makeState(), [pos(1, 10, 20)]);
    const s2 = dispatch(s1, [pos(1, 10, 99)]); // lat changed
    expect(s2.history[1]).toHaveLength(2);
  });

  it('enforces rolling history limit via web.liveRouteLength', () => {
    const LIMIT = 3;
    const state = makeState({
      server: { attributes: { mapLiveRoutes: 'simple', 'web.liveRouteLength': LIMIT } },
    });
    // Insert LIMIT + 2 unique points
    let s = state;
    for (let i = 0; i < LIMIT + 2; i += 1) {
      s = dispatch(s, [pos(1, i, i)]);
    }
    // slice(1 - LIMIT) before each append keeps the array at LIMIT entries
    expect(s.history[1]).toHaveLength(LIMIT);
  });

  it('clears all history when liveRoutes is "none"', () => {
    const state = makeState({
      server: { attributes: { mapLiveRoutes: 'none' } },
    });
    const s1 = dispatch(makeState(), [pos(1, 10, 20)]); // populate with default state
    const s2 = dispatch({ ...s1, server: { attributes: { mapLiveRoutes: 'none' } } }, [pos(1, 99, 99)]);
    expect(s2.history).toEqual({});
  });

  it('handles multiple devices independently', () => {
    const s1 = dispatch(makeState(), [pos(1, 10, 20), pos(2, 30, 40)]);
    expect(s1.history[1]).toEqual([[10, 20]]);
    expect(s1.history[2]).toEqual([[30, 40]]);
  });
});
