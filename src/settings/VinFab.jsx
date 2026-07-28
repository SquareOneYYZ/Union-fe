import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import { makeStyles } from '@mui/styles';
import CloseIcon from '@mui/icons-material/Close';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  speedDial: {
    position: 'fixed',
    bottom: theme.spacing(7),
    right: theme.spacing(2),
    zIndex: theme.zIndex.speedDial,
    '& .MuiFab-primary': {
      width: 52,
      height: 52,
      boxShadow: '0px 4px 16px rgba(0,0,0,0.35)',
    },
  },
}));

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
  const t = useTranslation();

  const actions = [
    {
      icon: <PhoneAndroidIcon fontSize="small" />,
      name: t('sharedDeviceAdd'),
      route: '/settings/device',
    },
    {
      icon: <DirectionsCarIcon fontSize="small" />,
      name: t('sharedVinAdd'),
      route: '/vin',
    },
  ];

  return (
    <SpeedDial
      ariaLabel={t('quickAccessActions')}
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
