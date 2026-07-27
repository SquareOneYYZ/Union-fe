import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'livestream',
  initialState: {
    open: false,
    deviceId: null,
  },
  reducers: {
    openLivestream(state, action) {
      state.open = true;
      state.deviceId = action.payload;
    },
    closeLivestream(state) {
      state.open = false;
      state.deviceId = null;
    },
  },
});

export { actions as livestreamActions };
export { reducer as livestreamReducer };
