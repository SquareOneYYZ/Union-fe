import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Button,
} from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import InboxIcon from '@mui/icons-material/Inbox';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DateRangeIcon from '@mui/icons-material/DateRange';
import TableShimmer from '../../common/components/TableShimmer';
import { useTranslation } from '../../common/components/LocalizationProvider';


const ReportEmptyState = ({
  searchState = 'idle',
  colSpan = 3,
  columns,
  startAction,
  endAction,
  onRetry,
}) => {
  const t = useTranslation();

  if (searchState === 'loading') {
    return (
      <TableShimmer
        columns={columns ?? colSpan}
        startAction={startAction}
        endAction={endAction}
      />
    );
  }

  const stateConfig = {
    idle: {
      icon: <InboxIcon sx={{ fontSize: 48, color: 'text.disabled' }} />,
      title: t('reportNoSearchYet') || 'No search run yet',
      subtitle: t('reportNoSearchYetHint') || 'Select your filters above and click Show to load results.',
      titleColor: 'text.secondary',
    },
    invalid: {
      icon: <DateRangeIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
      title: t('reportInvalidDateRange') || 'Invalid date range',
      subtitle: t('reportInvalidDateRangeHint') || 'No data matches the selected criteria. Try adjusting the date range or filters.',
      titleColor: 'warning.main',
    },
    empty: {
      icon: <SearchOffIcon sx={{ fontSize: 48, color: 'text.disabled' }} />,
      title: t('reportNoResults') || 'No results found',
      subtitle: t('reportNoResultsHint') || 'No records were returned for the selected period. Try a different date range or device.',
      titleColor: 'text.secondary',
    },
    error: {
      icon: <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.light' }} />,
      title: t('reportError') || 'Report could not be loaded',
      subtitle: t('reportErrorHint') || 'The report could not be loaded. Please try again.',
      titleColor: 'error.main',
    },
  };

  const config = stateConfig[searchState] ?? stateConfig.idle;

  return (
    <TableRow key={searchState}>
      <TableCell colSpan={colSpan} sx={{ border: 0, p: 0 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 2,
            gap: 1.5,

            animation: 'fadeInUp 350ms ease-out',

            '@keyframes fadeInUp': {
              from: {
                opacity: 0,
                transform: 'translateY(12px) scale(0.98)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0) scale(1)',
              },
            },
          }}
        >
          {config.icon}

          <Typography
            variant="subtitle1"
            fontWeight={600}
            color={config.titleColor}
            textAlign="center"
          >
            {config.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.disabled"
            textAlign="center"
            sx={{ maxWidth: 360 }}
          >
            {config.subtitle}
          </Typography>

          {searchState === 'error' && onRetry && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={onRetry}
              sx={{ mt: 1 }}
            >
              {t('reportRetry') || 'Try Again'}
            </Button>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default ReportEmptyState;