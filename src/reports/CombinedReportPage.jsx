import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Box, Pagination, FormControl, Select, MenuItem, Typography,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper';
import MapView from '../map/core/MapView';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import { formatTime } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import MapMarkers from '../map/MapMarkers';
import MapRouteCoordinates from '../map/MapRouteCoordinates';
import MapScale from '../map/MapScale';
import useResizableMap from './common/useResizableMap';
import deviceEquality from '../common/util/deviceEquality';

const CombinedReportPage = () => {
  const classes = useReportStyles();
  const t = useTranslation();
  const devices = useSelector(
    (state) => state.devices.items,
    deviceEquality(['id', 'name', 'uniqueId']),
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('eventTime');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { containerRef, mapHeight, handleMouseDown } = useResizableMap(60, 20, 80);

  const itemsCoordinates = useMemo(() => items.flatMap((item) => item.route), [items]);
  const createMarkers = () => items.flatMap((item) => item.events
    .map((event) => item.positions.find((p) => event.positionId === p.id))
    .filter((position) => position != null)
    .map((position) => ({
      latitude: position.latitude,
      longitude: position.longitude,
    })));

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

  const flattenedData = useMemo(() => items.flatMap((item) => item.events.map((event, index) => ({
    id: event.id,
    deviceId: item.deviceId,
    deviceName: devices[item.deviceId]?.name || '',
    eventTime: event.eventTime,
    eventType: event.type,
    isFirstForDevice: index === 0,
  }))), [items, devices]);

  const sortedAndPaginatedData = useMemo(() => {
    if (!flattenedData || flattenedData.length === 0) return [];

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

    const sorted = [...flattenedData].sort(comparator);
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [flattenedData, order, orderBy, page, rowsPerPage]);

  const totalCount = flattenedData.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startRow = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount);

  const handleSubmit = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/combined?${query.toString()}`);
      if (response.ok) {
        setItems(await response.json());
        setPage(0);
      } else {
        throw Error(await response.text());
      }
    } finally {
      setLoading(false);
    }
  });

  let tableBodyContent;

  if (loading) {
    tableBodyContent = <TableShimmer columns={3} />;
  } else if (sortedAndPaginatedData.length === 0) {
    tableBodyContent = (
      <TableRow>
        <TableCell colSpan={3} align="center">
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            {t('sharedNoData') || 'No data available'}
          </Typography>
        </TableCell>
      </TableRow>
    );
  } else {
    tableBodyContent = sortedAndPaginatedData.map((row) => (
      <TableRow key={row.id} hover>
        <TableCell>{row.isFirstForDevice ? row.deviceName : ''}</TableCell>
        <TableCell>{formatTime(row.eventTime, 'seconds')}</TableCell>
        <TableCell>{t(prefixString('event', row.eventType))}</TableCell>
      </TableRow>
    ));
  }

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportCombined']}>
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
        {Boolean(items.length) && (
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
                {items.map((item) => (
                  <MapRouteCoordinates
                    key={item.deviceId}
                    name={devices[item.deviceId].name}
                    coordinates={item.route}
                    deviceId={item.deviceId}
                  />
                ))}
                <MapMarkers markers={createMarkers()} />
              </MapView>
              <MapScale />
              <MapCamera coordinates={itemsCoordinates} />
            </div>

            <button
              type="button"
              aria-label="button"
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
            <ReportFilter
              handleSubmit={handleSubmit}
              showOnly
              multiDevice
              includeGroups
              loading={loading}
            />
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'deviceName'}
                    direction={orderBy === 'deviceName' ? order : 'asc'}
                    onClick={() => handleRequestSort('deviceName')}
                  >
                    {t('sharedDevice')}
                    {orderBy === 'deviceName' && (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    )}
                  </TableSortLabel>
                </TableCell>

                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'eventTime'}
                    direction={orderBy === 'eventTime' ? order : 'asc'}
                    onClick={() => handleRequestSort('eventTime')}
                  >
                    {t('positionFixTime')}
                    {orderBy === 'eventTime' && (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    )}
                  </TableSortLabel>
                </TableCell>

                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'eventType'}
                    direction={orderBy === 'eventType' ? order : 'asc'}
                    onClick={() => handleRequestSort('eventType')}
                  >
                    {t('sharedType')}
                    {orderBy === 'eventType' && (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    )}
                  </TableSortLabel>
                </TableCell>
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

export default CombinedReportPage;
