config: {
  onDestroyed: () => {
    window.dispatchEvent(new CustomEvent("zoneViolationDemoEnd"));
  }
}

const zoneViolationTour = {
  tourId: 'zoneViolation',
  steps: [
    {
      element: '#notification-alarm-type',
      popover: {
        title: '🚨 Zone Violation Alarm',
        description:
          'The existing Geofence Enter/Exit alarm has been replaced with the new Zone Violation alarm. This unified alarm supports monitoring multiple zone types from a single configuration.',
        side: 'left',
        align: 'start',
        onNextClick: (el, step, { driver: driverObj }) => {
          window.dispatchEvent(new CustomEvent("zoneViolationDemo"));

          setTimeout(() => {
            driverObj.moveNext();
          }, 200);
        }
      },
    },
    {
      element: '#notification-zone-type',
      popover: {
        title: '🗺️ Select Zone Type',
        description:
          'Choose the type of zone you want to monitor. Supported options include Geofence, City, State, and Country.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#notification-violation-type',
      popover: {
        title: '🚪 Select Violation Type',
        description:
          'Choose whether the alert should trigger when a device enters or exits the selected zone.',
        side: 'left',
        align: 'start',
      },
    },
    
    {
      element: '#notification-save',
      popover: {
        title: '💾 Save Configuration',
        description:
          'Save the notification to enable Zone Violation alerts. Alerts will be triggered based on the selected Zone Type, Zone Name, and Violation Type.',
        side: 'left',
        align: 'start',
      },
    },
  ],
};

export default zoneViolationTour;