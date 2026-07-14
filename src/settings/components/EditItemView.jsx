import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Container, Button, Accordion, AccordionDetails, AccordionSummary,
  Skeleton, Typography, TextField,
} from '@mui/material';
import { useCatch, useEffectAsync } from '../../reactHelper';
import { useTranslation } from '../../common/components/LocalizationProvider';
import PageLayout from '../../common/components/PageLayout';
import useSettingsStyles from '../common/useSettingsStyles';
import { enqueueSave } from '../../UpdateController';

const EditItemView = ({
  children, endpoint, item, setItem, defaultItem, validate, onItemSaved, menu, breadcrumbs,
}) => {
  const navigate = useNavigate();
  const classes = useSettingsStyles();
  const t = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const originalItemRef = useRef(null);

  useEffectAsync(async () => {
    if (!item) {
      if (id) {
        const response = await fetch(`/api/${endpoint}/${id}`);
        if (response.ok) {
          const data = await response.json();
          originalItemRef.current = data;
          setItem(data);
        } else {
          throw Error(await response.text());
        }
      } else {
        const defaultData = defaultItem || {};
        originalItemRef.current = defaultData;
        setItem(defaultData);
      }
    }
  }, [id, item, defaultItem]);

  const performSave = useCatch(async (itemToSave) => {
    let url = `/api/${endpoint}`;
    if (id) url += `/${id}`;

    const response = await fetch(url, {
      method: !id ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemToSave),
    });

    if (response.ok) {
      if (onItemSaved) {
        onItemSaved(await response.json());
      }
      navigate(-1);
    } else {
      throw Error(await response.text());
    }
  });

  const handleSave = () => {
    const snapshot = { ...item };
    const url = `/api/${endpoint}${id ? `/${id}` : ''}`;
    const method = id ? 'PUT' : 'POST';

    enqueueSave(
      dispatch,
      t('sharedSaved'),
      () => performSave(snapshot),
      () => setItem({ ...originalItemRef.current }),
      {
        url,
        method,
        body: JSON.stringify(snapshot),
      },
    );
  };

  return (
    <PageLayout menu={menu} breadcrumbs={breadcrumbs}>
      <Container maxWidth="xs" className={classes.container}>
        {item ? children : (
          <Accordion defaultExpanded>
            <AccordionSummary>
              <Typography variant="subtitle1">
                <Skeleton width="10em" />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={-i} width="100%">
                  <TextField />
                </Skeleton>
              ))}
            </AccordionDetails>
          </Accordion>
        )}
        <div className={classes.buttons}>
          <Button
            type="button"
            color="primary"
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={!item}
          >
            {t('sharedCancel')}
          </Button>
          <Button
            type="button"
            color="primary"
            variant="contained"
            onClick={handleSave}
            disabled={!item || !validate()}
          >
            {t('sharedSave')}
          </Button>
        </div>
      </Container>
    </PageLayout>
  );
};

export default EditItemView;