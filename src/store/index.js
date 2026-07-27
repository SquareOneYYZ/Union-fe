import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { errorsReducer as errors } from './errors';
import { sessionReducer as session } from './session';
import { devicesReducer as devices } from './devices';
import { eventsReducer as events } from './events';
import { geofencesReducer as geofences } from './geofences';
import { groupsReducer as groups } from './groups';
import { driversReducer as drivers } from './drivers';
import { maintenancesReducer as maintenances } from './maintenances';
import { calendarsReducer as calendars } from './calendars';
import { reportsReducer as reports } from './reports';
import { mapInteractionsReducer as mapInteractions } from './mapInteractions';
import { clustersReducer as clusters } from './cluster';
import throttleMiddleware from './throttleMiddleware';

const reducer = combineReducers({
  errors,
  session,
  devices,
  events,
  geofences,
  groups,
  drivers,
  maintenances,
  calendars,
  reports,
  mapInteractions,
  clusters,
});

export * from './errors';
export * from './session';
export * from './devices';
export * from './events';
export * from './geofences';
export * from './groups';
export * from './drivers';
export * from './maintenances';
export * from './calendars';
export * from './reports';
export * from './mapInteractions';
export * from './cluster';

export default configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
    immutableCheck: false,
  }).concat(throttleMiddleware),
});
