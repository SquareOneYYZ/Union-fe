import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, IconButton, Paper, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { makeStyles } from '@mui/styles';
import { clustersActions } from '../store';
import { map } from '../map/core/MapView';

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
    flex: 1,
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

const ClusterPopup = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const paperRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ bottom: INITIAL_BOTTOM, left: null, top: null });
  const { visible, devices } = useSelector((state) => state.clusters);

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

  // Drag listeners
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      setPosition({
        top: e.clientY - dragOffset.current.y,
        left: e.clientX - dragOffset.current.x,
        bottom: null,
      });
    };

    const onMouseUp = () => { dragging.current = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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

  if (!visible || devices.length === 0) return null;

  const style = {
    ...(position.top !== null ? { top: position.top } : { bottom: position.bottom }),
    ...(position.left !== null ? { left: position.left } : { left: '50%', transform: 'translateX(-50%)' }),
  };

  return (
    <Paper ref={paperRef} className={classes.root} elevation={6} style={style}>
      <Box className={classes.header} onMouseDown={onMouseDown}>
        <Box className={classes.headerLeft}>
          <DragIndicatorIcon className={classes.dragIcon} />
          <Typography className={classes.title}>Devices in Cluster</Typography>
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
      <List dense disablePadding className={classes.list}>
        {devices.map((device, index) => (
          <Box key={device.id}>
            <ListItem className={classes.listItem}>
              <ListItemText
                primary={device.name}
                primaryTypographyProps={{ className: classes.deviceName }}
              />
            </ListItem>
            {index < devices.length - 1 && <Divider component="li" />}
          </Box>
        ))}
      </List>
    </Paper>
  );
};

export default ClusterPopup;
