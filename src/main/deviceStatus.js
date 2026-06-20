import dayjs from 'dayjs';

export const STALE_THRESHOLD_MS = 60 * 60 * 1000;

export const isDeviceStale = (device) => {
  if (!device.lastUpdate) {
    return true;
  }
  return Date.now() - dayjs(device.lastUpdate).valueOf() > STALE_THRESHOLD_MS;
};

export const isPositionMoving = (position) => {
  if (!position) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(position.attributes || {}, 'motion')) {
    return !!position.attributes.motion;
  }
  return (position.speed || 0) > 0;
};

export const isIgnitionOn = (position) => !!(position && position.attributes && position.attributes.ignition);