import { useEffect, useState } from 'react';
import { map } from './core/MapView';

class TrafficControl {
  constructor(isActive, onClick) {
    this.isActive = isActive;
    this.onClick = onClick;
  }

  onAdd() {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'maplibregl-ctrl-icon';
    this.button.setAttribute('aria-label', 'Toggle Traffic');
    this.button.title = 'Toggle Traffic';

    this.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="4" width="6" height="16" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
        <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    `;

    this.updateButtonState();

    this.button.addEventListener('click', () => {
      this.onClick();
    });

    this.container.appendChild(this.button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
  }

  updateButtonState() {
    if (this.isActive) {
      this.button.style.backgroundColor = '#1976d2';
      this.button.style.color = '#ffffff';
    } else {
      this.button.style.backgroundColor = '';
      this.button.style.color = '';
    }
  }

  setActive(active) {
    this.isActive = active;
    this.updateButtonState();
  }
}

const MapTrafficControl = () => {
  const [isActive, setIsActive] = useState(() => {
    const storedValue = localStorage.getItem('selectedMapOverlay');
    return storedValue === 'traffic';
  });

  useEffect(() => {
    const handleToggleTraffic = () => {
      const newValue = isActive ? '' : 'traffic';

      if (newValue) {
        localStorage.setItem('selectedMapOverlay', newValue);
      } else {
        localStorage.removeItem('selectedMapOverlay');
      }
      setIsActive(!isActive);
      window.dispatchEvent(new CustomEvent('mapOverlayChange', {
        detail: { overlay: newValue },
      }));
    };

    const control = new TrafficControl(isActive, handleToggleTraffic);
    map.addControl(control, 'top-right');

    return () => {
      try {
        map.removeControl(control);
      } catch (e) {
        console.log(e);
      }
    };
  }, [isActive]);

  return null;
};

export default MapTrafficControl;
