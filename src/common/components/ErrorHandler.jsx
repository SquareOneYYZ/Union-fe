import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import { usePrevious } from '../../reactHelper';
import { errorsActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import mapError from '../util/errorMapper';

const ErrorHandler = () => {
  const dispatch = useDispatch();
  const t = useTranslation();

  const error = useSelector((state) => state.errors.errors.find(() => true));
  const cachedError = usePrevious(error);

  const current = error || cachedError;

  const rawMessage = typeof current === 'string' ? current : current?.message;
  const status = typeof current === 'string' ? undefined : current?.status;

  const userMessage = mapError(rawMessage, status) ?? null;

  if (!userMessage) return null;

  const handleClose = () => dispatch(errorsActions.pop());

  return (
    <Dialog
      open={Boolean(error)}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        elevation: 6,
        sx: {
          borderRadius: 2,
          borderLeft: '4px solid',
          borderColor: 'error.main',
          px: 0,
          py: 0,
          overflow: 'hidden',
        },
      }}
    >
      {/* Close button top right */}
      <IconButton
        onClick={handleClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'text.secondary',
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ pt: 2.5, pb: 1, px: 2.5 }}>
        {/* Icon + Title row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            Something went wrong
          </Typography>
        </Box>

        {/* Message */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6, pl: 0.5 }}
        >
          {userMessage}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'flex-start', px: 2.5, pb: 2, pt: 0.5, gap: 0.5 }}>
        <Button
          onClick={handleClose}
          size="small"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: 'error.main',
            minWidth: 'unset',
            px: 1,
            '&:hover': { backgroundColor: 'error.light' },
          }}
        >
          Retry
        </Button>
        <Button
          onClick={handleClose}
          size="small"
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            color: 'text.secondary',
            minWidth: 'unset',
            px: 1,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          {t('sharedHide') || 'Dismiss'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorHandler;