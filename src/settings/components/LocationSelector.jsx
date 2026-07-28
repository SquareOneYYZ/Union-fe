import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Autocomplete,
  Box,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { snackBarDurationShortMs } from '../../common/util/duration';
import { useTranslation } from '../../common/components/LocalizationProvider';

const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;

const LocationSelector = ({ groupId }) => {
  const t = useTranslation();

  const [cityOptions, setCityOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [cityQuery, setCityQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [existingCities, setExistingCities] = useState([]);
  const [existingStates, setExistingStates] = useState([]);
  const [existingCountries, setExistingCountries] = useState([]);
  const [linkedCityIds, setLinkedCityIds] = useState([]);
  const [linkedStateIds, setLinkedStateIds] = useState([]);
  const [linkedCountryIds, setLinkedCountryIds] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    const fetchExistingRegions = async () => {
      try {
        const [citiesRes, statesRes, countriesRes] = await Promise.all([
          fetch('/api/regions/filter?type=city'),
          fetch('/api/regions/filter?type=state'),
          fetch('/api/regions/filter?type=country'),
        ]);

        if (citiesRes.ok) {
          const cities = await citiesRes.json();
          setExistingCities(cities);
        }
        if (statesRes.ok) {
          const states = await statesRes.json();
          setExistingStates(states);
        }
        if (countriesRes.ok) {
          const countries = await countriesRes.json();
          setExistingCountries(countries);
        }
      } catch (error) {
        console.error('Error fetching existing regions:', error);
      }
    };

    fetchExistingRegions();
  }, []);

  useEffect(() => {
    const fetchLinkedRegions = async () => {
      try {
        const [citiesRes, statesRes, countriesRes] = await Promise.all([
          fetch(`/api/regions?groupId=${groupId}&type=city`),
          fetch(`/api/regions?groupId=${groupId}&type=state`),
          fetch(`/api/regions?groupId=${groupId}&type=country`),
        ]);

        if (citiesRes.ok) {
          const linkedCities = await citiesRes.json();
          const cityIds = linkedCities.map((c) => c.id);
          setLinkedCityIds(cityIds);
          setSelectedCities(
            existingCities.filter((c) => cityIds.includes(c.id)),
          );
        }

        if (statesRes.ok) {
          const linkedStates = await statesRes.json();
          const stateIds = linkedStates.map((s) => s.id);
          setLinkedStateIds(stateIds);
          setSelectedStates(
            existingStates.filter((s) => stateIds.includes(s.id)),
          );
        }

        if (countriesRes.ok) {
          const linkedCountries = await countriesRes.json();
          const countryIds = linkedCountries.map((c) => c.id);
          setLinkedCountryIds(countryIds);
          setSelectedCountries(
            existingCountries.filter((c) => countryIds.includes(c.id)),
          );
        }
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error fetching linked regions:', error);
      }
    };

    if (existingCities.length || existingStates.length || existingCountries.length) {
      fetchLinkedRegions();
    }
  }, [groupId, existingCities, existingStates, existingCountries]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!cityQuery || cityQuery.length < 2) {
        setCityOptions([]);
        return;
      }

      setLoadingCities(true);
      try {
        const response = await fetch(
          `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(
            cityQuery,
          )}&limit=10&dedupe=1`,
        );

        if (response.ok) {
          const data = await response.json();
          const filteredData = data.filter(
            (location) => location.type === 'city'
              || location.type === 'town'
              || location.type === 'village',
          );

          const formattedOptions = filteredData.map((location) => ({
            id: `locationiq_${location.place_id}`,
            label: location.display_name,
            isLocationIQ: true,
            locationData: {
              placeId: location.place_id,
              displayName: location.display_name,
              type: location.type,
              lat: location.lat,
              lon: location.lon,
              address: location.address,
            },
          }));
          setCityOptions(formattedOptions);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    const debounceTimer = setTimeout(fetchCities, 300);
    return () => clearTimeout(debounceTimer);
  }, [cityQuery]);

  useEffect(() => {
    const fetchStates = async () => {
      if (!stateQuery || stateQuery.length < 2) {
        setStateOptions([]);
        return;
      }

      setLoadingStates(true);
      try {
        const response = await fetch(
          `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(
            stateQuery,
          )}&limit=10&dedupe=1`,
        );

        if (response.ok) {
          const data = await response.json();
          const filteredData = data.filter(
            (location) => location.type === 'state',
          );

          const formattedOptions = filteredData.map((location) => ({
            id: `locationiq_${location.place_id}`,
            label: location.display_name,
            isLocationIQ: true,
            locationData: {
              placeId: location.place_id,
              displayName: location.display_name,
              type: location.type,
              lat: location.lat,
              lon: location.lon,
              address: location.address,
            },
          }));
          setStateOptions(formattedOptions);
        }
      } catch (error) {
        console.error('Error fetching states:', error);
      } finally {
        setLoadingStates(false);
      }
    };

    const debounceTimer = setTimeout(fetchStates, 300);
    return () => clearTimeout(debounceTimer);
  }, [stateQuery]);

  useEffect(() => {
    const fetchCountries = async () => {
      if (!countryQuery || countryQuery.length < 2) {
        setCountryOptions([]);
        return;
      }

      setLoadingCountries(true);
      try {
        const response = await fetch(
          `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(
            countryQuery,
          )}&limit=10&dedupe=1`,
        );

        if (response.ok) {
          const data = await response.json();
          const filteredData = data.filter(
            (location) => location.type === 'country',
          );

          const formattedOptions = filteredData.map((location) => ({
            id: `locationiq_${location.place_id}`,
            label: location.display_name,
            isLocationIQ: true,
            locationData: {
              placeId: location.place_id,
              displayName: location.display_name,
              type: location.type,
              lat: location.lat,
              lon: location.lon,
              address: location.address,
            },
          }));
          setCountryOptions(formattedOptions);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoadingCountries(false);
      }
    };

    const debounceTimer = setTimeout(fetchCountries, 300);
    return () => clearTimeout(debounceTimer);
  }, [countryQuery]);

  const createRegionFromLocationIQ = async (locationItem, type) => {
    try {
      const newRegion = {
        name: locationItem.locationData.displayName,
        type,
        value: locationItem.locationData.displayName,
        attributes: {
          placeId: locationItem.locationData.placeId,
          lat: locationItem.locationData.lat,
          lon: locationItem.locationData.lon,
          address: locationItem.locationData.address,
        },
      };

      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegion),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating region:', error);
      return null;
    }
  };

  const syncRegionPermissions = async (oldIds, newIds) => {
    const requests = [];
    newIds
      .filter((regionId) => !oldIds.includes(regionId))
      .forEach((regionId) => {
        requests.push(
          fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId: parseInt(groupId, 10),
              regionId,
            }),
          }),
        );
      });

    oldIds
      .filter((regionId) => !newIds.includes(regionId))
      .forEach((regionId) => {
        requests.push(
          fetch('/api/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId: parseInt(groupId, 10),
              regionId,
            }),
          }),
        );
      });

    await Promise.all(requests);
  };

  const handleCityChange = useCallback(async (newValue) => {
    setSelectedCities(newValue);
    if (!initialLoadComplete) return;

    try {
      const processedCities = await Promise.all(
        newValue.map(async (city) => {
          if (city.isLocationIQ) {
            const created = await createRegionFromLocationIQ(city, 'city');
            if (created) {
              setExistingCities((prev) => {
                if (prev.find((p) => p.id === created.id)) return prev;
                return [...prev, created];
              });
            }
            return created;
          }
          return city;
        }),
      );

      const cityIds = processedCities.filter(Boolean).map((c) => c.id);
      await syncRegionPermissions(linkedCityIds, cityIds);
      setLinkedCityIds(cityIds);
      setCityQuery('');
      setCityOptions([]);

      setUpdated(true);
    } catch (error) {
      console.error('Error auto-saving cities:', error);
    }
  }, [linkedCityIds, initialLoadComplete]);

  const handleStateChange = useCallback(async (newValue) => {
    setSelectedStates(newValue);
    if (!initialLoadComplete) return;
    try {
      const processedStates = await Promise.all(
        newValue.map(async (state) => {
          if (state.isLocationIQ) {
            const created = await createRegionFromLocationIQ(state, 'state');
            if (created) {
              setExistingStates((prev) => {
                if (prev.find((p) => p.id === created.id)) return prev;
                return [...prev, created];
              });
            }
            return created;
          }
          return state;
        }),
      );

      const stateIds = processedStates.filter(Boolean).map((s) => s.id);
      await syncRegionPermissions(linkedStateIds, stateIds);
      setLinkedStateIds(stateIds);
      setStateQuery('');
      setStateOptions([]);
      setUpdated(true);
    } catch (error) {
      console.error('Error auto-saving states:', error);
    }
  }, [linkedStateIds, initialLoadComplete]);

  const handleCountryChange = useCallback(async (newValue) => {
    setSelectedCountries(newValue);

    if (!initialLoadComplete) return;

    try {
      const processedCountries = await Promise.all(
        newValue.map(async (country) => {
          if (country.isLocationIQ) {
            const created = await createRegionFromLocationIQ(country, 'country');
            if (created) {
              setExistingCountries((prev) => {
                if (prev.find((p) => p.id === created.id)) return prev;
                return [...prev, created];
              });
            }
            return created;
          }
          return country;
        }),
      );

      const countryIds = processedCountries.filter(Boolean).map((c) => c.id);
      await syncRegionPermissions(linkedCountryIds, countryIds);
      setLinkedCountryIds(countryIds);
      setCountryQuery('');
      setCountryOptions([]);
      setUpdated(true);
    } catch (error) {
      console.error('Error auto-saving countries:', error);
    }
  }, [linkedCountryIds, initialLoadComplete]);

  const cityAutocompleteOptions = [...existingCities, ...cityOptions];
  const stateAutocompleteOptions = [...existingStates, ...stateOptions];
  const countryAutocompleteOptions = [...existingCountries, ...countryOptions];

  return (
    <>
      {/* Countries */}
      <Box>
        <Autocomplete
          multiple
          options={countryAutocompleteOptions}
          value={selectedCountries}
          onChange={(e, newValue) => handleCountryChange(newValue)}
          onInputChange={(e, newInputValue) => setCountryQuery(newInputValue)}
          getOptionLabel={(option) => {
            if (option.isLocationIQ) {
              return `${option.label}`;
            }
            return option.name || option.label || '';
          }}
          loading={loadingCountries}
          isOptionEqualToValue={(option, value) => {
            if (option.isLocationIQ && value.isLocationIQ) {
              return option.id === value.id;
            }
            if (!option.isLocationIQ && !value.isLocationIQ) {
              return option.id === value.id;
            }
            return false;
          }}
          filterOptions={(options, state) => {
            if (countryOptions.length > 0) {
              return options;
            }
            const query = state.inputValue.toLowerCase().trim();
            if (!query) return options;
            return options.filter(
              (opt) => (opt.name || opt.label || '')
                .toLowerCase()
                .includes(query),
            );
          }}
          noOptionsText={
            countryQuery.length < 2
              ? 'Type at least 2 characters'
              : 'No countries found'
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Countries"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingCountries ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Box>

      {/* States */}
      <Box>
        <Autocomplete
          multiple
          options={stateAutocompleteOptions}
          value={selectedStates}
          onChange={(e, newValue) => handleStateChange(newValue)}
          onInputChange={(e, newInputValue) => setStateQuery(newInputValue)}
          getOptionLabel={(option) => {
            if (option.isLocationIQ) {
              return `${option.label}`;
            }
            return option.name || option.label || '';
          }}
          loading={loadingStates}
          isOptionEqualToValue={(option, value) => {
            if (option.isLocationIQ && value.isLocationIQ) {
              return option.id === value.id;
            }
            if (!option.isLocationIQ && !value.isLocationIQ) {
              return option.id === value.id;
            }
            return false;
          }}
          filterOptions={(options, state) => {
            if (stateOptions.length > 0) {
              return options;
            }
            const query = state.inputValue.toLowerCase().trim();
            if (!query) return options;
            return options.filter(
              (opt) => (opt.name || opt.label || '')
                .toLowerCase()
                .includes(query),
            );
          }}
          noOptionsText={
            stateQuery.length < 2
              ? 'Type at least 2 characters'
              : 'No states found'
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="States"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingStates ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Box>

      {/* Cities */}
      <Box>
        <Autocomplete
          multiple
          options={cityAutocompleteOptions}
          value={selectedCities}
          onChange={(e, newValue) => handleCityChange(newValue)}
          onInputChange={(e, newInputValue) => setCityQuery(newInputValue)}
          getOptionLabel={(option) => {
            if (option.isLocationIQ) {
              return `${option.label}`;
            }
            return option.name || option.label || '';
          }}
          loading={loadingCities}
          isOptionEqualToValue={(option, value) => {
            if (option.isLocationIQ && value.isLocationIQ) {
              return option.id === value.id;
            }
            if (!option.isLocationIQ && !value.isLocationIQ) {
              return option.id === value.id;
            }
            return false;
          }}
          filterOptions={(options, state) => {
            if (cityOptions.length > 0) {
              return options;
            }
            const query = state.inputValue.toLowerCase().trim();
            if (!query) return options;
            return options.filter(
              (opt) => (opt.name || opt.label || '')
                .toLowerCase()
                .includes(query),
            );
          }}
          noOptionsText={
            cityQuery.length < 2
              ? 'Type at least 2 characters'
              : 'No cities found'
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Cities"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingCities ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Box>

      <Snackbar
        open={updated}
        onClose={() => setUpdated(false)}
        autoHideDuration={snackBarDurationShortMs}
        message={t('sharedSaved')}
      />
    </>
  );
};

export default LocationSelector;
