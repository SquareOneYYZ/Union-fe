export const tourDefinitions = {
  fullscreen: [
    {
      element: '.maplibre-ctrl-fullscreen',
      popover: {
        title: '⛶ Full Screen Mode',
        description: 'Click this button to expand the map to full screen. Click again or press Esc to exit.',
        side: 'left',
        align: 'start',
      },
    },
  ],

  zoombar: [
    {
      element: '#zoom-bar-control',
      popover: {
        title: '🔍 Zoom Bar',
        description: 'Use + and – to zoom in and out quickly without scrolling.',
        side: 'left',
      },
    },
  ],

  measure: [
    {
      element: '#measure-distance-control',
      popover: {
        title: '📏 Measure Distance',
        description: 'Activate this tool then click two points on the map to see the distance between them.',
        side: 'left',
      },
    },
  ],
};