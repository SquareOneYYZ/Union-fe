import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
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

  // Support both legacy string and new { message, status } object
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
          borderRadius: 3,
          px: 1,
          py: 2,
          textAlign: 'center',
        },
      }}
    >
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          pb: 1,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#ff3d3d6b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 0.5,
          }}
        >
          <WarningAmberRoundedIcon sx={{ color: 'error.contrastText', fontSize: 38, marginTop: -0.5 }} />
        </Box>

        <Typography variant="h6" fontWeight={700} color="text.primary">
          Something went wrong
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.7, maxWidth: 260, mx: 'auto' }}
        >
          {userMessage}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pt: 1, pb: 1.5 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          size="medium"
          sx={{
            minWidth: 120,
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'text.secondary',
              backgroundColor: 'action.hover',
            },
          }}
        >
          {t('sharedHide') || 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorHandler;