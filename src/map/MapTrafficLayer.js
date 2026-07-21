import {
  useEffect, useMemo, useId, useState,
} from 'react';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';
import useMapOverlays from './overlay/useMapOverlays';

const MapTrafficLayer = () => {
  const id = useId();
  const attributeOverlay = useAttributePreference('selectedMapOverlay');
  const [localOverlay, setLocalOverlay] = useState(() => localStorage.getItem('selectedMapOverlay') || '');

  const selectedMapOverlay = localOverlay || attributeOverlay || '';
  const mapOverlays = useMapOverlays();
  const enabled = selectedMapOverlay === 'traffic';

  useEffect(() => {
    const handleOverlayChange = (event) => {
      setLocalOverlay(event.detail.overlay || '');
    };

    window.addEventListener('mapOverlayChange', handleOverlayChange);

    return () => {
      window.removeEventListener('mapOverlayChange', handleOverlayChange);
    };
  }, []);

  const trafficOverlay = useMemo(() => {
    if (!enabled) return null;

    const priorityIds = ['tomTomFlow', 'hereFlow', 'googleTraffic'];

    const available = mapOverlays.filter(
      (overlay) => overlay.available && !overlay.isSpecial,
    );

    const foundId = priorityIds.find((overlayId) => available.some((overlay) => overlay.id === overlayId));

    if (!foundId) {
      return null;
    }

    const foundOverlay = available.find((overlay) => overlay.id === foundId);

    return foundOverlay || null;
  }, [enabled, mapOverlays]);

  useEffect(() => {
    const removeTraffic = () => {
      if (map.getLayer(`${id}-traffic`)) {
        map.removeLayer(`${id}-traffic`);
      }
      if (map.getSource(`${id}-traffic`)) {
        map.removeSource(`${id}-traffic`);
      }
    };

    if (!trafficOverlay) {
      removeTraffic();
      return () => {};
    }

    if (!map.getSource(`${id}-traffic`)) {
      map.addSource(`${id}-traffic`, trafficOverlay.source);
    }

    if (!map.getLayer(`${id}-traffic`)) {
      map.addLayer({
        id: `${id}-traffic`,
        type: 'raster',
        source: `${id}-traffic`,
        layout: {
          visibility: 'visible',
        },
      });
    } else {
      map.setLayoutProperty(`${id}-traffic`, 'visibility', 'visible');
    }

    return () => {
      removeTraffic();
    };
  }, [id, trafficOverlay, map]);

  useEffect(() => {
    const onStyleData = () => {
      if (trafficOverlay && map.getSource(`${id}-traffic`)) {
        if (!map.getLayer(`${id}-traffic`)) {
          map.addLayer({
            id: `${id}-traffic`,
            type: 'raster',
            source: `${id}-traffic`,
            layout: {
              visibility: 'visible',
            },
          });
        }
      }
    };

    map.on('styledata', onStyleData);
    return () => {
      map.off('styledata', onStyleData);
    };
  }, [id, trafficOverlay]);

  return null;
};

export default MapTrafficLayer;
