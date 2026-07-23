import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const MediaPreview = ({ open, mediaUrl, onClose }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Move the early return BEFORE any other code
  if (!mediaUrl) return null;

  // NOW it's safe to call functions and define variables
  const getMediaType = (url) => {
    const extension = url.split('.').pop().toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

    if (videoExtensions.includes(extension)) {
      return 'video';
    }
    if (imageExtensions.includes(extension)) {
      return 'image';
    }
    return 'unknown';
  };

  const mediaType = getMediaType(mediaUrl);
  const fileName = mediaUrl.split('/').pop();

  useEffect(() => {
    if (open && mediaType === 'video' && mediaUrl) {
      setThumbnailLoading(true);
      setThumbnailError(false);
      setShowVideo(false);
      setThumbnail(null);

      const video = document.createElement('video');
      video.src = mediaUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      const timeoutId = setTimeout(() => {
        setThumbnailError(true);
        setThumbnailLoading(false);
        video.remove();
      }, 10000);

      const handleLoadedData = () => {
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      const handleSeeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnail(thumbnailDataUrl);
          setThumbnailLoading(false);
          clearTimeout(timeoutId);
          video.remove();
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          setThumbnailError(true);
          setThumbnailLoading(false);
          clearTimeout(timeoutId);
          video.remove();
        }
      };

      const handleError = (e) => {
        console.error('Video loading error:', e);
        setThumbnailError(true);
        setThumbnailLoading(false);
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
    }
    return undefined;
  }, [open, mediaUrl, mediaType]);

  const renderVideoContent = () => {
    // If user clicked to play video, show the video player
    if (showVideo) {
      return (
        <video
          src={mediaUrl}
          controls
          autoPlay
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            outline: 'none',
          }}
          onError={(e) => {
            console.error('Video playback error:', mediaUrl);
          }}
        >
          <track kind="captions" />
        </video>
      );
    }

    // Loading thumbnail
    if (thumbnailLoading) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            minHeight: 400,
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={60} sx={{ color: '#fff' }} />
          <Typography variant="body1" color="white">
            Loading preview...
          </Typography>
        </Box>
      );
    }

    // Show thumbnail with play button
    if (thumbnail && !thumbnailError) {
      return (
        <Box
          sx={{
            position: 'relative',
            maxWidth: '100%',
            maxHeight: '80vh',
            cursor: 'pointer',
          }}
          onClick={() => setShowVideo(true)}
        >
          <img
            src={thumbnail}
            alt="Video thumbnail"
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '50%',
              width: 100,
              height: 100,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.85)',
                transform: 'translate(-50%, -50%) scale(1.1)',
              },
            }}
          >
            <PlayCircleOutlineIcon
              sx={{
                fontSize: 80,
                color: 'white',
              }}
            />
          </Box>
        </Box>
      );
    }

    // Fallback - show video player directly if thumbnail generation failed
    return (
      <video
        src={mediaUrl}
        controls
        autoPlay
        style={{
          maxWidth: '100%',
          maxHeight: '80vh',
          objectFit: 'contain',
          outline: 'none',
        }}
        onError={(e) => {
          console.error('Video playback error:', mediaUrl);
        }}
      >
        <track kind="captions" />
      </video>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          boxShadow: 'none',
        },
      }}
    >
      <IconButton
        onClick={onClose}
        style={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
          minHeight: '400px',
        }}
      >
        {mediaType === 'video' && renderVideoContent()}

        {mediaType === 'image' && (
          <img
            src={mediaUrl}
            alt="Media preview"
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
            }}
            onError={(e) => {
              console.error('Image load error:', mediaUrl);
            }}
          />
        )}

        {mediaType === 'unknown' && (
          <Paper
            style={{
              padding: 32,
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              maxWidth: 500,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Unable to preview this media type
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: '#ccc' }}>
              {fileName}
            </Typography>
            <Typography
              variant="body2"
              component="a"
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: '#90caf9',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Open in new tab
            </Typography>
          </Paper>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaPreview;
