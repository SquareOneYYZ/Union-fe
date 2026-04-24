import { useEffect, useMemo, useRef } from 'react';
import { map } from '../core/MapView';
import './notification.css';

class NotificationControl {
  constructor(eventHandler) {
    this.eventHandler = eventHandler;
  }

  onAdd() {
    this.button = document.createElement('button');
    this.button.className = 'maplibregl-ctrl-icon maplibre-ctrl-notification maplibre-ctrl-notification-off';
    this.button.type = 'button';
    this.button.title = 'Notifications';
    this.button.onclick = () => this.eventHandler(this);

    // Red badge dot
    this.badge = document.createElement('span');
    this.badge.className = 'notification-panic-badge';
    this.badge.style.display = 'none';

    this.wrapper = document.createElement('div');
    this.wrapper.style.position = 'relative';
    this.wrapper.style.display = 'inline-block';
    this.wrapper.appendChild(this.button);
    this.wrapper.appendChild(this.badge);

    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl-group maplibregl-ctrl';
    this.container.appendChild(this.wrapper);

    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
  }
}

const MapNotification = ({ enabled, onClick, panic }) => {
  const control = useMemo(() => new NotificationControl(onClick), [onClick]);

  useEffect(() => {
    map.addControl(control, 'top-right');
    return () => map.removeControl(control);
  }, [onClick]);

useEffect(() => {
    if (!control.button) return;

    const status = enabled ? 'on' : 'off';
    control.button.className = [
      'maplibregl-ctrl-icon',
      'maplibre-ctrl-notification',
      `maplibre-ctrl-notification-${status}`,
      panic ? 'maplibre-ctrl-notification-panic' : '',
    ].filter(Boolean).join(' ');
    control.button.title = enabled ? 'Notifications (active)' : 'Notifications';

    if (control.badge) {
      control.badge.style.display = panic ? 'block' : 'none';
    }
  }, [enabled, panic]);

  return null;
};

export default MapNotification;