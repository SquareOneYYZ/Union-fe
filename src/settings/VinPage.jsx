import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import TextField from '@mui/material/TextField';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditItemView from './components/EditItemView';
import { useTranslation } from '../common/components/LocalizationProvider';
import SettingsMenu from './components/SettingsMenu';
import useSettingsStyles from './common/useSettingsStyles';

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const IMEI_REGEX = /^[0-9]{15}$/;

const VinPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();

  const userOrganizationId = useSelector((state) => state.session.user?.organizationId);

  const [item, setItem] = useState();

  const vinError = item && item.vin && !VIN_REGEX.test(item.vin);
  const imeiError = item && item.imei && !IMEI_REGEX.test(item.imei);

  const validate = () => (
    item
    && VIN_REGEX.test(item.vin || '')
    && IMEI_REGEX.test(item.imei || '')
  );

  const roundedFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '13px',
      '& fieldset': { borderRadius: '13px', borderColor: 'rgba(255,255,255,0.23)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  };

  return (
    <EditItemView
      endpoint="vinmappings"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedVin']}
    >
      {item && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details} style={{gap: '0px' }}>
            <TextField
              value={item.vin || ''}
              onChange={(event) => setItem({
                ...item,
                vin: event.target.value.toUpperCase(),
                organizationId: item.organizationId ?? userOrganizationId,
              })}
              label={t('deviceVinNumber')}
              error={!!vinError}
              helperText={vinError ? 'VIN must be 17 characters (A-Z, 0-9, excluding I, O, Q)' : ' '}
              inputProps={{ maxLength: 17 }}
              sx={roundedFieldSx}
            />
            <TextField
              value={item.imei || ''}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, '');
                setItem({
                  ...item,
                  imei: digitsOnly,
                  organizationId: item.organizationId ?? userOrganizationId,
                });
              }}
              label="IMEI"
              error={!!imeiError}
              helperText={imeiError ? 'IMEI must be exactly 15 digits' : ' '}
              inputProps={{ maxLength: 15, inputMode: 'numeric' }}
              sx={roundedFieldSx}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </EditItemView>
  );
};

export default VinPage;