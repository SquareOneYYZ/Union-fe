const vinDecoderTour = {
  tourId: 'vinDecoder',
  steps: [
    {
      element: '#vin-field',
      popover: {
        title: '🔍 Enter VIN Number',
        description: 'Type or paste a valid 17-character VIN number here. The system will automatically validate and decode it using the VIN decoder API. Invalid VINs will be flagged immediately.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-make',
      popover: {
        title: '🚗 Vehicle Make',
        description: 'Once a valid VIN is decoded, the vehicle make (e.g., Toyota, Ford) is auto-populated here. You can edit this field manually if needed — just type to override the suggestion.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-manufacturer',
      popover: {
        title: '🏭 Manufacturer',
        description: 'The manufacturer details are filled automatically from the VIN decode response. This may differ from the make — for example, make could be "Chevrolet" while manufacturer is "General Motors".',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-model',
      popover: {
        title: '📋 Model',
        description: 'The exact vehicle model is populated here after decoding. If the decoded value is incorrect, click the field and type to override it with a custom value.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-model-year',
      popover: {
        title: '📅 Model Year',
        description: 'The manufacturing year of the vehicle is extracted from the VIN and filled automatically. VIN positions 10 encodes the model year — our decoder resolves this for you.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-trim',
      popover: {
        title: '✨ Trim Level',
        description: 'Trim level (e.g., LX, EX, Sport, Limited) is decoded from the VIN where available. If the VIN does not encode a trim level, this field will remain empty for manual entry.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-body-class',
      popover: {
        title: '🚙 Body Class',
        description: 'The body classification (e.g., Sedan, SUV, Pickup, Hatchback) is auto-filled from the VIN decode result. This helps categorize the vehicle correctly in the system.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-vehicle-type',
      popover: {
        title: '🏷️ Vehicle Type',
        description: 'The vehicle type indicates the broader category such as Passenger Car, Multipurpose Passenger Vehicle (MPV), or Truck. This is decoded directly from the VIN.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-engine',
      popover: {
        title: '⚙️ Engine Details',
        description: 'Engine specifications including horsepower, number of cylinders, and displacement are populated automatically. These values come directly from the manufacturer data tied to your VIN.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#vin-fuel-type',
      popover: {
        title: '⛽ Fuel Type',
        description: 'The primary fuel type (e.g., Gasoline, Diesel, Electric, Hybrid) is decoded from the VIN. For electric vehicles, the battery type field will also be populated automatically.',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
};

export default vinDecoderTour;