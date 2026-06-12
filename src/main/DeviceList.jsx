import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import makeStyles from '@mui/styles/makeStyles';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  ListItemAvatar, ListItemText, ListItemButton, Avatar, Skeleton,
} from '@mui/material';
import { devicesActions } from '../store';
import { useEffectAsync } from '../reactHelper';
import DeviceRow from './DeviceRow';

const useStyles = makeStyles((theme) => ({
  list: {
    maxHeight: '100%',
  },
  listInner: {
    position: 'relative',
    margin: theme.spacing(1.5, 0),
  },
}));

const SkeletonRow = ({ style }) => (
  <div style={style}>
    <ListItemButton>
      <ListItemAvatar>
        <Avatar>
          <Skeleton variant="circular" width={24} height={24} />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton variant="text" width="60%" />}
        secondary={<Skeleton variant="text" width="40%" />}
      />
    </ListItemButton>
  </div>
);

const DeviceList = ({ devices }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const listInnerEl = useRef(null);

  const loading = useSelector((state) => state.devices.loading);

  if (listInnerEl.current) {
    listInnerEl.current.className = classes.listInner;
  }

  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffectAsync(async () => {
    const response = await fetch('/api/devices');
    if (response.ok) {
      dispatch(devicesActions.refresh(await response.json()));
    } else {
      throw Error(await response.text());
    }
  }, []);

  if (loading) {
    return (
      <AutoSizer className={classes.list}>
        {({ height, width }) => (
          <FixedSizeList
            width={width}
            height={height}
            itemCount={8}
            itemSize={72}
            overscanCount={10}
            innerRef={listInnerEl}
          >
            {SkeletonRow}
          </FixedSizeList>
        )}
      </AutoSizer>
    );
  }

  return (
    <AutoSizer className={classes.list}>
      {({ height, width }) => (
        <FixedSizeList
          width={width}
          height={height}
          itemCount={devices.length}
          itemData={devices}
          itemSize={72}
          overscanCount={10}
          innerRef={listInnerEl}
        >
          {DeviceRow}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
};

export default DeviceList;