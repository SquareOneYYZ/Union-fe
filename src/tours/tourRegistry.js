import mapControlsTour from './mapControlsTour';
import vinDecoderTour from './vinDecoderTour';
import zoneViolationTour from './zoneViolationTour';

const tourRegistry = {
  [mapControlsTour.tourId]: mapControlsTour.steps,
  [vinDecoderTour.tourId]: vinDecoderTour.steps,
  [zoneViolationTour.tourId]: zoneViolationTour.steps,
};

export const tourRegistryMeta = {
  vinDecoder: { navigateTo: '/settings/device' },
  zoneViolation: { navigateTo: '/settings/notification' },
};

export default tourRegistry;