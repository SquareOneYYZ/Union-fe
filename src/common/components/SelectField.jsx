import React, { useEffect, useState, useRef } from 'react';
import {
  FormControl, InputLabel, MenuItem, Select, Autocomplete, TextField, Tooltip,
  CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useEffectAsync } from '../../reactHelper';

const formatVINInput = (value) => value
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, 17);

const padVINForApiCall = (vin) => {
  if (!vin) return '';
  const formatted = formatVINInput(vin);
  return formatted.length < 17 ? `${formatted}*` : formatted;
};

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
  filter,
  renderValue,
  MenuProps,
  sx,
  isVinField = false,
  vinApiEndpoint = '/api/devices/Vindecoder',
}) => {
  const [items, setItems] = useState();
  const [vinLoading, setVinLoading] = useState(false);
  const [vinInputValue, setVinInputValue] = useState('');
  const [vinSuggestions, setVinSuggestions] = useState([]);
  const [vinOpen, setVinOpen] = useState(false);

  const vinApiEndpointRef = useRef(vinApiEndpoint);
  const onChangeRef = useRef(onChange);

  useEffect(() => { vinApiEndpointRef.current = vinApiEndpoint; }, [vinApiEndpoint]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (isVinField) {
      const clean = (value || '').replace(/\*/g, '');
      if (clean !== vinInputValue) setVinInputValue(clean);
    }
  }, [isVinField, value]);

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
        setItems(filter ? filter(data) : data);
      } else {
        throw Error(await response.text());
      }
    }
  }, []);

  // Fires only on button click or Enter — no debounce, no auto-trigger
  const fetchVinSuggestions = useRef(async (searchValue) => {
    if (!searchValue) return;
    setVinLoading(true);
    try {
      const paddedVin = padVINForApiCall(searchValue);
      const response = await fetch(`${vinApiEndpointRef.current}/${paddedVin}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const responseData = await response.json();
      const list = Array.isArray(responseData) ? responseData : [responseData];
      const valid = list.filter((s) => s && s.vin);
      setVinSuggestions(valid);
      setVinOpen(valid.length > 0);
    } catch (error) {
      setVinSuggestions([]);
      setVinOpen(false);
    } finally {
      setVinLoading(false);
    }
  }).current;

  const handleVinInputChange = (event, newInputValue, reason) => {
    if (reason === 'reset') return;
    const formatted = formatVINInput(newInputValue);
    setVinInputValue(formatted);
    // Clear old suggestions when user edits input
    setVinSuggestions([]);
    setVinOpen(false);
  };

  const handleSearchClick = () => fetchVinSuggestions(vinInputValue);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      fetchVinSuggestions(vinInputValue);
    }
  };

  const handleVinSelect = (event, selectedOption) => {
    if (!selectedOption) return;
    setVinOpen(false);
    onChangeRef.current({
      target: {
        value: vinInputValue,
        vinData: typeof selectedOption === 'object' ? selectedOption : null,
      },
    });
  };

  const handleVinBlur = () => {
    if (vinInputValue) {
      onChangeRef.current({ target: { value: vinInputValue.replace(/\*/g, '') } });
    }
  };

  const getVinHelperText = () => {
    if (vinLoading) return 'Searching VIN...';
    if (vinInputValue.length === 0) return 'Enter a VIN and press search';
    return `${vinInputValue.length}/17 characters`;
  };

  if (isVinField) {
    return (
      <FormControl fullWidth={fullWidth}>
        <Autocomplete
          freeSolo
          open={vinOpen}
          onClose={() => setVinOpen(false)}
          options={vinSuggestions}
          loading={vinLoading}
          inputValue={vinInputValue}
          filterOptions={(x) => x}
          getOptionLabel={(option) => (typeof option === 'object' ? option.vin : option)}
          onChange={handleVinSelect}
          onInputChange={handleVinInputChange}
          onBlur={handleVinBlur}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '13px',
              '& fieldset': { borderRadius: '13px' },
            },
            ...sx,
          }}
          renderOption={(props, option) => (
            <MenuItem {...props} key={option.vin}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{option.vin}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  {[option.modelYear, option.make, option.model, option.vehicleType]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </MenuItem>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              helperText={getVinHelperText()}
              onKeyDown={handleKeyDown}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '13px',
                  '& fieldset': { borderRadius: '13px' },
                },
                ...sx,
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {vinLoading
                      ? <CircularProgress color="inherit" size={20} />
                      : (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleSearchClick}
                            disabled={vinInputValue.length === 0}
                            size="small"
                            title="Search VIN"
                          >
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </FormControl>
    );
  }

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
              renderValue={(selected) => (renderValue
                ? renderValue(selected)
                : selected
                  .map((val) => {
                    const item = items.find((i) => keyGetter(i) === val);
                    return item ? titleGetter(item) : val;
                  })
                  .join(', '))}
              MenuProps={MenuProps}
              sx={{
                borderRadius: '13px',
                '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                ...sx,
              }}
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '13px',
                '& fieldset': { borderRadius: '13px' },
              },
              ...sx,
            }}
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
            isOptionEqualToValue={(option, val) => keyGetter(option) === val}
            value={value}
            onChange={(_, val) => onChange({ target: { value: val ? keyGetter(val) : emptyValue } })}
            renderInput={(params) => {
              const displayValue = getOptionLabel(value);
              return (
                <Tooltip title={displayValue || ''} placement="bottom-start" arrow>
                  <TextField
                    {...params}
                    label={label}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '13px',
                        '& fieldset': { borderRadius: '13px' },
                      },
                      ...sx,
                    }}
                  />
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
