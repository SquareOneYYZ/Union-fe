import React, { Fragment, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import makeStyles from '@mui/styles/makeStyles';
import {
  Divider,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  IconButton,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';

import { geofencesActions } from '../store';
import CollectionActions from '../settings/components/CollectionActions';
import { useCatchCallback } from '../reactHelper';

const useStyles = makeStyles(() => ({
  list: {
    flexGrow: 1,
    overflow: 'auto',
  },
  controls: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem',
    alignItems: 'center',
  },
}));

const GeofencesList = ({ onGeofenceSelected }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const items = useSelector((state) => state.geofences.items);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const refreshGeofences = useCatchCallback(async () => {
    const response = await fetch('/api/geofences');
    if (response.ok) {
      dispatch(geofencesActions.refresh(await response.json()));
    } else {
      throw Error(await response.text());
    }
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    let list = Object.values(items);

    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(lower));
    }

    list.sort((a, b) => {
      if (a.name < b.name) return sortOrder === 'asc' ? -1 : 1;
      if (a.name > b.name) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [items, searchTerm, filterStatus, sortOrder]);

  return (
    <>
      <div className={classes.controls}>
        <TextField
          size="small"
          placeholder="Search geofences..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IconButton
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <SortIcon />
        </IconButton>
      </div>

      <List className={classes.list}>
        {filteredItems.map((item, index, list) => (
          <Fragment key={item.id}>
            <ListItemButton onClick={() => onGeofenceSelected(item.id)}>
              <ListItemText primary={item.name} />
              <CollectionActions
                itemId={item.id}
                editPath="/settings/geofence"
                endpoint="geofences"
                setTimestamp={refreshGeofences}
              />
            </ListItemButton>
            {index < list.length - 1 ? <Divider /> : null}
          </Fragment>
        ))}
      </List>
    </>
  );
};

export default GeofencesList;
