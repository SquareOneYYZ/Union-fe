import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'events',
  initialState: {
    items: [],
    selected: null,
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
    select(state, action) {
      state.selected = action.payload;
    },
    deselect(state) {
      state.selected = null;
    },
  },
});

export { actions as eventsActions };
export { reducer as eventsReducer };
