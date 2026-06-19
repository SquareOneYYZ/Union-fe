import mapControlsTour from './mapControlsTour';
import vinDecoderTour from './vinDecoderTour';

const tourRegistry = {
  [mapControlsTour.tourId]: mapControlsTour.steps,
  [vinDecoderTour.tourId]: vinDecoderTour.steps,
};

export const tourRegistryMeta = {
  vinDecoder: { navigateTo: '/settings/device' },
};

export default tourRegistry;