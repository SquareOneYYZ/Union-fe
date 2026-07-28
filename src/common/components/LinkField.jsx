import { Autocomplete, Snackbar, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useEffectAsync } from '../../reactHelper';
import { snackBarDurationShortMs } from '../util/duration';
import { useTranslation } from './LocalizationProvider';

const LinkField = ({
  label,
  endpointAll,
  endpointLinked,
  baseId,
  keyBase,
  keyLink,
  keyGetter = (item) => item.id,
  titleGetter = (item) => item.name,
}) => {
  const localStorageKey = `linked_${baseId}_${keyLink}`;
  const t = useTranslation();

  const [active, setActive] = useState(true);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [linkedIds, setLinkedIds] = useState(
    () => JSON.parse(localStorage.getItem(localStorageKey)) || [],
  );

  useEffectAsync(async () => {
    if (active) {
      const response = await fetch(endpointAll);
      if (response.ok) {
        setItems(await response.json());
      } else {
        throw Error(await response.text());
      }
    }
  }, [active]);

  useEffectAsync(async () => {
    if (active) {
      const response = await fetch(endpointLinked);
      if (response.ok) {
        const linkedData = await response.json();
        const ids = linkedData.map((it) => keyGetter(it));
        setLinkedIds(ids);
        localStorage.setItem(localStorageKey, JSON.stringify(ids));
      } else {
        throw Error(await response.text());
      }
    }
  }, [active]);

  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(linkedIds));
  }, [linkedIds]);

  const createBody = (linkId) => ({
    [keyBase]: baseId,
    [keyLink]: linkId,
  });

  const onChange = async (value) => {
    const oldValue = linkedIds;
    const newValue = value.map((it) => keyGetter(it));

    if (!newValue.find((it) => it < 0)) {
      const results = [];

      newValue
        .filter((it) => !oldValue.includes(it))
        .forEach((added) => {
          results.push(
            fetch('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createBody(added)),
            }),
          );
        });

      oldValue
        .filter((it) => !newValue.includes(it))
        .forEach((removed) => {
          results.push(
            fetch('/api/permissions', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createBody(removed)),
            }),
          );
        });

      await Promise.all(results);
      setLinkedIds(newValue);
      setUpdated(results.length > 0);
    }
  };

  const linkedItems = items.filter((it) => linkedIds.includes(keyGetter(it)));

  return (
    <>
      <Autocomplete
        loading={active && !items}
        isOptionEqualToValue={(i1, i2) => keyGetter(i1) === keyGetter(i2)}
        options={items}
        getOptionLabel={(item) => titleGetter(item)}
        renderInput={(params) => <TextField {...params} label={label} />}
        value={linkedItems}
        onChange={(_, value) => onChange(value)}
        open={open}
        onOpen={() => {
          setOpen(true);
          setActive(true);
        }}
        onClose={() => {
          setOpen(false);
        }}
        multiple
      />
      <Snackbar
        open={Boolean(updated)}
        onClose={() => setUpdated(false)}
        autoHideDuration={snackBarDurationShortMs}
        message={t('sharedSaved')}
      />
    </>
  );
};

export default LinkField;
