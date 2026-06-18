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
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from './LocalizationProvider';
import tourRegistry from '../../tours/tourRegistry';

const MOCK_FEATURES = [
  {
    id: 1,
    versionNo: '2.1.0',
    feature: 'Map Controls',
    details: 'New map control buttons added — full screen, measure distance, quick geofence access, zoom bar, and layer switcher are now available directly on the map.',
    tourId: 'mapControls',
  },
  {
    id: 2,
    versionNo: '2.0.8',
    feature: 'Faster Report Generation',
    details: 'Reports now load up to 3× faster. Export to Excel or PDF with one click from the reports page.',
    tourId: 'reports',
  },
  {
    id: 3,
    versionNo: '2.0.5',
    feature: 'Trip Export PDF',
    details: 'Export any trip as a formatted PDF including route map, timestamps, and full trip summary.',
    tourId: 'trips',
  },
  {
    id: 4,
    versionNo: '2.0.2',
    feature: 'Session Stability Fix',
    details: 'Resolved an issue where users were occasionally logged out unexpectedly. Sessions now remain stable across multiple browser tabs.',
    tourId: null,
  },
];

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
    flex: 1,
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
    borderRadius: 20,
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
    const data = MOCK_FEATURES;
    const latest = data.reduce((max, item) => (item.id > max.id ? item : max), data[0]);
    setFeatures(data);
    setLatestFeature(latest);
    setOpen(true);
  }, []);

  const handleReadMore = (tourId) => {
    const steps = tourRegistry[tourId];

    if (!steps || steps.length === 0) {
      console.warn(`[WhatsNewPopup] No tour found for tourId: "${tourId}"`);
      return;
    }
    setOpen(false);
    setTimeout(() => {
      const firstEl = document.querySelector(steps[0].element);
      if (!firstEl) {
        console.warn(`[WhatsNewPopup] Tour element not found in DOM: ${steps[0].element}`);
        return;
      }

      driver({
        showProgress: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.5,
        steps,
      }).drive();
    }, 300);
  };

  const handleGotIt = () => {
    setOpen(false);

    if (doNotShowAgain) {
      fetch('/api/feature/permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featured: latestFeature?.id }),
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

      {/* ── Feature list ── */}
      <DialogContent className={classes.content}>
        {features.map((item) => (
          <Box key={item.id} className={classes.row}>

            {/* Bullet + feature name + version pill */}
            <div className={classes.featureRow}>
              <span className={classes.bullet} />
              <Typography className={classes.featureTitle}>
                {item.feature}
              </Typography>
              <Typography className={classes.versionText}>
                {`v${item.versionNo}`}
              </Typography>
            </div>

            {/* Details */}
            <Typography className={classes.detailsText}>
              {item.details}
            </Typography>

            {/* Read More — only shown if tourId exists in registry */}
            {item.tourId && tourRegistry[item.tourId] && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                className={classes.readMoreBtn}
                onClick={() => handleReadMore(item.tourId)}
              >
                {t('readMore') || 'Read More'}
              </Button>
            )}

          </Box>
        ))}
      </DialogContent>

      {/* ── Footer ── */}
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