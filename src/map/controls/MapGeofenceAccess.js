import { useEffect, useMemo } from 'react';
import { map } from '../core/MapView';
import { createCtrlButton, createCtrlContainer } from './util';
import './mapControls.css';

class GeofenceAccessControl {
  constructor(onGeofenceClick) {
    this.onGeofenceClick = onGeofenceClick;
  }

  onAdd() {
    this.button = createCtrlButton(
      'Geofence Tools',
      'maplibregl-ctrl-icon maplibre-ctrl-geofence',
      () => this.onGeofenceClick && this.onGeofenceClick(),
    );

    this.container = createCtrlContainer();
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
  }
}

const MapGeofenceAccess = ({ onClick }) => {
  const control = useMemo(() => new GeofenceAccessControl(onClick), [onClick]);

  useEffect(() => {
    map.addControl(control, 'top-right');
    return () => map.removeControl(control);
  }, [control]);

  return null;
};

export default MapGeofenceAccess;