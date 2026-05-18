import { useDispatch, useSelector, connect } from 'react-redux';

import {
  geofencesActions, groupsActions, driversActions, maintenancesActions, calendarsActions,
} from './store';
import { useEffectAsync } from './reactHelper';

const CachingController = () => {
  const authenticated = useSelector((state) => !!state.session.user);
  const dispatch = useDispatch();

useEffectAsync(async () => {
  if (authenticated) {
    const listResponse = await fetch('/api/geofences/list');
    if (!listResponse.ok) throw Error(await listResponse.text());
    const geofenceList = await listResponse.json();

    const geofenceIds = geofenceList.map((g) => g.id);
    const results = await Promise.allSettled(
      geofenceIds.map((id) =>
        fetch(`https://cdn.iotrides.com/geofence/${id}/data.json`)
          .then((res) => res.json())
      )
    );

    const geofences = results
      .map((result, i) => {
        if (result.status === 'fulfilled') {
          return { ...result.value, id: geofenceList[i].id, name: geofenceList[i].name };
        }
        console.warn(`Failed to load geofence ${geofenceList[i].id}`);
        return null;
      })
      .filter(Boolean);

    dispatch(geofencesActions.refresh(geofences));
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
