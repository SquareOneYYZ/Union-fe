import { useDispatch, useSelector } from 'react-redux';
import {
  geofencesActions, groupsActions, driversActions, maintenancesActions, calendarsActions,
} from './store';
import { useEffectAsync } from './reactHelper';
import { useAttributePreference } from './common/util/preferences';

const CachingController = () => {
  const authenticated = useSelector((state) => !!state.session.user);
  const dispatch = useDispatch();
  const mapGeofences = useAttributePreference('mapGeofences', true);

  useEffectAsync(async () => {
    if (authenticated) {
      const requests = [
        fetch('/api/groups'),
        fetch('/api/drivers'),
        fetch('/api/maintenance'),
        fetch('/api/calendars'),
      ];

      if (mapGeofences) {
        requests.push(fetch('/api/geofences'));
      }

      const [
        groupsResponse,
        driversResponse,
        maintenancesResponse,
        calendarsResponse,
        geofencesResponse,
      ] = await Promise.all(requests);

      if (groupsResponse.ok) {
        dispatch(groupsActions.refresh(await groupsResponse.json()));
      } else {
        throw Error(await groupsResponse.text());
      }

      if (driversResponse.ok) {
        dispatch(driversActions.refresh(await driversResponse.json()));
      } else {
        throw Error(await driversResponse.text());
      }

      if (maintenancesResponse.ok) {
        dispatch(maintenancesActions.refresh(await maintenancesResponse.json()));
      } else {
        throw Error(await maintenancesResponse.text());
      }

      if (calendarsResponse.ok) {
        dispatch(calendarsActions.refresh(await calendarsResponse.json()));
      } else {
        throw Error(await calendarsResponse.text());
      }

      if (geofencesResponse?.ok) {
        dispatch(geofencesActions.refresh(await geofencesResponse.json()));
      }
    }
  }, [authenticated, mapGeofences]);

  return null;
};

export default CachingController;
