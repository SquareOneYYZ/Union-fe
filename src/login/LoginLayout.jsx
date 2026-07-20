import React from 'react';
import { useMediaQuery, Paper } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { useTheme } from '@mui/material/styles';
import LogoImage from './LogoImage';
import bgImage from './Installation.webp';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundContainer: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.95), rgba(17, 24, 39, 0.70))',
  },
  dotPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    opacity: 0.1,
  },
  sidebar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: theme.spacing(5),
    width: theme.dimensions.sidebarWidth,
    position: 'relative',
    zIndex: 1,
    [theme.breakpoints.down('lg')]: {
      width: theme.dimensions.sidebarWidthTablet,
    },
    [theme.breakpoints.down('sm')]: {
      width: '0px',
    },
  },
  paper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'start',
    flex: 1,
    backgroundColor: 'transparent',
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    [theme.breakpoints.up('lg')]: {
      padding: theme.spacing(0, 25, 0, 0),
      paddingLeft: theme.spacing(10),
    },
    [theme.breakpoints.down('lg')]: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing(2),
    },
  },
  form: {
    maxWidth: theme.spacing(52),
    padding: theme.spacing(5),
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      maxWidth: '100%',
      padding: theme.spacing(3),
    },
  },
}));

const LoginLayout = ({ children }) => {
  const classes = useStyles();
  const theme = useTheme();

  return (
    <main className={classes.root}>
      <div className={classes.backgroundContainer}>
        <img
          src={bgImage}
          alt="Background"
          className={classes.backgroundImage}
        />
        <div className={classes.gradientOverlay} />
        <div className={classes.dotPattern} />
      </div>
      <Paper className={classes.paper}>
        <form className={classes.form}>
          {children}
        </form>
      </Paper>
    </main>
  );
};

export default LoginLayout;
