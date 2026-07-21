import React from 'react';
import {
  Box, Paper, Typography, IconButton, Avatar,
  Chip, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Fade, useTheme,
} from '@mui/material';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import FmdGoodRoundedIcon from '@mui/icons-material/FmdGoodRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';

import { fmtTime, fmtDateTime, statusColor } from './chatConfig';

const renderMarkdown = (text) => {
  if (!text) return null;

  return text.split('\n').map((line, lineIndex) => {
    const isBullet = /^[-•]\s/.test(line);
    const content = line.replace(/^[-•]\s/, '');

    const lineKey = `line-${content}-${lineIndex}`;

    const parts = content.split(/\*\*(.+?)\*\*/g).map((part, partIndex) => {
      const partKey = `${lineKey}-part-${part}-${partIndex}`;

      if (partIndex % 2 === 1) {
        return <strong key={partKey}>{part}</strong>;
      }

      return <span key={partKey}>{part}</span>;
    });

    return (
      <Box
        key={lineKey}
        component="span"
        sx={{
          display: 'block',
          pl: isBullet ? 1.5 : 0,
          position: 'relative',
        }}
      >
        {isBullet && (
          <Box component="span" sx={{ position: 'absolute', left: 0 }}>
            •
          </Box>
        )}
        {parts}
      </Box>
    );
  });
};

export const DeviceCard = ({ device, onLocate }) => {
  const theme = useTheme();
  const hasLoc = device.latitude != null && device.longitude != null;

  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, mb: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>{device.name || '—'}</Typography>
          <Stack direction="row" flexWrap="wrap" sx={{ mt: 0.4, gap: 0.4 }}>
            {device.plate && <Chip label={`Plate: ${device.plate}`} size="small" variant="outlined" sx={{ fontSize: '0.67rem', height: 18 }} />}
            {device.vin && <Chip label={`VIN: ${device.vin}`} size="small" variant="outlined" sx={{ fontSize: '0.67rem', height: 18 }} />}
            {device.status && <Chip label={device.status} size="small" color={statusColor(device.status)} sx={{ fontSize: '0.67rem', height: 18 }} />}
          </Stack>
          {device.imei && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.66rem', display: 'block' }}>
              IMEI:
              {device.imei}
            </Typography>
          )}
          {device.group && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem', display: 'block' }}>
              Group:
              {device.group}
            </Typography>
          )}
        </Box>
        {hasLoc && (
          <Tooltip title="Locate on map">
            <IconButton size="small" color="primary" onClick={() => onLocate(device)} sx={{ flexShrink: 0 }}>
              <MyLocationRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {(device.speed != null || device.lastUpdate || hasLoc) && (
        <Stack direction="row" flexWrap="wrap" spacing={1.5} sx={{ mt: 0.75 }}>
          {device.speed != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <SpeedRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {device.speed}
                {' '}
                km/h
              </Typography>
            </Box>
          )}
          {device.lastUpdate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{fmtDateTime(device.lastUpdate)}</Typography>
            </Box>
          )}
          {hasLoc && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <FmdGoodRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {Number(device.latitude).toFixed(4)}
                ,
                {Number(device.longitude).toFixed(4)}
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </Paper>
  );
};

export const EventList = ({ events }) => {
  const theme = useTheme();
  if (!events?.length) return null;
  return (
    <Box sx={{ mt: 0.5, borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
      <Table size="small" sx={{ '& td,& th': { py: 0.5, px: 0.9, fontSize: '0.71rem' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100' }}>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Event</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Device</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((ev, index) => {
            const isEven = index % 2 === 0;
            let bgColor;
            if (isEven) {
              bgColor = theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50';
            } else {
              bgColor = 'transparent';
            }
            const rowKey = ev.id || `${ev.serverTime || ev.time}-${ev.deviceName}`;
            return (
              <TableRow key={rowKey} sx={{ bgcolor: bgColor }}>
                <TableCell>{ev.type || ev.eventType || '—'}</TableCell>
                <TableCell>{ev.deviceName || '—'}</TableCell>
                <TableCell>{fmtDateTime(ev.serverTime || ev.time)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

const FLEET_STATS = [
  { label: 'Total', key: 'total', color: 'text.primary' },
  { label: 'Online', key: 'online', color: 'success.main' },
  { label: 'Offline', key: 'offline', color: 'text.secondary' },
  { label: 'Idle', key: 'idle', color: 'warning.main' },
];

const FleetSummaryCard = ({ data }) => (
  <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, mt: 0.75 }}>
    {data.companyName && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
        {data.companyName}
      </Typography>
    )}
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {FLEET_STATS.filter((s) => data[s.key] != null).map((s) => (
        <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 70 }}>
          <DirectionsCarRoundedIcon sx={{ fontSize: 13, color: s.color }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1 }}>{s.label}</Typography>
            <Typography variant="subtitle2" fontWeight={700} color={s.color} lineHeight={1.2}>{data[s.key]}</Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  </Paper>
);

export const StructuredPayload = ({ data, onLocate }) => {
  if (!data) return null;
  const {
    devices, events, group, groups, total, online, offline, idle, companyName, count, status,
  } = data;

  const isFleetSummary = total != null || online != null || offline != null;

  return (
    <Box sx={{ mt: 0.75 }}>
      {devices?.length > 0 && devices.map((d) => (
        <DeviceCard key={d.id} device={d} onLocate={onLocate} />
      ))}
      {events?.length > 0 && <EventList events={events} />}
      {group && (
        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <GroupRoundedIcon color="primary" sx={{ fontSize: 22 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>{group.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {group.deviceCount}
              {' '}
              device
              {group.deviceCount !== 1 ? 's' : ''}
              {' '}
              · ID:
              {group.id}
            </Typography>
          </Box>
        </Paper>
      )}
      {groups?.length > 0 && groups.map((g) => (
        <Paper key={g.id} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
          <GroupRoundedIcon color="primary" sx={{ fontSize: 18 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{g.name}</Typography>
            {g.deviceCount != null && (
              <Typography variant="caption" color="text.secondary">
                {g.deviceCount}
                {' '}
                device
                {g.deviceCount !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </Paper>
      ))}
      {isFleetSummary && <FleetSummaryCard data={{ total, online, offline, idle, companyName }} />}
      {!isFleetSummary && count != null && (
        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={800} color="primary.main">{count}</Typography>
          {status && <Typography variant="caption" color="text.secondary">{status}</Typography>}
        </Paper>
      )}
    </Box>
  );
};

export const MessageBubble = ({ msg, onLocate }) => {
  const theme = useTheme();
  const isUser = msg.role === 'user';
  const backgroundColor = (() => {
    if (isUser) return 'primary.main';
    if (theme.palette.mode === 'dark') return 'grey.800';
    return 'grey.100';
  })();

  return (
    <Fade in timeout={260}>
      <Box sx={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <Avatar sx={{ width: 27, height: 27, flexShrink: 0, mt: 0.3, bgcolor: isUser ? 'primary.main' : 'secondary.main' }}>
          {!isUser && <SmartToyRoundedIcon sx={{ fontSize: 15 }} />}
        </Avatar>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
          <Box
            sx={{
              px: 1.5,
              py: 0.9,
              borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              bgcolor: backgroundColor,
              color: isUser ? 'primary.contrastText' : 'text.primary',
              boxShadow: 1,
            }}
          >
            <Typography
              variant="body2"
              component="div"
              sx={{ lineHeight: 1.7, wordBreak: 'break-word', fontSize: '0.82rem', '& strong': { fontWeight: 700 } }}
            >
              {isUser ? msg.content : renderMarkdown(msg.content)}
            </Typography>
          </Box>
          {!isUser && msg.data && (
            <Box sx={{ width: '100%', mt: 0.5 }}>
              <StructuredPayload data={msg.data} onLocate={onLocate} />
            </Box>
          )}
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.3, px: 0.5, fontSize: '0.63rem' }}>
            {fmtTime(msg.ts)}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

export const TypingBubble = () => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1.5 }}>
      <Avatar sx={{ width: 27, height: 27, bgcolor: 'secondary.main' }}>
        <SmartToyRoundedIcon sx={{ fontSize: 15 }} />
      </Avatar>
      <Box sx={{
        px: 1.4, py: 1.1, borderRadius: '16px 16px 16px 4px', bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100', display: 'flex', gap: '5px', alignItems: 'center', boxShadow: 1,
      }}
      >
        {['dot-1', 'dot-2', 'dot-3'].map((dotKey, i) => (
          <Box
            key={dotKey}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.disabled',
              animation: 'chatBounce 1.2s infinite ease-in-out',
              animationDelay: `${i * 0.18}s`,
              '@keyframes chatBounce': {
                '0%,60%,100%': { transform: 'translateY(0)', opacity: 0.35 },
                '30%': { transform: 'translateY(-5px)', opacity: 1 },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export const WelcomeState = ({ prompts }) => (
  <Box sx={{
    px: 2, pt: 2, pb: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center',
  }}
  >
    <Avatar sx={{ width: 46, height: 46, bgcolor: 'primary.main', boxShadow: 3 }}>
      <SmartToyRoundedIcon sx={{ fontSize: 24 }} />
    </Avatar>
    <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: -0.3 }}>Fleet Assistant</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, maxWidth: 260 }}>
      Ask about any vehicle, device, group or event. Try one of these:
    </Typography>
    {prompts.length > 0 && (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, width: '100%', mt: 0.25 }}>
        {prompts.map((p) => (
          <Box key={p.text || p.prompt || p} sx={{ px: 1.25, py: 0.7, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', fontStyle: 'italic' }}>
              {p.text || p.prompt || p}
            </Typography>
          </Box>
        ))}
      </Box>
    )}
  </Box>
);

export const ErrorBanner = ({ message }) => (
  <Fade in>
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 0.75, p: 1.25, borderRadius: 2, mb: 1.5, bgcolor: 'error.light', color: 'error.contrastText',
    }}
    >
      <ErrorOutlineRoundedIcon sx={{ fontSize: 15, mt: 0.1, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ lineHeight: 1.5 }}>{message}</Typography>
    </Box>
  </Fade>
);
