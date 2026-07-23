import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { PlayArrow, Stop, LocationOn } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import VideoBlock from '../common/components/VideoBlock';
import usePersistedState from '../common/util/usePersistedState';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(2),
    backgroundColor: '#1e1e1e',
    color: '#fff',
    boxShadow: theme.shadows[2],
    position: 'relative',

    [theme.breakpoints.down('md')]: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing(1.5),
      gap: theme.spacing(1.5),
      flexWrap: 'wrap',
    },
  },
  leftHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(60),

    '& > div:first-child': {
      display: 'flex',
      flexDirection: 'column',
    },

    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      width: 'auto',
      gap: theme.spacing(0.5),
      flex: 1,
    },
  },
  rightHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing(2),
    position: 'relative',

    [theme.breakpoints.down('md')]: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 'auto',
    },
  },

  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'nowrap',

    [theme.breakpoints.down('md')]: {
      justifyContent: 'flex-end',
      marginTop: 0,
      gap: theme.spacing(1),

      '& button': {
        padding: theme.spacing(0.2, 1.2),
        fontSize: '0.8rem',
        minWidth: 'auto',
      },
    },
  },
  closeBtn: {
    color: '#fff',
    padding: theme.spacing(1),

    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(0.5),
      '& svg': {
        fontSize: '1.5rem',
      },
    },
  },
  liveStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.8),
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 600,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    transition: 'all 0.3s ease',
    '&.online': {
      backgroundColor: '#ff3b30',
      boxShadow: '0 0 6px #ff3b30',
    },
    '&.offline': {
      backgroundColor: '#666',
      boxShadow: 'none',
    },
  },
  deviceName: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: theme.spacing(0.5),
    fontSize: '0.9rem',
    [theme.breakpoints.down('md')]: {
      textAlign: 'center',
      fontSize: '0.85rem',
    },
  },
  headerTitle: {
    [theme.breakpoints.down('md')]: {
      display: 'flex',
      fontSize: '1rem',
      width: '100%',
      marginBottom: theme.spacing(1.5),
      textAlign: 'center',
    },
  },
  layoutButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  layoutBtn: {
    minWidth: 30,
    height: 30,
    fontSize: '0.75rem',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    '&.active': {
      backgroundColor: theme.palette.primary.main,
      borderColor: theme.palette.primary.main,
    },
  },
  content: {
    flex: 1,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(1),
    },
  },
  videoGrid: {
    flex: 1,
    display: 'grid',
    gap: theme.spacing(1),
    width: '100%',
    height: '100%',

    [theme.breakpoints.down('md')]: {
      display: 'none',
    },

    '&.layout-1': {
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
    },
    '&.layout-2': {
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr',
    },
    '&.layout-3': {
      gridTemplateColumns: '2fr 1fr',
      gridTemplateRows: '1fr 1fr',
      '& > *:nth-child(1)': {
        gridRow: '1 / span 2',
        gridColumn: '1 / 2',
      },
      '& > *:nth-child(2)': {
        gridRow: '1 / 2',
        gridColumn: '2 / 3',
      },
      '& > *:nth-child(3)': {
        gridRow: '2 / 3',
        gridColumn: '2 / 3',
      },
    },
    '&.layout-4': {
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
    },
    '&.layout-5': {
      gridTemplateColumns: '2fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      '& > *:nth-child(1)': {
        gridRow: '1 / span 2',
        gridColumn: '1 / 2',
      },
      '& > *:nth-child(2)': {
        gridRow: '1 / 2',
        gridColumn: '2 / 3',
      },
      '& > *:nth-child(3)': {
        gridRow: '1 / 2',
        gridColumn: '3 / 4',
      },
      '& > *:nth-child(4)': {
        gridRow: '2 / 3',
        gridColumn: '2 / 3',
      },
      '& > *:nth-child(5)': {
        gridRow: '2 / 3',
        gridColumn: '3 / 4',
      },
    },
    '&.layout-6': {
      gridTemplateColumns: '2fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
      '& > *:nth-child(1)': {
        gridRow: '1 / span 3',
        gridColumn: '1 / 2',
      },
      '& > *:nth-child(2)': {
        gridRow: '1 / 2',
        gridColumn: '2 / 4',
      },
      '& > *:nth-child(3)': {
        gridRow: '2 / 3',
        gridColumn: '2 / 3',
      },
      '& > *:nth-child(4)': {
        gridRow: '2 / 3',
        gridColumn: '3 / 4',
      },
      '& > *:nth-child(5)': {
        gridRow: '3 / 4',
        gridColumn: '2 / 3',
      },
      '& > *:nth-child(6)': {
        gridRow: '3 / 4',
        gridColumn: '3 / 4',
      },
    },
  },
  mobileView: {
    display: 'none',
    [theme.breakpoints.down('md')]: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: theme.spacing(1),
    },
  },
  mainVideoContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    position: 'relative',
    minHeight: 0,
  },
  mobileVideoGrid: {
    display: 'none',
    [theme.breakpoints.down('md')]: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing(1),
      height: '100%',
      flex: 1,
    },
  },
  thumbnailContainer: {
    minWidth: 100,
    height: 70,
    borderRadius: 6,
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
    backgroundColor: '#2a2a2a',
    '&.active': {
      border: `2px solid ${theme.palette.primary.main}`,
      boxShadow: `0 0 8px ${theme.palette.primary.main}`,
    },
    '&:hover': {
      border: '2px solid rgba(255,255,255,0.5)',
    },
  },
  thumbnailVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: theme.spacing(0.5),
    fontSize: '0.65rem',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  thumbnailFocusBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    padding: 2,
    minWidth: 24,
    minHeight: 24,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  carouselArrow: {
    minWidth: 32,
    padding: theme.spacing(0.5),
    color: '#fff',
  },
  emptyBlock: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    border: '1px dashed rgba(255,255,255,0.2)',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
}));

const LiveStreamingPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  // Get Redux state
  const { open, deviceId } = useSelector((state) => state.livestream);
  const reduxDevice = useSelector((state) => state.devices.items[deviceId]);

  // Persist critical state
  const [persistedDeviceId, setPersistedDeviceId] = usePersistedState('livestream_deviceId', null);
  const [persistedOpen, setPersistedOpen] = usePersistedState('livestream_open', false);
  const [persistedLayout, setPersistedLayout] = usePersistedState('livestream_layout', 4);
  const [persistedFocusIndex, setPersistedFocusIndex] = usePersistedState('livestream_focusIndex', 0);

  // Determine active values (Redux takes priority)
  const activeDeviceId = deviceId || persistedDeviceId;
  const isOpen = open || persistedOpen;

  // Local state
  const [focusedCameraIndex, setFocusedCameraIndex] = useState(persistedFocusIndex || 0);
  const [uniqueId, setUniqueId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numCamera, setNumCamera] = useState(4);
  const [currentLayout, setCurrentLayout] = useState(persistedLayout || 4);
  const [isPlaying, setIsPlaying] = useState(true);
  const [deviceData, setDeviceData] = useState(null);
  const [device, setDevice] = useState(reduxDevice || null);

  // Sync Redux state to localStorage
  useEffect(() => {
    if (deviceId) {
      setPersistedDeviceId(deviceId);
    }
    if (open) {
      setPersistedOpen(open);
    }
  }, [deviceId, open, setPersistedDeviceId, setPersistedOpen]);

  // Persist layout changes
  useEffect(() => {
    setPersistedLayout(currentLayout);
  }, [currentLayout, setPersistedLayout]);

  // Persist focused camera index
  useEffect(() => {
    setPersistedFocusIndex(focusedCameraIndex);
  }, [focusedCameraIndex, setPersistedFocusIndex]);

  // Fetch device details (consolidated single API call)
  useEffect(() => {
    const fetchDeviceData = async () => {
      if (!activeDeviceId) return;

      try {
        const response = await fetch(`/api/devices/${activeDeviceId}`);
        if (response.ok) {
          const data = await response.json();
          setDeviceData(data);
          setDevice(data);

          // Set uniqueId and numCamera
          const cameras = data.attributes?.NumCamera || 4;
          setNumCamera(cameras);
          setCurrentLayout(persistedLayout <= cameras ? persistedLayout : cameras);
          setUniqueId(data.uniqueId || activeDeviceId);

          setLoading(false);
        } else {
          console.error('Failed to fetch device data');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching device data:', error);
        setLoading(false);
      }
    };

    if (activeDeviceId) {
      setLoading(true);
      fetchDeviceData();
    }
  }, [activeDeviceId, persistedLayout]);

  // Update device from Redux if available
  useEffect(() => {
    if (reduxDevice) {
      setDevice(reduxDevice);
    }
  }, [reduxDevice]);

  // Adjust layout if it exceeds number of cameras
  useEffect(() => {
    if (currentLayout > numCamera) {
      setCurrentLayout(numCamera);
    }
  }, [numCamera, currentLayout]);

  // Handle camera name updates
  const handleCameraNameUpdate = (channelId, newName) => {
    setDeviceData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [`camera${channelId}`]: newName,
      },
    }));
  };

  // Early return if page shouldn't be shown
  if (!isOpen || !activeDeviceId) return null;

  const handleStartAll = () => {
    setIsPlaying(true);
  };

  const handleStopAll = () => {
    setIsPlaying(false);
  };

  const handleLocation = () => navigate(`/map?deviceId=${activeDeviceId}`);

  const handleBack = () => {
    // Clear all persisted state when user clicks back
    setPersistedDeviceId(null);
    setPersistedOpen(false);
    setPersistedLayout(4);
    setPersistedFocusIndex(0);
    navigate(-1);
  };

  const videoSources = uniqueId
    ? Array.from({ length: numCamera }, (_, i) => ({
      id: i + 1,
      src: `https://staging.streaming.iotrides.com:8889/${uniqueId}_ch${i + 1}/`,
      title: `Camera ${i + 1}`,
    }))
    : [];

  const totalSlots = Number(currentLayout);

  const reorderedVideos = [...videoSources];
  if (focusedCameraIndex > 0 && focusedCameraIndex < reorderedVideos.length) {
    [reorderedVideos[0], reorderedVideos[focusedCameraIndex]] = [
      reorderedVideos[focusedCameraIndex],
      reorderedVideos[0],
    ];
  }

  const filledVideos = reorderedVideos.slice(0, totalSlots);
  const emptySlots = totalSlots - filledVideos.length;

  const handleCameraFocus = (originalIndex) => {
    if ([3, 5, 6].includes(currentLayout)) {
      setFocusedCameraIndex(originalIndex);
    }
  };

  const handleMobileCameraSwitch = (index) => {
    setFocusedCameraIndex(index);
  };

  const isFocusEnabled = [3, 5, 6].includes(currentLayout);
  const isDeviceOnline = device?.status === 'online';

  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.header}>
          <Typography variant="h6">Loading Live Stream...</Typography>
        </div>
        <div className={classes.content}>
          <div className={classes.loadingContainer}>
            <CircularProgress />
            <Typography variant="body1" color="textSecondary">
              Fetching device information...
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div className={classes.leftHeader}>
          <div>
            <div className={classes.liveStatus}>
              <Typography variant="body2">Live Stream</Typography>
              <span className={`${classes.redDot} ${isDeviceOnline ? 'online' : 'offline'}`} />
            </div>
            <Typography variant="h6">
              {device?.name || `Device ${activeDeviceId}`}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {numCamera}
              {' '}
              Cameras Connected
            </Typography>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className={classes.layoutButtons}>
            {Array.from({ length: numCamera }, (_, i) => i + 1).map((num) => (
              <button
                type="button"
                key={num}
                className={`${classes.layoutBtn} ${
                  currentLayout === num ? 'active' : ''
                }`}
                onClick={() => setCurrentLayout(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className={classes.rightHeader}>
          <div className={classes.controls}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={handleStartAll}
              disabled={isPlaying}
              sx={{ mr: 1 }}
            >
              Start
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Stop />}
              onClick={handleStopAll}
              disabled={!isPlaying}
              sx={{ mr: 1 }}
            >
              Stop
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LocationOn />}
              onClick={handleLocation}
              sx={{ mr: 1, display: { xs: 'flex', sm: 'flex' } }}
            >
              Location
            </Button>

            <Button
              variant="outlined"
              onClick={handleBack}
              className={classes.closeBtn}
              sx={{
                '@media (max-width: 900px)': {
                  padding: 1.5,
                  '& svg': {
                    fontSize: '2rem',
                  },
                },
              }}
            >
              <CloseIcon />
            </Button>
          </div>
        </div>

      </div>

      <div className={classes.content}>
        {/* Desktop Grid Layout */}
        <div className={`${classes.videoGrid} layout-${currentLayout}`}>
          {filledVideos.map((video) => {
            const originalIndex = videoSources.findIndex(
              (v) => v.id === video.id,
            );

            return (
              <VideoBlock
                key={video.id}
                src={video.src}
                title={video.title}
                className={classes.videoContainer}
                cameraName={deviceData?.attributes?.[`camera${video.id}`]}
                onCameraNameUpdate={handleCameraNameUpdate}
                showLaunch={false}
                showFocusIcon={isFocusEnabled}
                onFocus={() => handleCameraFocus(originalIndex)}
                deviceId={activeDeviceId}
                channelId={video.id}
                isVidPlaying={isPlaying}
              />
            );
          })}

          {Array.from({ length: emptySlots > 0 ? emptySlots : 0 }).map(
            (_, i) => {
              const key = `empty-${i}-${currentLayout}-${Date.now()}`;
              return <div key={key} className={classes.emptyBlock} />;
            },
          )}
        </div>

        {/* Mobile View */}
        <div className={classes.mobileView}>
          {/* Main focused video */}
          <div className={classes.mainVideoContainer}>
            {videoSources.length > 0 && (
              <VideoBlock
                key={videoSources[focusedCameraIndex].id}
                src={videoSources[focusedCameraIndex].src}
                title={videoSources[focusedCameraIndex].title}
                cameraName={deviceData?.attributes?.[`camera${videoSources[focusedCameraIndex].id}`]}
                onCameraNameUpdate={handleCameraNameUpdate}
                showLaunch={false}
                showFocusIcon={false}
                deviceId={activeDeviceId}
                channelId={videoSources[focusedCameraIndex].id}
                isVidPlaying={isPlaying}
              />
            )}
          </div>

          {/* Thumbnail grid */}
          <div className={classes.mobileVideoGrid}>
            {videoSources.map((video, index) => (
              <div
                key={video.id}
                style={{ position: 'relative' }}
              >
                <VideoBlock
                  src={video.src}
                  title={video.title}
                  cameraName={deviceData?.attributes?.[`camera${video.id}`]}
                  onCameraNameUpdate={handleCameraNameUpdate}
                  showLaunch={false}
                  showFocusIcon
                  onFocus={() => handleMobileCameraSwitch(index)}
                  deviceId={activeDeviceId}
                  channelId={video.id}
                  isVidPlaying={isPlaying}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamingPage;
