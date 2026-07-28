import { useEffect } from 'react';
import { useSelector } from 'react-redux';
// PRIORITY 3: Import Reselect selectors instead of using Object.values
import { getFilteredDevices, getFilteredPositions } from '../store/selectors';

export default (keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions) => {
  // PRIORITY 3: Use memoized selectors that only recalculate when inputs change
  const filteredDevices = useSelector((state) => getFilteredDevices(state, keyword, filterSort));

  const filteredPositions = useSelector((state) => getFilteredPositions(state, keyword, filterMap));

  useEffect(() => {
    setFilteredDevices(filteredDevices);
    setFilteredPositions(filteredPositions);
  }, [filteredDevices, filteredPositions, setFilteredDevices, setFilteredPositions]);
};
