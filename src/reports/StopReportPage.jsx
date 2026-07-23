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
import { useSelector } from 'react-redux';
import {
  formatDistance, formatVolume, formatTime, formatNumericHours,
} from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ColumnSelect from './components/ColumnSelect';
import usePersistedState from '../common/util/usePersistedState';
import { useCatch } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import MapPositions from '../map/MapPositions';
import MapView from '../map/core/MapView';
import MapCamera from '../map/MapCamera';
import AddressValue from '../common/components/AddressValue';
import TableShimmer from '../common/components/TableShimmer';
import MapGeofence from '../map/MapGeofence';
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import useResizableMap from './common/useResizableMap';
import RecentReportsWrapper from './components/RecentReportWrapper';

const columnsArray = [
  ['startTime', 'reportStartTime'],
  ['startOdometer', 'positionOdometer'],
  ['address', 'positionAddress'],
  ['endTime', 'reportEndTime'],
  ['duration', 'reportDuration'],
  ['engineHours', 'reportEngineHours'],
  ['spentFuel', 'reportSpentFuel'],
];
const columnsMap = new Map(columnsArray);

const StopReportPage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  const t = useTranslation();
  const { containerRef, mapHeight, handleMouseDown } = useResizableMap(60, 20, 80);

  const distanceUnit = useAttributePreference('distanceUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const userId = useSelector((state) => state.session.user?.id || 1);

  const [columns, setColumns] = usePersistedState('stopColumns', ['startTime', 'endTime', 'startOdometer', 'address']);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSubmit = useCatch(async ({ deviceId, groupIds, from, to, type, ...otherParams }, options = {}) => {
    const query = new URLSearchParams({ deviceId, from, to });

    if (type === 'export') {
      window.location.assign(`/api/reports/stops/xlsx?${query.toString()}`);
    } else if (type === 'mail') {
      const response = await fetch(`/api/reports/stops/mail?${query.toString()}`);
      if (!response.ok) throw Error(await response.text());
    } else {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/stops?${query.toString()}`, {
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

  const handleReRunReport = (config) => {
    if (!config) return;

    const deviceId = Array.isArray(config.deviceIds) && config.deviceIds.length > 0
      ? config.deviceIds[0]
      : config.deviceIds;

    handleSubmit(
      {
        deviceId,
        groupIds: config.groupIds || [],
        from: config.from,
        to: config.to,
        ...config.additionalParams,
      },
      { skipHistorySave: true },
    );
  };

  const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'stops';
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
        return formatDistance(value, distanceUnit, t);
      case 'duration':
        return formatNumericHours(value, t);
      case 'engineHours':
        return value > 0 ? formatNumericHours(value, t) : null;
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      case 'address':
        return <AddressValue latitude={item.latitude} longitude={item.longitude} originalAddress={value} />;
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
        <TableRow key={item.positionId} hover>
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
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportStops']}>
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
                <MapPositions
                  positions={[{
                    deviceId: selectedItem.deviceId,
                    fixTime: selectedItem.startTime,
                    latitude: selectedItem.latitude,
                    longitude: selectedItem.longitude,
                  }]}
                  titleField="fixTime"
                />
              </MapView>
              <MapScale />
              <MapCamera
                latitude={selectedItem.latitude}
                longitude={selectedItem.longitude}
              />
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

          {!loading && items.length === 0 && (
            <RecentReportsWrapper
              reportType="stops"
              onReRunReport={handleReRunReport}
            />
          )}
          {items.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                {columns.map((key) => {
                  const isSortable = key === 'startTime' || key === 'endTime' || key === 'duration' || key === 'startOdometer';
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

export default StopReportPage;
