import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ImageIcon from '@mui/icons-material/Image';

const MediaThumbnail = ({ src, alt, width, height, style }) => {
  const [mediaType, setMediaType] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [error, setError] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Determine media type from file extension
    const extension = src.split('.').pop().toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

    if (videoExtensions.includes(extension)) {
      setMediaType('video');
    } else if (imageExtensions.includes(extension)) {
      setMediaType('image');
    } else {
      setMediaType('unknown');
    }
  }, [src]);

  // Generate video thumbnail
  useEffect(() => {
    if (mediaType === 'video' && !thumbnailUrl && !error) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;

      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of duration, whichever is smaller
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width || 120;
          canvas.height = height || 80;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnailUrl(dataUrl);
        } catch (err) {
          console.error('Error generating video thumbnail:', err);
          setError(true);
        }
      };

      video.onerror = () => {
        console.error('Error loading video for thumbnail');
        setError(true);
      };

      video.src = src;
    }
  }, [mediaType, src, thumbnailUrl, error, width, height]);

  // Render based on media type
  if (mediaType === 'image') {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ display: 'block', objectFit: 'cover', ...style }}
        onError={() => setError(true)}
      />
    );
  }

  if (mediaType === 'video') {
    if (thumbnailUrl) {
      return (
        <Box
          sx={{
            position: 'relative',
            width,
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...style,
          }}
        >
          <img
            src={thumbnailUrl}
            alt={alt}
            width={width}
            height={height}
            style={{ display: 'block', objectFit: 'cover' }}
          />
          {/* Play icon overlay */}
          <PlayCircleOutlineIcon
            sx={{
              position: 'absolute',
              fontSize: 40,
              color: 'white',
              opacity: 0.9,
              pointerEvents: 'none',
            }}
          />
        </Box>
      );
    }

    // Loading state or error - show play icon
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          ...style,
        }}
      >
        <PlayCircleOutlineIcon sx={{ fontSize: 40, color: 'white' }} />
      </Box>
    );
  }

  // Unknown type
  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        ...style,
      }}
    >
      <ImageIcon sx={{ fontSize: 40, color: 'white' }} />
    </Box>
  );
};

export default MediaThumbnail;
