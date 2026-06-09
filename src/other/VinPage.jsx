import React, { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditItemView from '../settings/components/EditItemView';
import { useTranslation } from '../common/components/LocalizationProvider';
import SettingsMenu from '../settings/components/SettingsMenu';
import useSettingsStyles from '../settings/common/useSettingsStyles';

const VinPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();

  const [item, setItem] = useState(null);

  const validate = () => item && item.vin && item.uniqueId;

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
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedVin']}
    >
      {item && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">VIN & IMEI</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <TextField
              value={item.vin || ''}
              onChange={(event) => setItem({ ...item, vin: event.target.value })}
              label={t('deviceVinNumber')}
              sx={roundedFieldSx}
            />
            <TextField
              value={item.uniqueId || ''}
              onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
              label={t('deviceIdentifier')}
              helperText={t('deviceIdentifierHelp')}
              sx={roundedFieldSx}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </EditItemView>
  );
};

export default VinPage;