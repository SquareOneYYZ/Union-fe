import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  FormControl,
  MenuItem,
  Select,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatNotificationTitle, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { eventsActions } from '../store';

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
}));

const EventsDrawer = ({ open, onClose, selectedVehicle, onVehicleChange }) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const events = useSelector((state) => state.events.items);

  const formatType = (event) => formatNotificationTitle(t, {
    type: event.type,
    attributes: {
      alarms: event.attributes.alarm,
    },
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Toolbar className={classes.toolbar} disableGutters>
        <Typography variant="h6" className={classes.title}>
          {t('reportEvents')}
        </Typography>

        <FormControl size="small" style={{ minWidth: 150, marginRight: 8 }}>
          <Select
            value={selectedVehicle}
            onChange={(e) => onVehicleChange(e.target.value)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) return 'All';
              return devices[selected]?.name || 'Unknown';
            }}
          >
            <MenuItem value="">All</MenuItem>
            {[...new Set(events.map((e) => e.deviceId))]
              .filter((id) => devices[id])
              .map((id) => (
                <MenuItem key={id} value={id}>
                  {devices[id]?.name || 'Unknown'}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <IconButton
          size="small"
          color="inherit"
          onClick={() => dispatch(eventsActions.deleteAll())}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Toolbar>

      <List className={classes.drawer} dense>
        {events
          .filter(
            (event) => !selectedVehicle || event.deviceId === selectedVehicle,
          )
          .map((event) => (
            <ListItemButton
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`)}
              disabled={!event.id}
            >
              <ListItemText
                primary={`${devices[event.deviceId]?.name} • ${formatType(
                  event,
                )}`}
                secondary={formatTime(event.eventTime, 'seconds')}
              />
              <IconButton
                size="small"
                onClick={() => dispatch(eventsActions.delete(event))}
              >
                <DeleteIcon fontSize="small" className={classes.delete} />
              </IconButton>
            </ListItemButton>
          ))}
      </List>
    </Drawer>
  );
};

export default EventsDrawer;
