import React, { useEffect, useState } from 'react';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Button,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation, useTranslationKeys } from '../common/components/LocalizationProvider';
import EditItemView from './components/EditItemView';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import SelectField from '../common/components/SelectField';
import SettingsMenu from './components/SettingsMenu';
import { useCatch } from '../reactHelper';
import useSettingsStyles from './common/useSettingsStyles';

const NotificationPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();
  const [item, setItem] = useState();
  const [tourType, setTourType] = useState(null);
  const currentType = tourType ?? item?.type;
  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));

  const zoneTypes = [
    { key: 'geofence', name: 'Geofence' },
    { key: 'city', name: 'City' },
    { key: 'state', name: 'State' },
    { key: 'country', name: 'Country' },
  ];

  const violationTypes = [
    { key: 'enter', name: 'Enter' },
    { key: 'exit', name: 'Exit' },
  ];

  const excludedTypes = ['geofenceEnter', 'geofenceExit', 'deviceRegionCountryEnter', 'deviceRegionCountryExit', 'deviceRegionStateEnter', 'deviceRegionStateExit', 'deviceRegionCityEnter', 'deviceRegionCityExit'];

  const testNotificators = useCatch(async () => {
    await Promise.all(item.notificators.split(/[, ]+/).map(async (notificator) => {
      const response = await fetch(`/api/notifications/test/${notificator}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        throw Error(await response.text());
      }
    }));
  });

  const validate = () => item && item.type && item.notificators && (!item.notificators?.includes('command') || item.commandId);

  const getFirstValue = (value) => {
    if (!value) return '';
    const values = value.split(/[, ]+/);
    return values[0] || '';
  };

  const roundedFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '13px',
      '& fieldset': { borderRadius: '13px', borderColor: 'rgba(255,255,255,0.23)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  };

  useEffect(() => {
    const start = () => setTourType("zoneViolation");
    const end = () => setTourType(null);
    window.addEventListener("zoneViolationDemo", start);
    window.addEventListener("zoneViolationDemoEnd", end);
    return () => {
      window.removeEventListener("zoneViolationDemo", start);
      window.removeEventListener("zoneViolationDemoEnd", end);
    };

  }, []);

  return (
    <EditItemView
      endpoint="notifications"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedNotification']}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t('sharedRequired')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <div id='notification-alarm-type'>
                <SelectField
                  fullWidth
                  value={currentType}
                  onChange={(e) => {
                    setTourType(null);
                    setItem({ ...item, type: e.target.value })
                  }
                  }
                  endpoint="/api/notifications/types"
                  keyGetter={(it) => it.type}
                  titleGetter={(it) => t(prefixString('event', it.type))}
                  label={t('sharedType')}
                  filter={(types) => types.filter((type) => !excludedTypes.includes(type.type))}
                />
              </div>
              {currentType === 'alarm' && (
                <SelectField
                  multiple
                  value={item.attributes && item.attributes.alarms ? item.attributes.alarms.split(/[, ]+/) : []}
                  onChange={(e) => setItem({ ...item, attributes: { ...item.attributes, alarms: e.target.value.join() } })}
                  data={alarms}
                  keyGetter={(it) => it.key}
                  label={t('sharedAlarms')}
                />
              )}
              {(currentType === "zoneViolation" || tourType === "zoneViolation") && (
                <div id='notification-zone-type'>
                  <SelectField
                    fullWidth
                    value={getFirstValue(item.attributes?.zoneTypes || '')}
                    onChange={(e) => setItem({
                      ...item,
                      attributes: { ...item.attributes, zoneTypes: e.target.value }
                    })}
                    data={zoneTypes}
                    keyGetter={(it) => it.key}
                    titleGetter={(it) => it.name}
                    label={t('alarmZoneType')}
                  />
                </div>
              )}
              {(currentType === "zoneViolation" || tourType === "zoneViolation") && (

                <div id='notification-violation-type'>
                  <SelectField
                    fullWidth
                    value={getFirstValue(item.attributes?.violationTypes || '')}
                    onChange={(e) => setItem({ ...item, attributes: { ...item.attributes, violationTypes: e.target.value } })}
                    data={violationTypes}
                    keyGetter={(it) => it.key}
                    titleGetter={(it) => it.name}
                    label={t('alarmViolationType')}
                  />
                </div>
              )}
              <SelectField
                multiple
                value={item.notificators ? item.notificators.split(/[, ]+/) : []}
                onChange={(e) => setItem({ ...item, notificators: e.target.value.join() })}
                endpoint="/api/notifications/notificators"
                keyGetter={(it) => it.type}
                titleGetter={(it) => t(prefixString('notificator', it.type))}
                label={t('notificationNotificators')}
              />
              {item.notificators?.includes('command') && (
                <SelectField
                  value={item.commandId}
                  onChange={(e) => setItem({ ...item, commandId: Number(e.target.value) })}
                  endpoint="/api/commands"
                  titleGetter={(it) => it.description}
                  label={t('sharedSavedCommand')}
                />
              )}
              <Button
                variant="outlined"
                color="primary"
                onClick={testNotificators}
                disabled={!item.notificators}
              >
                {t('sharedTestNotificators')}
              </Button>
              <FormGroup>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={item.always}
                      onChange={(e) => setItem({ ...item, always: e.target.checked })}
                    />
                  )}
                  label={t('notificationAlways')}
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t('sharedExtra')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.description || ''}
                onChange={(e) => setItem({ ...item, description: e.target.value })}
                label={t('sharedDescription')}
                sx={roundedFieldSx}
              />
              <SelectField
                value={item.calendarId}
                onChange={(e) => setItem({ ...item, calendarId: Number(e.target.value) })}
                endpoint="/api/calendars"
                label={t('sharedCalendar')}
              />
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </EditItemView>
  );
};

export default NotificationPage;
