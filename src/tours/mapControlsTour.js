const mapControlsTour = {
  tourId: 'mapControls',
  steps: [
    {
      element: '#map-ctrl-fullscreen',
      popover: {
        title: '⛶ Full Screen Mode',
        description: 'Click this button to expand the map to full screen for a distraction-free tracking experience. Press Esc or click again to exit.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#map-ctrl-geofence',
      popover: {
        title: '🗺️ Quick Access — Create Geofence',
        description: 'Use this shortcut to jump directly into geofence management from the map. Draw, edit, or assign geofences without leaving the map view.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#map-ctrl-measure',
      popover: {
        title: '📏 Measure Distance',
        description: 'Activate the measure tool then click two or more points on the map to calculate the real-world distance between them. Click the last point twice to finish.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#map-ctrl-zoombar',
      popover: {
        title: '🔍 Zoom Bar',
        description: 'Use the + and – buttons or drag the slider to zoom in and out of the map. Alternatively, use the scroll wheel or pinch gesture on touch devices.',
        side: 'left',
        align: 'start',
      },
    },
  ],
};

export default mapControlsTour;