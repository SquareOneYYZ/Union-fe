import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';

const DeviceBulkUpdateSettingsDialog = ({
  open,
  onClose,
  onConfirm,
  selectedCount,
}) => {
  const [fields, setFields] = useState({
    phone: { enabled: false, value: '' },
    model: { enabled: false, value: '' },
    contact: { enabled: false, value: '' },
    expirationDate: { enabled: false, value: '' },
    disabled: { enabled: false, value: false },
  });

  const handleToggleField = (key) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const handleChangeValue = (key, value) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  const handleToggleDisabledValue = (checked) => {
    setFields((prev) => ({
      ...prev,
      disabled: { ...prev.disabled, value: checked },
    }));
  };

  const handleApply = () => {
    const payload = {};

    if (fields.phone.enabled) {
      payload.phone = fields.phone.value;
    }
    if (fields.model.enabled) {
      payload.model = fields.model.value;
    }
    if (fields.contact.enabled) {
      payload.contact = fields.contact.value;
    }
    if (fields.expirationDate.enabled && fields.expirationDate.value) {
      payload.expirationTime = new Date(fields.expirationDate.value).toISOString();
    }
    if (fields.disabled.enabled) {
      payload.disabled = fields.disabled.value;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    onConfirm(payload);
  };

  const handleClose = () => {
    setFields({
      phone: { enabled: false, value: '' },
      model: { enabled: false, value: '' },
      contact: { enabled: false, value: '' },
      expirationDate: { enabled: false, value: '' },
      disabled: { enabled: false, value: false },
    });
    onClose();
  };

  const hasEnabledField = Object.values(fields).some((f) => f.enabled);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Settings</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The selected settings will be applied to
          {' '}
          <strong>{selectedCount}</strong>
          {' '}
          device
          {selectedCount > 1 ? 's' : ''}
          .
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={(
              <Checkbox
                checked={fields.phone.enabled}
                onChange={() => handleToggleField('phone')}
              />
            )}
            label="Phone"
          />
          {fields.phone.enabled && (
            <TextField
              margin="dense"
              fullWidth
              size="small"
              label="Phone"
              value={fields.phone.value}
              onChange={(e) => handleChangeValue('phone', e.target.value)}
            />
          )}

          <FormControlLabel
            control={(
              <Checkbox
                checked={fields.model.enabled}
                onChange={() => handleToggleField('model')}
              />
            )}
            label="Model"
          />
          {fields.model.enabled && (
            <TextField
              margin="dense"
              fullWidth
              size="small"
              label="Model"
              value={fields.model.value}
              onChange={(e) => handleChangeValue('model', e.target.value)}
            />
          )}

          <FormControlLabel
            control={(
              <Checkbox
                checked={fields.contact.enabled}
                onChange={() => handleToggleField('contact')}
              />
            )}
            label="Contact"
          />
          {fields.contact.enabled && (
            <TextField
              margin="dense"
              fullWidth
              size="small"
              label="Contact"
              value={fields.contact.value}
              onChange={(e) => handleChangeValue('contact', e.target.value)}
            />
          )}

          <FormControlLabel
            control={(
              <Checkbox
                checked={fields.expirationDate.enabled}
                onChange={() => handleToggleField('expirationDate')}
              />
            )}
            label="Expiration Date"
          />
          {fields.expirationDate.enabled && (
            <TextField
              margin="dense"
              fullWidth
              size="small"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={fields.expirationDate.value}
              onChange={(e) => handleChangeValue('expirationDate', e.target.value)}
            />
          )}

          <FormControlLabel
            control={(
              <Checkbox
                checked={fields.disabled.enabled}
                onChange={() => handleToggleField('disabled')}
              />
            )}
            label="Disabled"
          />
          {fields.disabled.enabled && (
            <FormControlLabel
              control={(
                <Checkbox
                  checked={fields.disabled.value}
                  onChange={(e) => handleToggleDisabledValue(e.target.checked)}
                />
              )}
              label="Mark devices as disabled"
            />
          )}
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleApply}
          disabled={!hasEnabledField}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeviceBulkUpdateSettingsDialog;
