import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { makeStyles } from '@mui/styles';
import {
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    minWidth: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: theme.spacing(6, 5),
    backgroundColor: theme.palette.background.default,
    border:'1px solid ' + theme.palette.divider,
    width: '100%',
    maxWidth: 480,
    gap: theme.spacing(1.5),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(4, 3),
    },
  },
  code: {
    fontSize: 'clamp(80px, 18vw, 140px)',
    fontWeight: 700,
    lineHeight: 1,
    color: theme.palette.text.disabled,
    marginBottom: theme.spacing(0.5),
  },
  title: {
    fontWeight: 700,
    color: theme.palette.text.primary,
    fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
  },
  description: {
    color: theme.palette.text.secondary,
    fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
    maxWidth: 340,
  },
  pill: {
    fontFamily: 'monospace',
    fontSize: 'clamp(0.7rem, 2vw, 0.85rem)',
    backgroundColor: theme.palette.action.selected,
    color: theme.palette.text.secondary,
    padding: theme.spacing(0.5, 1.5),
    borderRadius: theme.spacing(1),
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
    wordBreak: 'break-all',
    maxWidth: '100%',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    width: '100%',
    marginTop: theme.spacing(1),
  },
  button: {
    padding: theme.spacing(1.5, 2),
    fontSize: '1rem',
    textTransform: 'none',
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.9rem',
    },
  },
}));

const NotFoundPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useTranslation();

  return (
    <Container disableGutters className={classes.root}>
      <Paper elevation={0} className={classes.card}>
        <Typography className={classes.code}>
          404
        </Typography>

        <Typography variant="h5" className={classes.title}>
          {t('errorPageNotFound')}
        </Typography>

        <Typography variant="body2" className={classes.description}>
          {t('errorPageNotFoundDescription')}
        </Typography>

        <Typography className={classes.pill}>
          {pathname}
        </Typography>

        <div className={classes.actions}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<HomeIcon />}
            className={classes.button}
            onClick={() => navigate('/')}
          >
            {t('errorPageGoHome')}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ArrowBackIcon />}
            className={classes.button}
            onClick={() => navigate(-1)}
          >
            {t('errorPageGoBack')}
          </Button>
        </div>
      </Paper>
    </Container>
  );
};

export default NotFoundPage;