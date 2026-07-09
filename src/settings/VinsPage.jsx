import React, { useState, useMemo } from 'react';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Typography,
} from '@mui/material';
import { useEffectAsync } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import useSettingsStyles from './common/useSettingsStyles';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const VinsPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();

  // Dropdown data
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  // Live text filters (VIN & IMEI) — no API call, client-side
  const [vinFilter, setVinFilter] = useState('');
  const [imeiFilter, setImeiFilter] = useState('');

  // Server-side filters (trigger API on Show)
  const [filters, setFilters] = useState({
    organizationId: '',
    userId: '',
    groupId: '',
  });

  // Table state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const roundedFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  };

  // Fetch dropdown data on mount
  useEffectAsync(async () => {
    try {
      const [orgRes, userRes, groupRes] = await Promise.all([
        fetch('/api/organization'),
        fetch('/api/users'),
        fetch('/api/groups'),
      ]);
      if (orgRes.ok) setOrganizations(await orgRes.json());
      if (userRes.ok) setUsers(await userRes.json());
      if (groupRes.ok) setGroups(await groupRes.json());
    } catch {
      // dropdowns failing shouldn't block the page
    }
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleShow = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setPage(1);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '') params.append(key, value);
      });

      const response = await fetch(`/api/vinmappings?${params.toString()}`);
      if (response.ok) {
        setItems(await response.json());
      } else {
        throw Error(await response.text());
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({ organizationId: '', userId: '', groupId: '' });
    setVinFilter('');
    setImeiFilter('');
    setItems([]);
    setHasSearched(false);
    setError(null);
    setPage(1);
  };

  // Live client-side filtering on fetched results by VIN and IMEI
  const filteredItems = useMemo(() => items.filter((item) => {
    const vinMatch = !vinFilter || (item.vin || '').toLowerCase().includes(vinFilter.toLowerCase());
    const imeiMatch = !imeiFilter || (item.imei || '').includes(imeiFilter);
    return vinMatch && imeiMatch;
  }), [items, vinFilter, imeiFilter]);

  // Pagination on filtered results
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Display helpers
  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? (user.name || user.email || `User ${userId}`) : (userId || '-');
  };

  const getOrgName = (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    return org ? (org.name || `Org ${orgId}`) : (orgId || '-');
  };

  const getGroupName = (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    return group ? group.name : (groupId || '-');
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedVin']}
    >
      <Box sx={{ p: 2, backgroundColor: 'background.paper', mb: 2, borderRadius: 1 }}>

        {/* Row 1: VIN and IMEI live filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label={t('deviceVinNumber')}
              value={vinFilter}
              onChange={(e) => {
                setVinFilter(e.target.value.toUpperCase());
                setPage(1);
              }}
              inputProps={{ maxLength: 17 }}
              sx={roundedFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label={t('deviceIMEINumber')}
              value={imeiFilter}
              onChange={(e) => {
                setImeiFilter(e.target.value.replace(/\D/g, ''));
                setPage(1);
              }}
              inputProps={{ maxLength: 15, inputMode: 'numeric' }}
              sx={roundedFieldSx}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} alignItems="center">

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={roundedFieldSx}>
              <InputLabel>User</InputLabel>
              <Select
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                label="User"
              >
                <MenuItem value="">All Users</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name || user.email || `User ${user.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={roundedFieldSx}>
              <InputLabel>Group</InputLabel>
              <Select
                value={filters.groupId}
                onChange={(e) => handleFilterChange('groupId', e.target.value)}
                label="Group"
              >
                <MenuItem value="">All Groups</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleShow}
                disabled={loading}
                sx={{ borderRadius: '10px', px: 3, flex: 1 }}
              >
                {t('reportShow')}
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={loading}
                sx={{ borderRadius: '10px', px: 3, flex: 1 }}
              >
                {t('sharedCancel')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Table */}
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>{t('deviceVinNumber')}</TableCell>
              <TableCell>{t('deviceIMEINumber')}</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Group</TableCell>
              <TableCell className={classes.columnAction} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableShimmer columns={6} endAction />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'error.main', py: 4 }}>
                  {error}
                </TableCell>
              </TableRow>
            ) : !hasSearched ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Select filters above and click Show to load results.
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  No VIN/IMEI mappings found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.vin || '-'}</TableCell>
                  <TableCell>{item.imei || '-'}</TableCell>
                  <TableCell>{getUserName(item.userId)}</TableCell>
                  <TableCell>{getOrgName(item.organizationId)}</TableCell>
                  <TableCell>{getGroupName(item.groupId)}</TableCell>
                  <TableCell className={classes.columnAction} padding="none">
                    <CollectionActions
                      itemId={item.id}
                      editPath="/vin"
                      endpoint="vinmappings"
                      setTimestamp={handleShow}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Pagination */}
      {hasSearched && filteredItems.length > 0 && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2,
          mb: 8,
          px: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="textSecondary">Rows per page:</Typography>
            <Select
              value={pageSize}
              onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
              size="small"
              variant="outlined"
              sx={{ minWidth: 80 }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <MenuItem key={size} value={size}>{size}</MenuItem>
              ))}
            </Select>
            <Typography variant="body2" color="textSecondary">
              {`${startIndex + 1}–${Math.min(startIndex + pageSize, filteredItems.length)} of ${filteredItems.length}`}
            </Typography>
          </Box>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            showFirstButton
            showLastButton
            size="medium"
          />
        </Box>
      )}

      <CollectionFab editPath="/vin" />
    </PageLayout>
  );
};

export default VinsPage;