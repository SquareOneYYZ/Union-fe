import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  IconButton,
  Paper,
  Box,
  Toolbar,
  Typography,
  Slider,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import CloseIcon from '@mui/icons-material/Close';
import { useSelector, useDispatch } from 'react-redux';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
import MapGeofence from '../map/MapGeofence';
import MapCamera from '../map/MapCamera';
import MapScale from '../map/MapScale';
import StatusCard from '../common/components/StatusCard';
import { formatTime } from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import useReportStyles from './common/useReportStyles';
import { devicesActions } from '../store';
import MediaPreview from './components/MediaPreview';
import MediaBar from './components/MediaBar';

const useStyles = makeStyles((theme) => ({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  mapContainer: {
    flexGrow: 1,
    display: 'flex',
    position: 'relative',
  },
  sidebar: {
    display: 'flex',
    gap: 6,
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    right: theme.spacing(6),
    top: theme.spacing(1),
    width: 380,
    maxHeight: 'calc(100vh - 32px)',
    [theme.breakpoints.down('md')]: {
      width: 320,
      right: theme.spacing(1),
      top: theme.spacing(1),
      maxHeight: 'calc(100vh - 16px)',
    },
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      right: 10,
      top: 25,
      maxHeight: '40vh',
      padding: theme.spacing(5),
      gap: 4,
    },
  },
  sidebarContent: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1.5),
      gap: theme.spacing(1.5),
    },
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      gap: theme.spacing(0.5),
    },
  },
  toolbarTitle: {
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.9rem',
    },
  },
}));

const isVideoFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv'].includes(ext);
};

const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
};

const thumbnailCache = new Map();

const ReplayMediaPage = () => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const classes = useStyles();
  const reportClasses = useReportStyles();
  const theme = useTheme();
  const timerRef = useRef();
  const abortControllerRef = useRef(null);
  const devices = useSelector((state) => state.devices.items);
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);
  const selectedDeviceIdFromRedux = useSelector((state) => state.devices.selectedId);
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smoothPosition, setSmoothPosition] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [openMedia, setOpenMedia] = useState(null);
  const [mediaTimeline, setMediaTimeline] = useState([]);
  const [miniVariant, setMiniVariant] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(-1);
  const [isMediaBarEnabled, setIsMediaBarEnabled] = useState(false);

  const deviceName = useMemo(
    () => selectedDeviceId && devices[selectedDeviceId]?.name,
    [selectedDeviceId, devices],
  );

  const DISABLED_DISPLAYED_MEDIA = {
    left: [],
    center: { id: 'ph-center' },
    right: [{ id: 'ph-r-1' }, { id: 'ph-r-2' }],
  };

  useEffect(() => {
    const handleDrawerChange = (event) => {
      setMiniVariant(event.detail.miniVariant);
    };
    window.addEventListener('drawerStateChange', handleDrawerChange);
    return () => window.removeEventListener('drawerStateChange', handleDrawerChange);
  }, []);

  const activeDisplayedMedia = useMemo(() => {
    if (activeMediaIndex === -1 || !mediaTimeline.length) return null;

    return {
      left: mediaTimeline.slice(
        Math.max(0, activeMediaIndex - 2),
        activeMediaIndex,
      ),
      center: mediaTimeline[activeMediaIndex],
      right: mediaTimeline.slice(
        activeMediaIndex + 1,
        activeMediaIndex + 3,
      ),
    };
  }, [mediaTimeline, activeMediaIndex]);

  const displayedMedia = activeDisplayedMedia || DISABLED_DISPLAYED_MEDIA;

  const mediaBarStyle = useMemo(() => {
    if (!desktop) return {};
    const drawerWidth = miniVariant ? 73 : 280;
    const maxWidth = miniVariant ? 1500 : 1100;
    return {
      left: '50%',
      transform: `translateX(calc(-50% + ${drawerWidth / 2}px))`,
      maxWidth,
      width: 'fit-content',
    };
  }, [desktop, miniVariant]);

  // Sync: Position Index → Active Media Index
  useEffect(() => {
    if (!positions.length || !mediaTimeline.length) return;

    const currentPos = positions[index];
    if (!currentPos) return;

    const currentTime = new Date(currentPos.fixTime).getTime();
    let closestIndex = -1;
    let smallestDiff = Infinity;

    mediaTimeline.forEach((media, idx) => {
      const mediaTime = new Date(media.eventTime).getTime();
      const diff = Math.abs(currentTime - mediaTime);

      // Find the closest media that's at or before current position
      if (mediaTime <= currentTime && currentTime - mediaTime < smallestDiff) {
        smallestDiff = currentTime - mediaTime;
        closestIndex = idx;
      }
    });

    // If no media before current position, take the first one if it's close enough
    if (closestIndex === -1 && mediaTimeline.length > 0) {
      const firstMediaTime = new Date(mediaTimeline[0].eventTime).getTime();
      if (Math.abs(currentTime - firstMediaTime) < 30000) { // Within 30 seconds
        closestIndex = 0;
      }
    }

    if (closestIndex !== activeMediaIndex) {
      setActiveMediaIndex(closestIndex);
    }
  }, [positions, index, mediaTimeline]);

  const handleSubmit = useCatch(async ({ deviceId, from, to }) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setLoading(true);
    setSelectedDeviceId(deviceId);
    setIndex(0);
    setAnimationProgress(0);
    setPlaying(false);
    setActiveMediaIndex(-1);
    setIsMediaBarEnabled(false); // Reset on new data load
    dispatch(devicesActions.selectId(null));

    try {
      const query = new URLSearchParams({ deviceId, from, to }).toString();
      const [positionsRes, eventsRes] = await Promise.all([
        fetch(`/api/positions?${query}`, { signal }),
        fetch(`/api/reports/events?${query}`, { headers: { Accept: 'application/json' }, signal }),
      ]);

      if (!positionsRes.ok || !eventsRes.ok) throw new Error(t('sharedNoData'));

      const [positionsData, allEvents] = await Promise.all([positionsRes.json(), eventsRes.json()]);
      if (!positionsData.length) throw new Error(t('sharedNoData'));

      setPositions(positionsData);

      const device = devices[deviceId];
      const uniqueId = device?.uniqueId || 'unknown';
      const mediaEvents = allEvents.filter((e) => e.type === 'media');
      const timeline = mediaEvents.map((event, idx) => {
        const file = event.attributes?.file || '';
        const fullUrl = `/api/media/${uniqueId}/${file}`;
        return {
          id: event.id || idx,
          url: fullUrl,
          file,
          isVideo: isVideoFile(file),
          isImage: isImageFile(file),
          eventTime: event.eventTime || event.serverTime,
        };
      });

      setMediaTimeline(timeline);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading replay data:', err);
      }
      setPositions([]);
      setMediaTimeline([]);
    } finally {
      setLoading(false);
    }
  });

  // Animation loop for smooth playback
  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setAnimationProgress((progress) => {
          const newProgress = progress + 0.02;
          if (newProgress >= 1) {
            setIndex((prev) => {
              const next = prev + 1;
              if (next >= positions.length - 1) {
                setPlaying(false);
                return positions.length - 1;
              }
              return next;
            });
            return 0;
          }
          return newProgress;
        });
      }, 16);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, positions.length]);

  // Calculate smooth position for animation
  useEffect(() => {
    if (!positions.length) {
      setSmoothPosition(null);
      return;
    }
    const current = positions[index];
    if (index < positions.length - 1 && animationProgress > 0) {
      const next = positions[index + 1];
      setSmoothPosition({
        ...current,
        latitude: current.latitude + (next.latitude - current.latitude) * animationProgress,
        longitude: current.longitude + (next.longitude - current.longitude) * animationProgress,
      });
    } else {
      setSmoothPosition(current);
    }
  }, [positions, index, animationProgress]);

  const onPointClick = useCallback((_, clickedIndex) => {
    setIndex(clickedIndex);
    setAnimationProgress(0);
    setPlaying(false);
  }, []);

  // Handle media thumbnail click - Sync: MediaBar → Position Index
  const handleMediaClick = useCallback((media, mediaIndex) => {
    if (!media) return;

    // Open media preview
    setOpenMedia(media);

    // Find closest position to this media's timestamp
    const mediaTime = new Date(media.eventTime).getTime();
    let closestIndex = 0;
    let smallestDiff = Infinity;

    positions.forEach((pos, idx) => {
      const posTime = new Date(pos.fixTime).getTime();
      const diff = Math.abs(mediaTime - posTime);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = idx;
      }
    });

    // Update position and stop playback
    setIndex(closestIndex);
    setAnimationProgress(0);
    setPlaying(false);
    setActiveMediaIndex(mediaIndex);
  }, [positions]);

  // Handle play button - Enable MediaBar on first play
  const handlePlayPause = useCallback(() => {
    if (!playing && !isMediaBarEnabled && mediaTimeline.length > 0) {
      setIsMediaBarEnabled(true); // Enable MediaBar on first play
    }
    setPlaying((p) => !p);
  }, [playing, isMediaBarEnabled, mediaTimeline.length]);

  const handleClose = useCallback(() => {
    setPositions([]);
    setMediaTimeline([]);
    setIndex(0);
    setAnimationProgress(0);
    setPlaying(false);
    setOpenMedia(null);
    setActiveMediaIndex(-1);
    setIsMediaBarEnabled(false);
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);

  const currentPosition = positions[index];

  if (!positions.length) {
    return (
      <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportReplayMedia']}>
        <div className={reportClasses.container}>
          <div className={reportClasses.containerMain}>
            <div className={reportClasses.header}>
              <ReportFilter handleSubmit={handleSubmit} fullScreen showOnly loading={loading} />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportReplay']}>
      <div className={classes.container}>
        <div className={classes.mapContainer}>
          <MapView>
            <MapGeofence />
            <MapRoutePath positions={positions} />
            <MapRoutePoints
              positions={positions}
              onClick={(pos, idx) => {
                onPointClick(pos, idx);
                if (selectedDeviceId) dispatch(devicesActions.selectId(selectedDeviceId));
              }}
            />
            {smoothPosition && <MapPositions positions={[smoothPosition]} titleField="fixTime" customIcon="event-error" />}
          </MapView>
          <MapCamera positions={positions} />
          <MapScale />
        </div>

        <div className={classes.sidebar}>
          <Paper elevation={4}>
            <Toolbar>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1 }} className={classes.toolbarTitle}>
                {t('reportReplay')}
                {' '}
                -
                {' '}
                {deviceName || t('sharedDevice')}
              </Typography>
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </Paper>

          <Paper className={classes.sidebarContent}>
            <Typography variant="subtitle1" fontWeight="bold">
              {currentPosition ? formatTime(currentPosition.fixTime, 'seconds') : '--'}
            </Typography>
            <Slider
              max={positions.length - 1}
              value={index}
              onChange={(_, v) => {
                setIndex(v);
                setAnimationProgress(0);
                setPlaying(false);
              }}
              step={null}
              marks={positions.map((_, i) => ({ value: i }))}
            />
            <Box className={classes.controls}>
              <IconButton onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index <= 0}>
                <FastRewindIcon />
              </IconButton>
              <IconButton
                onClick={handlePlayPause}
                disabled={index >= positions.length - 1 && !playing}
              >
                {playing ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton onClick={() => setIndex((i) => Math.min(i + 1, positions.length - 1))} disabled={index >= positions.length - 1}>
                <FastForwardIcon />
              </IconButton>
              <Typography variant="caption">
                {index + 1}
                {' '}
                /
                {' '}
                {positions.length}
              </Typography>
            </Box>
          </Paper>
        </div>

        <MediaBar
          mediaTimeline={mediaTimeline}
          displayedMedia={displayedMedia}
          activeMediaIndex={activeMediaIndex}
          thumbnailCache={thumbnailCache}
          onMediaClick={handleMediaClick}
          mediaBarStyle={mediaBarStyle}
          isEnabled={isMediaBarEnabled}
        />

        {openMedia && <MediaPreview open={!!openMedia} mediaUrl={openMedia.url} onClose={() => setOpenMedia(null)} />}

        {selectedDeviceIdFromRedux && currentPosition && (
          <StatusCard
            deviceId={selectedDeviceIdFromRedux}
            position={currentPosition}
            onClose={() => dispatch(devicesActions.selectId(null))}
            desktopPadding={theme.dimensions.drawerWidthDesktop}
            disableActions
          />
        )}
      </div>

    </PageLayout>
  );
};

export default ReplayMediaPage;
