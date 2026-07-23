import React, {
  useState, useCallback, useEffect, useRef,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Link,
  IconButton,
  Collapse,
  Box,
  Typography,
  CircularProgress,
  TableSortLabel,
  Pagination,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import ReplayIcon from '@mui/icons-material/Replay';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useSelector } from 'react-redux';
import {
  formatSpeed,
  formatTime,
  formatDistance,
} from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import {
  useTranslation,
  useTranslationKeys,
} from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import usePersistedState from '../common/util/usePersistedState';
import ColumnSelect from './components/ColumnSelect';
import { useCatch, useEffectAsync } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import { useAttributePreference } from '../common/util/preferences';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapPositions from '../map/MapPositions';
import MapCamera from '../map/MapCamera';
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import SelectField from '../common/components/SelectField';
import ReplayControl from './components/ReplayControl';
import MediaPreview from './components/MediaPreview';

const columnsArray = [
  ['eventTime', 'positionFixTime'],
  ['type', 'sharedType'],
  ['geofenceId', 'sharedGeofence'],
  ['maintenanceId', 'sharedMaintenance'],
  ['attributes', 'commandData'],
  ['speedLimit', 'attributeSpeedLimit'],
];

const filterEvents = (events, typesToExclude) => {
  const excludeSet = new Set(typesToExclude);
  return events.filter((event) => !excludeSet.has(event.type));
};

const groupEventsWithMedia = (events) => {
  const grouped = [];
  let currentAlarm = null;

  events.forEach((event) => {
    if (event.type === 'alarm') {
      currentAlarm = {
        alarm: event,
        media: [],
      };
      grouped.push(currentAlarm);
    } else if (event.type === 'media' && currentAlarm) {
      currentAlarm.media.push(event);
    } else {
      grouped.push({ event });
    }
  });

  return grouped;
};

const columnsMap = new Map(columnsArray);

const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isVideoFile = (filename) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const VideoThumbnail = ({ url, filename }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const timeoutId = setTimeout(() => {
      setError(true);
      setLoading(false);
      video.remove();
    }, 8000);

    const handleLoadedData = () => {
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setThumbnail(thumbnailDataUrl);
        setLoading(false);
        clearTimeout(timeoutId);
        video.remove();
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        setError(true);
        setLoading(false);
        clearTimeout(timeoutId);
        video.remove();
      }
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
      clearTimeout(timeoutId);
      video.remove();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.remove();
    };
  }, [url]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#fafafa',
        }}
      >
        <CircularProgress size={24} sx={{ color: '#888' }} />
      </Box>
    );
  }

  if (error || !thumbnail) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#fafafa',
        }}
      >
        <PlayCircleOutlineIcon sx={{ fontSize: 40, color: '#888' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={thumbnail}
        alt={filename}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <PlayCircleOutlineIcon sx={{ fontSize: 24 }} />
      </Box>
    </Box>
  );
};

const MediaBar = ({ mediaItems, devices, onMediaClick }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 1.5,
      overflowX: 'auto',
      padding: 1.5,
      borderRadius: 1,
      '&::-webkit-scrollbar': {
        height: 8,
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#9e9e9e',
        borderRadius: 4,
        '&:hover': {
          backgroundColor: '#757575',
        },
      },
    }}
  >
    {mediaItems.map((mediaItem) => {
      const mediaUrl = `/api/media/${devices[mediaItem.deviceId]?.uniqueId}/${mediaItem.attributes.file}`;
      const filename = mediaItem.attributes.file;
      const isImage = isImageFile(filename);
      const isVideo = isVideoFile(filename);

      return (
        <Box
          key={mediaItem.id}
          onClick={() => onMediaClick(mediaUrl)}
          sx={{
            minWidth: 120,
            maxWidth: 120,
            height: 100,
            cursor: 'pointer',
            borderRadius: 1,
            overflow: 'hidden',
            border: '2px solid #e0e0e0',
            backgroundColor: '#fff',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              borderColor: '#1976d2',
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isImage && (
              <img
                src={mediaUrl}
                alt={filename}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            {isVideo && <VideoThumbnail url={mediaUrl} filename={filename} />}

            {!isImage && !isVideo && (
              <InsertDriveFileIcon sx={{ fontSize: 40, color: '#9e9e9e' }} />
            )}
          </Box>
          <Box
            sx={{
              padding: 0.5,
              backgroundColor: '#fff',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontSize: 10,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#666',
              }}
              title={filename}
            >
              {filename}
            </Typography>
          </Box>
        </Box>
      );
    })}
  </Box>
);

const EventReportPage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const geofences = useSelector((state) => state.geofences.items);

  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');

  const [allEventTypes, setAllEventTypes] = useState([
    ['allEvents', 'eventAll'],
  ]);

  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map(
    (it) => ({
      key: unprefixString('alarm', it),
      name: t(it),
    }),
  );

  const [columns, setColumns] = usePersistedState('eventColumns', [
    'eventTime',
    'type',
    'attributes',
    'speedLimit',
  ]);
  const [eventTypes, setEventTypes] = useState(['allEvents']);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState([]);
  const [openAlarms, setOpenAlarms] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [position, setPosition] = useState(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayPositions, setReplayPositions] = useState([]);
  const [replayLoading, setReplayLoading] = useState(false);
  const [eventPosition, setEventPosition] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);

  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('eventTime');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const deviceName = useSelector((state) => {
    if (selectedItem?.deviceId) {
      const device = state.devices.items[selectedItem.deviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  useEffectAsync(async () => {
    if (selectedItem && !replayMode) {
      const response = await fetch(
        `/api/positions?id=${selectedItem.positionId}`,
      );
      if (response.ok) {
        const positions = await response.json();
        if (positions.length > 0) {
          setPosition(positions[0]);
        }
      } else {
        throw Error(await response.text());
      }
    } else if (!selectedItem) {
      setPosition(null);
    }
  }, [selectedItem, replayMode]);

  useEffectAsync(async () => {
    const response = await fetch('/api/notifications/types');
    if (response.ok) {
      const types = await response.json();
      const filteredTypes = [
        'deviceFuelDrop',
        'deviceFuelIncrease',
        'textMessage',
        'driverChanged',
      ];
      const typeFiltered = types.filter(
        (item) => !filteredTypes.includes(item.type),
      );
      setAllEventTypes([
        ...allEventTypes,
        ...typeFiltered.map((it) => [it.type, prefixString('event', it.type)]),
      ]);
    } else {
      throw Error(await response.text());
    }
  }, []);

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
  })), [items, devices]);

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
    eventTypes.forEach((it) => query.append('type', it));
    if (eventTypes[0] !== 'allEvents' && eventTypes.includes('alarm')) {
      alarmTypes.forEach((it) => query.append('alarm', it));
    }
    if (type === 'export') {
      window.location.assign(`/api/reports/events/xlsx?${query.toString()}`);
    } else if (type === 'mail') {
      const response = await fetch(
        `/api/reports/events/mail?${query.toString()}`,
      );
      if (!response.ok) {
        throw Error(await response.text());
      }
    } else {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/reports/events?${query.toString()}`,
          {
            headers: { Accept: 'application/json' },
          },
        );
        if (response.ok) {
          const data = await response.json();

          const typesToExclude = [
            'deviceOnline',
            'deviceUnknown',
            'commandResult',
            'queuedCommandSent',
          ];
          const modifiedData = data.map((item) => ({
            ...item,
            speedLimit: item.attributes?.speedLimit || null,
          }));
          const filteredEvents = filterEvents(modifiedData, typesToExclude);
          setItems(filteredEvents);
          const grouped = groupEventsWithMedia(filteredEvents);
          setGroupedItems(grouped);
        } else {
          throw Error(await response.text());
        }
      } finally {
        setLoading(false);
      }
    }
  });

  const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'events';
    if (eventTypes[0] !== 'allEvents') {
      report.attributes.types = eventTypes.join(',');
    }
    const error = await scheduleReport(deviceIds, groupIds, report);
    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  const handleReplayStart = useCatch(async (item) => {
    setReplayLoading(true);
    setReplayMode(true);
    setSelectedItem(item);

    try {
      const eventTime = new Date(item.eventTime);
      const fromTime = new Date(eventTime.getTime() - 60 * 60 * 1000);
      const toTime = new Date(eventTime.getTime() + 60 * 60 * 1000);
      const query = new URLSearchParams({
        deviceId: item.deviceId,
        from: fromTime.toISOString(),
        to: toTime.toISOString(),
      });

      const response = await fetch(`/api/positions?${query.toString()}`);
      if (response.ok) {
        const positions = await response.json();

        setReplayPositions(positions);
        const eventPositionResponse = await fetch(
          `/api/positions?id=${item.positionId}`,
        );
        if (eventPositionResponse.ok) {
          const eventPositions = await eventPositionResponse.json();
          if (eventPositions.length > 0) {
            setEventPosition(eventPositions[0]);
          }
        }

        if (positions.length === 0) {
          throw Error(t('sharedNoData'));
        }
      } else {
        throw Error(await response.text());
      }
    } finally {
      setReplayLoading(false);
    }
  });

  const handleReplayStop = () => {
    setReplayMode(false);
    setReplayPositions([]);
    setEventPosition(null);
    setSelectedItem(null);
  };

  const handleMediaClick = useCallback((mediaUrl) => {
    setMediaPreviewUrl(mediaUrl);
  }, []);

  const toggleAlarmDropdown = (alarmId) => {
    setOpenAlarms((prev) => ({
      ...prev,
      [alarmId]: !prev[alarmId],
    }));
  };

  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'eventTime':
        return formatTime(value, 'seconds');

      case 'type':
        return t(prefixString('event', value));

      case 'geofenceId': {
        if (value > 0) {
          const geofence = geofences[value];
          return geofence && geofence.name;
        }
        return null;
      }

      case 'maintenanceId':
        return value > 0 ? value : null;

      case 'speedLimit': {
        if (item.type === 'deviceOverspeed' && item.attributes?.speedLimit) {
          return formatSpeed(item.attributes.speedLimit, speedUnit, t);
        }
        return null;
      }

      case 'attributes':
        switch (item.type) {
          case 'alarm':
            return t(prefixString('alarm', item.attributes.alarm));

          case 'deviceOverspeed':
            return formatSpeed(item.attributes.speed, speedUnit, t);

          case 'driverChanged':
            return item.attributes.driverUniqueId;

          case 'media': {
            const mediaUrl = `/api/media/${devices[item.deviceId]?.uniqueId}/${
              item.attributes.file
            }`;
            return (
              <Link
                href={mediaUrl}
                onClick={(e) => {
                  e.preventDefault();
                  handleMediaClick(mediaUrl);
                }}
                style={{ cursor: 'pointer' }}
              >
                {item.attributes.file}
              </Link>
            );
          }

          case 'commandResult':
            return item.attributes.result;

          case 'deviceTollRouteExit': {
            let tollDetails = '';
            if ('tollName' in item.attributes) {
              tollDetails += `Toll name: ${item.attributes.tollName} | `;
            }
            if ('tollDistance' in item.attributes) {
              tollDetails += `Toll Distance: ${formatDistance(
                item.attributes.tollDistance,
                distanceUnit,
                t,
              )}`;
            }
            return tollDetails;
          }
          if ('tollDistance' in item.attributes) {
            tollDetails += `Toll Distance: ${formatDistance(
              item.attributes.tollDistance,
              distanceUnit,
              t,
            )}`;
          }
          return tollDetails;
        }
        if (item.type === 'deviceTollRouteEnter') {
          let tollDetails = '';
          if ('tollName' in item.attributes) {
            tollDetails += `Toll name: ${item.attributes.trollName} | `;
          }
          if ('tollRef' in item.attributes) {
            tollDetails += `Toll Reference: ${item.attributes.tollRef} | `;
          }
          return tollDetails;
        }
        return '';
      }

      default:
        return value;
    }
  };

  if (replayMode) {
    return (
      <ReplayControl
        replayPositions={replayPositions}
        selectedItem={selectedItem}
        deviceName={deviceName}
        eventPosition={eventPosition}
        onClose={handleReplayStop}
        showEventType
        initialSpeed={1}
      />
    );
  }

  const showAlarmSelect = eventTypes[0] !== 'allEvents' && eventTypes.includes('alarm');

  let tableBodyContent;

  if (loading) {
    tableBodyContent = <TableShimmer columns={columns.length + 2} />;
  } else if (sortedAndPaginatedData.length === 0) {
    tableBodyContent = (
      <TableRow>
        <TableCell colSpan={columns.length + 2} align="center">
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            {t('sharedNoData') || 'No data available'}
          </Typography>
        </TableCell>
      </TableRow>
    );
  } else {
    tableBodyContent = sortedAndPaginatedData.map((item) => {
      const isSelectedItem = selectedItem === item;
      const hasPositionId = Boolean(item.positionId);

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

          <TableCell className={classes.columnAction} padding="none">
            {hasPositionId && (
            <IconButton
              size="small"
              onClick={() => handleReplayStart(item)}
              disabled={replayLoading}
            >
              <ReplayIcon fontSize="small" />
            </IconButton>
            )}
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
      breadcrumbs={['reportTitle', 'reportEvents']}
    >
      <div className={classes.container}>
        {selectedItem && (
          <div className={classes.containerMap}>
            <MapView>
              <MapGeofence />
              {position && (
                <MapPositions positions={[position]} titleField="fixTime" />
              )}
            </MapView>
            <MapScale />
            {position && (
              <MapCamera
                latitude={position.latitude}
                longitude={position.longitude}
              />
            )}
          </div>
        )}
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter
              handleSubmit={handleSubmit}
              handleSchedule={handleSchedule}
              loading={loading}
            >
              <div className={classes.filterItem}>
                <FormControl fullWidth>
                  <InputLabel>{t('reportEventTypes')}</InputLabel>
                  <Select
                    label={t('reportEventTypes')}
                    value={eventTypes}
                    onChange={(e, child) => {
                      let values = e.target.value;
                      const clicked = child.props.value;
                      if (values.includes('allEvents') && values.length > 1) {
                        values = [clicked];
                      }
                      setEventTypes(values);
                    }}
                    multiple
                    sx={{
                      borderRadius: '13px',
                      '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                    }}
                    MenuProps={{
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
              {showAlarmSelect && (
                <div className={classes.filterItem}>
                  <SelectField
                    multiple
                    value={alarmTypes}
                    onChange={(e) => setAlarmTypes(e.target.value)}
                    data={alarms}
                    keyGetter={(it) => it.key}
                    label={t('sharedAlarms')}
                    fullWidth
                    sx={{
                      borderRadius: '13px',
                      '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                    }}
                    MenuProps={{
                      PaperProps: { sx: { borderRadius: '13px' } },
                    }}
                  />
                </div>
              )}
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
                <TableCell className={classes.columnAction} />
                {columns.map((key) => {
                  const isSortable = key === 'eventTime' || key === 'type';
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

      <MediaPreview
        open={!!mediaPreviewUrl}
        mediaUrl={mediaPreviewUrl}
        onClose={() => setMediaPreviewUrl(null)}
      />
    </PageLayout>
  );
};

export default EventReportPage;
