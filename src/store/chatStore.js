import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'fleet_chat_messages';

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (messages) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    console.warn('Failed to save chat messages to localStorage');
  }
};

const { reducer, actions } = createSlice({
  name: 'chats',
  initialState: {
    messages: load(),
  },
  reducers: {
    addMessage(state, action) {
      state.messages.push(action.payload);
      save(state.messages);
    },
    clearMessages(state) {
      state.messages = [];
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export { actions as chatActions };
export { reducer as chatReducer };
