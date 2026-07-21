import { createSelector } from 'reselect';

const selectDevices = (state) => state.devices.items;
const selectGroups = (state) => state.groups.items;
const selectPositions = (state) => state.session.positions;
const selectSelectedId = (state) => state.devices.selectedId;
const selectHistory = (state) => state.session.history;

export const selectDevicesAndGroups = createSelector(
  [selectDevices, selectGroups],
  (devices, groups) => ({ devices, groups }),
);

export const selectDevicesAndSelected = createSelector(
  [selectDevices, selectSelectedId],
  (devices, selectedDeviceId) => ({ devices, selectedDeviceId }),
);

export const selectLiveRoutesData = createSelector(
  [selectDevices, selectSelectedId, selectHistory],
  (devices, selectedDeviceId, history) => ({ devices, selectedDeviceId, history }),
);
