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
  Dialog,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DownloadIcon from '@mui/icons-material/Download';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
    right: theme.spacing(2),
    top: theme.spacing(2),
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
  mediaBar: {
    position: 'fixed',
    bottom: theme.spacing(10),
    left: '60.5%',
    transform: 'translateX(-50%)',
    zIndex: 1,
    display: 'flex',
    height: 110,
    padding: theme.spacing(1),
    gap: theme.spacing(0.5),
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    maxWidth: '78vw',
    overflowX: 'auto',
    overflowY: 'hidden',
    boxShadow: theme.shadows[6],
    scrollbarWidth: 'thin', // Firefox
    scrollbarColor: `${theme.palette.action.hover} transparent`, // Firefox
    '&::-webkit-scrollbar': {
      height: 6, // Thin scrollbar
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: theme.spacing(2),
      maxWidth: '95vw',
      height: 70,
    },
    // Mobile
    [theme.breakpoints.down('sm')]: {
      left: '50%',
      bottom: theme.spacing(20),
      maxWidth: '95vw',
      height: 65,
      padding: theme.spacing(0.5),
      gap: theme.spacing(0.25),
    },
  },
  thumb: {
    cursor: 'pointer',
    borderRadius: 4,
    overflow: 'hidden',
    border: '2px solid transparent',
    transition: 'border 0.2s',
    flexShrink: 0,
    '&:hover': {
      border: `2px solid ${theme.palette.primary.main}`,
    },
    // Mobile - smaller thumbs
    [theme.breakpoints.down('sm')]: {
      borderRadius: 2,
      border: '1px solid transparent',
      '&:hover': {
        border: `1px solid ${theme.palette.primary.main}`,
      },
    },
  },
  thumbSelected: {
    border: `2px solid ${theme.palette.primary.main}`,
    [theme.breakpoints.down('sm')]: {
      border: `1px solid ${theme.palette.primary.main}`,
    },
  },
  // New classes for responsive elements
  toolbarTitle: {
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.9rem',
    },
  },
  dialogContent: {
    [theme.breakpoints.down('sm')]: {
      padding: 0,
    },
  },
}));

const ReplayMediaPage = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const classes = useStyles();
  const reportClasses = useReportStyles();

  const timerRef = useRef();
  const abortControllerRef = useRef(null);

  const devices = useSelector((state) => state.devices.items);
  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smoothPosition, setSmoothPosition] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [openMedia, setOpenMedia] = useState(null);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [mediaTimeline, setMediaTimeline] = useState([]);
  const [showCard, setShowCard] = useState(false);

  const deviceName = useMemo(
    () => selectedDeviceId && devices[selectedDeviceId]?.name,
    [selectedDeviceId, devices],
  );

  const fetchLocationName = useCallback(async (latitude, longitude, signal) => {
    try {
      const res = await fetch(
        `/api/server/geocode?latitude=${latitude}&longitude=${longitude}`,
        { signal },
      );
      if (res.ok) {
        const data = await res.json();
        return (
          data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        );
      }
    } catch {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }, []);

  const handleSubmit = useCatch(async ({ deviceId, from, to }) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setLoading(true);
    setSelectedDeviceId(deviceId);
    setFrom(from);
    setTo(to);
    setIndex(0);
    setAnimationProgress(0);
    setPlaying(false);

    try {
      const query = new URLSearchParams({ deviceId, from, to }).toString();
      const [positionsRes, eventsRes] = await Promise.all([
        fetch(`/api/positions?${query}`, { signal }),
        fetch(`/api/reports/events?${query}`, {
          headers: { Accept: 'application/json' },
          signal,
        }),
      ]);

      if (!positionsRes.ok) throw new Error(await positionsRes.text());
      if (!eventsRes.ok) throw new Error(await eventsRes.text());

      const [positionsData, allEvents] = await Promise.all([
        positionsRes.json(),
        eventsRes.json(),
      ]);
      if (!positionsData.length) throw new Error(t('sharedNoData'));

      setPositions(positionsData);

      const [startLoc, endLoc] = await Promise.all([
        fetchLocationName(
          positionsData[0].latitude,
          positionsData[0].longitude,
          signal,
        ),
        fetchLocationName(
          positionsData[positionsData.length - 1].latitude,
          positionsData[positionsData.length - 1].longitude,
          signal,
        ),
      ]);
      setStartLocation(startLoc);
      setEndLocation(endLoc);

      const device = devices[deviceId];
      const uniqueId = device?.uniqueId || 'unknown';
      const mediaEvents = allEvents.filter((e) => e.type === 'media');
      const timeline = mediaEvents.map((event, idx) => {
        const file = event.attributes?.file || '';
        const fullUrl = `/api/media/${uniqueId}/${file}`;
        return {
          id: event.id || idx,
          thumb: fullUrl,
          full: fullUrl,
          time: new Date(
            event.eventTime || event.serverTime,
          ).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
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

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setAnimationProgress((progress) => {
          const newProgress = progress + 0.02 * speed;
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
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [playing, positions.length, speed]);

  useEffect(() => {
    if (!positions.length) {
      setSmoothPosition(null);
      return;
    }
    if (index >= positions.length) {
      setSmoothPosition(positions[positions.length - 1]);
      return;
    }
    const current = positions[index];
    if (index < positions.length - 1 && animationProgress > 0) {
      const next = positions[index + 1];
      const t = animationProgress;
      setSmoothPosition({
        ...current,
        latitude: current.latitude + (next.latitude - current.latitude) * t,
        longitude: current.longitude + (next.longitude - current.longitude) * t,
      });
    } else setSmoothPosition(current);
  }, [positions, index, animationProgress]);

  const handleDownload = useCallback(() => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query}`);
  }, [selectedDeviceId, from, to]);

  const handleClose = useCallback(() => {
    setPositions([]);
    setMediaTimeline([]);
    setStartLocation('');
    setEndLocation('');
    setIndex(0);
    setAnimationProgress(0);
    setPlaying(false);
    setShowCard(false);
    setOpenMedia(null);
  }, []);

  const currentPosition = positions[index];

  if (!positions.length) {
    return (
      <PageLayout
        menu={<ReportsMenu />}
        breadcrumbs={['reportTitle', 'reportReplayMedia']}
      >
        <div className={reportClasses.container}>
          <div className={reportClasses.containerMain}>
            <div className={reportClasses.header}>
              <ReportFilter
                showLast24Hours
                handleSubmit={handleSubmit}
                fullScreen
                showOnly
                loading={loading}
              />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={['reportTitle', 'reportReplay']}
    >
      <div className={classes.container}>
        <div className={classes.mapContainer}>
          <MapView>
            <MapGeofence />
            <MapRoutePath positions={positions} />
            <MapRoutePoints positions={positions} />
            {smoothPosition && (
              <MapPositions positions={[smoothPosition]} titleField="fixTime" />
            )}
          </MapView>
          <MapCamera positions={positions} />
          <MapScale />
        </div>

        <div className={classes.sidebar}>
          <Paper elevation={4}>
            <Toolbar>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ flexGrow: 1 }}
              >
                {t('reportReplay')}
                {' '}
                -
                {deviceName || t('sharedDevice')}
              </Typography>
              <IconButton onClick={handleDownload}>
                <DownloadIcon />
              </IconButton>
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </Paper>

          <Paper className={classes.sidebarContent}>
            <Typography variant="subtitle1" fontWeight="bold">
              {currentPosition
                ? formatTime(currentPosition.fixTime, 'seconds')
                : '--'}
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
              <IconButton
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={playing || index <= 0}
              >
                <FastRewindIcon />
              </IconButton>
              <IconButton
                onClick={() => setPlaying((p) => !p)}
                disabled={index >= positions.length - 1 && !playing}
              >
                {playing ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton
                onClick={() => setIndex((i) => Math.min(i + 1, positions.length - 1))}
                disabled={playing || index >= positions.length - 1}
              >
                <FastForwardIcon />
              </IconButton>
              <Typography variant="caption">
                {index + 1}
                {' '}
                /
                {positions.length}
              </Typography>
            </Box>
          </Paper>
        </div>

        {mediaTimeline.length > 0 && (
          <Paper className={classes.mediaBar} elevation={6}>
            {mediaTimeline.map((item) => (
              <Box
                key={item.id}
                onClick={() => setOpenMedia(item)}
                className={`${classes.thumb} ${
                  openMedia?.id === item.id ? classes.thumbSelected : ''
                }`}
              >
                <img
                  src={item.thumb}
                  alt="thumb"
                  width={120}
                  height={80}
                  style={{ display: 'block' }}
                />
                <Typography
                  align="center"
                  variant="caption"
                  sx={{ fontSize: '0.65rem', p: 0.5 }}
                >
                  {item.time}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        <Dialog
          open={!!openMedia}
          onClose={() => setOpenMedia(null)}
          maxWidth="md"
        >
          {openMedia && (
            <img
              src={openMedia.full}
              alt="preview"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </Dialog>

        {showCard && currentPosition && (
          <StatusCard
            deviceId={selectedDeviceId}
            position={currentPosition}
            onClose={() => setShowCard(false)}
            disableActions
          />
        )}
      </div>
    </PageLayout>
  );
};

export default ReplayMediaPage;
