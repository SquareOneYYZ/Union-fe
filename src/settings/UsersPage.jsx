import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Switch,
  TableFooter,
  FormControlLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Chip,
  Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LinkIcon from '@mui/icons-material/Link';
import { useCatch, useEffectAsync } from '../reactHelper';
import { formatBoolean, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import { useManager } from '../common/util/permissions';
import useSettingsStyles from './common/useSettingsStyles';

const UsersPage = () => {
  const classes = useSettingsStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const manager = useManager();

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [temporary, setTemporary] = useState(false);

  // Filter states
  const [globalSearch, setGlobalSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [disabledFilter, setDisabledFilter] = useState('');
  const [expirationFilter, setExpirationFilter] = useState('');

  const handleLogin = useCatch(async (userId) => {
    const response = await fetch(`/api/session/${userId}`);
    if (response.ok) {
      window.location.replace('/');
    } else {
      throw Error(await response.text());
    }
  });

  const actionLogin = {
    key: 'login',
    title: t('loginLogin'),
    icon: <LoginIcon fontSize="small" />,
    handler: handleLogin,
  };

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (userId) => navigate(`/settings/user/${userId}/connections`),
  };

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        setItems(await response.json());
      } else {
        throw Error(await response.text());
      }
    } finally {
      setLoading(false);
    }
  }, [timestamp]);

  const filteredItems = useMemo(() => {
    let filtered = items.filter((u) => temporary || !u.temporary);

    // Global search
    if (globalSearch) {
      filtered = filtered.filter(
        (item) => (item.name || '')
          .toLowerCase()
          .includes(globalSearch.toLowerCase())
          || (item.email || '').toLowerCase().includes(globalSearch.toLowerCase()),
      );
    }

    // Admin filter
    if (adminFilter !== '') {
      filtered = filtered.filter(
        (item) => Boolean(item.administrator) === (adminFilter === 'true'),
      );
    }

    // Disabled filter
    if (disabledFilter !== '') {
      filtered = filtered.filter(
        (item) => Boolean(item.disabled) === (disabledFilter === 'true'),
      );
    }

    // Expiration filter
    if (expirationFilter) {
      const now = new Date();
      filtered = filtered.filter((item) => {
        const expirationDate = item.expirationTime
          ? new Date(item.expirationTime)
          : null;

        if (expirationFilter === 'expired') {
          return expirationDate && expirationDate <= now;
        }
        if (expirationFilter === 'active') {
          return !expirationDate || expirationDate > now;
        }
        if (expirationFilter === 'never') {
          return !expirationDate;
        }
        return true;
      });
    }

    return filtered;
  }, [
    items,
    temporary,
    globalSearch,
    adminFilter,
    disabledFilter,
    expirationFilter,
  ]);

  const hasActiveFilters = globalSearch || adminFilter || disabledFilter || expirationFilter;

  const getFilterLabel = (key, value) => {
    if (key === 'search') return `Search: "${value}"`;
    if (key === 'admin') return `Admin: ${value === 'true' ? 'Yes' : 'No'}`;
    if (key === 'status') {
      return `Status: ${value === 'true' ? 'Disabled' : 'Active'}`;
    }
    if (key === 'expiration') {
      const labels = { never: 'Never', active: 'Active', expired: 'Expired' };
      return `Expiration: ${labels[value]}`;
    }
    return value;
  };

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'search':
        setGlobalSearch('');
        break;
      case 'admin':
        setAdminFilter('');
        break;
      case 'status':
        setDisabledFilter('');
        break;
      case 'expiration':
        setExpirationFilter('');
        break;
      default:
        break;
    }
  };

  const roundedFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '13px',
      '& fieldset': { borderRadius: '13px', borderColor: 'rgba(255,255,255,0.23)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'settingsUsers']}
    >
      {/* Filter Section */}
      <Box
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Name or email..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
              sx={roundedFieldSx}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl
              fullWidth
              size="small"
              sx={roundedFieldSx}
            >
              <InputLabel>Admin</InputLabel>
              <Select
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                label="Admin"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl
              fullWidth
              size="small"
              sx={roundedFieldSx}
            >
              <InputLabel>Status</InputLabel>
              <Select
                value={disabledFilter}
                onChange={(e) => setDisabledFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="false">Active</MenuItem>
                <MenuItem value="true">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl
              fullWidth
              size="small"
              sx={roundedFieldSx}
            >
              <InputLabel>Expiration</InputLabel>
              <Select
                value={expirationFilter}
                onChange={(e) => setExpirationFilter(e.target.value)}
                label="Expiration"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="never">Never</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Active filters:
            </Typography>
            {globalSearch && (
              <Chip
                size="small"
                label={getFilterLabel('search', globalSearch)}
                onDelete={() => removeFilter('search')}
                color="primary"
              />
            )}
            {adminFilter && (
              <Chip
                size="small"
                label={getFilterLabel('admin', adminFilter)}
                onDelete={() => removeFilter('admin')}
                color="primary"
              />
            )}
            {disabledFilter && (
              <Chip
                size="small"
                label={getFilterLabel('status', disabledFilter)}
                onDelete={() => removeFilter('status')}
                color="primary"
              />
            )}
            {expirationFilter && (
              <Chip
                size="small"
                label={getFilterLabel('expiration', expirationFilter)}
                onDelete={() => removeFilter('expiration')}
                color="primary"
              />
            )}
          </Box>
        )}
      </Box>

      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('sharedName')}</TableCell>
            <TableCell>{t('userEmail')}</TableCell>
            <TableCell>{t('userAdmin')}</TableCell>
            <TableCell>{t('sharedDisabled')}</TableCell>
            <TableCell>{t('userExpirationTime')}</TableCell>
            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? (
            filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{formatBoolean(item.administrator, t)}</TableCell>
                <TableCell>{formatBoolean(item.disabled, t)}</TableCell>
                <TableCell>{formatTime(item.expirationTime, 'date')}</TableCell>
                <TableCell className={classes.columnAction} padding="none">
                  <CollectionActions
                    itemId={item.id}
                    editPath="/settings/user"
                    endpoint="users"
                    setTimestamp={setTimestamp}
                    customActions={
                      manager
                        ? [actionLogin, actionConnections]
                        : [actionConnections]
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableShimmer columns={6} endAction />
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} align="right">
              <FormControlLabel
                control={(
                  <Switch
                    checked={temporary}
                    onChange={(e) => setTemporary(e.target.checked)}
                    size="small"
                  />
                )}
                label={t('userTemporary')}
                labelPlacement="start"
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <CollectionFab editPath="/settings/user" />
    </PageLayout>
  );
};

export default UsersPage;
