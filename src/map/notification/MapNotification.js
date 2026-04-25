import { useEffect, useMemo } from 'react';
import { map } from '../core/MapView';
import './notification.css';

const statusClass = (status) => `maplibregl-ctrl-icon maplibre-ctrl-notification maplibre-ctrl-notification-${status}`;

class NotificationControl {
  constructor(eventHandler) {
    this.eventHandler = eventHandler;
  }

  onAdd() {
    this.button = document.createElement('button');
    this.button.className = statusClass('off');
    this.button.type = 'button';
    this.button.title = 'Notifications';
    this.button.onclick = () => this.eventHandler(this);

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

const MapNotification = ({
  enabled, onClick, panic, onButtonReady,
}) => {
  const control = useMemo(() => new NotificationControl(onClick), [onClick]);

  useEffect(() => {
    map.addControl(control, 'top-right');
    // control.button is created synchronously inside onAdd(), called
    // synchronously by map.addControl — no setTimeout needed.
    onButtonReady?.(control.button);
    return () => {
      map.removeControl(control);
      onButtonReady?.(null);
    };
  }, [onClick]);

  useEffect(() => {
    if (!control.button) return;

    control.button.className = statusClass(enabled ? 'on' : 'off');
    control.button.title = enabled ? 'Notifications (active)' : 'Notifications';
    control.button.classList.toggle('maplibre-ctrl-notification-panic', !!panic);

    if (control.badge) {
      control.badge.style.display = panic ? 'block' : 'none';
    }
  }, [enabled, panic]);

  return null;
};

export default MapNotification;