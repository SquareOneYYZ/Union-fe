import { useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { map } from './core/MapView';

const MapCamera = ({ latitude, longitude, positions, coordinates }) => {
  const coords = useMemo(() => {
    if (coordinates && coordinates.length) return coordinates;
    if (positions && positions.length) {
      return positions.map((p) => [p.longitude, p.latitude]);
    }
    return null;
  }, [coordinates, positions]);

  useEffect(() => {
    if (coords && coords.length) {
      const bounds = coords.reduce(
        (acc, c) => acc.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );

      const canvas = map.getCanvas();

      map.fitBounds(bounds, {
        padding: Math.min(canvas.width, canvas.height) * 0.1,
        duration: 0,
      });

      return;
    }

    if (latitude != null && longitude != null) {
      map.jumpTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 10),
      });
    }
  }, [coords, latitude, longitude]);

  return null;
};

export default MapCamera;
