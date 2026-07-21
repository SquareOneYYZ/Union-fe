import { useEffect, useMemo } from 'react';
import { map } from '../core/MapView';
import { distanceFromMeters, distanceUnitString } from '../../common/util/converter';
import { useAttributePreference } from '../../common/util/preferences';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { createCtrlButton, createCtrlContainer } from './util';
import './mapControls.css';

const MEASURE_SOURCE = 'measure-source';
const MEASURE_PREVIEW_SOURCE = 'measure-preview-source';
const MEASURE_POINTS_LAYER = 'measure-points';
const MEASURE_MIDPOINTS_LAYER = 'measure-midpoints';
const MEASURE_LINE_LAYER = 'measure-line';
const MEASURE_PREVIEW_LAYER = 'measure-preview-line';
const MEASURE_LABELS_LAYER = 'measure-labels';
const MEASURE_MIDPOINT_LABELS_LAYER = 'measure-midpoint-labels';
const TRIANGLE_IMAGE_ID = 'measure-triangle-icon';

const calculateDistance = (coords) => {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
};

const segmentDistance = (p1, p2) => calculateDistance([p1, p2]);

const midpoint = (p1, p2) => [
  (p1[0] + p2[0]) / 2,
  (p1[1] + p2[1]) / 2,
];

const addTriangleImage = () => {
  if (map.hasImage(TRIANGLE_IMAGE_ID)) return;

  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size - 2, size - 2);
  ctx.lineTo(2, size - 2);
  ctx.closePath();

  ctx.fillStyle = '#f57c00';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage(TRIANGLE_IMAGE_ID, { width: size, height: size, data: imageData.data });
};

class MeasureControl {
  constructor() {
    this.active = false;
    this.points = [];
    this.mousePos = null;
    this.distanceUnit = 'km';
    this.distanceUnitLabel = 'km';
  }

  setUnit(unit, unitLabel) {
    this.distanceUnit = unit;
    this.distanceUnitLabel = unitLabel;
    if (this.active && this.points.length > 0) {
      this.updateSource();
      this.updateLabel();
    }
  }

  formatDist(meters) {
    const converted = distanceFromMeters(meters, this.distanceUnit);
    return `${converted.toFixed(converted >= 10 ? 1 : 2)} ${this.distanceUnitLabel}`;
  }

  onAdd() {
    this.button = createCtrlButton(
      'Measure Distance',
      'maplibregl-ctrl-icon maplibre-ctrl-measure maplibre-ctrl-measure-off',
      () => this.toggleMeasure(),
    );

    this.distanceRow = document.createElement('div');
    this.distanceRow.className = 'maplibre-ctrl-measure-row';
    this.distanceRow.style.display = 'none';

    this.label = document.createElement('span');
    this.label.className = 'maplibre-ctrl-measure-label';
    this.label.textContent = '—';

    this.closeBtn = createCtrlButton(
      'Stop measuring (Esc or double-click)',
      'maplibre-ctrl-measure-close',
      () => this.deactivate(),
    );
    this.closeBtn.innerHTML = '&#x2715;';

    this.distanceRow.appendChild(this.label);
    this.distanceRow.appendChild(this.closeBtn);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'maplibre-measure-tooltip';
    this.tooltip.style.display = 'none';
    map.getContainer().appendChild(this.tooltip);

    this.container = createCtrlContainer();
    this.container.appendChild(this.button);
    this.container.appendChild(this.distanceRow);

    this.onMapClick = (e) => this.handleMapClick(e);
    this.onMapDblClick = () => this.deactivate();
    this.onMouseMove = (e) => this.handleMouseMove(e);
    this.onKeyDown = (e) => { if (e.key === 'Escape') this.deactivate(); };

    return this.container;
  }

  onRemove() {
    this.deactivate();
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.container.parentNode.removeChild(this.container);
  }

  toggleMeasure() {
    if (this.active) this.deactivate();
    else this.activate();
  }

  activate() {
    this.active = true;
    this.points = [];
    this.mousePos = null;
    this.button.className = 'maplibregl-ctrl-icon maplibre-ctrl-measure maplibre-ctrl-measure-on';
    this.button.setAttribute('aria-label', 'Measuring… (Esc or double-click to stop)');
    this.button.title = 'Measuring… (Esc or double-click to stop)';
    this.distanceRow.style.display = 'flex';
    this.label.textContent = 'Click map';
    map.getCanvas().style.cursor = 'crosshair';

    addTriangleImage();

    if (!map.getSource(MEASURE_SOURCE)) {
      map.addSource(MEASURE_SOURCE, { type: 'geojson', data: this.getGeoJSON() });

      map.addLayer({
        id: MEASURE_LINE_LAYER,
        type: 'line',
        source: MEASURE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1976d2', 'line-width': 2.5, 'line-dasharray': [2, 1] },
        filter: ['==', '$type', 'LineString'],
      });

      map.addLayer({
        id: MEASURE_POINTS_LAYER,
        type: 'circle',
        source: MEASURE_SOURCE,
        paint: {
          'circle-radius': 5,
          'circle-color': '#fff',
          'circle-stroke-color': '#1976d2',
          'circle-stroke-width': 2,
        },
        filter: ['==', ['get', 'markerType'], 'point'],
      });

      map.addLayer({
        id: MEASURE_MIDPOINTS_LAYER,
        type: 'symbol',
        source: MEASURE_SOURCE,
        layout: {
          'icon-image': TRIANGLE_IMAGE_ID,
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        filter: ['==', ['get', 'markerType'], 'midpoint'],
      });

      map.addLayer({
        id: MEASURE_MIDPOINT_LABELS_LAYER,
        type: 'symbol',
        source: MEASURE_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, -1.8],
          'text-anchor': 'bottom',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#f57c00',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
        filter: ['all',
          ['==', ['get', 'markerType'], 'midpoint'],
          ['!=', ['get', 'label'], ''],
        ],
      });

      map.addLayer({
        id: MEASURE_LABELS_LAYER,
        type: 'symbol',
        source: MEASURE_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, -1.2],
          'text-anchor': 'bottom',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#1976d2',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
        filter: ['all',
          ['==', ['get', 'markerType'], 'point'],
          ['!=', ['get', 'label'], ''],
        ],
      });
    }

    if (!map.getSource(MEASURE_PREVIEW_SOURCE)) {
      map.addSource(MEASURE_PREVIEW_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: MEASURE_PREVIEW_LAYER,
        type: 'line',
        source: MEASURE_PREVIEW_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#1976d2',
          'line-width': 1.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.6,
        },
      });
    }

    map.on('click', this.onMapClick);
    map.on('dblclick', this.onMapDblClick);
    map.on('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
  }

  deactivate() {
    this.active = false;
    this.points = [];
    this.mousePos = null;
    this.button.className = 'maplibregl-ctrl-icon maplibre-ctrl-measure maplibre-ctrl-measure-off';
    this.button.setAttribute('aria-label', 'Measure Distance');
    this.button.title = 'Measure Distance';
    this.distanceRow.style.display = 'none';
    this.tooltip.style.display = 'none';
    map.getCanvas().style.cursor = '';

    map.off('click', this.onMapClick);
    map.off('dblclick', this.onMapDblClick);
    map.off('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);

    if (map.getLayer(MEASURE_MIDPOINT_LABELS_LAYER)) map.removeLayer(MEASURE_MIDPOINT_LABELS_LAYER);
    if (map.getLayer(MEASURE_LABELS_LAYER)) map.removeLayer(MEASURE_LABELS_LAYER);
    if (map.getLayer(MEASURE_MIDPOINTS_LAYER)) map.removeLayer(MEASURE_MIDPOINTS_LAYER);
    if (map.getLayer(MEASURE_POINTS_LAYER)) map.removeLayer(MEASURE_POINTS_LAYER);
    if (map.getLayer(MEASURE_LINE_LAYER)) map.removeLayer(MEASURE_LINE_LAYER);
    if (map.getLayer(MEASURE_PREVIEW_LAYER)) map.removeLayer(MEASURE_PREVIEW_LAYER);
    if (map.getSource(MEASURE_SOURCE)) map.removeSource(MEASURE_SOURCE);
    if (map.getSource(MEASURE_PREVIEW_SOURCE)) map.removeSource(MEASURE_PREVIEW_SOURCE);

    if (map.hasImage(TRIANGLE_IMAGE_ID)) map.removeImage(TRIANGLE_IMAGE_ID);
  }

  handleMapClick(e) {
    this.points.push([e.lngLat.lng, e.lngLat.lat]);
    this.updateSource();
    this.updateLabel();
    if (this.mousePos) this.updatePreview(this.mousePos);
  }

  handleMouseMove(e) {
    this.mousePos = [e.lngLat.lng, e.lngLat.lat];

    if (this.points.length === 0) {
      this.tooltip.style.display = 'none';
      return;
    }

    this.updatePreview(this.mousePos);

    const lastPoint = this.points[this.points.length - 1];
    const segDist = segmentDistance(lastPoint, this.mousePos);
    const totalDist = calculateDistance(this.points) + segDist;
    const point = map.project(e.lngLat);

    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${point.x + 14}px`;
    this.tooltip.style.top = `${point.y - 28}px`;

    if (this.points.length === 1) {
      this.tooltip.innerHTML = `<span class="measure-tooltip-segment">${this.formatDist(segDist)}</span>`;
    } else {
      this.tooltip.innerHTML = `
        <span class="measure-tooltip-segment">${this.formatDist(segDist)}</span>
        <span class="measure-tooltip-total">Total: ${this.formatDist(totalDist)}</span>
      `;
    }
  }

  updatePreview(mouseCoord) {
    if (this.points.length === 0) return;
    const lastPoint = this.points[this.points.length - 1];
    const previewSource = map.getSource(MEASURE_PREVIEW_SOURCE);
    if (previewSource) {
      previewSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [lastPoint, mouseCoord] },
        }],
      });
    }
  }

  updateSource() {
    const source = map.getSource(MEASURE_SOURCE);
    if (source) source.setData(this.getGeoJSON());
  }

  getGeoJSON() {
    const features = [];

    this.points.forEach((coord, i) => {
      if (i === 0) return;
      const dist = segmentDistance(this.points[i - 1], coord);
      features.push({
        type: 'Feature',
        properties: {
          markerType: 'midpoint',
          label: this.formatDist(dist),
        },
        geometry: {
          type: 'Point',
          coordinates: midpoint(this.points[i - 1], coord),
        },
      });
    });

    this.points.forEach((coord) => {
      features.push({
        type: 'Feature',
        properties: {
          markerType: 'point',
          label: '',
        },
        geometry: { type: 'Point', coordinates: coord },
      });
    });

    if (this.points.length > 1) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: this.points },
      });
    }

    return { type: 'FeatureCollection', features };
  }

  updateLabel() {
    const dist = calculateDistance(this.points);
    this.label.textContent = dist > 0 ? this.formatDist(dist) : 'Click next point';
  }
}

const MapMeasureDistance = () => {
  const t = useTranslation();
  const control = useMemo(() => new MeasureControl(), []);
  const distanceUnit = useAttributePreference('distanceUnit', 'km');

  useEffect(() => {
    const unitLabel = distanceUnitString(distanceUnit, t);
    control.setUnit(distanceUnit, unitLabel);
  }, [distanceUnit, t, control]);

  useEffect(() => {
    map.addControl(control, 'top-right');
    return () => map.removeControl(control);
  }, [control]);

  return null;
};

export default MapMeasureDistance;
