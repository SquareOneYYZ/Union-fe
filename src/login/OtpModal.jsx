import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, IconButton, Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import makeStyles from '@mui/styles/makeStyles';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  title: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(2, 3),
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginTop: theme.spacing(3),
    padding: theme.spacing(2, 3),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 1.5),
    },
  },
  pill: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.action.hover,
    border: `3px solid ${theme.palette.divider}`,
    borderRadius: 10,
    padding: theme.spacing(1.5, 2.5),
    boxSizing: 'border-box',
    cursor: 'text',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    '&:focus-within': {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 3px ${theme.palette.primary.main}22`,
    },
  },
  pillError: {
    borderColor: `${theme.palette.error.main} !important`,
    boxShadow: `0 0 0 3px ${theme.palette.error.main}22 !important`,
  },
  pillShake: {
    animation: '$shake 0.5s ease',
  },
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '15%': { transform: 'translateX(-6px)' },
    '30%': { transform: 'translateX(6px)' },
    '45%': { transform: 'translateX(-5px)' },
    '60%': { transform: 'translateX(5px)' },
    '75%': { transform: 'translateX(-3px)' },
    '90%': { transform: 'translateX(3px)' },
  },
  hiddenInput: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'text',
    zIndex: 1,
    fontSize: 16,
    border: 'none',
    background: 'transparent',
  },
  displayRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 0,
    gap: theme.spacing(4),
  },
  group: {
    display: 'flex',
    gap: theme.spacing(1.5),
  },
  digitSlot: {
    width: 'clamp(22px, 6vw, 30px)',
    height: 'clamp(36px, 10vw, 44px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(18px, 4vw, 22px)',
    fontWeight: 900,
    color: theme.palette.text.primary,
    userSelect: 'none',
  },
  digitSlotError: {
    color: theme.palette.error.main,
  },
  pillCursor: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: theme.palette.primary.main,
    animation: '$blink 1s step-end infinite',
    pointerEvents: 'none',
    zIndex: 0,
  },
  slotCursor: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: theme.palette.primary.main,
    animation: '$blink 1s step-end infinite',
  },
  '@keyframes blink': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0 },
  },
  dotsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(4),
    marginTop: theme.spacing(0.5),
    pointerEvents: 'none',
  },
  dotGroup: {
    display: 'flex',
    gap: theme.spacing(1.5),
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    transition: 'background-color 0.15s',
  },
  dotEmpty: {
    backgroundColor: theme.palette.divider,
  },
  dotError: {
    backgroundColor: theme.palette.error.main,
  },
  actions: {
    padding: theme.spacing(2, 3),
    gap: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
      padding: theme.spacing(1.5, 2),
      '& > button': { width: '100%', margin: '0 !important' },
    },
  },
}));

const OTP_LENGTH = 6;

const OtpModal = ({ open, onClose, onSubmit, error }) => {
  const classes = useStyles();
  const t = useTranslation();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (error) {
      setShakeKey((k) => k + 1);
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [error]);

  const handleSubmit = () => onSubmit(value);

  const handleChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setValue(clean);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.length === OTP_LENGTH) handleSubmit();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    setValue(pasted);
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  const renderGroup = (start, end) => (
    <div className={classes.group}>
      {Array.from({ length: end - start }).map((_, i) => {
        const index = start + i;
        const char = value[index] || '';
        const isCursorSlot = focused && value.length === index && index > 0;
        return (
          <div
            key={index}
            className={[
              classes.digitSlot,
              error ? classes.digitSlotError : '',
            ].join(' ')}
          >
            {char || (isCursorSlot ? <span className={classes.slotCursor} /> : null)}
          </div>
        );
      })}
    </div>
  );

  const renderDotGroup = (start, end) => (
    <div className={classes.dotGroup}>
      {Array.from({ length: end - start }).map((_, i) => {
        const index = start + i;
        const filled = !!value[index];
        return (
          <div
            key={index}
            className={[
              classes.dot,
              !filled ? classes.dotEmpty : '',
              error ? classes.dotError : '',
            ].join(' ')}
          />
        );
      })}
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      BackdropProps={{ sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' } }}
      PaperProps={{ sx: { mx: { xs: 2, sm: 4 } } }}
    >
      <DialogTitle disableTypography className={classes.title}>
        <Typography variant="h6">{t('loginTotpCode')}</Typography>
        <IconButton size="small" onClick={handleClose} style={{ color: 'inherit' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent className={classes.content}>
        <Typography variant="body2" color="textSecondary" align="center">
          Enter the 6-digit code from your authenticator app.
        </Typography>

        <Box
          key={shakeKey}
          className={[
            classes.pill,
            error ? classes.pillError : '',
            error ? classes.pillShake : '',
          ].join(' ')}
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            className={classes.hiddenInput}
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={value}
          // eslint-disable-next-line
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />

          {focused && value.length === 0 && (
            <span className={classes.pillCursor} />
          )}

          <div className={classes.displayRow}>
            {renderGroup(0, 3)}
            {renderGroup(3, 6)}
          </div>
        </Box>

        <Box className={classes.dotsRow}>
          {renderDotGroup(0, 3)}
          {renderDotGroup(3, 6)}
        </Box>

        {error && (
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }} variant="caption" color="error">
            Invalid or expired code. Please try again.
          </Typography>
        )}
      </DialogContent>

      <DialogActions className={classes.actions}>
        <Button variant="outlined" onClick={handleClose} color="primary">{t('sharedCancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={error ? 'error' : 'primary'}
          disabled={value.length !== OTP_LENGTH}
        >
          {error ? t('loginRetry') : t('loginLogin')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OtpModal;
