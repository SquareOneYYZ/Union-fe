import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'errors',
  initialState: {
    errors: [],
  },
  reducers: {
    push(state, action) {
      const payload = typeof action.payload === 'string'
        ? { message: action.payload, status: undefined }
        : action.payload;
      state.errors.push(payload);
    },
    pop(state) {
      if (state.errors.length) {
        state.errors.shift();
      }
    },
  },
});

export { actions as errorsActions };
export { reducer as errorsReducer };