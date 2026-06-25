import {
  Snackbar, Alert, Dialog, DialogContent, DialogContentText, DialogActions, Typography,
  Button,
  Link,
} from '@mui/material';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePrevious } from '../../reactHelper';
import { errorsActions } from '../../store';
import { useAdministrator } from '../util/permissions';
import { useTranslation } from './LocalizationProvider';
import mapError from '../util/errorMapper';

const ErrorHandler = () => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const admin = useAdministrator();

  const error = useSelector((state) => state.errors.errors.find(() => true));
  const cachedError = usePrevious(error);

  const rawMessage = error || cachedError;
  const userMessage = mapError(rawMessage) ?? null;

  const [expanded, setExpanded] = useState(false);

  if (!userMessage) return null; // silent errors (e.g. 404 with no message)

  return (
    <>
      <Snackbar open={Boolean(error) && !expanded}>
        <Alert
          elevation={6}
          onClose={() => dispatch(errorsActions.pop())}
          severity="error"
          variant="filled"
        >
          {userMessage}
          {admin && rawMessage?.includes('\n') && (
            <>
              {' '}
              <Link color="inherit" href="#" onClick={() => setExpanded(true)}>
                {t('sharedShowDetails')}
              </Link>
            </>
          )}
        </Alert>
      </Snackbar>
      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth={false}
      >
        <DialogContent>
          <DialogContentText>
            <Typography variant="caption">
              <pre>{rawMessage}</pre>
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpanded(false)} autoFocus>{t('sharedHide')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ErrorHandler;