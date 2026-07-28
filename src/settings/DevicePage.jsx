import React, { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Autocomplete,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DropzoneArea } from 'react-mui-dropzone';
import EditItemView from './components/EditItemView';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import { useAdministrator } from '../common/util/permissions';
import SettingsMenu from './components/SettingsMenu';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import { useCatch } from '../reactHelper';
import useQuery from '../common/util/useQuery';
import useSettingsStyles from './common/useSettingsStyles';

const DevicePage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();
  const admin = useAdministrator();
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);
  const query = useQuery();
  const uniqueId = query.get('uniqueId');

  const [item, setItem] = useState(uniqueId ? { uniqueId } : null);
  const [vinDecodedData, setVinDecodedData] = useState(null);

  const handleFiles = useCatch(async (files) => {
    if (files.length > 0) {
      const response = await fetch(`/api/devices/${item.id}/image`, {
        method: 'POST',
        body: files[0],
      });
      if (response.ok) {
        setItem({
          ...item,
          attributes: {
            ...item.attributes,
            deviceImage: await response.text(),
          },
        });
      } else {
        throw Error(await response.text());
      }
    }
  });

  const validate = () => item && item.name && item.uniqueId;

  const roundedFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '13px',
      '& fieldset': { borderRadius: '13px', borderColor: 'rgba(255,255,255,0.23)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  };

  const renderVinAutocomplete = (field, labelKey, suggestedValue) => {
    const options = suggestedValue ? [suggestedValue] : [];

    return (
      <Autocomplete
        freeSolo
        options={options}
        value={item[field] || ''}
        sx={roundedFieldSx}
        onChange={(event, newValue) => {
          setItem((prev) => ({ ...prev, [field]: newValue || '' }));
        }}
        onInputChange={(event, newInputValue) => {
          setItem((prev) => ({ ...prev, [field]: newInputValue }));
        }}
        renderOption={(props, option) => (
          <li {...props}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
            }}
            >
              <span style={{
                fontSize: '0.9rem',
                color: '#fff',
              }}
              >
                {option}
              </span>
              <Chip
                label={t('vinSuggestion')}
                size="small"
                sx={{
                  backgroundColor: 'transparent',
                  border: '1px solid #4caf50',
                  color: '#4caf50',
                  fontSize: '0.75rem',
                  height: '24px',
                  '& .MuiChip-label': {
                    padding: '0 8px',
                  },
                }}
              />
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t(labelKey)}
          />
        )}
      />
    );
  };

  return (
    <EditItemView
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedDevice']}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.name || ''}
                onChange={(event) => setItem({ ...item, name: event.target.value })}
                label={t('sharedName')}
                sx={roundedFieldSx}
              />
              <TextField
                value={item.uniqueId || ''}
                onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                label={t('deviceIdentifier')}
                helperText={t('deviceIdentifierHelp')}
                disabled={!admin || Boolean(uniqueId)}
                sx={roundedFieldSx}

              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedExtra')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <SelectField
                value={item.groupId}
                onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                endpoint="/api/groups"
                label={t('groupParent')}
              />
              <TextField
                value={item.phone || ''}
                onChange={(event) => setItem({ ...item, phone: event.target.value })}
                label={t('sharedPhone')}
                sx={roundedFieldSx}

              />
              <TextField
                value={item.license || ''}
                onChange={(event) => setItem({ ...item, license: event.target.value })}
                label={t('deviceLicenseNumber')}
                sx={roundedFieldSx}

              />

              <SelectField
                value={item.vin || ''}
                onChange={(event) => {
                  const { value: newVin, vinData } = event.target;
                  if (vinData) {
                    setVinDecodedData(vinData);
                  }
                  setItem((prev) => ({ ...prev, vin: newVin.replace(/\*/g, '') }));
                }}
                label={t('deviceVinNumber')}
                isVinField
                vinApiEndpoint="/api/devices/Vindecoder"
                fullWidth
              />
              {renderVinAutocomplete('make', 'deviceMake', vinDecodedData?.make)}
              {renderVinAutocomplete('manufacturer', 'deviceManufacturer', vinDecodedData?.manufacturer)}
              {renderVinAutocomplete('model', 'deviceModel', vinDecodedData?.model)}
              {renderVinAutocomplete('modelYear', 'deviceModelYear', vinDecodedData?.modelYear)}
              {renderVinAutocomplete('trim', 'deviceTrim', vinDecodedData?.trim)}
              {renderVinAutocomplete('bodyClass', 'deviceBodyClass', vinDecodedData?.bodyClass)}
              {renderVinAutocomplete('vehicleType', 'deviceVehicleType', vinDecodedData?.vehicleType)}
              {renderVinAutocomplete('displacementL', 'deviceDisplacementL', vinDecodedData?.displacementL)}
              {renderVinAutocomplete('engineCylinders', 'deviceEngineCylinders', vinDecodedData?.engineCylinders)}
              {renderVinAutocomplete('engineHP', 'deviceEngineHP', vinDecodedData?.engineHP)}
              {renderVinAutocomplete('driveType', 'deviceDriveType', vinDecodedData?.driveType)}
              {renderVinAutocomplete('fuelTypePrimary', 'deviceFuelTypePrimary', vinDecodedData?.fuelTypePrimary)}
              {renderVinAutocomplete('batteryType', 'deviceBatteryType', vinDecodedData?.batteryType)}

              <TextField
                value={item.contact || ''}
                onChange={(event) => setItem({ ...item, contact: event.target.value })}
                label={t('deviceContact')}
                sx={roundedFieldSx}

              />
              <SelectField
                value={item.category || 'default'}
                onChange={(event) => setItem({ ...item, category: event.target.value })}
                data={deviceCategories
                  .map((category) => ({
                    id: category,
                    name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
                label={t('deviceCategory')}
              />
              <SelectField
                value={item.calendarId}
                onChange={(event) => setItem({ ...item, calendarId: Number(event.target.value) })}
                endpoint="/api/calendars"
                label={t('sharedCalendar')}
              />
              {admin && (
                <SelectField
                  value={item.organizationId || ''}
                  onChange={(event) => setItem({ ...item, organizationId: event.target.value })}
                  endpoint="/api/organization"
                  label="Organization"
                />
              )}
              {admin && (
                <>
                  <TextField
                    label={t('userExpirationTime')}
                    type="date"
                    value={item.expirationTime ? item.expirationTime.split('T')[0] : '2099-01-01'}
                    onChange={(e) => {
                      if (e.target.value) {
                        setItem({ ...item, expirationTime: new Date(e.target.value).toISOString() });
                      }
                    }}
                    sx={roundedFieldSx}
                  />
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={item.disabled}
                        onChange={(event) => setItem({ ...item, disabled: event.target.checked })}
                      />
                    )}
                    label={t('sharedDisabled')}
                  />
                </>
              )}
            </AccordionDetails>
          </Accordion>

          {item.id && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('attributeDeviceImage')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <DropzoneArea
                  dropzoneText={t('sharedDropzoneText')}
                  acceptedFiles={['image/*']}
                  filesLimit={1}
                  onChange={handleFiles}
                  showAlerts={false}
                  maxFileSize={500000}
                  sx={roundedFieldSx}

                />
              </AccordionDetails>
            </Accordion>
          )}

          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
          />
        </>
      )}
    </EditItemView>
  );
};

export default DevicePage;
