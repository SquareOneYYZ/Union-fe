import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, IconButton, Paper, ListItem, ListItemText,
} from '@mui/material';
import { FixedSizeList } from 'react-window';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { makeStyles } from '@mui/styles';
import { clustersActions } from '../store/cluster';
import { devicesActions } from '../store/devices';
import { map } from '../map/core/MapView';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatStatus } from '../common/util/formatter';

const useStyles = makeStyles((theme) => ({
  root: {
    pointerEvents: 'auto',
    position: 'fixed',
    zIndex: 5,
    width: 320,
    maxHeight: 400,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[6],
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    flexShrink: 0,
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  dragIcon: {
    opacity: 0.7,
    fontSize: '1.1rem',
  },
  title: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  count: {
    fontSize: '0.8rem',
    opacity: 0.85,
    marginLeft: theme.spacing(0.5),
  },
  list: {
    overflowY: 'auto',
    // Styled scrollbars are painted on the main thread instead of composited.
    // A native composited scrollbar inside this layer-promoted popup gets
    // painted at the wrong viewport location by Chromium (ghost black bar at
    // the top of the map), so never let one be created here. This styling is
    // the load-bearing fix: react-window keeps the scroller composited via
    // will-change, so positioning alone cannot prevent the bug. Chromium >=121
    // uses scrollbar-width/scrollbar-color and ignores the webkit rules, which
    // remain as the Safari fallback.
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.grey[500]} transparent`,
    '&::-webkit-scrollbar': {
      width: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.grey[500],
      borderRadius: 4,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
  },
  listItem: {
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
  },
  deviceName: {
    fontSize: '0.875rem',
  },
}));

const INITIAL_BOTTOM = 16;
const ROW_HEIGHT = 68;
const LIST_MAX_HEIGHT = 340;

const ClusterDeviceRow = ({ data, index, style }) => {
  const { devices, classes, t, onSelect } = data;
  const device = devices[index];
  return (
    <ListItem
      divider={index < devices.length - 1}
      style={style}
      className={classes.listItem}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: 1,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography
            noWrap
            className={classes.deviceName}
          >
            {device.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
          >
            {formatStatus(device.status, t)}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={() => onSelect(device.id)}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => onSelect(device.id)}
        >
          <GpsFixedIcon fontSize="small" />
        </IconButton>
      </Box>
    </ListItem>
  );
};

const ClusterPopup = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const paperRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ bottom: INITIAL_BOTTOM, left: null, top: null });
  const { visible, devices } = useSelector((state) => state.clusters);

  const handleSelect = useCallback((deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
    dispatch(clustersActions.hideClusterPopup());
  }, [dispatch]);

  const itemData = useMemo(() => ({
    devices, classes, t, onSelect: handleSelect,
  }), [devices, classes, t, handleSelect]);

  useEffect(() => {
    if (visible) {
      setPosition({ bottom: INITIAL_BOTTOM, left: null, top: null });
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const hide = () => dispatch(clustersActions.hideClusterPopup());

    const handleZoomOut = () => {
      const metersPerPixel = (156543.03392 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / (2 ** map.getZoom());
      const visibleWidthKm = (map.getCanvas().width * metersPerPixel) / 1000;
      if (visibleWidthKm > 739) hide();
    };

    map.on('click', hide);
    map.on('movestart', hide);
    map.on('zoom', handleZoomOut);

    return () => {
      map.off('click', hide);
      map.off('movestart', hide);
      map.off('zoom', handleZoomOut);
    };
  }, [visible, dispatch]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;

      setPosition({
        top: e.clientY - dragOffset.current.y,
        left: e.clientX - dragOffset.current.x,
        bottom: null,
      });
    };

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      if (!e.touches.length) return;
      const touch = e.touches[0];

      setPosition({
        top: touch.clientY - dragOffset.current.y,
        left: touch.clientX - dragOffset.current.x,
        bottom: null,
      });

      e.preventDefault();
    };

    const stopDragging = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', stopDragging);
    window.addEventListener('touchcancel', stopDragging);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);

      window.removeEventListener('touchmove', onTouchMove, { passive: false });
      window.removeEventListener('touchend', stopDragging);
      window.removeEventListener('touchcancel', stopDragging);
    };
  }, []);

  const onMouseDown = (e) => {
    if (!paperRef.current) return;
    dragging.current = true;
    const rect = paperRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPosition({ top: rect.top, left: rect.left, bottom: null });
    e.preventDefault();
  };

  const onTouchStart = (e) => {
    if (!paperRef.current) return;

    dragging.current = true;

    const touch = e.touches[0];
    const rect = paperRef.current.getBoundingClientRect();

    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };

    setPosition({
      top: rect.top,
      left: rect.left,
      bottom: null,
    });

    e.preventDefault();
  };

  if (!visible || devices.length === 0) return null;

  const style = {
    ...(position.top !== null ? { top: position.top } : { bottom: position.bottom }),
    // avoid transform positioning: Chromium paints composited scrollbars of
    // children at the wrong location inside transformed containers
    ...(position.left !== null ? { left: position.left } : { left: 'calc(50% - 160px)' }),
  };

  return (
    <Paper ref={paperRef} className={classes.root} elevation={6} style={style}>
      <Box
        className={classes.header}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <Box className={classes.headerLeft}>
          <DragIndicatorIcon className={classes.dragIcon} />
          <Typography className={classes.title}>
            {t('clusterDevices')}
          </Typography>
          <Typography className={classes.count}>
            (
            {devices.length}
            )
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => dispatch(clustersActions.hideClusterPopup())}
          sx={{ color: 'inherit' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <FixedSizeList
        className={classes.list}
        style={{ willChange: 'auto' }}
        height={Math.min(devices.length * ROW_HEIGHT, LIST_MAX_HEIGHT)}
        width="100%"
        itemCount={devices.length}
        itemSize={ROW_HEIGHT}
        itemData={itemData}
      >
        {ClusterDeviceRow}
      </FixedSizeList>
    </Paper>
  );
};

export default ClusterPopup;
