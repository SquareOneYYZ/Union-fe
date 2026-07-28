import { createSelector } from 'reselect';

// --------------------------------------
// Base selectors (always safe)
// --------------------------------------
export const getPositions = (state) => state.session?.positions || {};
export const getDevices = (state) => state.devices?.items || {};
export const getGroups = (state) => state.groups?.items || {};

export const getFilter = (state) => state.filter || { statuses: [], groups: [], keyword: '', sort: '' };

export const getPositionsArray = createSelector(
  [getPositions],
  (positions) => Object.values(positions),
);

const resolveDeviceGroups = (device, groups) => {
  const groupIds = [];
  let gid = device.groupId;

  while (gid) {
    groupIds.push(gid);
    gid = groups[gid]?.groupId || 0;
  }

  return groupIds;
};

export const getFilteredPositions = createSelector(
  [
    getPositionsArray,
    getDevices,
    getGroups,
    getFilter,
    (_, keyword = '') => keyword,
    (_, __, filterMap = false) => filterMap,
  ],
  (positions, devices, groups, filter, keyword, filterMap) => {
    const { statuses = [], groups: filterGroups = [] } = filter;
    const lowerKeyword = keyword?.toLowerCase() || '';

    const filteredDevices = Object.values(devices)
      .filter((device) => !statuses.length || statuses.includes(device.status))
      .filter((device) => !filterGroups.length
        || resolveDeviceGroups(device, groups).some((id) => filterGroups.includes(id)))
      .filter((device) => [device.name, device.uniqueId, device.model, device.phone, device.vin, device.contact]
        .some((s) => s?.toLowerCase?.().includes(lowerKeyword)));

    if (!filterMap) return positions;

    return filteredDevices
      .map((device) => positions.find((p) => p.deviceId === device.id))
      .filter(Boolean);
  },
);

export const getFilteredDevices = createSelector(
  [
    getDevices,
    getGroups,
    getFilter,
    (_, keyword = '') => keyword,
    (_, __, sort = '') => sort,
  ],
  (devices, groups, filter, keyword, sort) => {
    const { statuses = [], groups: filterGroups = [] } = filter;
    const lowerKeyword = keyword?.toLowerCase() || '';

    let filtered = Object.values(devices)
      .filter((device) => !statuses.length || statuses.includes(device.status))
      .filter((device) => !filterGroups.length
        || resolveDeviceGroups(device, groups).some((gid) => filterGroups.includes(gid)))
      .filter((device) => [device.name, device.uniqueId, device.model, device.phone, device.vin, device.contact]
        .some((s) => s?.toLowerCase?.().includes(lowerKeyword)));

    switch (sort) {
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'lastUpdate':
        filtered = [...filtered].sort((a, b) => {
          const t1 = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
          const t2 = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
          return t2 - t1;
        });
        break;
      default:
        // no sorting
        break;
    }

    return filtered;
  },
);
