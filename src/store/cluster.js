import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'clusters',
  initialState: {
    devices: [],
    coordinates: null,
    visible: false,
  },
  reducers: {
    showClusterPopup(state, action) {
      state.devices = action.payload.devices;
      state.coordinates = action.payload.coordinates;
      state.visible = true;
    },
    hideClusterPopup(state) {
      state.devices = [];
      state.coordinates = null;
      state.visible = false;
    },
  },
});

export { actions as clustersActions };
export { reducer as clustersReducer };
