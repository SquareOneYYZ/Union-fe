import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import TextField from '@mui/material/TextField';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditItemView from './components/EditItemView';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import { useTranslation } from '../common/components/LocalizationProvider';
import SettingsMenu from './components/SettingsMenu';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useGroupAttributes from '../common/attributes/useGroupAttributes';
import { useCatch } from '../reactHelper';
import { groupsActions } from '../store';
import useSettingsStyles from './common/useSettingsStyles';

const GroupPage = () => {
  const classes = useSettingsStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const groupAttributes = useGroupAttributes(t);
  const [item, setItem] = useState();
  const admin = useAdministrator();


  const onItemSaved = useCatch(async () => {
    const response = await fetch('/api/groups');
    if (response.ok) {
      dispatch(groupsActions.refresh(await response.json()));
    } else {
      throw Error(await response.text());
    }
  });

  const validate = () => item && item.name;

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
      endpoint="groups"
      item={item}
      setItem={setItem}
      validate={validate}
      onItemSaved={onItemSaved}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'groupDialog']}
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
              {admin && (
                <SelectField
                  value={item.organizationId || ''}
                  onChange={(event) => setItem({ ...item, organizationId: event.target.value })}
                  endpoint="/api/organization"
                  label="Organization"
                />
              )}
            </AccordionDetails>
          </Accordion>
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...groupAttributes }}
          />
        </>
      )}
    </EditItemView>
  );
};

export default GroupPage;
