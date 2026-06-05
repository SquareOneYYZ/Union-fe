import React, { useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import {
  IconButton, Paper, Slider, Toolbar, Typography, Box, Chip,
  Tooltip, useTheme, Avatar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapScale from '../map/MapScale';
import MapCamera from '../map/MapCamera';
import MapPositions from '../map/MapPositions';
import MapRouteCoordinates from '../map/MapRouteCoordinates';
import ReportFilter from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatTime } from '../common/util/formatter';
import SelectField from '../common/components/SelectField';
import { useStyles, SPEED_OPTIONS } from './replayStyles';
import { useReplayState } from './useReplayState';

const ReplayPage = () => {
  const t = useTranslation();
  const classes = useStyles();
  const navigate = useNavigate();
  const theme = useTheme();
  const [devicesOpen, setDevicesOpen] = useState(false);

  const {
    from,
    to,
    expanded,
    setExpanded,
    loading,
    titleExpanded,
    setTitleExpanded,
    playing,
    setPlaying,
    speed,
    setSpeed,
    currentTime,
    hasData,
    primaryName,
    timelineStart,
    timelineEnd,
    sliderValue,
    playheadPercent,
    chartData,
    deviceMarkers,
    deviceRoutes,
    allCoordinates,
    allSpeeds,
    compareDeviceList,
    usedDeviceIds,
    pendingCompareId,
    setPendingCompareId,
    devices,
    handleSliderChange,
    handleStepBack,
    handleStepForward,
    handleSubmit,
    handleAddCompareDevice,
    handleRemoveCompareDevice,
    handleDownload,
  } = useReplayState();

  const isAtEnd = currentTime >= timelineEnd;

  const speedGradientStops = {
    high: theme.palette.error.main,
    medium: theme.palette.warning.main,
    low: theme.palette.success.main,
  };

  return (
    <div className={classes.root}>
      <MapView>
        <MapGeofence />
        {deviceRoutes.map((route) => (
          <MapRouteCoordinates
            key={route.deviceId}
            name=''
            coordinates={route.coordinates}
            deviceId={route.deviceId}
          />
        ))}
        {deviceMarkers.length > 0 && (
          <MapPositions
            positions={deviceMarkers}
            titleField="name"
            sourceId="replay-markers"
            cluster={false}
          />
        )}
      </MapView>

      <MapScale />
      {allCoordinates.length > 0 && <MapCamera coordinates={allCoordinates} />}

      {!expanded && hasData && (
        <Box className={classes.speedStrip}>
          <Box className={classes.deviceLegend}>
            {allSpeeds.map((item) => (
              <Box key={item.label} className={classes.deviceLegendItem}>
                <Box className={classes.deviceDot} sx={{ background: item.color }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {item.label}:&nbsp;
                  <span style={{ fontWeight: 600, color: item.color }}>
                    {Math.round(item.speed)} km/h
                  </span>
                </Typography>
              </Box>
            ))}
          </Box>

          <div className={classes.chartWrapper}>
            <ResponsiveContainer width="100%" height={48}>
              <ComposedChart
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={speedGradientStops.high} stopOpacity={0.9} />
                    <stop offset="40%" stopColor={speedGradientStops.medium} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={speedGradientStops.low} stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="speed"
                  fill="url(#speedGrad)"
                  stroke={theme.palette.divider}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                  baseValue={0}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <svg className={classes.playheadOverlay}>
              <line
                x1={`${playheadPercent}%`} y1="0%"
                x2={`${playheadPercent}%`} y2="100%"
                stroke={theme.palette.primary.light}
                strokeWidth={3}
              />
            </svg>
          </div>
        </Box>
      )}

      <div className={`${classes.sidebar} ${titleExpanded ? 'expanded' : ''}`}>
        <Paper elevation={3} square>
          <Toolbar sx={{ alignItems: 'center', minHeight: 'unset', paddingTop: 1, paddingBottom: 1 }}>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Tooltip
              title={`${t('reportReplay')}${primaryName ? ` - ${primaryName}` : ''}`}
              arrow
              placement="bottom"
            >
              <Typography
                variant="subtitle1"
                onClick={() => setTitleExpanded((prev) => !prev)}
                noWrap={!titleExpanded}
                sx={{
                  overflow: 'hidden',
                  textOverflow: titleExpanded ? 'unset' : 'ellipsis',
                  whiteSpace: titleExpanded ? 'normal' : 'nowrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  flexGrow: 1,
                }}
              >
                {t('reportReplay')}
                {primaryName ? ` - ${primaryName}` : ''}
              </Typography>
            </Tooltip>
            {!expanded && (
              <>
                <IconButton onClick={handleDownload}><DownloadIcon /></IconButton>
                <IconButton edge="end" onClick={() => setExpanded(true)}><TuneIcon /></IconButton>
              </>
            )}
          </Toolbar>
        </Paper>

        <Paper className={classes.content} square>
          {!expanded ? (
            <>
              <Box className={classes.speedControl}>
                <Box className={classes.speedChips}>
                  {SPEED_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={`${opt}x`}
                      onClick={() => setSpeed(opt)}
                      color={speed === opt ? 'primary' : 'default'}
                      variant={speed === opt ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ minWidth: 48 }}
                    />
                  ))}
                </Box>
              </Box>

              <Slider
                className={classes.slider}
                min={0}
                max={100}
                step={0.01}
                value={sliderValue}
                onChange={handleSliderChange}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {from ? formatTime(from, 'seconds') : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {to ? formatTime(to, 'seconds') : '—'}
                </Typography>
              </Box>

              <div className={classes.controls}>
                <IconButton
                  onClick={handleStepBack}
                  disabled={playing || currentTime <= timelineStart}
                >
                  <FastRewindIcon />
                </IconButton>
                <IconButton onClick={() => setPlaying(!playing)} disabled={isAtEnd}>
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton
                  onClick={handleStepForward}
                  disabled={playing || isAtEnd}
                >
                  <FastForwardIcon />
                </IconButton>
              </div>

              <Box className={classes.compareSection}>

                {/* Header row — clickable to expand/collapse */}
                <Box
                  onClick={() => setDevicesOpen((prev) => !prev)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Compare Devices {compareDeviceList.length > 0 ? `(${compareDeviceList.length})` : ''}
                  </Typography>
                  {devicesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </Box>

                {/* Collapsible section */}
                {devicesOpen && (
                  <Box sx={{ mt: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>

                    {/* Device list rows */}
                    {compareDeviceList.length > 0 ? (
                      compareDeviceList.map((d) => (
                        <Box
                          key={d.deviceId}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 0.75,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                              {d.name}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => handleRemoveCompareDevice(d.deviceId)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', px: 1.5, py: 1 }}>
                        No devices added yet.
                      </Typography>
                    )}

                    {/* Add device row inside the dropdown */}
                    <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Box className={classes.addRow}>
                        <SelectField
                          label="Add Device"
                          fullWidth
                          data={Object.values(devices)
                            .filter((d) => !usedDeviceIds.has(String(d.id)))
                            .sort((a, b) => a.name.localeCompare(b.name))}
                          value={pendingCompareId}
                          onChange={(e) => setPendingCompareId(e.target.value)}
                          sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}
                        />
                        <Tooltip title={!from ? 'Load a primary device first' : 'Add device to replay'}>
                          <span>
                            <IconButton
                              color="primary"
                              onClick={handleAddCompareDevice}
                              disabled={!pendingCompareId || !from}
                              size="small"
                              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}
                            >
                              <AddIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>

                  </Box>
                )}

              </Box>
            </>
          ) : (
            <ReportFilter handleSubmit={handleSubmit} fullScreen showOnly loading={loading} />
          )}
        </Paper>
      </div>
    </div>
  );
};

export default ReplayPage;