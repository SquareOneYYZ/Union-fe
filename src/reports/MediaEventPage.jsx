import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconButton, CircularProgress, Typography, Box,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ReportFilter from './components/ReportFilter';
import useReportStyles from './common/useReportStyles';
import { useCatch, useEffectAsync } from '../reactHelper';
import scheduleReport from './common/scheduleReport';
import { eventsActions } from '../store/events';

const MediaBlock = ({ media, onLaunch, isSelected, onSelect }) => {
  const ref = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const renderMediaContent = () => {
    if (media.mediaType === 'image' && media.url) {
      return (
        <img
          src={media.url}
          alt={media.fileName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      );
    }

    if (media.mediaType === 'video') {
      return <PlayCircleOutlineIcon sx={{ fontSize: 60, color: '#555' }} />;
    }

    return <ImageIcon sx={{ fontSize: 60, color: '#555' }} />;
  };

  return (
    <Box
      ref={ref}
      onClick={() => onLaunch(media)}
      sx={{
        backgroundColor: '#1e1e1e',
        borderRadius: 2,
        position: 'relative',
        aspectRatio: '16/9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        border: isSelected ? '3px solid #1976d2' : 'none',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: 4,
        },
      }}
    >
      {renderMediaContent()}

      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: 1,
          fontSize: '12px',
        }}
      >
        {new Date(media.eventTime).toLocaleString()}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 0.5,
        }}
      >
        <IconButton
          size="small"
          sx={{
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
        >
          <FullscreenIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          sx={{
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            onLaunch(media);
          }}
        >
          <LaunchIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

const LoadingState = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 400,
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <CircularProgress />
    <Typography variant="body1" color="text.secondary">
      Loading media events...
    </Typography>
  </Box>
);

const MediaEventPage = () => {
  const classes = useReportStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [mediaBlocks, setMediaBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [position, setPosition] = useState(null);

  useEffectAsync(async () => {
    if (selectedItem && selectedItem.positionId) {
      try {
        const response = await fetch(
          `/api/positions?id=${selectedItem.positionId}`,
          {
            headers: { Accept: 'application/json' },
          },
        );
        if (response.ok) {
          const positions = await response.json();
          if (positions && positions.length > 0) {
            setPosition(positions[0]);
          }
        } else {
          console.error('Failed to fetch position');
          setPosition(null);
        }
      } catch (error) {
        console.error('Error fetching position:', error);
        setPosition(null);
      }
    } else {
      setPosition(null);
    }
  }, [selectedItem]);

  const fetchUniqueId = async (deviceId) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}`);
      if (!response.ok) {
        throw Error('Failed to fetch device details');
      }
      const device = await response.json();
      return device.uniqueId || deviceId;
    } catch (error) {
      console.error(`Error fetching uniqueId for device ${deviceId}:`, error);
      return deviceId;
    }
  };

  const handleSubmit = useCatch(async ({ deviceId, from, to, type }) => {
    const query = new URLSearchParams({ deviceId, from, to });

    if (type === 'export') {
      window.location.assign(`/api/reports/events/xlsx?${query.toString()}`);
      return;
    }

    if (type === 'mail') {
      const response = await fetch(
        `/api/reports/events/mail?${query.toString()}`,
      );
      if (!response.ok) {
        throw Error(await response.text());
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw Error(await response.text());
      }

      const events = await response.json();
      const mediaEvents = events.filter((event) => event.type === 'media');
      if (mediaEvents.length === 0) {
        setMediaBlocks([]);
        setLoading(false);
        return;
      }

      const uniqueIdMap = new Map();
      const uniqueDeviceIds = [
        ...new Set(mediaEvents.map((event) => event.deviceId)),
      ];

      await Promise.all(
        uniqueDeviceIds.map(async (devId) => {
          const uniqueId = await fetchUniqueId(devId);
          uniqueIdMap.set(devId, uniqueId);
        }),
      );

      const alarmLookup = new Map();
      events.forEach((ev) => {
        if (ev.attributes?.alarmId) {
          alarmLookup.set(String(ev.attributes.alarmId), ev);
        }
      });

      const transformedMedia = mediaEvents.map((event) => {
        const uniqueId = uniqueIdMap.get(event.deviceId);
        const fileId = event.attributes?.file;
        const mediaUrl = fileId ? `/api/media/${uniqueId}/${fileId}` : '';

        let mediaTitle = null;
        if (fileId && alarmLookup.has(String(fileId))) {
          const match = alarmLookup.get(String(fileId));
          mediaTitle = match.attributes?.alarmName
      || match.type
      || `Alarm ${fileId}`;
        }

        return {
          id: event.id,
          deviceId: event.deviceId,
          uniqueId,
          eventTime: event.eventTime,
          positionId: event.positionId,
          mediaType: event.attributes?.media || 'unknown',

          fileName:
      event.attributes?.alarmName
      || event.attributes?.file
      || mediaTitle,

          url: mediaUrl,
        };
      });

      dispatch(eventsActions.setMediaList(transformedMedia));
      setMediaBlocks(transformedMedia);
    } catch (error) {
      console.error('Error fetching media events:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  });

  const existingMediaList = useSelector((state) => state.events.mediaList);

  useEffect(() => {
    if (existingMediaList.length > 0) {
      setMediaBlocks(existingMediaList);
    }
  }, [existingMediaList]);

  const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
    const reportConfig = { ...report, type: 'events' };
    const error = await scheduleReport(deviceIds, groupIds, reportConfig);

    if (error) {
      throw Error(error);
    }

    navigate('/reports/scheduled');
  });

  const handleLaunch = (media) => {
    dispatch(eventsActions.setSelectedEvent(media));
    navigate('/reports/media/details');
  };

  const handleSelect = (media) => {
    setSelectedItem(selectedItem?.id === media.id ? null : media);
  };

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={['reportTitle', 'reportMedia']}
    >
      <div className={classes.container}>
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter
              showLast24Hours
              handleSubmit={handleSubmit}
              handleSchedule={handleSchedule}
              loading={loading}
            />
          </div>

          {loading && <LoadingState />}

          {!loading && mediaBlocks.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                },
                gap: 2,
                mt: 2,
                mb: 2,
                padding: 2,
              }}
            >
              {mediaBlocks.map((media) => (
                <MediaBlock
                  key={media.id}
                  media={media}
                  onLaunch={handleLaunch}
                  isSelected={selectedItem?.id === media.id}
                  onSelect={() => handleSelect(media)}
                />
              ))}
            </Box>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default MediaEventPage;
