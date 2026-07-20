import React, { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'center',
    // Responsive gap adjustments
    [theme.breakpoints.down('sm')]: {
      gap: theme.spacing(0.75),
    },
    [theme.breakpoints.down('xs')]: {
      gap: theme.spacing(0.5),
    },
  },
  input: {
    width: '48px',
    height: '56px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: '600',
    border: '1px solid #545454',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: '#212121',
    color: theme.palette.text.primary,
    outline: 'none',
    transition: 'all 0.2s',
    // Responsive sizing
    [theme.breakpoints.down('sm')]: {
      width: '42px',
      height: '50px',
      fontSize: '18px',
    },
    [theme.breakpoints.down('xs')]: {
      width: '36px',
      height: '44px',
      fontSize: '16px',
    },
    // Smaller devices (very small phones)
    '@media (max-width: 360px)': {
      width: '32px',
      height: '40px',
      fontSize: '14px',
    },
    '&:hover': {
      borderColor: '#ffff',
    },
    '&:focus': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
    '&:disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      cursor: 'not-allowed',
    },
  },
  inputError: {
    borderColor: theme.palette.error.main,
  },
  labelText: {
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    // Responsive font size
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.875rem',
    },
    [theme.breakpoints.down('xs')]: {
      fontSize: '0.8125rem',
    },
  },
}));

const OTPInput = ({ value = '', onChange, error = false, disabled = false }) => {
  const classes = useStyles();
  const inputRefs = useRef([]);
  const [otp, setOtp] = useState(value.split('').slice(0, 6));

  if (inputRefs.current.length !== 6) {
    inputRefs.current = Array(6).fill(null);
  }

  const handleChange = (index, newValue) => {
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);
    onChange(newOtp.join(''));

    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        handleChange(index, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      onChange(pastedData);
      inputRefs.current[5]?.focus();
    }
  };

  const handleFocus = (index) => {
    inputRefs.current[index]?.select();
  };

  return (
    <Box>
      <Typography
        variant="body2"
        className={classes.labelText}
        sx={{
          color: error ? 'error.main' : 'text.secondary',
        }}
      >
        * One-time Password Code
      </Typography>

      <Box className={classes.container}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`${classes.input} ${error ? classes.inputError : ''}`}
            autoComplete="off"
          />
        ))}
      </Box>
    </Box>
  );
};

export default OTPInput;
