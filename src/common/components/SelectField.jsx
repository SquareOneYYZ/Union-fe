import React, { useEffect, useState } from 'react';
import {
  FormControl, InputLabel, MenuItem, Select, Autocomplete, TextField, Tooltip,
} from '@mui/material';
import { useEffectAsync } from '../../reactHelper';

const SelectField = ({
  label,
  fullWidth,
  multiple,
  value = null,
  emptyValue = null,
  emptyTitle = '',
  onChange,
  endpoint,
  data,
  keyGetter = (item) => item.id,
  titleGetter = (item) => item.name,
  renderValue,
  MenuProps,
}) => {
  const [items, setItems] = useState();

  const getOptionLabel = (option) => {
    if (typeof option !== 'object') {
      option = items.find((obj) => keyGetter(obj) === option);
    }
    return option ? titleGetter(option) : emptyTitle;
  };

  useEffect(() => setItems(data), [data]);

  useEffectAsync(async () => {
    if (endpoint) {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();

        if (endpoint === '/api/notifications/types') {
          const FilteredTypes = ['deviceFuelDrop', 'deviceFuelIncrease', 'textMessage', 'driverChanged', 'media'];

          setItems(data.filter((item) => !FilteredTypes.includes(item.type)));
        } else {
          setItems(data);
        }
      } else {
        throw Error(await response.text());
      }
    }
  }, []);

  if (items) {
    return (
      <FormControl fullWidth={fullWidth}>
        {multiple ? (
          <>
            <InputLabel>{label}</InputLabel>
            <Select
              label={label}
              multiple
              value={value}
              onChange={onChange}
              renderValue={renderValue}
              MenuProps={MenuProps}
            >
              {items.map((item) => (
                <MenuItem key={keyGetter(item)} value={keyGetter(item)}>
                  <Tooltip title={titleGetter(item)} placement="right" arrow>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      width: '100%',
                    }}
                    >
                      {titleGetter(item)}
                    </span>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </>
        ) : (
          <Autocomplete
            size="small"
            options={items}
            getOptionLabel={getOptionLabel}
            renderOption={(props, option) => (
              <MenuItem {...props} key={keyGetter(option)} value={keyGetter(option)}>
                <Tooltip title={titleGetter(option)} placement="right" arrow>
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    width: '100%',
                  }}
                  >
                    {titleGetter(option)}
                  </span>
                </Tooltip>
              </MenuItem>
            )}
            isOptionEqualToValue={(option, value) => keyGetter(option) === value}
            value={value}
            onChange={(_, value) => onChange({ target: { value: value ? keyGetter(value) : emptyValue } })}
            renderInput={(params) => {
              const displayValue = getOptionLabel(value);
              return (
                <Tooltip title={displayValue || ''} placement="bottom-start" arrow>
                  <TextField {...params} label={label} />
                </Tooltip>
              );
            }}
          />
        )}
      </FormControl>
    );
  }
  return null;
};

export default SelectField;
