import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'session',
  initialState: {
    server: null,
    user: null,
    socket: null,
    includeLogs: false,
    logs: [],
    positions: {},
    history: {},
  },
  reducers: {
    updateServer(state, action) {
      state.server = action.payload;
    },
    updateUser(state, action) {
      state.user = action.payload;
    },
    updateSocket(state, action) {
      state.socket = action.payload;
    },
    enableLogs(state, action) {
      state.includeLogs = action.payload;
      if (!action.payload) {
        state.logs = [];
      }
    },
    updateLogs(state, action) {
      state.logs.push(...action.payload);
    },
    // PRIORITY 5: Optimize live route history to eliminate array allocations
    updatePositions(state, action) {
      const liveRoutes = state.user.attributes.mapLiveRoutes || state.server.attributes.mapLiveRoutes || 'none';
      const liveRoutesLimit = state.user.attributes['web.liveRouteLength'] || state.server.attributes['web.liveRouteLength'] || 10;

      action.payload.forEach((position) => {
        state.positions[position.deviceId] = position;

        if (liveRoutes !== 'none') {
          const route = state.history[position.deviceId];

          if (!route) {
            // Initialize new route
            state.history[position.deviceId] = [[position.longitude, position.latitude]];
          } else {
            const last = route[route.length - 1];

            // Only add if position changed
            if (!last || (last[0] !== position.longitude || last[1] !== position.latitude)) {
              // Mutate in place instead of array spread
              if (route.length >= liveRoutesLimit) {
                route.shift(); // Remove oldest
              }
              route.push([position.longitude, position.latitude]);
            }
          }
        } else if (Object.keys(state.history).length > 0) {
          // Only clear once if needed
          state.history = {};
        }
      });
    },
  },
});

export { actions as sessionActions };
export { reducer as sessionReducer };
