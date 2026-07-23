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
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ReportFilter from './components/ReportFilter';
import useReportStyles from './common/useReportStyles';
import { useCatch, useEffectAsync } from '../reactHelper';
import scheduleReport from './common/scheduleReport';
import { eventsActions } from '../store/events';

// Video Thumbnail Component
const VideoThumbnail = ({ url, fileName }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setError(true);
      setLoading(false);
      return;
    }

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
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setThumbnail(thumbnailDataUrl);
        setLoading(false);
        clearTimeout(timeoutId);
        video.remove();
      } catch (err) {
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
        }}
      >
        <CircularProgress size={40} sx={{ color: '#888' }} />
      </Box>
    );
  }

  if (error || !thumbnail) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          gap: 1,
        }}
      >
        <PlayCircleOutlineIcon sx={{ fontSize: 60, color: '#555' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={thumbnail}
        alt={fileName}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '50%',
          width: 60,
          height: 60,
        }}
      >
        <PlayCircleOutlineIcon
          sx={{
            fontSize: 40,
            color: 'white',
          }}
        />
      </Box>
    </Box>
  );
};

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
          onError={(e) => {
            e.target.src = '';
          }}
        />
      );
    }

    if (media.mediaType === 'video' && media.url) {
      return <VideoThumbnail url={media.url} fileName={media.fileName} />;
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

  // Get persisted data from Redux
  const existingMediaList = useSelector((state) => state.events.mediaList);
  const existingFilters = useSelector((state) => state.events.mediaFilters);

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
          setPosition(null);
        }
      } catch (error) {
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
      return deviceId;
    }
  };

  const handleSubmit = useCatch(async ({ deviceId, from, to, type }) => {
    const query = new URLSearchParams({ deviceId, from, to });

    // Save filter parameters to Redux for persistence
    dispatch(eventsActions.setMediaFilters({ deviceId, from, to, type }));

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
      console.log('Error fetching media events:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  });

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
              handleSubmit={handleSubmit}
              handleSchedule={handleSchedule}
              loading={loading}
              backdateToday
              initialFilters={existingFilters}
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
