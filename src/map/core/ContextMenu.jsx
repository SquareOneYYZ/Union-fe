import React, { useEffect, useRef } from 'react';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles((theme) => ({
  paper: {
    position: 'fixed',
    zIndex: 2000,
    minWidth: 242,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.75),
    boxShadow: theme.shadows[8],
    fontFamily: theme.typography.fontFamily,
    userSelect: 'none',
  },
  coords: {
    fontSize: 11,
    color: theme.palette.text.disabled,
    padding: `${theme.spacing(0.5)} ${theme.spacing(1.25)} ${theme.spacing(0.75)}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(0.5),
    letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums',
    userSelect: 'text',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    width: '100%',
    padding: `${theme.spacing(0.875)} ${theme.spacing(1.25)}`,
    border: 'none',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: theme.typography.fontFamily,
    color: theme.palette.text.primary,
    transition: 'background-color 0.1s',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&:active': {
      backgroundColor: theme.palette.action.selected,
    },
    '&:disabled': {
      opacity: 0.45,
      cursor: 'default',
      pointerEvents: 'none',
    },
  },
  iconWrap: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
    flexShrink: 0,
    fontSize: 16,
  },
  labelWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontSize: theme.typography.body2.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.palette.text.primary,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sub: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subHighlight: {
    fontSize: 11,
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

const ContextMenu = ({
  visible,
  x,
  y,
  lngLat,
  nearestDeviceName,
  onClose,
  onGeofence,
  onNearestVehicle,
  onMeasure,
}) => {
  const classes = useStyles();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) return undefined;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const menuWidth = 242;
  const menuHeight = 190;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  const menuItems = [
    {
      key: 'geofence',
      icon: '⬡',
      label: 'Create Geofence Here',
      sub: 'Draw a new geofence at this location',
      subClass: classes.sub,
      handler: onGeofence,
      disabled: false,
    },
    {
      key: 'nearest',
      icon: '🚗',
      label: 'Find Nearest Vehicle',
      sub: nearestDeviceName ?? 'No vehicles with positions found',
      subClass: nearestDeviceName ? classes.subHighlight : classes.sub,
      handler: onNearestVehicle,
      disabled: !nearestDeviceName,
    },
    {
      key: 'measure',
      icon: '📏',
      label: 'Measure From Here',
      sub: nearestDeviceName ? `From ${nearestDeviceName} to cursor` : 'No vehicle position available',
      subClass: nearestDeviceName ? classes.subHighlight : classes.sub,
      handler: onMeasure,
      disabled: !nearestDeviceName,
    },
  ];

  return (
    <div
      ref={menuRef}
      className={classes.paper}
      style={{ top: adjustedY, left: adjustedX }}
    >
      {lngLat && (
        <div className={classes.coords}>
          {lngLat.lat.toFixed(5)}
          ,&nbsp;
          {lngLat.lng.toFixed(5)}
        </div>
      )}

      {menuItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={classes.item}
          disabled={item.disabled}
          onClick={() => {
            if (item.handler) item.handler(lngLat);
            onClose();
          }}
        >
          <span className={classes.iconWrap}>{item.icon}</span>
          <span className={classes.labelWrap}>
            <span className={classes.label}>{item.label}</span>
            <span className={item.subClass}>{item.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
