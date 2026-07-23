import { useSelector } from 'react-redux';

export const useAdministrator = () => useSelector((state) => {
  const admin = state.session.user?.administrator ?? false;
  return admin;
});

export const useManager = () => useSelector((state) => {
  const admin = state.session.user.administrator;
  const manager = (state.session.user.userLimit || 0) !== 0;
  return admin || manager;
});

export const useDeviceReadonly = () => useSelector((state) => {
  const admin = state.session.user.administrator;
  const serverReadonly = state.session.server.readonly;
  const userReadonly = state.session.user.readonly;
  const serverDeviceReadonly = state.session.server.deviceReadonly;
  const userDeviceReadonly = state.session.user.deviceReadonly;
  return !admin && (serverReadonly || userReadonly || serverDeviceReadonly || userDeviceReadonly);
});

export const useRestriction = (key) => useSelector((state) => {
  const admin = state.session.user.administrator;
  const serverValue = state.session.server[key];
  const userValue = state.session.user[key];
  return !admin && (serverValue || userValue);
});

export const useDashcamPermission = () => useSelector((state) => {
  const admin = state.session.user?.administrator ?? false;
  const hasDashcamFeatures = state.session.user?.attributes?.DashcamFeatures === true;

  return admin || hasDashcamFeatures;
});

export const useDeviceHasLivestream = (deviceId) => useSelector((state) => {
  if (!deviceId) return false;
  const device = state.devices.items[deviceId];
  return device?.attributes?.LiveStream === true;
});

export const useCanAccessLivestream = (deviceId) => {
  const hasDashcamPermission = useDashcamPermission();
  const deviceHasLivestream = useDeviceHasLivestream(deviceId);

  return hasDashcamPermission && deviceHasLivestream;
};
