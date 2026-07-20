import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Draggable from 'react-draggable';
import {
  Card,
  CardContent,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
  TableFooter,
  Link,
  Tooltip,
  Box,
  Divider,
  Typography,
  Badge,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import PublishIcon from '@mui/icons-material/Publish';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useAdministrator, useDeviceReadonly } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import RecentEventsSection from './RecentEventsSection';
import usePersistedState from '../util/usePersistedState';

const DRAWER_WIDTH = 240;

const useStyles = makeStyles((theme) => ({
  card: {
    pointerEvents: 'auto',
    position: 'relative',
    width: theme.dimensions.popupMaxWidth,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  mediaButton: {
    color: theme.palette.primary.contrastText,
    mixBlendMode: 'difference',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
    cursor: 'move',
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    overflowY: 'auto',
    maxHeight: `calc(100vh - ${theme.spacing(24)})`,
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-child': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  actions: {
    justifyContent: 'space-between',
  },
  root: ({ desktopPadding }) => ({
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  }),
  cardRow: {
    display: 'flex',
    pointerEvents: 'auto',
    [theme.breakpoints.up('md')]: {
      flexDirection: 'row',
      alignItems: 'stretch',
      maxHeight: `calc(100vh - ${theme.spacing(12)})`,
    },
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
      alignItems: 'stretch',
      maxHeight: `calc(100vh - ${theme.spacing(16)})`,
    },
  },
  chevronTab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    cursor: 'pointer',
    backgroundColor: theme.palette.background.paper,
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderRadius: `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
    boxShadow: theme.shadows[3],
    [theme.breakpoints.up('md')]: {
      display: 'flex',
    },
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  chevronTabMobile: {
    display: 'none',
    [theme.breakpoints.down('md')]: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: 24,
      cursor: 'pointer',
      backgroundColor: theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  },
  eventsPanel: {
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[3],
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      width: DRAWER_WIDTH,
      marginLeft: theme.spacing(0.5),
      alignSelf: 'stretch',
      maxHeight: `calc(100vh - ${theme.spacing(12)})`,
      transition: theme.transitions.create('max-width', {
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.standard,
      }),
    },
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginTop: theme.spacing(0.5),
      transition: theme.transitions.create('max-height', {
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.standard,
      }),
    },
  },
  eventsPanelOpen: {
    [theme.breakpoints.up('md')]: {
      maxWidth: DRAWER_WIDTH,
    },
    [theme.breakpoints.down('md')]: {
      maxHeight: 300,
    },
  },
  eventsPanelClosed: {
    boxShadow: 'none',
    [theme.breakpoints.up('md')]: {
      maxWidth: 0,
      marginLeft: 0,
    },
    [theme.breakpoints.down('md')]: {
      maxHeight: 0,
      marginTop: 0,
    },
  },
  eventsPanelHeader: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(1, 1.5, 0.5),
  },
  eventsPanelDivider: {
    flexShrink: 0,
  },
  eventsPanelTitle: {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
  },
  eventsPanelIcon: {
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
  },
  eventsPanelContent: {
    padding: theme.spacing(0.5, 1.5, 1.5),
    flex: 1,
    overflowY: 'auto',
    minWidth: DRAWER_WIDTH - theme.spacing(3),
  },
}));

const StatusRow = ({ name, content }) => {
  const classes = useStyles();
  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">{content}</Typography>
      </TableCell>
    </TableRow>
  );
};

const StatusCard = ({
  deviceId, position, onClose, disableActions, desktopPadding = 0,
}) => {
  const classes = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [eventCount, setEventCount] = useState(0);
  const [drawerOpenMap, setDrawerOpenMap] = usePersistedState('statusCardAlertsOpen', {});
  const drawerOpen = drawerOpenMap[deviceId] ?? true;

  const t = useTranslation();
  const admin = useAdministrator();
  const deviceReadonly = useDeviceReadonly();
  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);
  const deviceImage = device?.attributes?.deviceImage;
  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance');
  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');
  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);

  const handleCloseDrawer = () => {
    setDrawerOpenMap((prev) => ({ ...prev, [deviceId]: false }));
  };

  const handleOpenDrawer = () => {
    setDrawerOpenMap((prev) => ({ ...prev, [deviceId]: true }));
  };

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetch('/api/devices');
      if (response.ok) {
        dispatch(devicesActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetch('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    if (response.ok) {
      const item = await response.json();
      const permissionResponse = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
      });
      if (!permissionResponse.ok) throw Error(await permissionResponse.text());
      navigate(`/settings/geofence/${item.id}`);
    } else {
      throw Error(await response.text());
    }
  }, [navigate, position]);

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Draggable handle={`.${classes.media}, .${classes.header}`}>
            <Box className={classes.cardRow}>
              <Card elevation={3} className={classes.card}>
                {deviceImage ? (
                  <CardMedia
                    className={classes.media}
                    image={`/api/media/${device.uniqueId}/${deviceImage}`}
                  >
                    <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                      <CloseIcon fontSize="small" className={classes.mediaButton} />
                    </IconButton>
                  </CardMedia>
                ) : (
                  <div className={classes.header}>
                    <Typography variant="body2" color="textSecondary">
                      {device.name}
                    </Typography>
                    <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </div>
                )}

                {position && (
                  <CardContent className={classes.content}>
                    <Table size="small" classes={{ root: classes.table }}>
                      <TableBody>
                        {positionItems
                          .split(',')
                          .filter(
                            (key) => position.hasOwnProperty(key)
                              || position.attributes.hasOwnProperty(key),
                          )
                          .map((key) => (
                            <StatusRow
                              key={key}
                              name={positionAttributes[key]?.name || key}
                              content={(
                                <PositionValue
                                  position={position}
                                  property={position.hasOwnProperty(key) ? key : null}
                                  attribute={position.hasOwnProperty(key) ? null : key}
                                />
                              )}
                            />
                          ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className={classes.cell}>
                            <Typography variant="body2">
                              <Link component={RouterLink} to={`/position/${position.id}`}>
                                {t('sharedShowDetails')}
                              </Link>
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                )}

                <CardActions classes={{ root: classes.actions }} disableSpacing>
                  <Tooltip title={t('sharedConnections')}>
                    <IconButton
                      onClick={() => navigate(`/settings/device/${deviceId}/connections`)}
                      disabled={disableActions}
                    >
                      <LinkIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sharedExtra')}>
                    <IconButton
                      color="secondary"
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      disabled={!position}
                    >
                      <PendingIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('reportReplay')}>
                    <IconButton
                      onClick={() => navigate('/replay')}
                      disabled={disableActions || !position}
                    >
                      <ReplayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('commandTitle')}>
                    <IconButton
                      onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                      disabled={disableActions}
                    >
                      <PublishIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sharedEdit')}>
                    <IconButton
                      onClick={() => navigate(`/settings/device/${deviceId}`)}
                      disabled={disableActions || deviceReadonly}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {admin && (
                    <Tooltip title={t('sharedRemove')}>
                      <IconButton
                        color="error"
                        onClick={() => setRemoving(true)}
                        disabled={disableActions || deviceReadonly}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>

                <Tooltip title={drawerOpen ? 'Hide alerts' : 'Show alerts'}>
                  <Box
                    className={classes.chevronTabMobile}
                    onClick={drawerOpen ? handleCloseDrawer : handleOpenDrawer}
                  >
                    <Badge
                      badgeContent={!drawerOpen ? eventCount : 0}
                      color="error"
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      {drawerOpen
                        ? <KeyboardArrowUpIcon fontSize="small" />
                        : <KeyboardArrowDownIcon fontSize="small" />}
                    </Badge>
                  </Box>
                </Tooltip>
              </Card>

              <Tooltip title={drawerOpen ? 'Hide alerts' : 'Show alerts'}>
                <Box
                  className={classes.chevronTab}
                  onClick={drawerOpen ? handleCloseDrawer : handleOpenDrawer}
                >
                  <Badge
                    badgeContent={!drawerOpen ? eventCount : 0}
                    color="error"
                    overlap="circular"
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    {drawerOpen
                      ? <ChevronRightIcon fontSize="small" />
                      : <ChevronLeftIcon fontSize="small" />}
                  </Badge>
                </Box>
              </Tooltip>

              <Box className={`${classes.eventsPanel} ${drawerOpen ? classes.eventsPanelOpen : classes.eventsPanelClosed}`}>
                <Box className={classes.eventsPanelHeader}>
                  <NotificationsIcon className={classes.eventsPanelIcon} />
                  <Typography className={classes.eventsPanelTitle}>
                    Recent Alerts (24h)
                  </Typography>
                </Box>
                <Divider className={classes.eventsPanelDivider} />
                <Box className={classes.eventsPanelContent}>
                  <RecentEventsSection
                    deviceId={deviceId}
                    onCountChange={setEventCount}
                  />
                </Box>
              </Box>
            </Box>
          </Draggable>
        )}
      </div>

      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>
          <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}>
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem component="a" target="_blank" href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}>
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}>
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && (
            <MenuItem component="a" target="_blank" href={navigationAppLink.replace('{latitude}', position.latitude).replace('{longitude}', position.longitude)}>
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('deviceShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}

      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
