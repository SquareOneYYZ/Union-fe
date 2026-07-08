import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
} from '@mui/material';
import { useEffectAsync } from '../reactHelper';
import { useAdministrator } from '../common/util/permissions';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader from './components/SearchHeader';
import useSettingsStyles from './common/useSettingsStyles';

const filterVinMapping = (keyword) => (item) => {
  if (!keyword) return true;
  const lowerKeyword = keyword.toLowerCase();
  return (
    (item.vin || '').toLowerCase().includes(lowerKeyword)
    || (item.imei || '').toLowerCase().includes(lowerKeyword)
  );
};

const VinsPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();
  const admin = useAdministrator();
  const userOrganizationId = useSelector((state) => state.session.user?.organizationId);

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vinmappings');
      if (response.ok) {
        setItems(await response.json());
      } else {
        throw Error(await response.text());
      }
    } finally {
      setLoading(false);
    }
  }, [timestamp]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedVin']}
    >
      <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('deviceVinNumber')}</TableCell>
            <TableCell>{t('deviceIMEINumber')}</TableCell>
            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? (
            items
              .filter((item) => admin || (userOrganizationId != null && item.organizationId === userOrganizationId))
              .filter(filterVinMapping(searchKeyword))
              .map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.vin}</TableCell>
                  <TableCell>{item.imei}</TableCell>
                  <TableCell className={classes.columnAction} padding="none">
                    <CollectionActions
                      itemId={item.id}
                      editPath="/vin"
                      endpoint="vinmappings"
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
      <CollectionFab editPath="/vin" />
    </PageLayout>
  );
};

export default VinsPage;
