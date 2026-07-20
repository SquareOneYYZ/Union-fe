import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Button,
  Slider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { prefixString } from '../common/util/stringUtils';
import EditItemView from './components/EditItemView';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import SettingsMenu from './components/SettingsMenu';
import useSettingsStyles from './common/useSettingsStyles';

const DriverBehaviourPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();
  const navigate = useNavigate();

  const positionAttributes = usePositionAttributes(t);

  const [item, setItem] = useState();
  const [labels, setLabels] = useState({ start: '', period: '' });

  const speedUnit = useAttributePreference('speedUnit', 'kn');
  const distanceUnit = useAttributePreference('distanceUnit', 'km');

  useEffect(() => {
    const attribute = positionAttributes[item?.type];
    if (item?.type?.endsWith('Time')) {
      setLabels({ ...labels, start: null, period: t('sharedDays') });
    } else if (attribute && attribute.dataType) {
      switch (attribute.dataType) {
        case 'speed':
          setLabels({
            ...labels,
            start: t(prefixString('shared', speedUnit)),
            period: t(prefixString('shared', speedUnit)),
          });
          break;
        case 'distance':
          setLabels({
            ...labels,
            start: t(prefixString('shared', distanceUnit)),
            period: t(prefixString('shared', distanceUnit)),
          });
          break;
        case 'hours':
          setLabels({
            ...labels,
            start: t('sharedHours'),
            period: t('sharedHours'),
          });
          break;
        default:
          setLabels({ ...labels, start: null, period: null });
          break;
      }
    } else {
      setLabels({ ...labels, start: null, period: null });
    }
  }, [item?.type]);

  const validate = () =>
    item && item.name && item.type && item.start && item.period;

  const handleSave = () => {
    console.log('Details:', item);
    navigate('/settings/behaviours');
  };

  return (
    <EditItemView
      endpoint="behaviour"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedDriverBehaviour']}
    >
      {item && (
        <>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Option</InputLabel>
            <Select
              label="Select Option"
              value={item.selection || ''}
              onChange={(e) => setItem({ ...item, selection: e.target.value })}
            >
              <MenuItem value="drivers">Drivers</MenuItem>
              <MenuItem value="groups">Groups</MenuItem>
            </Select>
          </FormControl>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Harsh Driving</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Enable harsh driving detection</InputLabel>
                <Select
                  label="Enable harsh driving detection"
                  value={item.enable || ''}
                  onChange={(e) => setItem({ ...item, enable: e.target.value })}
                >
                  <MenuItem value="enable">Enable</MenuItem>
                  <MenuItem value="disable">Disable</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Source</InputLabel>
                <Select
                  label="Source"
                  value={item.source || ''}
                  onChange={(e) => setItem({ ...item, source: e.target.value })}
                >
                  <MenuItem value="accelerometer">Accelerometer</MenuItem>
                  <MenuItem value="gps">GPS</MenuItem>
                </Select>
              </FormControl>

              {/* Sliders */}
              <Typography>
                Acceleration:
                {' '}
                {item.acceleration || 0}
                {' '}
                ft/s²
              </Typography>
              <Slider
                min={0}
                max={20}
                step={0.1}
                value={item.acceleration || 0}
                onChange={(_, val) => setItem({ ...item, acceleration: val })}
              />
              <Typography>
                Braking:
                {item.braking || 0}
                {' '}
                ft/s²
              </Typography>
              <Slider
                min={0}
                max={20}
                step={0.1}
                value={item.braking || 0}
                onChange={(_, val) => setItem({ ...item, braking: val })}
              />
              <Typography>
                Turns:
                {item.turns || 0}
                {' '}
                ft/s²
              </Typography>
              <Slider
                min={0}
                max={20}
                step={0.1}
                value={item.turns || 0}
                onChange={(_, val) => setItem({ ...item, turns: val })}
              />
            </AccordionDetails>
          </Accordion>

          {/* <div style={{ marginTop: 16 }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ mr: 1 }}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div> */}
        </>
      )}
    </EditItemView>
  );
};

export default DriverBehaviourPage;
