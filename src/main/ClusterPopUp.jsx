import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, IconButton, Paper, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from '@mui/styles';
import { clustersActions } from '../store';

const useStyles = makeStyles((theme) => ({
  root: {
    pointerEvents: 'auto',
    position: 'fixed',
    zIndex: 5,
    bottom: theme.spacing(2),
    left: '50%',
    transform: 'translateX(-50%)',
    width: 320,
    maxHeight: 400,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[6],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    flexShrink: 0,
  },
  title: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  count: {
    fontSize: '0.8rem',
    opacity: 0.85,
    marginLeft: theme.spacing(1),
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

const ClusterPopup = () => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const { visible, devices } = useSelector((state) => state.clusters);

  if (!visible || devices.length === 0) return null;

  return (
    <Paper className={classes.root} elevation={6}>
      <Box className={classes.header}>
        <Box display="flex" alignItems="center">
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
