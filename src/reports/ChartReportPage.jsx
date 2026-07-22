import dayjs from 'dayjs';
import React, { useState, useMemo } from 'react';
import {
  FormControl, InputLabel, Select, MenuItem, useTheme, Button, ButtonGroup,
  Box, Typography, Card, CardContent,
} from '@mui/material';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Brush,
} from 'recharts';
import ReportFilter from './components/ReportFilter';
import { formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { useCatch } from '../reactHelper';
import { useAttributePreference } from '../common/util/preferences';
import {
  altitudeFromMeters, distanceFromMeters, speedFromKnots, volumeFromLiters,
} from '../common/util/converter';
import useReportStyles from './common/useReportStyles';

const CustomTooltip = ({ active, payload, label, positionAttributes }) => {
  if (active && payload && payload.length) {
    return (
      <Card
        sx={{
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          minWidth: 200,
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
            {formatTime(label, 'seconds')}
          </Typography>
          {payload.map((entry, index) => (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                mb: 0.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: entry.stroke,
                  }}
                />
                <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                  {positionAttributes[entry.dataKey]?.name || entry.dataKey}
                  :
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                {entry.value}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }
  return null;
};

const ChartReportPage = () => {
  const classes = useReportStyles();
  const theme = useTheme();
  const t = useTranslation();

  const positionAttributes = usePositionAttributes(t);

  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  const [items, setItems] = useState([]);
  const [types, setTypes] = useState(['speed']);
  const [selectedTypes, setSelectedTypes] = useState(['speed']);
  const [timeType, setTimeType] = useState('fixTime');
  const [brushDomain, setBrushDomain] = useState(null);
  const [zoomLevel, setZoomLevel] = useState('all');

  const aggregateData = (data, maxPoints = 200) => {
    if (data.length <= maxPoints) return data;

    const interval = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % interval === 0);
  };

  const displayData = useMemo(() => aggregateData(items), [items]);

  const values = displayData.map((it) => selectedTypes.map((type) => it[type]).filter((value) => value != null));
  const minValue = values.length ? Math.min(...values.flat()) : 0;
  const maxValue = values.length ? Math.max(...values.flat()) : 100;
  const valueRange = maxValue - minValue;
  const chartMinValue = Math.max(0, minValue - valueRange / 5);
  const chartMaxValue = maxValue + valueRange / 5;
  const handleSubmit = useCatch(async ({ deviceId, from, to }) => {
    const query = new URLSearchParams({ deviceId, from, to });
    const response = await fetch(`/api/reports/route?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const positions = await response.json();
      const keySet = new Set();
      const keyList = [];
      const formattedPositions = positions.map((position) => {
        const data = { ...position, ...position.attributes };
        const formatted = {};
        formatted.fixTime = dayjs(position.fixTime).valueOf();
        formatted.deviceTime = dayjs(position.deviceTime).valueOf();
        formatted.serverTime = dayjs(position.serverTime).valueOf();
        Object.keys(data).filter((key) => !['id', 'deviceId'].includes(key)).forEach((key) => {
          const value = data[key];
          if (typeof value === 'number') {
            keySet.add(key);
            const definition = positionAttributes[key] || {};
            switch (definition.dataType) {
              case 'speed':
                formatted[key] = speedFromKnots(value, speedUnit).toFixed(2);
                break;
              case 'altitude':
                formatted[key] = altitudeFromMeters(value, altitudeUnit).toFixed(2);
                break;
              case 'distance':
                formatted[key] = distanceFromMeters(value, distanceUnit).toFixed(2);
                break;
              case 'volume':
                formatted[key] = volumeFromLiters(value, volumeUnit).toFixed(2);
                break;
              case 'hours':
                formatted[key] = (value / 1000).toFixed(2);
                break;
              default:
                formatted[key] = value;
                break;
            }
          }
        });
        return formatted;
      });
      Object.keys(positionAttributes).forEach((key) => {
        if (keySet.has(key)) {
          keyList.push(key);
          keySet.delete(key);
        }
      });
      setTypes([...keyList, ...keySet]);
      setItems(formattedPositions);
      setBrushDomain(null);
      setZoomLevel('all');
    } else {
      throw Error(await response.text());
    }
  });

  const handleZoom = (level) => {
    if (displayData.length === 0) return;

    setZoomLevel(level);

    if (level === 'all') {
      setBrushDomain(null);
      return;
    }

    const latestTime = displayData[displayData.length - 1][timeType];
    const hours = { '1h': 1, '6h': 6, '12h': 12, '24h': 24 }[level];
    const startTime = latestTime - (hours * 60 * 60 * 1000);

    const startIndex = displayData.findIndex((item) => item[timeType] >= startTime);
    const endIndex = displayData.length - 1;

    if (startIndex !== -1) {
      setBrushDomain({ startIndex, endIndex });
    }
  };

  const waveColors = [
    { stroke: '#4A90E2', fill: 'rgba(74, 144, 226, 0.3)' },
    { stroke: '#50C878', fill: 'rgba(80, 200, 120, 0.3)' },
    { stroke: '#E57373', fill: 'rgba(229, 115, 115, 0.3)' },
    { stroke: '#FFB74D', fill: 'rgba(255, 183, 77, 0.3)' },
    { stroke: '#BA68C8', fill: 'rgba(186, 104, 200, 0.3)' },
    { stroke: '#4DB6AC', fill: 'rgba(77, 182, 172, 0.3)' },
    { stroke: '#90A4AE', fill: 'rgba(144, 164, 174, 0.3)' },
  ];

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportChart']}>
      <ReportFilter handleSubmit={handleSubmit} showOnly>
        <div className={classes.filterItem}>
          <FormControl fullWidth>
            <InputLabel>{t('reportChartType')}</InputLabel>
            <Select
              label={t('reportChartType')}
              value={selectedTypes}
              onChange={(e) => setSelectedTypes(e.target.value)}
              multiple
              renderValue={(selected) => selected.join(', ')}
              disabled={!displayData.length}
            >
              {types.map((key) => (
                <MenuItem key={key} value={key}>{positionAttributes[key]?.name || key}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className={classes.filterItem}>
          <FormControl fullWidth>
            <InputLabel>{t('reportTimeType')}</InputLabel>
            <Select
              label={t('reportTimeType')}
              value={timeType}
              onChange={(e) => setTimeType(e.target.value)}
              disabled={!displayData.length}
            >
              <MenuItem value="fixTime">{t('positionFixTime')}</MenuItem>
              <MenuItem value="deviceTime">{t('positionDeviceTime')}</MenuItem>
              <MenuItem value="serverTime">{t('positionServerTime')}</MenuItem>
            </Select>
          </FormControl>
        </div>
      </ReportFilter>
      {displayData.length > 0 && (
        <Card
          sx={{
            m: 2,
            backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F5F5F5',
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing
                {' '}
                {displayData.length}
                {' '}
                of
                {' '}
                {items.length}
                {' '}
                data points
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={() => handleZoom('1h')}
                  variant={zoomLevel === '1h' ? 'contained' : 'outlined'}
                >
                  1 Hour
                </Button>
                <Button
                  onClick={() => handleZoom('6h')}
                  variant={zoomLevel === '6h' ? 'contained' : 'outlined'}
                >
                  6 Hours
                </Button>
                <Button
                  onClick={() => handleZoom('12h')}
                  variant={zoomLevel === '12h' ? 'contained' : 'outlined'}
                >
                  12 Hours
                </Button>
                <Button
                  onClick={() => handleZoom('24h')}
                  variant={zoomLevel === '24h' ? 'contained' : 'outlined'}
                >
                  24 Hours
                </Button>
                <Button
                  onClick={() => handleZoom('all')}
                  variant={zoomLevel === 'all' ? 'contained' : 'outlined'}
                >
                  All
                </Button>
              </ButtonGroup>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: {
                  xs: 380,
                  sm: 400,
                  md: 530,
                },
              }}
            >

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={displayData}
                  margin={{
                    top: 10, right: 40, left: 10, bottom: 10,
                  }}
                >
                  <defs>
                    {selectedTypes.map((type, index) => (
                      <linearGradient
                        key={`gradient-${type}`}
                        id={`gradient-${type}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={waveColors[index % waveColors.length].stroke}
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="95%"
                          stopColor={waveColors[index % waveColors.length].stroke}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis
                    stroke={theme.palette.text.secondary}
                    dataKey={timeType}
                    type="number"
                    tickFormatter={(value) => formatTime(value, 'time')}
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                    minTickGap={80}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    stroke={theme.palette.text.secondary}
                    type="number"
                    tickFormatter={(value) => value.toFixed(2)}
                    domain={[chartMinValue, chartMaxValue]}
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <CartesianGrid
                    stroke={theme.palette.divider}
                    strokeDasharray="3 3"
                    opacity={0.3}
                  />
                  <Tooltip content={<CustomTooltip positionAttributes={positionAttributes} />} />
                  <Brush
                    dataKey={timeType}
                    height={40}
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.background.paper}
                    tickFormatter={(value) => formatTime(value, 'time')}
                    startIndex={brushDomain?.startIndex}
                    endIndex={brushDomain?.endIndex}
                    onChange={(domain) => {
                      if (domain) {
                        setBrushDomain(domain);
                        setZoomLevel('custom');
                      }
                    }}
                  />
                  {selectedTypes.map((type, index) => (
                    <Area
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stroke={waveColors[index % waveColors.length].stroke}
                      fill={`url(#gradient-${type})`}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      connectNulls
                      fillOpacity={0.8}
                      isAnimationActive
                      animationDuration={800}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 2, textAlign: 'center' }}
            >
              Use the slider below the chart to zoom into specific time ranges, or click preset buttons above
            </Typography>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
};

export default ChartReportPage;
