import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

const MapLoadingIndicator = ({ isLoading, progress, positionCount }) => {
  if (!isLoading && progress >= 100) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 2,
        padding: 2,
        minWidth: 280,
        zIndex: 1000,
      }}
    >
      <Typography variant="body2" align="center" gutterBottom>
        Loading markers...
        {' '}
        {progress}
        %
      </Typography>
      <LinearProgress variant="determinate" value={progress} />
      {positionCount > 0 && (
        <Typography variant="caption" align="center" display="block" sx={{ mt: 1, opacity: 0.7 }}>
          {Math.round((progress / 100) * positionCount)}
          {' '}
          /
          {positionCount}
          {' '}
          devices
        </Typography>
      )}
    </Box>
  );
};

export default MapLoadingIndicator;
