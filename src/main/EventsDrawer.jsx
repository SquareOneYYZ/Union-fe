import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography, Box,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatNotificationTitle, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { eventsActions } from '../store';
import SelectField from '../common/components/SelectField';

const useStyles = makeStyles((theme) => ({
  drawer: {
    width: theme.dimensions.eventsDrawerWidth,
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  filters: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const EventsDrawer = ({ open, onClose }) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const events = useSelector((state) => state.events.items);

  const [filterType, setFilterType] = useState(null);
  const [filterDeviceId, setFilterDeviceId] = useState(null);

  const formatType = (event) => formatNotificationTitle(t, {
    type: event.type,
    attributes: { alarms: event.attributes.alarm },
  });

  // Build unique device list from current events only
  const eventDevices = useMemo(() => {
    const seen = new Set();
    return events
      .filter((e) => devices[e.deviceId] && !seen.has(e.deviceId) && seen.add(e.deviceId))
      .map((e) => ({ id: e.deviceId, name: devices[e.deviceId].name }));
  }, [events, devices]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const typeMatch = !filterType || event.type === filterType;
    const deviceMatch = !filterDeviceId || event.deviceId === filterDeviceId;
    return typeMatch && deviceMatch;
  }), [events, filterType, filterDeviceId]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Toolbar className={classes.toolbar} disableGutters>
        <Typography variant="h6" className={classes.title}>
          {t('reportEvents')}
        </Typography>
        <IconButton size="small" color="inherit" onClick={() => dispatch(eventsActions.deleteAll())}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Toolbar>

      <Box className={classes.filters}>
        <SelectField
          label={t('notificationType')}
          fullWidth
          value={filterType}
          emptyValue={null}
          emptyTitle={t('sharedAll')}
          endpoint="/api/notifications/types"
          keyGetter={(item) => item.type}
          titleGetter={(item) => formatNotificationTitle(t, { type: item.type, attributes: {} })}
          onChange={(e) => setFilterType(e.target.value || null)}
        />
        <SelectField
          label={t('deviceTitle')}
          fullWidth
          value={filterDeviceId}
          emptyValue={null}
          emptyTitle={t('sharedAll')}
          data={eventDevices}
          onChange={(e) => setFilterDeviceId(e.target.value || null)}
        />
      </Box>

      <List className={classes.drawer} dense>
        {filteredEvents.map((event) => (
          <ListItemButton
            key={event.id}
            onClick={() => navigate(`/event/${event.id}`)}
            disabled={!event.id}
          >
            <ListItemText
              primary={`${devices[event.deviceId]?.name} • ${formatType(event)}`}
              secondary={formatTime(event.eventTime, 'seconds')}
            />
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); dispatch(eventsActions.delete(event)); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
};

export default EventsDrawer;
