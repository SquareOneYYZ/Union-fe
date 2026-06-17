import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from './LocalizationProvider';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const MOCK_FEATURES = [
  {
    id: 1,
    versionNo: '2.1.0',
    feature: 'Full Screen Mode',
    details: 'Expand the map to full screen for a distraction-free tracking experience. Click the icon on the top-right of the map to enter or exit full screen.',
  },
  {
    id: 2,
    versionNo: '2.0.8',
    feature: 'Zoom Controls',
    details: 'Use the zoom bar on the right side of the map to quickly zoom in and out without using scroll wheel or pinch gestures.',
  },
  {
    id: 3,
    versionNo: '2.0.5',
    feature: 'Measure Distance',
    details: 'Activate the measure tool and click any two or more points on the map to calculate the real-world distance between them.',
  },
  {
    id: 4,
    versionNo: '2.0.2',
    feature: 'Geofence Access',
    details: 'Quickly navigate to geofence management directly from the map using the geofence access control button.',
  },
];

const featureTourMap = {
  1: 'fullscreen',
  2: 'zoombar',
  3: 'measure',
  4: 'geofenceAccess',
};

const tourDefinitions = {
  fullscreen: [
    {
      element: '#map-ctrl-fullscreen',
      popover: {
        title: '⛶ Full Screen Mode',
        description: 'Click this button to expand the map to full screen. Press Esc or click again to exit.',
        side: 'left',
        align: 'start',
      },
    },
  ],
  zoombar: [
    {
      element: '#map-ctrl-zoombar',
      popover: {
        title: '🔍 Zoom Controls',
        description: 'Use the + and – buttons or drag the slider to zoom in and out of the map.',
        side: 'left',
        align: 'start',
      },
    },
  ],
  measure: [
    {
      element: '#map-ctrl-measure',
      popover: {
        title: '📏 Measure Distance',
        description: 'Activate this tool then click two or more points on the map to measure the real-world distance between them.',
        side: 'left',
        align: 'start',
      },
    },
  ],
  geofenceAccess: [
    {
      element: '#map-ctrl-geofence',
      popover: {
        title: '🗺️ Geofence Access',
        description: 'Click here to quickly navigate to geofence management directly from the map.',
        side: 'left',
        align: 'start',
      },
    },
  ],
};

const useStyles = makeStyles((theme) => ({
  paper: {
    overflow: 'hidden',
    width: '100%',
    maxWidth: 680,
    borderRadius: 0,
    margin: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
      maxWidth: '100%',
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  headerIcon: {
    color: theme.palette.primary.main,
    fontSize: 20,
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 15,
  },
  content: {
    padding: '0 !important',
    overflowY: 'auto',
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.divider,
      borderRadius: 4,
    },
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1.5, 2.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.4),
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: theme.palette.primary.main,
  },
  featureTitle: {
    fontWeight: 700,
    fontSize: 13,
  },
  versionText: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.primary.main,
    letterSpacing: 0.3,
    display: 'inline-block',
    border: `1.5px solid ${theme.palette.primary.main}`,
    borderRadius: 20,
    padding: theme.spacing(0.1, 0.8),
    flexShrink: 0,
  },
  detailsText: {
    fontSize: 12,
    lineHeight: 1.6,
    color: theme.palette.text.secondary,
    paddingLeft: theme.spacing(2.2),
  },
  readMoreBtn: {
    marginTop: theme.spacing(0.8),
    marginLeft: theme.spacing(2.2),
    alignSelf: 'flex-start',
    fontSize: 11,
    padding: theme.spacing(0.2, 1),
    textTransform: 'none',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  checkboxLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  backdrop: {
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
}));

const WhatsNewPopup = () => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState([]);
  const [latestFeature, setLatestFeature] = useState(null);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const t = useTranslation();
  const userId = useSelector((state) => state.session.user?.id);

  useEffect(() => {
    const enriched = MOCK_FEATURES.map((item) => ({
      ...item,
      tourId: featureTourMap[item.id] ?? null,
    }));

    const latest = enriched.reduce((max, item) => (item.id > max.id ? item : max), enriched[0]);

    setFeatures(enriched);
    setLatestFeature(latest);
    setOpen(true);
  }, []);

  const handleReadMore = (tourId) => {
    if (!tourId || !tourDefinitions[tourId]) return;
    setOpen(false);

    setTimeout(() => {
      const steps = tourDefinitions[tourId];
      const firstElement = document.querySelector(steps[0].element);
      if (!firstElement) {
        console.warn(`[WhatsNewPopup] Tour element not found: ${steps[0].element}`);
        return;
      }

      const driverObj = driver({
        showProgress: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.5,
        steps,
      });

      driverObj.drive();
    }, 300); 
  };

  const handleGotIt = () => {
    setOpen(false);

    if (doNotShowAgain) {
      fetch('/api/feature/permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featureId: latestFeature?.id }),
      }).catch((err) => console.error('[WhatsNewPopup] permission post failed:', err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: classes.paper }}
      BackdropProps={{ className: classes.backdrop }}
    >
      {/* ── Header ── */}
      <div className={classes.header}>
        <div className={classes.headerLeft}>
          <AutoAwesomeIcon className={classes.headerIcon} />
          <Typography className={classes.headerTitle}>
            {t('whatsNewTitle')}
          </Typography>
        </div>
        <IconButton size="small" onClick={() => setOpen(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <DialogContent className={classes.content}>
        {features.map((item) => (
          <Box key={item.id} className={classes.row}>
            <div className={classes.featureRow}>
              <span className={classes.bullet} />
              <Typography className={classes.featureTitle}>
                {item.feature}
              </Typography>
              <Typography className={classes.versionText}>
                {`v${item.versionNo}`}
              </Typography>
            </div>
            <Typography className={classes.detailsText}>
              {item.details}
            </Typography>
            {item.tourId && (
              <Button
                size="small"
                variant="outlined"
                className={classes.readMoreBtn}
                onClick={() => handleReadMore(item.tourId)}
              >
                {t('readMore') || 'Read More'}
              </Button>
            )}
          </Box>
        ))}
      </DialogContent>

      <div className={classes.footer}>
        <FormControlLabel
          control={(
            <Checkbox
              size="small"
              checked={doNotShowAgain}
              onChange={(e) => setDoNotShowAgain(e.target.checked)}
            />
          )}
          label={<Typography className={classes.checkboxLabel}>{t('doNotShowAgain')}</Typography>}
        />
        <Button size="small" variant="contained" onClick={handleGotIt} disableElevation>
          {t('gotIt')}
        </Button>
      </div>
    </Dialog>
  );
};

export default WhatsNewPopup;