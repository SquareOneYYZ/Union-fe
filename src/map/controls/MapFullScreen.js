import { useEffect } from 'react';
import { createCtrlButton, createCtrlContainer } from './util';
import './mapControls.css';

export class FullScreenControl {
  onAdd(mapInstance) {
    this.map = mapInstance;
    this.isFullScreen = false;

    this.button = createCtrlButton(
      'Enter Full Screen',
      'maplibregl-ctrl-icon maplibre-ctrl-fullscreen maplibre-ctrl-fullscreen-off',
      () => this.toggleFullScreen(),
    );

    this.container = createCtrlContainer();
    this.container.appendChild(this.button);

    this.fullscreenChangeHandler = () => this.onFullScreenChange();
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);

    return this.container;
  }

  onRemove() {
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    this.container.parentNode.removeChild(this.container);
  }

  toggleFullScreen() {
    const mapContainer = this.map.getContainer();
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request denied:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  onFullScreenChange() {
    this.isFullScreen = !!document.fullscreenElement;
    const label = this.isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen';
    this.button.className = `maplibregl-ctrl-icon maplibre-ctrl-fullscreen maplibre-ctrl-fullscreen-${this.isFullScreen ? 'on' : 'off'}`;
    this.button.setAttribute('aria-label', label);
    this.button.title = label;
  }
}

const MapFullScreen = () => null;

export default MapFullScreen;
