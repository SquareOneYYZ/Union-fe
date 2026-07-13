import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dimensions from '../../common/theme/dimensions';
import { map } from '../core/MapView';
import { usePrevious } from '../../reactHelper';
import { useAttributePreference } from '../../common/util/preferences';
import { devicesActions } from '../../store';

const MapSelectedDevice = ({ mapReady }) => {
  const dispatch = useDispatch();

  const currentTime = useSelector((state) => state.devices.selectTime);
  const currentId = useSelector((state) => state.devices.selectedId);
  const locateId = useSelector((state) => state.devices.locateId);
  const previousTime = usePrevious(currentTime);
  const previousId = usePrevious(currentId);
  const selectZoom = useAttributePreference('web.selectZoom', 10);
  const mapFollow = useAttributePreference('mapFollow', false);

  const position = useSelector((state) => state.session.positions[currentId]);
  const locatePosition = useSelector((state) => state.session.positions[locateId]);

  const previousPosition = usePrevious(position);

  useEffect(() => {
    if (!mapReady) return;

    const positionChanged = position && (!previousPosition
      || position.latitude !== previousPosition.latitude
      || position.longitude !== previousPosition.longitude);

    if ((currentId !== previousId
      || currentTime !== previousTime
      || (mapFollow && positionChanged)) && position) {
      map.easeTo({
        center: [position.longitude, position.latitude],
        zoom: Math.max(map.getZoom(), selectZoom),
        offset: [0, -dimensions.popupMapOffset / 2],
      });
    }
  }, [currentId, previousId, currentTime, previousTime, mapFollow, position, selectZoom, mapReady]);

  useEffect(() => {
    if (!mapReady || !locateId || !locatePosition) return;

    map.easeTo({
      center: [locatePosition.longitude, locatePosition.latitude],
      zoom: Math.max(map.getZoom(), selectZoom),
      offset: [0, -dimensions.popupMapOffset / 2],
    });

    dispatch(devicesActions.selectId(locateId));
    dispatch(devicesActions.clearLocateId());
  }, [mapReady, locateId, locatePosition, selectZoom, dispatch]);

  return null;
};

MapSelectedDevice.handlesMapReady = true;

export default MapSelectedDevice;