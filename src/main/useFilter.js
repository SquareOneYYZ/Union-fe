import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export default (keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions) => {
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
      .filter((device) => {
        const lowerCaseKeyword = keyword.toLowerCase();
        return [device.name, device.uniqueId, device.phone, device.model, device.contact, device.vin].some((s) => s && s.toLowerCase().includes(lowerCaseKeyword));
      });
    switch (filterSort) {
      case 'name':
        filtered.sort((device1, device2) => device1.name.localeCompare(device2.name));
        break;
      case 'lastUpdate': {
        // this effect re-runs on every WS flush; parse each ISO string once
        // per run instead of 2·N·log N dayjs constructions in the comparator
        const updateTimes = new Map();
        filtered.forEach((device) => {
          updateTimes.set(device.id, device.lastUpdate ? Date.parse(device.lastUpdate) || 0 : 0);
        });
        filtered.sort((device1, device2) => updateTimes.get(device2.id) - updateTimes.get(device1.id));
        break;
      }
      default:
        break;
    }
    setFilteredDevices(filtered);
    setFilteredPositions(filterMap
      ? filtered.map((device) => positions[device.id]).filter(Boolean)
      : Object.values(positions));
  }, [keyword, filter, filterSort, filterMap, groups, devices, positions, setFilteredDevices, setFilteredPositions]);
};
