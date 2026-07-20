import React, { useState, useEffect } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { formatTime } from '../util/formatter';
import { useTranslation } from './LocalizationProvider';
import { prefixString } from '../util/stringUtils';

const useStyles = makeStyles((theme) => ({
  eventsSection: {},
  eventRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0.4, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  eventType: {
    fontSize: '0.78rem',
    color: theme.palette.text.primary,
    flex: 1,
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: '0.72rem',
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
    marginLeft: theme.spacing(1),
  },
  noEventsText: {
    fontSize: '0.75rem',
    color: theme.palette.text.disabled,
    fontStyle: 'italic',
    padding: theme.spacing(0.5, 0),
  },
  skeletonRow: {
    marginBottom: theme.spacing(0.5),
  },
}));

let cachedEventTypes = null;

const fetchEventTypes = async () => {
  if (cachedEventTypes) return cachedEventTypes;
  const response = await fetch('/api/notifications/types', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  cachedEventTypes = data.map((item) => item.type);
  return cachedEventTypes;
};

const RecentEventsSection = ({ deviceId, onCountChange }) => {
  const classes = useStyles();
  const t = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const eventTypes = await fetchEventTypes();
        if (cancelled) return;

        const to = new Date();
        const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          deviceId,
          from: from.toISOString(),
          to: to.toISOString(),
        });
        eventTypes.forEach((type) => params.append('type', type));

        const response = await fetch(`/api/reports/events?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        if (!cancelled) {
          const sorted = [...data].sort(
            (a, b) => new Date(b.eventTime) - new Date(a.eventTime),
          );
          const top3 = sorted.slice(0, 3);
          setEvents(top3);
          if (onCountChange) onCountChange(top3.length);
        }
      } catch (_) {
        if (!cancelled) {
          setEvents([]);
          if (onCountChange) onCountChange(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (deviceId) run();

    return () => { cancelled = true; };
  }, [deviceId]);

  if (loading) {
    return (
      <Box className={classes.eventsSection}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="text" height={24} className={classes.skeletonRow} />
        ))}
      </Box>
    );
  }

  if (events.length === 0) {
    return (
      <Box className={classes.eventsSection}>
        <Typography className={classes.noEventsText}>
          No alerts in the last 24 hours
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={classes.eventsSection}>
      {events.map((event) => (
        <Box key={event.id} className={classes.eventRow}>
          <Typography className={classes.eventType}>
            {t(prefixString('event', event.type))}
          </Typography>
          <Typography className={classes.eventTime}>
            {formatTime(event.eventTime, 'minutes')}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default RecentEventsSection;
