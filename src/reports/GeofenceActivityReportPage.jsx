import React, {
  useState,
  useEffect,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  TableSortLabel,
  Box,
  Pagination,
  Typography,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import { useSelector } from 'react-redux';
import {
  formatTime,
  formatDistance,
} from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import usePersistedState from '../common/util/usePersistedState';
import ColumnSelect from './components/ColumnSelect';
import { useCatch, useEffectAsync } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import { useAttributePreference } from '../common/util/preferences';
import scheduleReport from './common/scheduleReport';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapRoutePath from '../map/MapRoutePath';
import MapMarkers from '../map/MapMarkers';
import MapCamera from '../map/MapCamera';
import MapScale from '../map/MapScale';
import useResizableMap from './common/useResizableMap';

const columnsArray = [
  ['deviceId', 'sharedDevice'],
  ['geofenceId', 'sharedGeofence'],
  ['type', 'sharedType'],
  ['startTime', 'reportStartTime'],
  ['endTime', 'reportEndTime'],
  ['startDistance', 'sharedStartDistance'],
  ['endDistance', 'sharedEndDistance'],
  ['distanceTraveled', 'sharedDistanceTraveled'],
];

const columnsMap = new Map(columnsArray);

const allEventTypes = [
  ['allTypes', 'sharedAll'],
  ['inside', 'inside'],
  ['outside', 'outside'],
];

const segmentTypes = [
  ['all', 'All Segments'],
  ['open', 'Open Segments Only'],
  ['reentry', 'Re-Entries Only'],
];

const GeofenceDistanceReportPage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  const t = useTranslation();
  const { containerRef, mapHeight, handleMouseDown } = useResizableMap(60, 20, 80);

  const devices = useSelector((state) => state.devices.items);

  const distanceUnit = useAttributePreference('distanceUnit');
  const [filterRange, setFilterRange] = useState({ from: null, to: null });

  const [columns, setColumns] = usePersistedState('geofenceDistanceColumns', [
    'deviceId',
    'geofenceId',
    'startTime',
    'endTime',
    'type',
    'totalDistance',
    'startDistance',
    'endDistance',
    'distanceTraveled',
  ]);

  const [items, setItems] = useState([]);
  const [geofences, setGeofences] = useState({});
  const [allGeofences, setAllGeofences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(['allTypes']);
  const [selectedSegmentType, setSelectedSegmentType] = useState('all');
  const [selectedGeofences, setSelectedGeofences] = useState(['allGeofences']);
  const [minDistance, setMinDistance] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [positions, setPositions] = useState([]);
  const [route, setRoute] = useState(null);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('startTime');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    const fetchGeofences = async () => {
      try {
        const response = await fetch('/api/geofences', {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          const geofenceMap = {};
          data.forEach((geofence) => {
            geofenceMap[geofence.id] = geofence;
          });
          setGeofences(geofenceMap);
          setAllGeofences(data);
        }
      } catch (error) {
        console.error('Error fetching geofences:', error);
      }
    };

    fetchGeofences();
  }, []);

  const createMarkers = () => {
    const markers = [];
    if (positions.length > 0) {
      markers.push({
        latitude: positions[0].latitude,
        longitude: positions[0].longitude,
        image: 'start-success',
      });
    }
    if (positions.length > 1) {
      markers.push({
        latitude: positions[1].latitude,
        longitude: positions[1].longitude,
        image: 'finish-error',
      });
    }
    return markers;
  };

  useEffectAsync(async () => {
    if (selectedItem) {
      const positionsToFetch = [];

      if (selectedItem.enterPositionId) {
        positionsToFetch.push(selectedItem.enterPositionId);
      }
      if (selectedItem.exitPositionId) {
        positionsToFetch.push(selectedItem.exitPositionId);
      }

      if (positionsToFetch.length > 0) {
        const responses = await Promise.all(
          positionsToFetch.map(async (posId) => {
            const response = await fetch(`/api/positions?id=${posId}`);

            if (!response.ok) {
              throw new Error(await response.text());
            }

            const posData = await response.json();
            return posData.length > 0 ? posData[0] : null;
          }),
        );

        const fetchedPositions = responses.filter(Boolean);

        setPositions(fetchedPositions);

        if (selectedItem.startTime && selectedItem.endTime) {
          const query = new URLSearchParams({
            deviceId: selectedItem.deviceId,
            from: selectedItem.startTime,
            to: selectedItem.endTime,
          });
          const routeResponse = await fetch(`/api/reports/route?${query.toString()}`, {
            headers: { Accept: 'application/json' },
          });
          if (routeResponse.ok) {
            setRoute(await routeResponse.json());
          } else {
            setRoute(null);
          }
        } else {
          setRoute(null);
        }
      } else {
        setPositions([]);
        setRoute(null);
      }
    } else {
      setPositions([]);
      setRoute(null);
    }
  }, [selectedItem]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage - 1);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const preparedData = useMemo(() => items.map((item) => ({
    ...item,
    deviceName: devices[item.deviceId]?.name || '',
    geofenceName: geofences[item.geofenceId]?.name || '',
  })), [items, devices, geofences]);

  const sortedAndPaginatedData = useMemo(() => {
    if (!preparedData || preparedData.length === 0) return [];

    const comparator = (a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (orderBy.toLowerCase().includes('time') || orderBy.toLowerCase().includes('date')) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (order === 'asc') {
        if (aVal < bVal) {
          return -1;
        }
        if (aVal > bVal) {
          return 1;
        }
        return 0;
      }

      if (aVal > bVal) {
        return -1;
      }
      if (aVal < bVal) {
        return 1;
      }
      return 0;
    };

    const sorted = [...preparedData].sort(comparator);
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [preparedData, order, orderBy, page, rowsPerPage]);

  const totalCount = preparedData.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startRow = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount);

  const handleSubmit = useCatch(async ({ deviceId, from, to, type }) => {
    const query = new URLSearchParams({ deviceId, from, to });

    if (selectedTypes[0] !== 'allTypes') {
      selectedTypes.forEach((eventType) => query.append('type', eventType));
    }

    if (type === 'export') {
      window.location.assign(`/api/reports/devicegeofencedistances/xlsx?${query.toString()}`);
    } else if (type === 'mail') {
      const response = await fetch(
        `/api/reports/devicegeofencedistances/mail?${query.toString()}`,
      );
      if (!response.ok) {
        throw Error(await response.text());
      }
    } else {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/devicegeofencedistances?${query.toString()}`,
          {
            headers: { Accept: 'application/json' },
          },
        );
        if (response.ok) {
          let data = await response.json();

          if (selectedTypes[0] !== 'allTypes') {
            data = data.filter((item) => selectedTypes.includes(item.type));
          }

          if (selectedSegmentType === 'open') {
            data = data.filter((item) => item.open === true);
          } else if (selectedSegmentType === 'reentry') {
            data = data.filter((item) => item.open === false);
          }

          if (minDistance && !Number.isNaN(parseFloat(minDistance))) {
            const minDistanceMeters = parseFloat(minDistance) * 1000;
            data = data.filter((item) => item.distance >= minDistanceMeters);
          }

          if (selectedGeofences[0] !== 'allGeofences') {
            const selectedGeofenceIds = selectedGeofences.map(Number);
            const existingData = data.filter((item) => selectedGeofenceIds.includes(item.geofenceId));

            const existingGeofenceIds = new Set(existingData.map((item) => item.geofenceId));
            const missingGeofenceIds = selectedGeofenceIds.filter(
              (id) => !existingGeofenceIds.has(id),
            );

            const placeholderRows = missingGeofenceIds.map((geofenceId, index) => ({
              id: `placeholder-${geofenceId}-${index}`,
              deviceId,
              geofenceId,
              type: 'N/A',
              startTime: null,
              endTime: null,
              distance: 0,
              odoStart: 0,
              odoEnd: 0,
              isPlaceholder: true,
            }));

            data = [...existingData, ...placeholderRows];
          }

          setItems(data);
          setFilterRange({ from, to });
          setPage(0);
        } else {
          throw Error(await response.text());
        }
      } finally {
        setLoading(false);
      }
    }
  });

  const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'geofence-distance';
    const error = await scheduleReport(deviceIds, groupIds, report);
    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  const formatValue = (item, key) => {
    if (item.isPlaceholder) {
      if (key === 'deviceId') {
        return devices[item.deviceId]?.name || item.deviceId;
      }
      if (key === 'geofenceId') {
        return geofences[item.geofenceId]?.name || item.geofenceId;
      }
      return 'N/A';
    }

    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name || value;

      case 'geofenceId':
        return geofences[value]?.name || value;

      case 'startTime':
        return item.startTime ? formatTime(item.startTime, 'minutes') : 'N/A';

      case 'endTime': {
        if (item.open === true) {
          return 'In Progress';
        }
        return item.endTime ? formatTime(item.endTime, 'minutes') : 'N/A';
      }

      case 'type': {
        if (value === 'enter') return t('geofenceEnter');
        if (value === 'exit') return t('geofenceExit');
        if (value === 'Inside' || value === 'inside') return 'Inside';
        if (value === 'Outside' || value === 'outside') return 'Outside';
        return value;
      }

      case 'startDistance': {
        if (item.odoStart !== null && item.odoStart !== undefined) {
          return formatDistance(item.odoStart, distanceUnit, t);
        }
        return 'N/A';
      }

      case 'endDistance': {
        if (item.odoEnd !== null && item.odoEnd !== undefined) {
          return formatDistance(item.odoEnd, distanceUnit, t);
        }
        return 'N/A';
      }

      case 'distanceTraveled': {
        if (item.distance !== null && item.distance !== undefined) {
          const formattedDistance = formatDistance(item.distance, distanceUnit, t);
          return item.open === true ? `${formattedDistance} (current)` : formattedDistance;
        }
        return 'N/A';
      }

      default:
        return value;
    }
  };

  let tableBodyContent;

  if (loading) {
    tableBodyContent = <TableShimmer columns={columns.length + 1} startAction />;
  } else if (sortedAndPaginatedData.length === 0) {
    tableBodyContent = (
      <TableRow>
        <TableCell colSpan={columns.length + 1} align="center">
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            {t('sharedNoData') || 'No data available'}
          </Typography>
        </TableCell>
      </TableRow>
    );
  } else {
    tableBodyContent = sortedAndPaginatedData.map((item) => {
      const isSelectedItem = selectedItem === item;
      const hasPositionId = !item.isPlaceholder && (item.enterPositionId || item.exitPositionId);

      let locationAction = null;

      if (hasPositionId) {
        locationAction = isSelectedItem ? (
          <IconButton size="small" onClick={() => setSelectedItem(null)}>
            <GpsFixedIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton size="small" onClick={() => setSelectedItem(item)}>
            <LocationSearchingIcon fontSize="small" />
          </IconButton>
        );
      }

      return (
        <TableRow key={item.id} hover>
          <TableCell className={classes.columnAction} padding="none">
            {locationAction}
          </TableCell>
          {columns.map((key) => (
            <TableCell key={key}>{formatValue(item, key)}</TableCell>
          ))}
        </TableRow>
      );
    });
  }

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={['reportTitle', 'reportGeofenceDistance']}
    >
      <div
        ref={containerRef}
        className={classes.container}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
        }}
      >
        {selectedItem && (
          <>
            <div
              className={classes.containerMap}
              style={{
                height: `${mapHeight}%`,
                minHeight: '150px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <MapView>
                <MapGeofence />
                {route && (
                  <>
                    <MapRoutePath positions={route} />
                    <MapMarkers markers={createMarkers()} />
                    <MapCamera positions={route} />
                  </>
                )}
              </MapView>
              <MapScale />
            </div>

            <button
              type="button"
              aria-label="Resize map"
              onMouseDown={handleMouseDown}
              style={{
                height: '8px',
                backgroundColor: '#e0e0e0',
                cursor: 'row-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                borderTop: '1px solid #ccc',
                borderBottom: '1px solid #ccc',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.backgroundColor = '#d0d0d0';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.backgroundColor = '#e0e0e0';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  backgroundColor: '#999',
                  borderRadius: '2px',
                }}
              />
            </button>
          </>
        )}

        <div
          className={classes.containerMain}
          style={{
            flex: 1,
            overflow: 'auto',
            minHeight: '150px',
          }}
        >
          <div className={classes.containerMain}>
            <div className={classes.header}>
              <ReportFilter
                handleSubmit={handleSubmit}
                handleSchedule={handleSchedule}
                loading={loading}
              >
                <div className={classes.filterItem}>
                  <FormControl fullWidth>
                    <InputLabel>Segment Type</InputLabel>
                    <Select
                      label="Segment Type"
                      value={selectedSegmentType}
                      onChange={(e) => setSelectedSegmentType(e.target.value)}
                      sx={{ // ← ADD THIS
                        borderRadius: '13px',
                        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                      }}
                      MenuProps={{ // ← ADD THIS
                        PaperProps: { sx: { borderRadius: '13px' } },
                      }}
                    >
                      {segmentTypes.map(([key, label]) => (
                        <MenuItem key={key} value={key}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                <div className={classes.filterItem}>
                  <TextField
                    fullWidth
                    label="Minimum Distance (km)"
                    type="number"
                    value={minDistance}
                    onChange={(e) => setMinDistance(e.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ // ← ADD THIS
                      borderRadius: '13px',
                      '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                    }}
                    MenuProps={{ // ← ADD THIS
                      PaperProps: { sx: { borderRadius: '13px' } },
                    }}
                  />
                </div>
                <div className={classes.filterItem}>
                  <FormControl fullWidth>
                    <InputLabel>{t('sharedType')}</InputLabel>
                    <Select
                      label={t('sharedType')}
                      value={selectedTypes}
                      onChange={(e, child) => {
                        let values = e.target.value;
                        const clicked = child.props.value;
                        if (values.includes('allTypes') && values.length > 1) {
                          values = [clicked];
                        }
                        setSelectedTypes(values);
                      }}
                      multiple
                      sx={{ // ← ADD THIS
                        borderRadius: '13px',
                        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                      }}
                      MenuProps={{ // ← ADD THIS
                        PaperProps: { sx: { borderRadius: '13px' } },
                      }}
                    >
                      {allEventTypes.map(([key, string]) => (
                        <MenuItem key={key} value={key}>
                          {t(string)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                <div className={classes.filterItem}>
                  <FormControl fullWidth>
                    <InputLabel>{t('sharedGeofence')}</InputLabel>
                    <Select
                      label={t('sharedGeofence')}
                      value={selectedGeofences}
                      onChange={(e, child) => {
                        let values = e.target.value;
                        const clicked = child.props.value;
                        if (values.includes('allGeofences') && values.length > 1) {
                          values = [clicked];
                        }
                        setSelectedGeofences(values);
                      }}
                      multiple
                      sx={{ // ← ADD THIS
                        borderRadius: '13px',
                        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                      }}
                      MenuProps={{ // ← ADD THIS
                        PaperProps: { sx: { borderRadius: '13px' } },
                      }}
                    >
                      <MenuItem key="allGeofences" value="allGeofences">
                        All Geofences
                      </MenuItem>
                      {allGeofences.map((geofence) => (
                        <MenuItem key={geofence.id} value={geofence.id.toString()}>
                          {geofence.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                <ColumnSelect
                  columns={columns}
                  setColumns={setColumns}
                  columnsArray={columnsArray}
                />
              </ReportFilter>
            </div>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell className={classes.columnAction} />
                  {columns.map((key) => {
                    const isSortable = key === 'startTime' || key === 'endTime' || key === 'deviceId' || key === 'geofenceId';
                    if (isSortable) {
                      return (
                        <TableCell key={key}>
                          <TableSortLabel
                            active={orderBy === key}
                            direction={orderBy === key ? order : 'asc'}
                            onClick={() => handleRequestSort(key)}
                          >
                            {t(columnsMap.get(key))}
                            {orderBy === key ? (
                              <Box component="span" sx={visuallyHidden}>
                                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                              </Box>
                            ) : null}
                          </TableSortLabel>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={key}>{t(columnsMap.get(key))}</TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>{tableBodyContent}</TableBody>
            </Table>
            {!loading && sortedAndPaginatedData.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                  p: 2,
                  borderTop: '1px solid rgba(224, 224, 224, 1)',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {t('sharedRowsPerPage') || 'Rows per page'}
                    :
                  </Typography>
                  <FormControl size="small">
                    <Select
                      value={rowsPerPage}
                      onChange={handleChangeRowsPerPage}
                      sx={{ minWidth: 80 }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    {startRow}
                    -
                    {endRow}
                    {' '}
                    {t('sharedOf') || 'of'}
                    {' '}
                    {totalCount}
                  </Typography>
                </Box>

                <Pagination
                  count={totalPages}
                  page={page + 1}
                  onChange={handleChangePage}
                  color="primary"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  boundaryCount={1}
                />
              </Box>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default GeofenceDistanceReportPage;
