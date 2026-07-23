import { createSlice } from '@reduxjs/toolkit';

const { actions, reducer } = createSlice({
  name: 'mapInteractions',
  initialState: {
    showAllRoutePoints: false,
  },
  reducers: {
    expandRoutePoints(state) {
      state.showAllRoutePoints = true;
    },
    collapseRoutePoints(state) {
      state.showAllRoutePoints = false;
    },
  },
});

export { actions as mapInteractionsActions };
export { reducer as mapInteractionsReducer };
