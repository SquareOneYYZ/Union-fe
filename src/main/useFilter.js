import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { isDeviceStale, isPositionMoving, isIgnitionOn } from './deviceStatus';

const statusPriority = { online: 0, unknown: 1, offline: 2 };

export default (keyword, filter, filterSort, filterMap, positions, pinnedDevices, setFilteredDevices, setFilteredPositions) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

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
      .filter((device) => !filter.online || device.status === 'online')
      .filter((device) => !filter.moving || isPositionMoving(positions[device.id]))
      .filter((device) => !filter.ignition || isIgnitionOn(positions[device.id]))
      .filter((device) => !filter.stale || isDeviceStale(device))
      .filter((device) => {
        const lowerCaseKeyword = keyword.toLowerCase();
        return [device.name, device.uniqueId, device.phone, device.model, device.contact, device.vin].some((s) => s && s.toLowerCase().includes(lowerCaseKeyword));
      });

    switch (filterSort) {
      case 'name':
        filtered.sort((device1, device2) => device1.name.localeCompare(device2.name));
        break;
      case 'status':
        filtered.sort((device1, device2) => (statusPriority[device1.status] ?? 3) - (statusPriority[device2.status] ?? 3));
        break;
      case 'speed':
        filtered.sort((device1, device2) => (positions[device2.id]?.speed || 0) - (positions[device1.id]?.speed || 0));
        break;
      case 'ignition':
        filtered.sort((device1, device2) => Number(isIgnitionOn(positions[device2.id])) - Number(isIgnitionOn(positions[device1.id])));
        break;
      case 'lastUpdate':
        filtered.sort((device1, device2) => {
          const time1 = device1.lastUpdate ? dayjs(device1.lastUpdate).valueOf() : 0;
          const time2 = device2.lastUpdate ? dayjs(device2.lastUpdate).valueOf() : 0;
          return time2 - time1;
        });
        break;
      default:
        break;
    }

    if (pinnedDevices?.length) {
      filtered.sort((device1, device2) => {
        const pinned1 = pinnedDevices.includes(device1.id);
        const pinned2 = pinnedDevices.includes(device2.id);
        if (pinned1 === pinned2) return 0;
        return pinned1 ? -1 : 1;
      });
    }

    setFilteredDevices(filtered);
    setFilteredPositions(filterMap
      ? filtered.map((device) => positions[device.id]).filter(Boolean)
      : Object.values(positions));
  }, [keyword, filter, filterSort, filterMap, groups, devices, positions, pinnedDevices, setFilteredDevices, setFilteredPositions]);
};