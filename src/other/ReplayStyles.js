import makeStyles from '@mui/styles/makeStyles';

export const SPEED_OPTIONS = [1, 1.5, 2, 5, 10];

export const DEVICE_COLORS = [
  '#2196f3',
  '#ff5722',
  '#4caf50',
  '#9c27b0',
  '#ff9800',
  '#00bcd4',
];

export const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    position: 'relative',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    margin: theme.spacing(1.5),
    width: 340,
    maxWidth: '90vw',
    transition: 'width 0.3s ease',

    '&.expanded': {
      width: 400,
    },

    [theme.breakpoints.down('md')]: {
      width: 'calc(100% - 16px)',
      maxWidth: 'calc(100% - 16px)',
      margin: theme.spacing(1),
      left: 0,
      right: 0,
    },

    [theme.breakpoints.down('sm')]: {
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      left: 0,
      right: 0,
    },

    '& .MuiSelect-select': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  title: {
    flexGrow: 1,
  },
  slider: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speedControl: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  speedChips: {
    display: 'flex',
    gap: theme.spacing(0.75),
    flexWrap: 'wrap',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    overflow: 'hidden',
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(2),
      margin: theme.spacing(1.5),
    },
  },
  speedStrip: {
    position: 'fixed',
    bottom: 8,
    left: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 0,
    background: theme.palette.background.paper,
    border: `0.5px solid ${theme.palette.divider}`,
    padding: '5px 8px 4px',
    opacity: 0.93,

    [theme.breakpoints.down('sm')]: {
      bottom: 56,
      left: 10,
      right: 10,
      borderRadius: 0,
    },

    [theme.breakpoints.down('md')]: {
      bottom: 65,
      left: 10,
      right: 10,
    },
  },
  speedStripValue: {
    fontWeight: 500,
    color: theme.palette.warning.dark,
  },
  chartWrapper: {
    position: 'relative',
    width: '100%',
    height: 48,
  },
  playheadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  deviceLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(0.5),
  },
  deviceLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  deviceDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  compareSection: {
    marginTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(1.5),
  },
  compareRow: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  compareDeviceChip: {
    maxWidth: 160,
  },
  addRow: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
  },
}));