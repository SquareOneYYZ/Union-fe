import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import { makeStyles } from '@mui/styles';
import CloseIcon from '@mui/icons-material/Close';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const useStyles = makeStyles((theme) => ({
  speedDial: {
    position: 'fixed',
    bottom: theme.spacing(10),
    right: theme.spacing(2),
    zIndex: theme.zIndex.speedDial,
    '& .MuiFab-primary': {
      width: 52,
      height: 52,
      boxShadow: '0px 4px 16px rgba(0,0,0,0.35)',
    },
  },
}));

const actions = [
  {
    icon: <PhoneAndroidIcon fontSize="small" />,
    name: 'Add Device',
    route: '/settings/device',
  },
  {
    icon: <DirectionsCarIcon fontSize="small" />,
    name: 'Add VIN & IMEI',
    route: '/vin',
  },
];

const actionSx = {
  '& .MuiSpeedDialAction-staticTooltipLabel': {
    whiteSpace: 'nowrap !important',
    maxWidth: 'unset !important',
    width: 'max-content !important',
    minWidth: 'max-content !important',
    overflow: 'visible !important',
    wordBreak: 'keep-all !important',
  },
  '& .MuiFab-root': {
    width: 44,
    height: 44,
  },
};

const VinFab = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <SpeedDial
      ariaLabel="Quick access actions"
      className={classes.speedDial}
      icon={<SpeedDialIcon openIcon={<CloseIcon />} />}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      direction="up"
    >
      {actions.map((action) => (
        <SpeedDialAction
          key={action.name}
          icon={action.icon}
          tooltipTitle={action.name}
          tooltipOpen
          sx={actionSx}
          onClick={() => {
            setOpen(false);
            navigate(action.route);
          }}
        />
      ))}
    </SpeedDial>
  );
};

export default VinFab;