import React, { useState, useEffect } from 'react';
import {
  Grid,
  FormControl, InputLabel, Select, MenuItem, Button, TextField, Typography, Tooltip,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useTranslation } from '../../common/components/LocalizationProvider';
import useReportStyles from '../common/useReportStyles';
import { devicesActions, reportsActions } from '../../store';
import SplitButton from '../../common/components/SplitButton';
import SelectField from '../../common/components/SelectField';
import { useRestriction } from '../../common/util/permissions';

const ReportFilter = ({
  children,
  handleSubmit,
  handleSchedule,
  showOnly,
  ignoreDevice,
  multiDevice,
  includeGroups,
  loading,
  showLast24Hours,
  backdateToday,
  initialFilters,
  sx,
}) => {
  const classes = useReportStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');

  const devices = useSelector((state) => state.devices.items);
  const groups = useSelector((state) => state.groups.items);

  const deviceId = useSelector((state) => state.devices.selectedId);
  const deviceIds = useSelector((state) => state.devices.selectedIds);
  const groupIds = useSelector((state) => state.reports.groupIds);
  const period = useSelector((state) => state.reports.period);
  const from = useSelector((state) => state.reports.from);
  const to = useSelector((state) => state.reports.to);

  const [button, setButton] = useState('json');
  const [description, setDescription] = useState();
  const [calendarId, setCalendarId] = useState();

  // Initialize with saved filters if available
  const [selectedDate, setSelectedDate] = useState(initialFilters?.selectedDate || '');
  const [fromTime, setFromTime] = useState(initialFilters?.fromTime || '');
  const [toTime, setToTime] = useState(initialFilters?.toTime || '');
  const [timeRangeValid, setTimeRangeValid] = useState(false);

  // Restore filters when initialFilters changes (on component mount)
  useEffect(() => {
    if (initialFilters && showLast24Hours) {
      if (initialFilters.selectedDate) setSelectedDate(initialFilters.selectedDate);
      if (initialFilters.fromTime) setFromTime(initialFilters.fromTime);
      if (initialFilters.toTime) setToTime(initialFilters.toTime);
    }
  }, [initialFilters, showLast24Hours]);

  useEffect(() => {
    if (!showLast24Hours) {
      setTimeRangeValid(true);
      return;
    }
    if (!selectedDate || !fromTime || !toTime) {
      setTimeRangeValid(false);
      return;
    }
    const start = dayjs(`${selectedDate}T${fromTime}`);
    const end = dayjs(`${selectedDate}T${toTime}`);
    setTimeRangeValid(end.isAfter(start));
  }, [selectedDate, fromTime, toTime, showLast24Hours]);

  const handleClick = (type) => {
    if (type === 'schedule') {
      handleSchedule(deviceIds, groupIds, {
        description,
        calendarId,
        attributes: {},
      });
      return;
    }

    let selectedFrom;
    let selectedTo;

    if (showLast24Hours) {
      // Use local state for date/time selection
      if (!selectedDate || !fromTime || !toTime) {
        notifyError(t('reportSelectDateAndTime') || 'Please select date, from time and to time');
        return;
      }
      selectedFrom = dayjs(`${selectedDate}T${fromTime}`);
      selectedTo = dayjs(`${selectedDate}T${toTime}`);

      if (!selectedFrom.isValid() || !selectedTo.isValid()) {
        notifyError(t('reportInvalidDateOrTime') || 'Invalid date/time');
        return;
      }
      if (!selectedTo.isAfter(selectedFrom)) {
        notifyError(t('End time must be after start time') || 'End time must be after start time');
        return;
      }
    } else {
      // Original behavior - use Redux state
      switch (period) {
        case 'today':
          if (backdateToday) {
            selectedFrom = dayjs().subtract(24, 'hour');
            selectedTo = dayjs();
          } else {
            selectedFrom = dayjs().startOf('day');
            selectedTo = dayjs();
          }
          break;
        case 'yesterday':
          selectedFrom = dayjs().subtract(1, 'day').startOf('day');
          selectedTo = dayjs().subtract(1, 'day').endOf('day');
          break;
        case 'thisWeek':
          selectedFrom = dayjs().startOf('week');
          selectedTo = dayjs().endOf('week');
          break;
        case 'previousWeek':
          selectedFrom = dayjs().subtract(1, 'week').startOf('week');
          selectedTo = dayjs().subtract(1, 'week').endOf('week');
          break;
        case 'thisMonth':
          selectedFrom = dayjs().startOf('month');
          selectedTo = dayjs().endOf('month');
          break;
        case 'previousMonth':
          selectedFrom = dayjs().subtract(1, 'month').startOf('month');
          selectedTo = dayjs().subtract(1, 'month').endOf('month');
          break;
        default:
          selectedFrom = from ? dayjs(from, 'YYYY-MM-DDTHH:mm') : null;
          selectedTo = to ? dayjs(to, 'YYYY-MM-DDTHH:mm') : null;
          break;
      }
    }

    if (!selectedFrom || !selectedTo || !selectedFrom.isValid() || !selectedTo.isValid()) {
      return;
    }

    handleSubmit({
      deviceId,
      deviceIds,
      groupIds,
      from: selectedFrom.toISOString(),
      to: selectedTo.toISOString(),
      calendarId,
      type,
      selectedDate: showLast24Hours ? selectedDate : undefined,
      fromTime: showLast24Hours ? fromTime : undefined,
      toTime: showLast24Hours ? toTime : undefined,
    });
  };
  const deviceMissing = (!ignoreDevice && !deviceId && !deviceIds.length && !groupIds.length);
  const scheduleDisabled = button === 'schedule' && (!description || !calendarId);

  const baseDisabled = deviceMissing || scheduleDisabled || loading;

  const finalDisabled = showLast24Hours ? (baseDisabled || !timeRangeValid) : baseDisabled;

  return (
    <div className={classes.filter}>
      {!ignoreDevice && (
      <div className={classes.filterItem} style={{ minWidth: '280px', flex: '1.5' }}>
        <SelectField
          label={t(multiDevice ? 'deviceTitle' : 'reportDevice')}
          data={Object.values(devices).sort((a, b) => a.name.localeCompare(b.name))}
          value={multiDevice ? deviceIds : deviceId}
          onChange={(e) => dispatch(multiDevice ? devicesActions.selectIds(e.target.value) : devicesActions.selectId(e.target.value))}
          multiple={multiDevice}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '13px',
              '& fieldset': { borderRadius: '13px' },
            },
            ...sx,
          }}
          renderValue={(selected) => {
            if (multiDevice && Array.isArray(selected)) {
              const selectedDevices = selected.map((id) => devices[id]?.name || id).join(', ');
              return (
                <Tooltip title={selectedDevices} placement="bottom-start" arrow>
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                  >
                    {selectedDevices}
                  </span>
                </Tooltip>
              );
            }
            const deviceName = devices[selected]?.name || selected || '';
            return (
              <Tooltip title={deviceName} placement="bottom-start" arrow>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
                >
                  {deviceName}
                </span>
              </Tooltip>
            );
          }}
          MenuProps={{
            PaperProps: {
              style: {
                maxWidth: '400px',
              },
            },
          }}
        />
      </div>
      )}

      {/* Groups */}
      {includeGroups && (
        <div className={classes.filterItem}>
          <SelectField
            label={t('settingsGroups')}
            data={Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))}
            value={groupIds}
            onChange={(e) => dispatch(reportsActions.updateGroupIds(e.target.value))}
            multiple
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '13px',
                '& fieldset': { borderRadius: '13px' },
              },
              ...sx,
            }}
          />
        </div>
      )}

      {button !== 'schedule' ? (
        <>
          <div className={classes.filterItem}>
            <FormControl fullWidth>
              <InputLabel>{t('reportPeriod')}</InputLabel>
              <Select
                label={t('reportPeriod')}
                value={showLast24Hours ? 'custom' : period}
                onChange={(e) => dispatch(reportsActions.updatePeriod(e.target.value))}
                disabled={showLast24Hours}
                sx={{
                  borderRadius: '13px',
                  '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
                }}
                label={t('reportPeriod')}
                value={period}
                onChange={(e) => dispatch(reportsActions.updatePeriod(e.target.value))}
              >
                <MenuItem value="today">{t('reportToday')}</MenuItem>
                <MenuItem value="yesterday">{t('reportYesterday')}</MenuItem>
                <MenuItem value="thisWeek">{t('reportThisWeek')}</MenuItem>
                <MenuItem value="previousWeek">{t('reportPreviousWeek')}</MenuItem>
                <MenuItem value="thisMonth">{t('reportThisMonth')}</MenuItem>
                <MenuItem value="previousMonth">{t('reportPreviousMonth')}</MenuItem>
                <MenuItem value="custom">{t('reportCustom')}</MenuItem>
              </Select>
            </FormControl>
          </div>
          {period === 'custom' && (
            <div className={classes.filterItem}>
              <TextField
                label={t('reportFrom')}
                type="datetime-local"
                value={from}
                onChange={(e) => dispatch(reportsActions.updateFrom(e.target.value))}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '13px',
                    '& fieldset': { borderRadius: '13px' },
                  },
                  ...sx,
                }}
              />
            </div>
          )}
          {period === 'custom' && (
            <div className={classes.filterItem}>
              <TextField
                label={t('reportTo')}
                type="datetime-local"
                value={to}
                onChange={(e) => dispatch(reportsActions.updateTo(e.target.value))}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '13px',
                    '& fieldset': { borderRadius: '13px' },
                  },
                  ...sx,
                }}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className={classes.filterItem}>
            <TextField
              value={description || ''}
              onChange={(e) => setDescription(e.target.value)}
              label={t('sharedDescription')}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '13px',
                  '& fieldset': { borderRadius: '13px' },
                },
                ...sx,
              }}
            />
          </div>

          <div className={classes.filterItem}>
            <SelectField
              value={calendarId}
              onChange={(e) => setCalendarId(Number(e.target.value))}
              endpoint="/api/calendars"
              label={t('sharedCalendar')}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '13px',
                  '& fieldset': { borderRadius: '13px' },
                },
                ...sx,
              }}
            />
          </div>
        </>
      )}

      {children}

      <div className={classes.filterItem}>
        {showOnly ? (
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            disabled={finalDisabled}
            onClick={() => handleClick('json')}
            sx={{ borderRadius: '13px' }}
          >
            <Typography variant="button" noWrap>{t(loading ? 'sharedLoading' : 'reportShow')}</Typography>
          </Button>
        ) : (
          <SplitButton
            fullWidth
            variant="outlined"
            color="secondary"
            disabled={finalDisabled}
            onClick={handleClick}
            selected={button}
            setSelected={(value) => setButton(value)}
            options={readonly ? {
              json: t('reportShow'),
              export: t('reportExport'),
              mail: t('reportEmail'),
            } : {
              json: t('reportShow'),
              export: t('reportExport'),
              mail: t('reportEmail'),
              schedule: t('reportSchedule'),
            }}
            sx={{
              borderRadius: '13px',
              '& .MuiOutlinedInput-notchedOutline': { borderRadius: '13px' },
            }}
            MenuProps={{
              PaperProps: { sx: { borderRadius: '13px' } },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ReportFilter;
