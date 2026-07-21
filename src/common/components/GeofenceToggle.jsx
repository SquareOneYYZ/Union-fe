import React, { useState, useCallback } from 'react';
import {
  Box, Switch, Typography, Tooltip, CircularProgress,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import LayersIcon from '@mui/icons-material/Layers';
import { useSelector, useDispatch } from 'react-redux';
import { sessionActions } from '../../store';
import { useAttributePreference } from '../util/preferences';
import { useTranslation } from './LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    minHeight: 44,
  },
  labelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  icon: {
    fontSize: 18,
    color: theme.palette.text.secondary,
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: theme.palette.text.primary,
    userSelect: 'none',
  },
  loader: {
    marginRight: theme.spacing(1),
  },
  switch: {
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: theme.palette.primary.main,
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: theme.palette.primary.main,
    },
  },
}));

const GeofenceToggle = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const user = useSelector((state) => state.session.user);
  const forceSettings = useSelector((state) => state.session.server.forceSettings);
  const enabled = useAttributePreference('mapGeofences', true);

  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async (event) => {
    if (!user) return;
    const newValue = event.target.checked;
    const previousUser = user;
    setLoading(true);

    const optimisticUser = {
      ...user,
      attributes: { ...user.attributes, mapGeofences: newValue },
    };
    dispatch(sessionActions.updateUser(optimisticUser));

    try {
      const putResponse = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimisticUser),
      });

      if (putResponse.ok) {
        const saved = await putResponse.json();
        dispatch(sessionActions.updateUser(saved));
      } else {
        dispatch(sessionActions.updateUser(previousUser));
      }
    } catch (err) {
      dispatch(sessionActions.updateUser(previousUser));
    } finally {
      setLoading(false);
    }
  }, [user, dispatch]);

  if (!user) return null;

  return (
    <Box className={classes.root}>
      <Box className={classes.labelGroup}>
        <LayersIcon className={classes.icon} />
        <Typography className={classes.label}>{t('attributeShowGeofences')}</Typography>
      </Box>

      <Box display="flex" alignItems="center">
        {loading && (
          <CircularProgress size={14} thickness={5} className={classes.loader} />
        )}
        <Tooltip
          title={enabled ? 'Hide geofences on map' : 'Show geofences on map'}
          placement="left"
          arrow
        >
          <span>
            <Switch
              size="small"
              checked={enabled}
              onChange={handleToggle}
              disabled={loading || forceSettings}
              className={classes.switch}
              inputProps={{ 'aria-label': 'Toggle geofence visibility' }}
            />
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default GeofenceToggle;
