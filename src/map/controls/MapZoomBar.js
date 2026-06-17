import { useEffect, useMemo } from 'react';
import { map } from '../core/MapView';
import { createCtrlButton, createCtrlContainer } from './util';
import './mapControls.css';

class ZoomBarControl {
  onAdd() {
    this.container = createCtrlContainer('maplibre-ctrl-zoombar');
     this.container.id = 'map-ctrl-zoombar'; 
    this.zoomInBtn = createCtrlButton(
      'Zoom In',
      'maplibregl-ctrl-icon maplibre-ctrl-zoom-in',
      () => map.zoomIn(),
    );

    this.sliderWrapper = document.createElement('div');
    this.sliderWrapper.className = 'maplibre-ctrl-zoom-slider-wrapper';

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'maplibre-ctrl-zoom-slider';
    this.slider.min = map.getMinZoom();
    this.slider.max = map.getMaxZoom();
    this.slider.step = 0.5;
    this.slider.value = map.getZoom();
    this.slider.setAttribute('aria-label', 'Zoom Level');
    this.slider.title = 'Zoom Level';
    this.slider.oninput = (e) => map.zoomTo(parseFloat(e.target.value));

    this.sliderWrapper.appendChild(this.slider);

    this.zoomOutBtn = createCtrlButton(
      'Zoom Out',
      'maplibregl-ctrl-icon maplibre-ctrl-zoom-out',
      () => map.zoomOut(),
    );

    this.container.appendChild(this.zoomInBtn);
    this.container.appendChild(this.sliderWrapper);
    this.container.appendChild(this.zoomOutBtn);

    this.onZoom = () => {
      this.slider.value = map.getZoom();
    };
    map.on('zoom', this.onZoom);

    return this.container;
  }

  onRemove() {
    map.off('zoom', this.onZoom);
    this.container.parentNode.removeChild(this.container);
  }
}

const MapZoomBar = () => {
  const control = useMemo(() => new ZoomBarControl(), []);

  useEffect(() => {
    map.addControl(control, 'top-right');
    return () => map.removeControl(control);
  }, [control]);

  return null;
};

export default MapZoomBar;