import { createSlice } from '@reduxjs/toolkit';

const { actions, reducer: pendingSaveReducer } = createSlice({
  name: 'pendingSave',
  initialState: {
    open: false,
    message: '',
  },
  reducers: {
    show(state, action) {
      state.open = true;
      state.message = action.payload;
    },
    hide(state) {
      state.open = false;
      state.message = '';
    },
  },
});

export { actions as pendingSaveActions, pendingSaveReducer };