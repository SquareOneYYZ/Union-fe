import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Box,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import {
  formatDistance, formatSpeed, formatVolume, formatTime, formatNumericHours,
} from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ColumnSelect from './components/ColumnSelect';
import usePersistedState from '../common/util/usePersistedState';
import { useCatch, useEffectAsync } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import AddressValue from '../common/components/AddressValue';
import TableShimmer from '../common/components/TableShimmer';
import MapMarkers from '../map/MapMarkers';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import useResizableMap from './common/useResizableMap';

const columnsArray = [
  ['startTime', 'reportStartTime'],
  ['startOdometer', 'reportStartOdometer'],
  ['startAddress', 'reportStartAddress'],
  ['endTime', 'reportEndTime'],
  ['endOdometer', 'reportEndOdometer'],
  ['endAddress', 'reportEndAddress'],
  ['distance', 'sharedDistance'],
  ['averageSpeed', 'reportAverageSpeed'],
  ['maxSpeed', 'reportMaximumSpeed'],
  ['duration', 'reportDuration'],
  ['spentFuel', 'reportSpentFuel'],
  ['driverName', 'sharedDriver'],
];
const columnsMap = new Map(columnsArray);

const TripReportPage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  const t = useTranslation();
  const { containerRef, mapHeight, handleMouseDown } = useResizableMap(60, 20, 80);
  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  const [columns, setColumns] = usePersistedState('tripColumns', ['startTime', 'endTime', 'distance', 'averageSpeed']);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [route, setRoute] = useState(null);

  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('startTime');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const createMarkers = () => ([
    {
      latitude: selectedItem.startLat,
      longitude: selectedItem.startLon,
      image: 'start-success',
    },
    {
      latitude: selectedItem.endLat,
      longitude: selectedItem.endLon,
      image: 'finish-error',
    },
  ]);

  useEffectAsync(async () => {
    if (selectedItem) {
      const query = new URLSearchParams({
        deviceId: selectedItem.deviceId,
        from: selectedItem.startTime,
        to: selectedItem.endTime,
      });
      const response = await fetch(`/api/reports/route?${query.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        setRoute(await response.json());
      } else {
        throw Error(await response.text());
      }
    } else {
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

  const sortedAndPaginatedData = useMemo(() => {
    if (!items || items.length === 0) return [];

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

    const sorted = [...items].sort(comparator);
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [items, order, orderBy, page, rowsPerPage]);

  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startRow = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount);

  const handleSubmit = useCatch(async ({ deviceId, from, to, type }) => {
    const query = new URLSearchParams({ deviceId, from, to });
    if (type === 'export') {
      window.location.assign(`/api/reports/trips/xlsx?${query.toString()}`);
    } else if (type === 'mail') {
      const response = await fetch(`/api/reports/trips/mail?${query.toString()}`);
      if (!response.ok) {
        throw Error(await response.text());
      }
    } else {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/trips?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          setItems(await response.json());
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
    report.type = 'trips';
    const error = await scheduleReport(deviceIds, groupIds, report);
    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'startTime':
      case 'endTime':
        return formatTime(value, 'minutes');
      case 'startOdometer':
      case 'endOdometer':
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : null;
      case 'duration':
        return formatNumericHours(value, t);
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      case 'startAddress':
        return (<AddressValue latitude={item.startLat} longitude={item.startLon} originalAddress={value} />);
      case 'endAddress':
        return (<AddressValue latitude={item.endLat} longitude={item.endLon} originalAddress={value} />);
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

      const locationAction = isSelectedItem ? (
        <IconButton size="small" onClick={() => setSelectedItem(null)}>
          <GpsFixedIcon fontSize="small" />
        </IconButton>
      ) : (
        <IconButton size="small" onClick={() => setSelectedItem(item)}>
          <LocationSearchingIcon fontSize="small" />
        </IconButton>
      );

      return (
        <TableRow key={item.startPositionId} hover>
          <TableCell className={classes.columnAction} padding="none">
            {locationAction}
          </TableCell>
          {columns.map((key) => (
            <TableCell key={key}>
              {formatValue(item, key)}
            </TableCell>
          ))}
        </TableRow>
      );
    });
  }

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportTrips']}>
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
          <div className={classes.header}>
            <ReportFilter handleSubmit={handleSubmit} handleSchedule={handleSchedule} loading={loading}>
              <ColumnSelect columns={columns} setColumns={setColumns} columnsArray={columnsArray} />
            </ReportFilter>
          </div>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                {columns.map((key) => {
                  const isSortable = key === 'startTime' || key === 'endTime' || key === 'distance' || key === 'duration' || key === 'averageSpeed' || key === 'maxSpeed';
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
    </PageLayout>
  );
};

export default TripReportPage;
