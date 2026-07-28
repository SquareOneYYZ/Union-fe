import {
  useId, useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useTheme } from '@mui/styles';
import { useMediaQuery } from '@mui/material';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';
import { findFonts } from './core/mapUtil';

const MapMarkers = ({ markers, showTitles }) => {
  const id = useId();
  const initialized = useRef(false);
  const lastZoom = useRef(null);

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  const features = useMemo(() => {
    if (!markers?.length) return [];
    return markers.map(({ latitude, longitude, image, title }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties: {
        image: image || 'default-neutral',
        title: title || '',
      },
    }));
  }, [markers]);

  const syncZoomTitleVisibility = useCallback(() => {
    if (!map.getLayer(id)) return;

    const zoom = Math.round(map.getZoom() * 2) / 2;
    if (lastZoom.current === zoom) return;

    lastZoom.current = zoom;
    const show = zoom >= 14;

    map.setLayoutProperty(id, 'text-field', show ? '{title}' : '');
  }, [id]);

  useEffect(() => {
    if (initialized.current) return;

    try {
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      if (!map.getLayer(id)) {
        map.addLayer({
          id,
          type: 'symbol',
          source: id,
          filter: ['!has', 'point_count'],
          layout: {
            'icon-image': ['get', 'image'],
            'icon-size': iconScale,
            'icon-allow-overlap': true,
            'text-field': showTitles ? ['get', 'title'] : '',
            'text-allow-overlap': true,
            'text-anchor': 'bottom',
            'text-offset': [0, -2 * iconScale],
            'text-font': findFonts(map),
            'text-size': 12,
          },
          paint: {
            'text-halo-color': 'white',
            'text-halo-width': 1,
          },
        });
      }

      initialized.current = true;

      map.on('zoom', syncZoomTitleVisibility);
      syncZoomTitleVisibility();
    } catch (err) {
      console.error('Layer initialization failed:', err);
    }
  }, [id, iconScale, showTitles, syncZoomTitleVisibility]);

  useEffect(
    () => () => {
      try {
        map.off('zoom', syncZoomTitleVisibility);
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
        initialized.current = false;
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }
    },
    [id, syncZoomTitleVisibility],
  );
  useEffect(() => {
    if (!initialized.current || !map.getLayer(id)) return;

    try {
      map.setLayoutProperty(id, 'icon-size', iconScale);
      map.setLayoutProperty(id, 'text-offset', [0, -2 * iconScale]);
    } catch (err) {
      console.warn('Failed to update scale:', err);
    }
  }, [id, iconScale]);

  useEffect(() => {
    if (!initialized.current || !map.getLayer(id)) return;

    try {
      const zoom = map.getZoom();
      const show = showTitles && zoom >= 14;
      map.setLayoutProperty(id, 'text-field', show ? ['get', 'title'] : '');
    } catch (err) {
      console.warn('Title visibility update failed:', err);
    }
  }, [id, showTitles]);

  useEffect(() => {
    if (!initialized.current) return;

    const source = map.getSource(id);
    if (!source) return;

    requestAnimationFrame(() => {
      try {
        source.setData({
          type: 'FeatureCollection',
          features,
        });
      } catch (err) {
        console.warn('GeoJSON update failed:', err);
      }
    });
  }, [id, features]);

  return null;
};

export default MapMarkers;
