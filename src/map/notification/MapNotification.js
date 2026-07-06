import { useEffect, useMemo, useRef } from 'react';
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

    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl-group maplibregl-ctrl';
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
  }
}

const BADGE_CLASS = 'notification-panic-badge';
const PANIC_CLASS = 'maplibre-ctrl-notification-panic';

const MapNotification = ({ enabled, onClick, panic, notificationButtonRef, }) => {
  const control = useMemo(() => new NotificationControl(onClick), [onClick]);
  useEffect(() => {
    map.addControl(control, 'top-right');
    return () => map.removeControl(control);
  }, [control]);

  useEffect(() => {
    if (!control.button) return;

    control.button.className = statusClass(enabled ? 'on' : 'off');
    control.button.title = enabled ? 'Notifications (active)' : 'Notifications';
    control.button.style.position = 'relative';
    notificationButtonRef.current = control.button;

    control.button.classList.toggle(PANIC_CLASS, !!panic);

    let badge = control.button.querySelector(`.${BADGE_CLASS}`);
    if (panic) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = BADGE_CLASS;
        control.button.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  }, [enabled, panic]);

  return null;
};

export default MapNotification;