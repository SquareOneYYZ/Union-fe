import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { selectDevicesAndGroups } from '../store/selectors';
import deviceEquality from '../common/util/deviceEquality';

export default (keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions) => {
  const { devices, groups } = useSelector(
    selectDevicesAndGroups,
    (prev, next) => deviceEquality(['id', 'name', 'uniqueId', 'status', 'lastUpdate'])(prev.devices, next.devices)
      && deviceEquality(['id', 'name'])(prev.groups, next.groups),
  );

  useEffect(() => {
    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId) {
        groupIds.push(groupId);
        groupId = groups[groupId]?.groupId || 0;
      }
      return groupIds;
    };

    const filtered = Object.values(devices)
      .filter((device) => !filter.statuses.length || filter.statuses.includes(device.status))
      .filter((device) => !filter.groups.length || deviceGroups(device).some((id) => filter.groups.includes(id)))
      .filter((device) => {
        const lowerCaseKeyword = keyword.toLowerCase();
        return [device.name, device.uniqueId, device.phone, device.model, device.contact, device.vin].some((s) => s && s.toLowerCase().includes(lowerCaseKeyword));
      });

    switch (filterSort) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'lastUpdate':
        filtered.sort((a, b) => {
          const time1 = a.lastUpdate ? dayjs(a.lastUpdate).valueOf() : 0;
          const time2 = b.lastUpdate ? dayjs(b.lastUpdate).valueOf() : 0;
          return time2 - time1;
        });
        break;
      default:
        filtered.sort((a, b) => {
          const time1 = a.lastUpdate ? dayjs(a.lastUpdate).valueOf() : 0;
          const time2 = b.lastUpdate ? dayjs(b.lastUpdate).valueOf() : 0;
          return time2 - time1;
        });
        break;
    }

    setFilteredDevices(filtered);
    setFilteredPositions(filterMap
      ? filtered.map((device) => positions[device.id]).filter(Boolean)
      : Object.values(positions));
  }, [keyword, filter, filterSort, filterMap, groups, devices, positions, setFilteredDevices, setFilteredPositions]);
};
