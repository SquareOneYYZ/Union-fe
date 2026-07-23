# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Traccar Web is the modern React-based web interface for the Traccar GPS tracking platform. Built with React 18, Material UI (MUI), MapLibre GL, and Redux Toolkit, it provides real-time device tracking, reporting, and fleet management capabilities.

**Tech Stack:**
- React 18 with functional components and hooks
- Material UI v5 for UI components
- MapLibre GL for mapping (with Google Maps protocol support)
- Redux Toolkit for state management
- React Router v6 for routing
- Vite for building and development
- Day.js for date/time handling
- 60+ language translations

## Build and Development Commands

### Development
```bash
# Start development server (runs on port 3000)
npm start

# Development server proxies to backend at localhost:8082
# API requests: http://localhost:8082/api
# WebSocket: ws://localhost:8082/api/socket
```

### Building
```bash
# Build for production (outputs to build/ directory)
npm run build

# The build creates a Progressive Web App (PWA) with service worker
```

### Code Quality
```bash
# Run ESLint (uses Airbnb style guide)
npm run lint

# Auto-fix linting issues
npm run lint:fix

# ESLint config is in .eslintrc.json
# Key disabled rules: max-len, no-shadow, no-unused-vars, no-console (warning only)
```

### PWA Assets
```bash
# Generate PWA icons from logo.svg
npm run generate-pwa-assets
```

## Architecture Overview

### Application Bootstrap Flow

1. **Entry Point** (`src/index.jsx`):
   - Creates React root
   - Wraps app in providers: Redux, LocalizationProvider, AppThemeProvider, ServerProvider, BrowserRouter
   - Renders Navigation component
   - Initializes Microsoft Clarity analytics

2. **Navigation** (`src/Navigation.jsx`):
   - Defines all routes using React Router v6
   - Handles query parameter redirects (token auth, deviceId selection, eventId)
   - Main routes: `/` (MainPage), `/login`, `/settings/*`, `/reports/*`, `/replay`, etc.

3. **App Component** (`src/App.jsx`):
   - Session management and authentication
   - Mounts core controllers: SocketController, CachingController, UpdateController
   - Shows BottomMenu on mobile
   - Handles terms acceptance dialog

### Core Controllers

**SocketController** (`src/SocketController.jsx`):
- Manages WebSocket connection to backend (`/api/socket`)
- Real-time updates for devices, positions, events, and logs
- Auto-reconnects with 60s delay on disconnect
- Dispatches updates to Redux store
- Handles event notifications with sound alerts

**CachingController** (`src/CachingController.js`):
- Preloads reference data (geofences, groups, drivers, maintenances, calendars)
- Fetches data once on app initialization

**UpdateController** (`src/UpdateController.jsx`):
- Detects service worker updates
- Shows notification when new version is available

### State Management (Redux Toolkit)

Store is configured in `src/store/index.js` with these slices:
- **session**: User, server config, positions, socket status
- **devices**: Device list, selected device ID
- **events**: Event history
- **geofences**: Geofence definitions
- **groups**: Device groups
- **drivers**: Driver database
- **maintenances**: Maintenance schedules
- **calendars**: Calendar definitions
- **reports**: Report data and filters
- **errors**: Global error handling

**Throttle Middleware** (`src/store/throttleMiddleware.js`):
- Throttles high-frequency updates (devices/positions)
- Buffers actions when >3 updates per 1.5s
- Uses `batch()` to reduce re-renders

### Main Page Structure

**MainPage** (`src/main/MainPage.jsx`):
- Split view: Device list (sidebar) + Map (main area)
- Responsive: Desktop shows both, mobile toggles between them
- Device filtering by keyword, status, group, and map bounds
- Selected device shows StatusCard overlay

**MainToolbar** (`src/main/MainToolbar.jsx`):
- Search bar for device filtering
- Filter controls (status, groups)
- Sort options
- "Filter on map" toggle

**DeviceList** (`src/main/DeviceList.jsx`):
- Virtualized list of filtered devices (react-window)
- Shows device status, position, speed

### Map System

**MapView** (`src/map/core/MapView.jsx`):
- Global singleton map instance initialized at startup
- MapLibre GL with RTL text support
- Style switcher control for multiple map providers
- Map ready state management via listeners
- Preloaded map images for markers/icons

**Map Components** (render on top of MapView):
- `MapMarkers`: Device position markers
- `MapPositions`: Position points and routes
- `MapGeofence`: Geofence polygons/circles
- `MapSelectedDevice`: Highlighted selected device
- `MapAccuracy`: Accuracy circles
- `MapLiveRoutes`: Real-time device trails
- `MapCurrentLocation`: User's current location
- `MapGeocoder`: Address search control

**Map Providers**:
Configured via `useMapStyles` hook, supports:
- OpenStreetMap variants
- LocationIQ (streets/dark)
- MapTiler
- Google Maps (via maplibre-google-maps protocol)
- Mapbox (requires token)
- Custom tile servers

### Routing and Pages

**Page Categories**:
- **Main**: Device tracking (`/`)
- **Login**: Login, register, reset password (`/login`, `/register`, `/reset-password`)
- **Settings**: Devices, users, geofences, notifications, etc. (`/settings/*`)
- **Reports**: Trip, stop, event, summary, chart reports (`/reports/*`)
- **Other**: Replay, position details, network info (`/replay`, `/position/:id`)

**Page Layout Pattern**:
Most pages use `PageLayout` component which provides consistent header with breadcrumb navigation.

### Settings Pages

Settings pages typically follow this pattern:
- List page (e.g., `DevicesPage.jsx`): Shows table with add/edit/delete actions
- Detail page (e.g., `DevicePage.jsx`): Form for creating/editing single item
- Use `EditItemView` or `EditCollectionView` from `settings/components`

### Reports System

**Report Pages**:
- All reports use `ReportFilter` component for date range and device selection
- Reports fetch from backend API (`/api/reports/*`)
- Support Excel/CSV export
- Common reports: trip, stop, summary, route, event, chart

### Localization

**LocalizationProvider** (`src/common/components/LocalizationProvider.jsx`):
- Supports 60+ languages
- JSON translation files in `src/resources/l10n/`
- Auto-detects browser language
- RTL support for Arabic, Hebrew, Farsi
- Hook: `useTranslation()` returns `t(key)` function
- Hook: `useLocalization()` for language switching

### API Communication

**REST API**:
- Base URL: `/api`
- Session-based authentication (cookie)
- All API calls use standard `fetch()`
- Error handling via `useEffectAsync` and `useCatch` helpers in `reactHelper.js`

**Common API Patterns**:
```javascript
// Fetch devices
const response = await fetch('/api/devices');
const devices = await response.json();

// Update user
await fetch(`/api/users/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(user),
});

// Delete geofence
await fetch(`/api/geofences/${id}`, { method: 'DELETE' });
```

**WebSocket**:
Real-time updates via WebSocket at `/api/socket`. Messages have this structure:
```javascript
{
  devices: [...],      // Updated devices
  positions: [...],    // New positions
  events: [...],       // New events
  logs: [...]          // System logs (if enabled)
}
```

### Custom Hooks

**reactHelper.js**:
- `useEffectAsync(effect, deps)`: Like useEffect but for async functions with error handling
- `useCatch(method)`: Wraps async method with error dispatching
- `usePrevious(value)`: Returns previous value from last render

**Utility Hooks**:
- `usePersistedState(key, defaultValue)`: localStorage-backed state
- `useAttributePreference(key, defaultValue)`: User/server attribute preference
- `usePreference(category, defaultValue)`: User preference
- `useQuery()`: URL query parameters (uses URLSearchParams)
- `useFilter()`: Device filtering logic

### Styling

**Material UI Styling**:
- Uses `makeStyles` from `@mui/styles` (JSS-based)
- Theme configured in `src/common/theme/`
- Custom theme dimensions in `dimensions.js`
- Component overrides in `components.js`
- Dark/light theme support via `AppThemeProvider`

**Common Patterns**:
```javascript
const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}));

const Component = () => {
  const classes = useStyles();
  return <div className={classes.root}>Content</div>;
};
```

### Configuration

**Environment Variables** (`.env`):
- `VITE_APP_VERSION`: Automatically set from package.json version

**Vite Config** (`vite.config.js`):
- Dev server on port 3000
- Proxies `/api` and `/api/socket` to localhost:8082
- Build output: `build/`
- PWA plugin configured with service worker
- SVGR plugin for SVG imports as React components

### Important Conventions

**Component Patterns**:
- Use arrow function components (enforced by ESLint)
- Functional components only (no class components)
- Props are not validated with PropTypes (disabled in ESLint)

**Code Style**:
- Airbnb ESLint config with customizations
- No max line length
- `no-console` is warning only (logs allowed)
- `no-unused-vars` disabled
- Object curly newline: 8 properties minimum

**File Organization**:
- Components: `.jsx` extension
- Utilities: `.js` extension
- Styles: Inline with `makeStyles` (no separate CSS files except for map controls)
- Assets: `src/resources/` (images, sounds, translations)

### Backend Integration

This frontend connects to the Traccar Java backend (separate repository). Key integration points:
- Session API: `/api/session`
- Devices API: `/api/devices`
- Positions API: `/api/positions`
- Events API: `/api/events`
- WebSocket: `/api/socket`

In development, the backend should run on port 8082 (configured in vite.config.js proxy).

### Mobile Considerations

**Responsive Design**:
- Desktop breakpoint: `md` (Material UI breakpoint)
- Mobile: Stacked layout with toggle between map and list
- Bottom navigation on mobile
- Drawer-based menus

**Progressive Web App**:
- Service worker caches all assets
- Installable on mobile devices
- Offline support for cached pages
- Icons generated via `pwa-assets-generator`
