import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from '@mui/styles';
import {
  Paper,
  Typography,
  IconButton,
  Box,
  Divider, useMediaQuery,
} from '@mui/material';
import {
  AccessTime as ClockIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  fetchReportHistory,
  fetchFavoriteReports,
  deleteReportHistory,
  deleteFavoriteReport,
  createFavoriteReport,
  parseReportConfig,
} from './ReportUtils';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  reportsContainer: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
  },
  columnsWrapper: {
    display: 'flex',
    gap: theme.spacing(3),
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
    },
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    paddingBottom: theme.spacing(1),
  },
  reportCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    transition: 'all 0.2s',
    '&:hover': {
      boxShadow: theme.shadows[4],
      borderColor: theme.palette.primary.main,
    },
  },
  reportHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  reportMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
    color: theme.palette.text.secondary,
  },
}));

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getPeriodDisplay = (report) => {
  const period = report.period || 'Custom';
  if (period.toLowerCase() === 'custom' && report.fromDate && report.toDate) {
    return `${formatDateShort(report.fromDate)} to ${formatDateShort(report.toDate)}`;
  }
  return period;
};

const parseIds = (idsString) => {
  try {
    const parsed = JSON.parse(idsString);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

const getDeviceNames = (deviceIdsString, devices) => {
  try {
    const ids = JSON.parse(deviceIdsString);
    if (Array.isArray(ids) && ids.length > 0) {
      const names = ids.map((id) => devices[id]?.name || `Device ${id}`);
      return names.length > 2
        ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
        : names.join(', ');
    }
  } catch {
    return 'N/A';
  }
  return 'N/A';
};

const getGroupNames = (groupIdsString, groups) => {
  try {
    const ids = JSON.parse(groupIdsString);
    if (Array.isArray(ids) && ids.length > 0) {
      const names = ids.map((id) => groups[id]?.name || `Group ${id}`);
      return names.length > 2
        ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
        : names.join(', ');
    }
  } catch {
    return 'N/A';
  }
  return 'N/A';
};

const capitalizeFirstLetter = (val) => String(val).charAt(0).toUpperCase() + String(val).slice(1);

const FavoriteReportCard = ({
  report,
  devices,
  groups,
  classes,
  onReRun,
  onUnfavorite,
  t,
}) => (
  <Paper className={classes.reportCard} elevation={1}>
    <Box className={classes.reportHeader}>
      <Box className={classes.reportInfo}>
        <Box className={classes.reportTitle}>
          <StarIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6">
            {t(`reportTitle${capitalizeFirstLetter(report.reportType || 'favorite')}`)}
          </Typography>
        </Box>

        <Box className={classes.reportMeta}>
          <Box className={classes.metaItem}>
            {report.description && (
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {report.description}
            </Typography>
            )}
          </Box>
          <Box className={classes.metaItem}>
            <CalendarIcon fontSize="small" />
            <strong>Period:</strong>
            {' '}
            {getPeriodDisplay(report)}
          </Box>
          {report.deviceIds && parseIds(report.deviceIds) > 0 && (
            <Box className={classes.metaItem}>
              <SettingsIcon fontSize="small" />
              <strong>Devices:</strong>
              {' '}
              {getDeviceNames(report.deviceIds, devices)}
            </Box>
          )}
          {report.groupIds && parseIds(report.groupIds) > 0 && (
            <Box className={classes.metaItem}>
              <SettingsIcon fontSize="small" />
              <strong>Groups:</strong>
              {' '}
              {getGroupNames(report.groupIds, groups)}
            </Box>
          )}
        </Box>
      </Box>

      <Box className={classes.actions}>
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            onReRun(report);
          }}
          title="Run report"
        >
          <PlayIcon />
        </IconButton>
        <IconButton
          size="small"
          color="warning"
          onClick={(e) => {
            e.stopPropagation();
            onUnfavorite(report.id);
          }}
          title="Remove from favorites"
        >
          <StarIcon />
        </IconButton>
      </Box>
    </Box>
  </Paper>
);

const RecentReportCard = ({
  report,
  reportType,
  devices,
  groups,
  classes,
  onReRun,
  onFavorite,
  onDelete,
  isFavorite,
  t,
}) => (

  <Paper className={classes.reportCard} elevation={1}>
    <Box className={classes.reportHeader}>
      <Box className={classes.reportTitle}>
        <Typography variant="h6">
          {t(`reportTitle${capitalizeFirstLetter(reportType)}`)}
        </Typography>
      </Box>
      <Box className={classes.actions}>
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            onReRun(report);
          }}
          title="Re-run report"
        >
          <PlayIcon />
        </IconButton>
        <IconButton
          size="small"
          color="warning"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(report);
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(report.id);
          }}
          title="Delete"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </Box>

    <Box className={classes.reportMeta}>
      <Box className={classes.metaItem}>
        <ClockIcon fontSize="small" />
        <span>
          <strong>Generated: </strong>
          {' '}
          {formatDate(report.generatedAt)}
        </span>
      </Box>
      <Box className={classes.metaItem}>
        <CalendarIcon fontSize="small" />
        <strong>Period:</strong>
        {' '}
        {getPeriodDisplay(report)}
      </Box>
      {report.deviceIds && parseIds(report.deviceIds) > 0 && (
        <Box className={classes.metaItem}>
          <SettingsIcon fontSize="small" />
          <strong>Devices:</strong>
          {' '}
          {getDeviceNames(report.deviceIds, devices)}
        </Box>
      )}
      {report.groupIds && parseIds(report.groupIds) > 0 && (
        <Box className={classes.metaItem}>
          <SettingsIcon fontSize="small" />
          <strong>Groups:</strong>
          {' '}
          {getGroupNames(report.groupIds, groups)}
        </Box>
      )}
    </Box>

  </Paper>
);

const RecentReportsWrapper = ({ reportType, onReRunReport }) => {
  const classes = useStyles();
  const devices = useSelector((state) => state.devices.items);
  const t = useTranslation();

  const groups = useSelector((state) => state.groups.items);
  const userId = useSelector((state) => state.session.user?.id || 1);
  const [recentReports, setRecentReports] = useState([]);
  const [favoriteReports, setFavoriteReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const isDesktop = useMediaQuery('(min-width:900px)');
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [history, favorites] = await Promise.all([
        fetchReportHistory(userId, reportType),
        fetchFavoriteReports(userId, reportType),
      ]);
      setRecentReports(history);
      setFavoriteReports(favorites);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, reportType]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDeleteRecent = useCallback(async (reportId) => {
    const success = await deleteReportHistory(reportId);
    if (success) {
      setRecentReports((prev) => prev.filter((r) => r.id !== reportId));
    }
  }, []);

  const handleReRun = useCallback((report) => {
    const config = parseReportConfig(report);

    if (!config) {
      console.error('Failed to parse report config');
      return;
    }

    if (onReRunReport) {
      onReRunReport(config);
    }
  }, [onReRunReport]);

  const handleToggleFavorite = useCallback(async (report) => {
    const existingFavorite = favoriteReports.find((fav) => {
      const favDevices = JSON.parse(fav.deviceIds || '[]').sort().join(',');
      const repDevices = JSON.parse(report.deviceIds || '[]').sort().join(',');
      const favGroups = JSON.parse(fav.groupIds || '[]').sort().join(',');
      const repGroups = JSON.parse(report.groupIds || '[]').sort().join(',');

      return (
        favDevices === repDevices
        && favGroups === repGroups
        && fav.fromDate === report.fromDate
        && fav.toDate === report.toDate
      );
    });

    if (existingFavorite) {
      const success = await deleteFavoriteReport(existingFavorite.id);
      if (success) {
        setFavoriteReports((prev) => prev.filter((r) => r.id !== existingFavorite.id));
      }
    } else {
      const deviceIds = JSON.parse(report.deviceIds || '[]');
      const groupIds = JSON.parse(report.groupIds || '[]');
      const additionalParams = JSON.parse(report.additionalParams || '{}');

      const newFavorite = await createFavoriteReport({
        name: `${capitalizeFirstLetter(reportType)} Report`,
        description: `Generated on ${formatDate(report.generatedAt)}`,
        reportType,
        deviceIds,
        groupIds,
        additionalParams,
        period: report.period || 'Custom',
        fromDate: report.fromDate,
        toDate: report.toDate,
      });

      if (newFavorite) {
        setFavoriteReports((prev) => [...prev, newFavorite]);
      }
    }
  }, [favoriteReports, reportType]);

  const handleUnfavorite = useCallback(async (favoriteId) => {
    const success = await deleteFavoriteReport(favoriteId);
    if (success) {
      setFavoriteReports((prev) => prev.filter((r) => r.id !== favoriteId));
    }
  }, []);

  const isReportFavorited = useCallback((report) => favoriteReports.some((fav) => {
    const favDevices = JSON.parse(fav.deviceIds || '[]').sort().join(',');
    const repDevices = JSON.parse(report.deviceIds || '[]').sort().join(',');
    const favGroups = JSON.parse(fav.groupIds || '[]').sort().join(',');
    const repGroups = JSON.parse(report.groupIds || '[]').sort().join(',');

    return (
      favDevices === repDevices
        && favGroups === repGroups
        && fav.fromDate === report.fromDate
        && fav.toDate === report.toDate
    );
  }), [favoriteReports]);

  return (
    <Box className={classes.wrapper}>
      <Box className={classes.reportsContainer}>
        <Box className={classes.columnsWrapper}>

          <Box className={classes.column}>
            <Box className={classes.sectionHeader}>
              <ClockIcon color="primary" />
              <Typography variant="h5">{t('reportRecentReports')}</Typography>
            </Box>

            {loading && (
              <Box className={classes.emptyState}>
                <Typography>Loading reports...</Typography>
              </Box>
            )}

            {!loading && recentReports.length === 0 && (
              <Box className={classes.emptyState}>
                <Typography variant="body1" color="textSecondary">
                  No recent
                  {' '}
                  {reportType}
                  {' '}
                  reports found.
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Use the filter above to generate your first report!
                </Typography>
              </Box>
            )}

            {!loading && recentReports.length > 0 && (
              recentReports.map((report) => (
                <RecentReportCard
                  key={report.id}
                  report={report}
                  reportType={reportType}
                  devices={devices}
                  groups={groups}
                  classes={classes}
                  onReRun={handleReRun}
                  onFavorite={handleToggleFavorite}
                  onDelete={handleDeleteRecent}
                  isFavorite={isReportFavorited(report)}
                  t={t}
                />
              ))
            )}
          </Box>
          {isDesktop && (
          <Divider
            sx={{
              width: '2px',
              backgroundColor: '#e0e0e013',
              mx: 2,
            }}
            orientation="vertical"
            flexItem
          />
          )}
          {/* Favorite Reports Column */}
          <Box className={classes.column}>
            <Box className={classes.sectionHeader}>
              <StarIcon sx={{ color: 'warning.main' }} />
              <Typography variant="h5">{t('reportFavoriteReports')}</Typography>
            </Box>

            {favoriteReports.length === 0 && (
              <Box className={classes.emptyState}>
                <Typography variant="body1" color="textSecondary">
                  No favorite reports yet.
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Click the star icon on any recent report to add it here!
                </Typography>
              </Box>
            )}

            {favoriteReports.map((report) => (
              <FavoriteReportCard
                key={report.id}
                report={report}
                devices={devices}
                groups={groups}
                classes={classes}
                onReRun={handleReRun}
                onUnfavorite={handleUnfavorite}
                t={t}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RecentReportsWrapper;
