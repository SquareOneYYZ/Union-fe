import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box, IconButton, TextField, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const EditableCameraLabel = ({
  deviceId,
  channelId,
  initialName,
  onNameUpdate,
  controlScale = 1,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName || `Camera ${channelId}`);
  const [tempName, setTempName] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialName) {
      setName(initialName);
      setTempName(initialName);
    }
  }, [initialName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setTempName(name);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setTempName(name);
  };

  const handleSave = async (e) => {
    e.stopPropagation();

    if (!tempName.trim()) {
      handleCancel(e);
      return;
    }

    setIsSaving(true);

    try {
      // First, fetch the current device data
      const getResponse = await fetch(`/api/devices/${deviceId}`);
      if (!getResponse.ok) {
        throw new Error('Failed to fetch device data');
      }

      const device = await getResponse.json();

      // Update the attributes with the new camera name
      const updatedAttributes = {
        ...device.attributes,
        [`camera${channelId}`]: tempName.trim(),
      };

      const updateResponse = await fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...device,
          attributes: updatedAttributes,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update camera name');
      }

      setName(tempName.trim());
      setIsEditing(false);

      if (onNameUpdate) {
        onNameUpdate(channelId, tempName.trim());
      }
    } catch (error) {
      console.error('Error updating camera name:', error);
      alert('Failed to update camera name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave(e);
    } else if (e.key === 'Escape') {
      handleCancel(e);
    }
  };

  if (isEditing) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 8 * controlScale,
          left: 8 * controlScale,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <TextField
          inputRef={inputRef}
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          size="small"
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              fontSize: `${14 * controlScale}px`,
              height: `${32 * controlScale}px`,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '& .MuiInputBase-input': {
              padding: `${4 * controlScale}px ${8 * controlScale}px`,
            },
          }}
        />
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            backgroundColor: 'rgba(76,175,80,0.8)',
            color: 'white',
            width: `${28 * controlScale}px`,
            height: `${28 * controlScale}px`,
            '&:hover': {
              backgroundColor: 'rgba(76,175,80,1)',
            },
          }}
        >
          {isSaving ? (
            <CircularProgress size={16 * controlScale} sx={{ color: 'white' }} />
          ) : (
            <CheckIcon sx={{ fontSize: `${16 * controlScale}px` }} />
          )}
        </IconButton>
        <IconButton
          size="small"
          onClick={handleCancel}
          disabled={isSaving}
          sx={{
            backgroundColor: 'rgba(244,67,54,0.8)',
            color: 'white',
            width: `${28 * controlScale}px`,
            height: `${28 * controlScale}px`,
            '&:hover': {
              backgroundColor: 'rgba(244,67,54,1)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: `${16 * controlScale}px` }} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'absolute',
        top: 8 * controlScale,
        left: 8 * controlScale,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
      }}
      onClick={handleEdit}
    >
      <Box
        sx={{
          padding: `${3 * controlScale}px ${8 * controlScale}px`,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          fontSize: `${14 * controlScale}px`,
          borderRadius: 1,
          pointerEvents: 'none',
          transition: 'background-color 0.2s',
          ...(isHovered && {
            backgroundColor: 'rgba(0,0,0,0.8)',
          }),
        }}
      >
        {name}
      </Box>
      {isHovered && (
        <IconButton
          size="small"
          sx={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            width: `${24 * controlScale}px`,
            height: `${24 * controlScale}px`,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.9)',
            },
          }}
        >
          <EditIcon sx={{ fontSize: `${14 * controlScale}px` }} />
        </IconButton>
      )}
    </Box>
  );
};

EditableCameraLabel.propTypes = {
  deviceId: PropTypes.number.isRequired,
  channelId: PropTypes.number.isRequired,
  initialName: PropTypes.string,
  onNameUpdate: PropTypes.func,
  controlScale: PropTypes.number,
};

EditableCameraLabel.defaultProps = {
  initialName: '',
  onNameUpdate: null,
  controlScale: 1,
};

export default EditableCameraLabel;
