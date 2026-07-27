import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';

const DeviceBulkAssignGroupDialog = ({
  open,
  onClose,
  onConfirm,
  groups,
  selectedCount,
}) => {
  const [groupId, setGroupId] = useState('');

  const sortedGroups = useMemo(
    () => Object.values(groups || {}).sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

  const handleApply = () => {
    if (!groupId) {
      return;
    }
    onConfirm(Number(groupId));
    setGroupId('');
  };

  const handleClose = () => {
    setGroupId('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign to Group</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This will assign
          {' '}
          <strong>{selectedCount}</strong>
          {' '}
          device
          {selectedCount > 1 ? 's' : ''}
          {' '}
          to the selected group.
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="bulk-group-label">Group</InputLabel>
          <Select
            labelId="bulk-group-label"
            label="Group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {sortedGroups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleApply}
          disabled={!groupId}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeviceBulkAssignGroupDialog;
