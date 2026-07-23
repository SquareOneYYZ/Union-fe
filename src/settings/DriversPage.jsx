import React, { useState, useMemo } from 'react';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  TextField,
  Box,
  IconButton,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useEffectAsync } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import useSettingsStyles from './common/useSettingsStyles';

const DriversPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/drivers');
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
    let list = [...items];

    if (searchKeyword.trim() !== '') {
      const lower = searchKeyword.toLowerCase();
      list = list.filter(
        (item) => (item.name && item.name.toLowerCase().includes(lower))
          || (item.uniqueId && item.uniqueId.toLowerCase().includes(lower)),
      );
    }

    list.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [items, searchKeyword, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUpwardIcon fontSize="small" />
    ) : (
      <ArrowDownwardIcon fontSize="small" />
    );
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
      breadcrumbs={['settingsTitle', 'sharedDrivers']}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          label="Search"
          placeholder="Search by name or identifier"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          size="small"
          sx={{ width: '50%', ...roundedFieldSx }}
        />
      </Box>

      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell
              onClick={() => handleSort('name')}
              sx={{ cursor: 'pointer', p: 0 }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="flex-start"
                height="100%"
                px={2} // keeps normal padding look
              >
                {t('sharedName')}
                {renderSortIcon('name')}
              </Box>
            </TableCell>

            <TableCell
              onClick={() => handleSort('uniqueId')}
              sx={{ cursor: 'pointer', p: 0 }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="flex-start"
                height="100%"
                px={2}
              >
                {t('deviceIdentifier')}
                {renderSortIcon('uniqueId')}
              </Box>
            </TableCell>

            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>

        <TableBody>
          {!loading ? (
            filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.uniqueId}</TableCell>
                <TableCell className={classes.columnAction} padding="none">
                  <CollectionActions
                    itemId={item.id}
                    editPath="/settings/driver"
                    endpoint="drivers"
                    setTimestamp={setTimestamp}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableShimmer columns={3} endAction />
          )}
        </TableBody>
      </Table>

      <CollectionFab editPath="/settings/driver" />
    </PageLayout>
  );
};

export default DriversPage;
