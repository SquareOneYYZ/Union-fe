import React, {
  useState, useCallback, useMemo, useEffect,
} from 'react';
import {
  MoreVert, Settings, Refresh, Speed, LocationOn, Warning,
  FilterList, FlashOff, EventNote,
} from '@mui/icons-material';
import {
  Box, Typography, IconButton, Button, Paper,
  MenuItem, Select, FormControl, InputLabel,
  Chip, Skeleton, Tooltip, Divider, alpha, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ReportTable, DarkTableRow, DarkTableCell } from '../../reports/components/StyledTableComponents';
import SelectField from './SelectField';
import { useTranslation } from './LocalizationProvider';
import { useEffectAsync } from '../../reactHelper';
import { prefixString } from '../util/stringUtils';

const EXCLUDED_EVENT_TYPES = ['deviceFuelDrop', 'deviceFuelIncrease', 'textMessage', 'driverChanged', 'media'];

const VIEW_EVENTS = 'events';
const VIEW_POWERCUT = 'powercut';

// ─── Event view helpers ───────────────────────────────────────────────────────

const eventTypeColor = (type) => (
  { speedCamera: 'warning', geofence: 'info', maintenance: 'secondary', alarm: 'error', ignition: 'success' }[type] ?? 'default'
);

const EventTypeChip = ({ type }) => {
  const sx = { fontSize: 13 };
  let icon = <Warning sx={sx} />;
  if (type === 'speedCamera') icon = <Speed sx={sx} />;
  else if (type === 'geofence') icon = <LocationOn sx={sx} />;

  return (
    <Chip
      icon={icon}
      label={type}
      color={eventTypeColor(type)}
      size="small"
      variant="outlined"
      sx={{
        fontSize: 11,
        fontWeight: 600,
        height: 22,
        textTransform: 'none',
        letterSpacing: 0.2,
        '& .MuiChip-icon': { ml: '6px' },
      }}
    />
  );
};

const fmt = (iso) => new Date(iso).toLocaleString(undefined, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const EmptyCell = () => <span style={{ opacity: 0.35 }}>—</span>;

// ─── Column definitions ───────────────────────────────────────────────────────

const EVENT_COLUMNS = [
  { key: 'deviceName', labelKey: 'sharedDevice', sortable: true },
  { key: 'type', labelKey: 'sharedType', sortable: true },
  { key: 'highway', labelKey: 'positionHighway', sortable: false },
  { key: 'speedLimit', labelKey: 'reportSpeedLimit', sortable: true },
  { key: 'deviceSpeed', labelKey: 'positionSpeed', sortable: true },
  { key: 'geofenceId', labelKey: 'sharedGeofence', sortable: false },
  { key: 'maintenanceId', labelKey: 'sharedMaintenance', sortable: false },
  { key: 'eventTime', labelKey: 'positionFixTime', sortable: true },
  { key: 'actions', labelKey: '', sortable: false },
];

const POWERCUT_COLUMNS = [
  { key: 'deviceName', labelKey: 'sharedDevice', sortable: true },
  { key: 'groupName', labelKey: 'settingsGroups', sortable: true },
  { key: 'firstPowerCut', labelKey: 'dashboardFirstPowerCut', sortable: true },
  { key: 'lastPowerCut', labelKey: 'dashboardLastPowerCut', sortable: true },
  { key: 'totalPowerCutEvents', labelKey: 'dashboardTotalPowerCuts', sortable: true },
];

// ─── Row components ───────────────────────────────────────────────────────────

const EventRow = ({ event }) => {
  const theme = useTheme();
  const overSpeed = event.attributes?.speedLimit > 0
    && event.attributes?.deviceSpeed > event.attributes?.speedLimit;

  const speedBg = overSpeed ? alpha(theme.palette.error.main, 0.1) : 'transparent';
  const speedColor = overSpeed ? theme.palette.error.main : theme.palette.text.primary;
  const speedLimitDisplay = event.attributes?.speedLimit > 0 ? `${event.attributes.speedLimit} km/h` : null;
  const deviceSpeedDisplay = event.attributes?.deviceSpeed != null ? event.attributes.deviceSpeed.toFixed(1) : null;
  const geofenceDisplay = event.geofenceId > 0 ? String(event.geofenceId) : null;
  const maintenanceDisplay = event.maintenanceId > 0 ? String(event.maintenanceId) : null;

  return (
    <DarkTableRow sx={{ ...(overSpeed && { borderLeft: `3px solid ${theme.palette.error.main}` }) }}>
      <DarkTableCell sx={{ pl: overSpeed ? '13px' : 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{event.deviceName}</Typography>
      </DarkTableCell>
      <DarkTableCell>
        <EventTypeChip type={event.type} />
      </DarkTableCell>
      <DarkTableCell>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {event.attributes?.highway ?? <EmptyCell />}
        </Typography>
      </DarkTableCell>
      <DarkTableCell align="right">
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {speedLimitDisplay ?? <EmptyCell />}
        </Typography>
      </DarkTableCell>
      <DarkTableCell align="right">
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          backgroundColor: speedBg,
        }}
        >
          {overSpeed && <Speed sx={{ fontSize: 12, color: theme.palette.error.main }} />}
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: speedColor }}>
            {deviceSpeedDisplay ?? '—'}
          </Typography>
          {deviceSpeedDisplay && (
            <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>km/h</Typography>
          )}
        </Box>
      </DarkTableCell>
      <DarkTableCell>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {geofenceDisplay ?? <EmptyCell />}
        </Typography>
      </DarkTableCell>
      <DarkTableCell>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {maintenanceDisplay ?? <EmptyCell />}
        </Typography>
      </DarkTableCell>
      <DarkTableCell>
        <Tooltip title={event.eventTime} placement="top" arrow>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {fmt(event.eventTime)}
          </Typography>
        </Tooltip>
      </DarkTableCell>
      <DarkTableCell padding="none" sx={{ pr: 1 }}>
        <IconButton size="small" sx={{ color: theme.palette.text.disabled }}>
          <MoreVert sx={{ fontSize: 15 }} />
        </IconButton>
      </DarkTableCell>
    </DarkTableRow>
  );
};

const PowerCutRow = ({ record }) => {
  const theme = useTheme();
  return (
    <DarkTableRow>
      <DarkTableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.deviceName}</Typography>
      </DarkTableCell>
      <DarkTableCell>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {record.groupName ?? <EmptyCell />}
        </Typography>
      </DarkTableCell>
      <DarkTableCell>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {fmt(record.firstPowerCut)}
        </Typography>
      </DarkTableCell>
      <DarkTableCell>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {fmt(record.lastPowerCut)}
        </Typography>
      </DarkTableCell>
      <DarkTableCell align="center">
        <Chip
          label={record.totalPowerCutEvents}
          size="small"
          color="error"
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: 12, height: 22 }}
        />
      </DarkTableCell>
    </DarkTableRow>
  );
};

// ─── Skeleton adapts to active column set ─────────────────────────────────────

const SkeletonRows = ({ count, columns }) => Array.from({ length: count }).map((_, i) => (
  <DarkTableRow key={i}>
    {columns.map((col) => (
      <DarkTableCell key={col.key}>
        <Skeleton variant="text" height={16} sx={{ borderRadius: 1 }} />
      </DarkTableCell>
    ))}
  </DarkTableRow>
));

// ─── Main component ───────────────────────────────────────────────────────────

const DashboardEventsTable = () => {
  const theme = useTheme();
  const t = useTranslation();

  const [activeView, setActiveView] = useState(VIEW_EVENTS);

  // Events state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [filterDevice, setFilterDevice] = useState(null);
  const [filterEventTypes, setFilterEventTypes] = useState(['allEvents']);
  const [filterGroup, setFilterGroup] = useState(null);
  const [limit, setLimit] = useState(10);
  const [allEventTypes, setAllEventTypes] = useState([['allEvents', 'eventAll']]);

  // PowerCut state
  const [powercuts, setPowercuts] = useState([]);
  const [powercutLoading, setPowercutLoading] = useState(false);
  const [powercutError, setPowercutError] = useState(null);

  // Shared sort state — reset when view changes
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('eventTime');

  useEffectAsync(async () => {
    const res = await fetch('/api/notifications/types');
    if (res.ok) {
      const types = await res.json();
      const filtered = types.filter((item) => !EXCLUDED_EVENT_TYPES.includes(item.type));
      setAllEventTypes([
        ['allEvents', 'eventAll'],
        ...filtered.map((it) => [it.type, prefixString('event', it.type)]),
      ]);
    }
  }, []);

  const activeColumns = activeView === VIEW_EVENTS ? EVENT_COLUMNS : POWERCUT_COLUMNS;
  const loading = activeView === VIEW_EVENTS ? eventsLoading : powercutLoading;
  const error = activeView === VIEW_EVENTS ? eventsError : powercutError;

  const headers = activeColumns.map(({ key, labelKey, sortable }) => {
    const label = labelKey ? t(labelKey) : '';
    if (sortable) return { label, sortKey: key };
    return label;
  });

  // ── Fetch events ──
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const params = new URLSearchParams({ limit });
      const hasTypeFilter = !filterEventTypes.includes('allEvents');
      if (hasTypeFilter) filterEventTypes.forEach((type) => params.append('eventType', type));
      if (filterDevice) params.set('deviceId', filterDevice);
      if (filterGroup) params.set('groupId', filterGroup);

      const res = await fetch(`/api/dashboard/recentEvents?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
      setEvents(arr);
    } catch (err) {
      setEventsError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, [limit, filterEventTypes, filterDevice, filterGroup]);

  // ── Fetch power cuts ──
  const fetchPowercuts = useCallback(async () => {
    setPowercutLoading(true);
    setPowercutError(null);
    try {
      const res = await fetch('/api/dashboard/powercut');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      setPowercuts(Array.isArray(raw) ? raw : [raw]);
    } catch (err) {
      setPowercutError(err.message);
    } finally {
      setPowercutLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Fetch powercut data only when that view is first activated
  useEffect(() => {
    if (activeView === VIEW_POWERCUT && powercuts.length === 0 && !powercutLoading) {
      fetchPowercuts();
    }
  }, [activeView]);

  const handleViewChange = (_, newView) => {
    if (!newView) return;
    setActiveView(newView);
    setOrder('desc');
    setOrderBy(newView === VIEW_EVENTS ? 'eventTime' : 'firstPowerCut');
  };

  const handleRefresh = () => {
    if (activeView === VIEW_EVENTS) fetchEvents();
    else fetchPowercuts();
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleEventTypeChange = (e, child) => {
    let values = e.target.value;
    const clicked = child.props.value;
    if (values.includes('allEvents') && values.length > 1) {
      values = [clicked];
    }
    setFilterEventTypes(values);
  };

  // ── Sort logic shared for both views ──
  const sortedData = useMemo(() => {
    const source = activeView === VIEW_EVENTS ? events : powercuts;
    if (!source.length) return [];

    const resolve = (item, key) => {
      if (key === 'highway') return item.attributes?.highway ?? '';
      if (key === 'speedLimit') return item.attributes?.speedLimit ?? 0;
      if (key === 'deviceSpeed') return item.attributes?.deviceSpeed ?? 0;
      return item[key];
    };

    return [...source].sort((a, b) => {
      let aVal = resolve(a, orderBy);
      let bVal = resolve(b, orderBy);
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const isTimeField = orderBy.toLowerCase().includes('time') || orderBy.toLowerCase().includes('cut');
      if (isTimeField) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (order === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [activeView, events, powercuts, order, orderBy]);

  const isAllEvents = filterEventTypes.includes('allEvents');
  const activeFilterCount = [filterDevice, filterGroup, !isAllEvents ? true : null].filter(Boolean).length;

  const titleText = activeView === VIEW_EVENTS ? t('reportEvents') : t('dashboardPowerCutReport');
  const countLabel = activeView === VIEW_EVENTS ? events.length : powercuts.length;

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>

      {/* Header */}
      <Box sx={{
        px: 2.5,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
            {titleText}
          </Typography>
          {!loading && (
            <Chip
              label={countLabel}
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

          {/* View toggle — Events | Power Cut */}
          <ToggleButtonGroup
            value={activeView}
            exclusive
            onChange={handleViewChange}
            size="small"
            sx={{
              height: 32,
              '& .MuiToggleButton-root': {
                px: 1.5,
                fontSize: 12,
                textTransform: 'none',
                fontWeight: 600,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '8px !important',
                gap: 0.5,
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          >
            <ToggleButton value={VIEW_EVENTS}>
              <EventNote sx={{ fontSize: 15 }} />
              {t('reportEvents')}
            </ToggleButton>
            <ToggleButton value={VIEW_POWERCUT}>
              <FlashOff sx={{ fontSize: 15 }} />
              {t('dashboardPowerCut')}
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Show limit — only relevant for events view */}
          {activeView === VIEW_EVENTS && (
            <FormControl size="small">
              <Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  height: 32,
                  borderRadius: 1.5,
                  color: theme.palette.text.secondary,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                  '& .MuiSelect-select': { py: '5px', pr: '28px !important', pl: 1.5 },
                }}
              >
                {[5, 10, 25, 50].map((n) => (
                  <MenuItem key={n} value={n} sx={{ fontSize: 13 }}>
                    {t('sharedShow')}
                    {' '}
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Tooltip title={t('sharedRefresh')}>
            <span>
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={loading}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  width: 32,
                  height: 32,
                  color: theme.palette.text.secondary,
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.06) },
                }}
              >
                <Refresh sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Settings sx={{ fontSize: 14 }} />}
            sx={{ height: 32, fontSize: 12, borderRadius: 1.5, textTransform: 'none' }}
          >
            {t('sharedCustomize')}
          </Button>
        </Box>
      </Box>

      {/* Filter bar — shown only for Events view */}
      {activeView === VIEW_EVENTS && (
        <Box sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: theme.palette.text.secondary }}>
            <FilterList sx={{ fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {t('sharedFilter')}
            </Typography>
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="primary"
                sx={{ height: 18, fontSize: 11, fontWeight: 700, borderRadius: 1, ml: 0.25 }}
              />
            )}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <SelectField
            label={t('sharedDevice')}
            endpoint="/api/devices"
            value={filterDevice}
            onChange={(e) => setFilterDevice(e.target.value || null)}
            emptyValue={null}
            emptyTitle={t('sharedAll')}
            sx={{ minWidth: 180 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('reportEventTypes')}</InputLabel>
            <Select
              label={t('reportEventTypes')}
              multiple
              value={filterEventTypes}
              onChange={handleEventTypeChange}
              sx={{
                borderRadius: '13px',
                '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
              }}
            >
              {allEventTypes.map(([key, string]) => (
                <MenuItem key={key} value={key}>
                  {t(string)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <SelectField
            label={t('settingsGroups')}
            endpoint="/api/groups"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value || null)}
            emptyValue={null}
            emptyTitle={t('sharedAll')}
            sx={{ minWidth: 180 }}
          />

          {activeFilterCount > 0 && (
            <Button
              size="small"
              variant="text"
              onClick={() => { setFilterDevice(null); setFilterEventTypes(['allEvents']); setFilterGroup(null); }}
              sx={{ fontSize: 12, textTransform: 'none', color: theme.palette.text.secondary, ml: 'auto', height: 32 }}
            >
              {t('sharedClear')}
            </Button>
          )}
        </Box>
      )}

      {/* Error banner */}
      {error && (
        <Box sx={{
          px: 2.5,
          py: 1,
          backgroundColor: alpha(theme.palette.error.main, 0.08),
          borderBottom: `1px solid ${theme.palette.error.light}`,
        }}
        >
          <Typography variant="body2" color="error" sx={{ fontSize: 13 }}>
            {t('sharedError')}
            :
            {error}
          </Typography>
        </Box>
      )}

      {/* Table */}
      <ReportTable
        headers={headers}
        loading={loading}
        loadingComponent={<SkeletonRows count={Math.min(limit, 8)} columns={activeColumns} />}
        sortable
        sortConfig={{ order, orderBy }}
        onSort={handleSort}
      >
        {sortedData.length === 0 && !loading ? (
          <DarkTableRow>
            <DarkTableCell colSpan={headers.length} align="center" sx={{ py: 6 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.disabled }}>
                {t('sharedNoData')}
              </Typography>
            </DarkTableCell>
          </DarkTableRow>
        ) : (
          activeView === VIEW_EVENTS
            ? sortedData.map((ev) => <EventRow key={ev.id} event={ev} />)
            : sortedData.map((rec) => <PowerCutRow key={rec.deviceId} record={rec} />)
        )}
      </ReportTable>

    </Paper>
  );
};

export default DashboardEventsTable;
