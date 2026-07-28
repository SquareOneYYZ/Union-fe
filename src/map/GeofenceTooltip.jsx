import React from 'react';
import { createPortal } from 'react-dom';
import { makeStyles } from '@mui/styles';
import { CircularProgress } from '@mui/material';

const TOOLTIP_WIDTH = 160;
const TOOLTIP_HEIGHT = 100;
const OFFSET = 14;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999,
    background: '#212121',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1.25, 1.5),
    width: TOOLTIP_WIDTH,
    boxShadow: theme.shadows[3],
  },
  name: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.75),
    width: '100%',
    textAlign: 'center',
    whiteSpace: 'normal', // ← allows wrapping
    wordBreak: 'break-word', // ← breaks long single words
    lineHeight: 1.4,
  },
  statsRow: {
    display: 'flex',
    gap: theme.spacing(2),
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  entryValue: { color: '#16a34a' },
  exitValue: { color: '#dc2626' },
  lastVehicle: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.75),
    '& strong': { color: theme.palette.text.primary },
  },
  loader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
}));

const getPosition = (x, y) => {
  const left = x + OFFSET + TOOLTIP_WIDTH > window.innerWidth
    ? x - TOOLTIP_WIDTH - OFFSET
    : x + OFFSET;
  const top = y + OFFSET + TOOLTIP_HEIGHT > window.innerHeight
    ? y - TOOLTIP_HEIGHT - OFFSET
    : y + OFFSET;
  return { left, top };
};

const GeofenceTooltip = ({
  visible, x, y, geofenceName, entries, exits, lastVehicle, loading,
}) => {
  const classes = useStyles();

  if (!visible) return null;

  const { left, top } = getPosition(x, y);

  return createPortal(
    <div className={classes.root} style={{ left, top }}>
      <div className={classes.name}>{geofenceName}</div>

      {loading ? (
        <div className={classes.loader}>
          <CircularProgress size={12} thickness={4} />
          Loading activity...
        </div>
      ) : (
        <>
          <div className={classes.statsRow}>
            <div className={classes.stat}>
              <span className={classes.statLabel}>Entries</span>
              <span className={`${classes.statValue} ${classes.entryValue}`}>
                {entries ?? 0}
              </span>
            </div>
            <div className={classes.stat}>
              <span className={classes.statLabel}>Exits</span>
              <span className={`${classes.statValue} ${classes.exitValue}`}>
                {exits ?? 0}
              </span>
            </div>
          </div>

          {lastVehicle && (
            <div className={classes.lastVehicle}>
              Last vehicle:
              {' '}
              <strong>{lastVehicle}</strong>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
};

export default GeofenceTooltip;
