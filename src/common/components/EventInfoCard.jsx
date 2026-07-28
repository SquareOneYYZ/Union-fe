import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card, CardContent, Typography, IconButton, Link,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Draggable from 'react-draggable';
import makeStyles from '@mui/styles/makeStyles';
import { useTranslation } from './LocalizationProvider';
import { formatNotificationTitle } from '../util/formatter';
import { eventsActions } from '../../store/events';
import MapNotification from '../../map/notification/MapNotification';
import EventsDrawer from '../../main/EventsDrawer';

const useStyles = makeStyles((theme) => ({
  card: {
    pointerEvents: 'auto',
    width: 240,
    height: 130,
    backgroundColor: '#252525',
    color: '#fff',
    position: 'fixed',
    zIndex: 5,
    left: '83%',
    bottom: theme.spacing(29),
    transform: 'translateX(-50%)',
    boxShadow: '0px 4px 20px rgba(0,0,0,0.4)',

    [theme.breakpoints.down('sm')]: {
      width: '90%',
      left: '50%',
      bottom: theme.spacing(12),
    },
  },
  content: {
    padding: theme.spacing(0.7),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  heading: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
  },
  text: {
    fontSize: '0.9rem',
    color: '#e0e0e0',
    marginBottom: theme.spacing(0.5),
  },
  closeIcon: {
    color: '#fff',
  },
}));

const EventInfoCard = ({ onClose }) => {
  const classes = useStyles();
  const t = useTranslation();
  const dispatch = useDispatch();
  const cardRef = useRef(null);

  const devices = useSelector((state) => state.devices.items);
  const allEvents = useSelector((state) => state.events.items);
  const selectedEvent = useSelector((state) => state.events.selected);

  const [deviceEvent, setDeviceEvent] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const handleClose = () => {
    onClose?.();
    dispatch(eventsActions.deselect());
  };

  const handleLinkClick = () => {
    if (selectedEvent?.deviceId) {
      setSelectedVehicle(selectedEvent.deviceId);
    }
    setDrawerOpen(true);
  };

  const handleNotificationClick = () => {
    console.log('Map Notification Icon Clicked!');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedEvent?.deviceId && allEvents.length > 0) {
      const latestDeviceEvent = allEvents.find(
        (event) => event.deviceId === selectedEvent.deviceId,
      );
      setDeviceEvent(latestDeviceEvent || null);
    } else {
      setDeviceEvent(null);
    }
  }, [selectedEvent, allEvents]);

  if (!selectedEvent || !deviceEvent) return null;

  const device = devices[selectedEvent.deviceId];

  const formatType = (event) => formatNotificationTitle(t, {
    type: event?.type,
    attributes: {
      alarms: event?.attributes?.alarm || [],
    },
  });

  return (
    <>
      <Draggable>
        <Card ref={cardRef} className={classes.card}>
          {' '}
          {/* ✅ Attach ref here */}
          <CardContent className={classes.content}>
            <div className={classes.header}>
              <Typography className={classes.heading}>Event Details</Typography>
              <IconButton size="small" onClick={handleClose}>
                <CloseIcon className={classes.closeIcon} />
              </IconButton>
            </div>
            <Typography className={classes.text}>
              <strong style={{ marginRight: 6 }}>Vehicle Name:</strong>
              {device?.name || 'Unknown'}
            </Typography>
            <Typography className={classes.text}>
              <strong style={{ marginRight: 6 }}>Event Type:</strong>
              {formatType(deviceEvent)}
            </Typography>
            <Typography variant="body2">
              <Link
                component="button"
                variant="body2"
                underline="always"
                onClick={handleLinkClick}
                color="primary"
              >
                Show all events
              </Link>
            </Typography>
          </CardContent>
          <CardContent className={classes.content} />
          {showNotification && (
            <MapNotification
              enabled={notifEnabled}
              onClick={handleNotificationClick}
            />
          )}
        </Card>
      </Draggable>

      <EventsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedVehicle={selectedVehicle}
        onVehicleChange={setSelectedVehicle}
      />
    </>
  );
};

export default EventInfoCard;
