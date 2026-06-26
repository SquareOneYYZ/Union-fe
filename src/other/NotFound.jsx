import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { makeStyles } from '@mui/styles';
import {
  Button,
  Container,
  Typography,
} from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(2),
    textAlign: 'center',
  },
  icon: {
    fontSize: '5rem',
    color: theme.palette.text.secondary,
  },
  path: {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.action.hover,
    padding: theme.spacing(0.5, 1.5),
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.secondary,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1),
  },
}));

const NotFoundPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useTranslation();

  return (
    <Container className={classes.root}>
      <div className={classes.content}>
        <SearchOffIcon className={classes.icon} />
        <Typography variant="h5" fontWeight={500}>
          {t('errorPageNotFound')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('errorPageNotFoundDescription')}
        </Typography>
        <Typography className={classes.path} variant="caption">
          {pathname}
        </Typography>
        <div className={classes.actions}>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            {t('errorPageGoHome')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
          >
            {t('errorPageGoBack')}
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default NotFoundPage;