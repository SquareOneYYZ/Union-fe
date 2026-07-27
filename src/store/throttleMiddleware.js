import { sessionActions } from './session';
import { devicesActions } from './devices';
import { eventsActions } from './events';

const threshold = 200;
const interval = 1000;

export default () => (next) => {
  const buffer = [];
  let throttled = false;
  let counter = 0;
  let currentInterval = minInterval;

  const tick = () => {
    if (throttled) {
      const start = performance.now();

      const flushed = buffer.splice(0, buffer.length);

      const deviceUpdates = {};
      const positionUpdates = {};
      const eventUpdates = [];

      flushed.forEach((action) => {
        if (action.type === devicesActions.update.type) {
          action.payload.forEach((item) => {
            deviceUpdates[item.id] = item;
          });
        } else if (action.type === sessionActions.updatePositions.type) {
          action.payload.forEach((item) => {
            positionUpdates[item.deviceId] = item;
          });
        } else if (action.type === eventsActions.add.type) {
          eventUpdates.push(...action.payload);
        }
      });

      const mergedDeviceUpdates = Object.values(deviceUpdates);
      if (mergedDeviceUpdates.length) {
        next({
          type: devicesActions.update.type,
          payload: mergedDeviceUpdates,
        });
      }
      batch(() => buffer.splice(0, buffer.length).forEach((action) => next(action)));
    } else {
      if (counter > threshold) {
        throttle = true;
      }

      const totalTime = performance.now() - start;
      const flushedCount = mergedDeviceUpdates.length
        + mergedPositionUpdates.length
        + eventUpdates.length;

      debugLog(
        `Flushed ${flushedCount} / ${flushed.length} events in ${totalTime.toFixed(2)} ms`,
      );

      currentInterval = Math.min(
        Math.max(totalTime * scaleFactor, minInterval),
        maxInterval,
      );
    }

    const shouldThrottle = ((counter * 1000) / currentInterval) > threshold;

    if (throttled !== shouldThrottle) {
      debugLog(`Throttling ${shouldThrottle}`);
      throttled = shouldThrottle;
    }

    counter = 0;

    if (!throttled) {
      currentInterval = minInterval;
    }

    setTimeout(tick, currentInterval);
  };

  setTimeout(tick, currentInterval);

  return (action) => {
    const throttledTypes = [
      devicesActions.update.type,
      sessionActions.updatePositions.type,
      eventsActions.add.type,
    ];

    if (!throttledTypes.includes(action.type)) {
      return next(action);
    }

    counter += 1;

    if (throttled) {
      buffer.push(action);
      return undefined;
    }

    if (((counter * 1000) / currentInterval) > threshold) {
      if (!throttled) {
        debugLog('Throttling started');
      }
      throttled = true;
    }

    return next(action);
  };
};
