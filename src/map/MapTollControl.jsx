import { useEffect, useState } from 'react';
import { map } from './core/MapView';

class TollControl {
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
    this.button.setAttribute('aria-label', 'Toggle Toll Roads');
    this.button.title = 'Toggle Toll Roads';

    this.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 4V6H18L18 18H15V20H21V4H15Z" fill="currentColor"/>
        <path d="M3 4V20H9V18H6V6H9V4H3Z" fill="currentColor"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
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

const MapTollControl = () => {
  const [isActive, setIsActive] = useState(() => {
    const storedValue = localStorage.getItem('selectedMapOverlay');
    return storedValue === 'tollRoads';
  });

  useEffect(() => {
    const handleToggleToll = () => {
      const newValue = isActive ? '' : 'tollRoads';
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

    const control = new TollControl(isActive, handleToggleToll);
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

export default MapTollControl;
