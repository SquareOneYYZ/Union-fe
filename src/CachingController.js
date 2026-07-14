import { useDispatch, useSelector, connect } from 'react-redux';

import {
  geofencesActions, groupsActions, driversActions, maintenancesActions, calendarsActions,
} from './store';
import { useEffectAsync } from './reactHelper';

const CDN_BASE_URL ='https://cdn.iotrides.com';
const CDN_CONCURRENCY = 10;

const runWithConcurrency = async (items, limit, task) => {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
};

const fetchGeofenceFallback = async (id) => {
  try {
    const response = await fetch(`/api/geofences/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};

const fetchGeofenceFromCdn = async (id) => {
  try {
    const response = await fetch(`${CDN_BASE_URL}/geofence/${id}/data.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};

const CachingController = () => {
  const authenticated = useSelector((state) => !!state.session.user);
  const dispatch = useDispatch();

  useEffectAsync(async () => {
    if (authenticated) {
      const listResponse = await fetch('/api/geofences/list');
      if (!listResponse.ok) throw Error(await listResponse.text());
      const geofenceList = await listResponse.json();

      let failedCount = 0;

      const geofences = await runWithConcurrency(geofenceList, CDN_CONCURRENCY, async (meta) => {
        let data = await fetchGeofenceFromCdn(meta.id);
        if (!data) {
          data = await fetchGeofenceFallback(meta.id);
        }
        if (!data) {
          failedCount += 1;
          return null;
        }
        return { ...data, id: meta.id, name: meta.name };
      });

      if (failedCount > 0) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to load ${failedCount} of ${geofenceList.length} geofences from cache and fallback`);
      }

      dispatch(geofencesActions.refresh(geofences.filter(Boolean)));
    }
  }, [authenticated]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetch('/api/groups');
      if (response.ok) {
        dispatch(groupsActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
    }
  }, [authenticated]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetch('/api/drivers');
      if (response.ok) {
        dispatch(driversActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
    }
  }, [authenticated]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetch('/api/maintenance');
      if (response.ok) {
        dispatch(maintenancesActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
    }
  }, [authenticated]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetch('/api/calendars');
      if (response.ok) {
        dispatch(calendarsActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
    }
  }, [authenticated]);

  return null;
};

export default connect()(CachingController);