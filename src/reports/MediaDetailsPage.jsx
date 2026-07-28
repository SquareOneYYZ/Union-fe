import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Typography,
  Box,
  Alert,
  Paper,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ImageIcon from '@mui/icons-material/Image';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import useReportStyles from './common/useReportStyles';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import {
  formatDistance,
  formatSpeed,
  formatNumericHours,
} from '../common/util/formatter';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapScale from '../map/MapScale';
import MapPositions from '../map/MapPositions';
import MapCamera from '../map/MapCamera';
import MapRoutePath from '../map/MapRoutePath';
import MapMarkers from '../map/MapMarkers';
import { useEffectAsync } from '../reactHelper';

const MediaDetailsPage = () => {
  const classes = useReportStyles();
  const navigate = useNavigate();
  const t = useTranslation();
  const selectedEvent = useSelector((state) => state.events.selectedEvent);
  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const [position, setPosition] = useState(null);
  const [route, setRoute] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);

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
  useEffectAsync(async () => {
    if (selectedEvent && selectedEvent.positionId) {
      try {
        const response = await fetch(
          `/api/positions?id=${selectedEvent.positionId}`,
        );
        if (response.ok) {
          const positions = await response.json();
          if (positions && positions.length > 0) {
            setPosition(positions[0]);
          }
        } else {
          console.error('Failed to fetch position');
        }
      } catch (error) {
        console.error('Error fetching position:', error);
      }
    }
  }, [selectedEvent]);

  useEffectAsync(async () => {
    if (selectedTrip) {
      try {
        const query = new URLSearchParams({
          deviceId: selectedTrip.deviceId,
          from: selectedTrip.startTime,
          to: selectedTrip.endTime,
        });
        const response = await fetch(`/api/reports/route?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const routeData = await response.json();
          setRoute(routeData);
        } else {
          console.error('Failed to fetch route');
          setRoute(null);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        setRoute(null);
      }
    } else {
      setRoute(null);
    }
  }, [selectedTrip]);

  useEffectAsync(async () => {
    if (!selectedEvent || !selectedEvent.id) {
      setError(
        'No media event selected. Please go back and select a media event.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { deviceId } = selectedEvent;
      const uniqueId = await fetchUniqueId(deviceId);
      if (selectedEvent.attributes?.file || selectedEvent.fileName) {
        const fileName = selectedEvent.attributes?.file || selectedEvent.fileName;
        const generatedUrl = `/api/media/${uniqueId}/${fileName}`;
        setMediaUrl(generatedUrl);
      }
      const eventTime = new Date(selectedEvent.eventTime);
      const year = eventTime.getUTCFullYear();
      const month = eventTime.getUTCMonth();
      const day = eventTime.getUTCDate();
      const from = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const to = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      const tripsQuery = new URLSearchParams({
        deviceId,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      const tripsResponse = await fetch(
        `/api/reports/trips?${tripsQuery.toString()}`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (tripsResponse.ok) {
        const tripsData = await tripsResponse.json();
        setTrips(tripsData);
        if (tripsData.length > 0) {
          console.log('Sample trip:', tripsData[0]);
        }
      } else {
        const errorText = await tripsResponse.text();
        console.error(
          'Failed to fetch trips:',
          tripsResponse.status,
          errorText,
        );
        setTrips([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (trips.length > 0 && !selectedTrip) {
      setSelectedTrip(trips[0]);
    }
  }, [trips]);

  const renderMediaContent = () => {
    const mediaType = selectedEvent?.mediaType || selectedEvent?.attributes?.media;
    const finalUrl = mediaUrl || selectedEvent?.url;

    if (mediaType === 'image' && finalUrl) {
      return (
        <img
          src={finalUrl}
          alt={selectedEvent?.fileName || 'Media'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error('Image failed to load:', finalUrl);
            e.target.style.display = 'none';
          }}
        />
      );
    }

    if (mediaType === 'video' && finalUrl) {
      return (
        <video
          src={finalUrl}
          controls
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error('Video failed to load:', finalUrl);
          }}
        >
          <track kind="captions" />
        </video>
      );
    }

    // Default icon
    return mediaType === 'video' ? (
      <PlayCircleOutlineIcon sx={{ fontSize: 100, color: '#555' }} />
    ) : (
      <ImageIcon sx={{ fontSize: 100, color: '#555' }} />
    );
  };

  const createMarkers = () => {
    if (!selectedTrip || !route || route.length === 0) return [];

    const first = route[0];
    const last = route[route.length - 1];

    return [
      {
        latitude: first.latitude,
        longitude: first.longitude,
        image: 'start-success',
      },
      {
        latitude: last.latitude,
        longitude: last.longitude,
        image: 'finish-error',
      },
    ];
  };

  const formatValue = (trip, key) => {
    const value = trip[key];
    switch (key) {
      case 'startTime':
      case 'endTime':
        return value ? new Date(value).toLocaleTimeString() : '-';
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : '-';
      case 'duration':
        return formatNumericHours(value, t);
      default:
        return value || '-';
    }
  };

  const eventDate = selectedEvent?.eventTime
    ? new Date(selectedEvent.eventTime).toLocaleDateString()
    : '';

  const eventDateTime = selectedEvent?.eventTime
    ? new Date(selectedEvent.eventTime).toLocaleString()
    : '';

  if (loading) {
    return (
      <PageLayout
        menu={<ReportsMenu />}
        breadcrumbs={['reportTitle', 'reportMediaDetails']}
      >
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
            Loading media details...
          </Typography>
        </Box>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        menu={<ReportsMenu />}
        breadcrumbs={['reportTitle', 'reportMediaDetails']}
      >
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/reports/event')}
          >
            ← Go back to Media Events
          </Typography>
        </Box>
      </PageLayout>
    );
  }

  const columns = [
    { key: 'startTime', label: 'Start Time' },
    { key: 'endTime', label: 'End Time' },
    { key: 'distance', label: 'Distance' },
    { key: 'averageSpeed', label: 'Avg Speed' },
    { key: 'maxSpeed', label: 'Max Speed' },
    { key: 'duration', label: 'Duration' },
  ];

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={['reportTitle', 'reportMediaDetails']}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, m: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>
        <Paper
          sx={{
            backgroundColor: '#1e1e1e',
            borderRadius: 2,
            aspectRatio: { xs: '16/9', md: '21/9' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            m: 2,
            flexShrink: 0,
          }}
        >
          {renderMediaContent()}
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: { xs: 12, md: 14 },
            }}
          >
            {selectedEvent?.fileName
              || selectedEvent?.attributes?.file
              || 'Media File'}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: { xs: 10, md: 12 },
            }}
          >
            {eventDateTime}
          </Box>
        </Paper>

        {/* Map Section - Middle */}
        <Paper
          sx={{
            height: { xs: 300, sm: 400, md: 500 },
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2,
            mx: 2,
            mb: 2,
            flexShrink: 0,
          }}
        >
          <MapView>
            <MapGeofence />
            {selectedTrip && route && route.length > 0 && (
              <>
                <MapRoutePath positions={route} />
                <MapMarkers markers={createMarkers()} />
                <MapCamera positions={route} />
              </>
            )}
            {!selectedTrip && position && (
              <>
                <MapPositions positions={[position]} titleField="fixTime" />
                <MapCamera
                  latitude={position.latitude}
                  longitude={position.longitude}
                />
              </>
            )}
          </MapView>
          <MapScale />
        </Paper>

        {/* Trips Table Section - Bottom */}
        <Paper
          sx={{
            mx: 2,
            mb: 2,
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              Trips on
              {eventDate}
            </Typography>
          </Box>

          {trips.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No trips found for this day.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className={classes.columnAction} />
                    {columns.map((col) => (
                      <TableCell key={col.key}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow
                      key={trip.startPositionId}
                      hover
                      selected={
                        selectedTrip?.startPositionId === trip.startPositionId
                      }
                    >
                      <TableCell
                        className={classes.columnAction}
                        padding="none"
                      />
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {formatValue(trip, col.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>
    </PageLayout>
  );
};

export default MediaDetailsPage;
