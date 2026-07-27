import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

export const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

export const isVideoFile = (filename) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

export const VideoThumbnail = ({ url, filename }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const timeoutId = setTimeout(() => {
      setError(true);
      setLoading(false);
      video.remove();
    }, 8000);

    const handleLoadedData = () => {
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setThumbnail(thumbnailDataUrl);
        setLoading(false);
        clearTimeout(timeoutId);
        video.remove();
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        setError(true);
        setLoading(false);
        clearTimeout(timeoutId);
        video.remove();
      }
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
      clearTimeout(timeoutId);
      video.remove();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.remove();
    };
  }, [url]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#fafafa',
        }}
      >
        <CircularProgress size={24} sx={{ color: '#888' }} />
      </Box>
    );
  }

  if (error || !thumbnail) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#fafafa',
        }}
      >
        <PlayCircleOutlineIcon sx={{ fontSize: 40, color: '#888' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={thumbnail}
        alt={filename}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <PlayCircleOutlineIcon sx={{ fontSize: 24 }} />
      </Box>
    </Box>
  );
};

export const MediaBar = ({ mediaItems, devices, onMediaClick }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 1.5,
      overflowX: 'auto',
      padding: 1.5,
      borderRadius: 1,
      '&::-webkit-scrollbar': {
        height: 8,
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#9e9e9e',
        borderRadius: 4,
        '&:hover': {
          backgroundColor: '#757575',
        },
      },
    }}
  >
    {mediaItems.map((mediaItem) => {
      const mediaUrl = `/api/media/${devices[mediaItem.deviceId]?.uniqueId}/${mediaItem.attributes.file}`;
      const filename = mediaItem.attributes.file;
      const isImage = isImageFile(filename);
      const isVideo = isVideoFile(filename);

      return (
        <Box
          key={mediaItem.id}
          onClick={() => onMediaClick(mediaUrl)}
          sx={{
            minWidth: 120,
            maxWidth: 120,
            height: 100,
            cursor: 'pointer',
            borderRadius: 1,
            overflow: 'hidden',
            border: '2px solid #e0e0e0',
            backgroundColor: '#fff',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              borderColor: '#1976d2',
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isImage && (
              <img
                src={mediaUrl}
                alt={filename}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            {isVideo && <VideoThumbnail url={mediaUrl} filename={filename} />}

            {!isImage && !isVideo && (
              <InsertDriveFileIcon sx={{ fontSize: 40, color: '#9e9e9e' }} />
            )}
          </Box>
          <Box
            sx={{
              padding: 0.5,
              backgroundColor: '#fff',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontSize: 10,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#666',
              }}
              title={filename}
            >
              {filename}
            </Typography>
          </Box>
        </Box>
      );
    })}
  </Box>
);
