import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'events',
  initialState: {
    items: [],
    selectedEvent: null,
    mediaList: [],
  },
  reducers: {
    add(state, action) {
      state.items.unshift(...action.payload);
      state.items.splice(50);
    },
    delete(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload.id);
    },
    deleteAll(state) {
      state.items = [];
    },
    setSelectedEvent(state, action) {
      state.selectedEvent = action.payload;
    },
    setMediaList(state, action) {
      state.mediaList = action.payload;
    },
    clearSelectedEvent(state) {
      state.selectedEvent = null;
    },
  },
});

export { actions as eventsActions };
export { reducer as eventsReducer };
