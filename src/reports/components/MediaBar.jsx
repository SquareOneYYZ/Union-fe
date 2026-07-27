import React, {
  useRef, useEffect,
} from 'react';
import {
  Paper, Box, CircularProgress, Slider,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ImageIcon from '@mui/icons-material/Image';

const useStyles = makeStyles((theme) => ({
  mediaBarContainer: {
    position: 'fixed',
    bottom: theme.spacing(10),
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    width: 'fit-content',
    maxWidth: '90vw',
    [theme.breakpoints.down('md')]: {
      bottom: theme.spacing(2),
    },
    [theme.breakpoints.down('sm')]: {
      bottom: theme.spacing(20),
    },
  },
  mediaBar: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[6],
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      height: 6,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#aaa',
      borderRadius: 4,
    },
    [theme.breakpoints.down('md')]: {
      gap: theme.spacing(1.5),
      padding: theme.spacing(1.5),
    },
    [theme.breakpoints.down('sm')]: {
      gap: theme.spacing(1),
      padding: theme.spacing(1),
    },
  },
  mediaBarDisabled: {
    opacity: 0.1,
    pointerEvents: 'none',
  },
  scrollbarContainer: {
    padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[4],
    [theme.breakpoints.down('md')]: {
      padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
    },
    [theme.breakpoints.down('sm')]: {
      padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
    },
  },
  scrollbarDisabled: {
    opacity: 0.1,
    pointerEvents: 'none',
  },
  placeholderThumb: {
    width: 120,
    height: 75,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    borderRadius: 4,
    overflow: 'hidden',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    flexShrink: 0,
    position: 'relative',
    backgroundColor: '#1e1e1e',
    width: 120,
    height: 75,
    [theme.breakpoints.down('md')]: {
      width: 100,
      height: 65,
    },
    [theme.breakpoints.down('sm')]: {
      width: 80,
      height: 60,
      borderRadius: 3,
    },
  },
  thumbCenter: {
    cursor: 'pointer',
    border: `3px solid ${theme.palette.secondary.main}`,
    transform: 'scale(1.1)',
    boxShadow: `0 0 20px ${theme.palette.secondary.main}`,
    width: 140,
    height: 90,
    [theme.breakpoints.down('md')]: {
      width: 120,
      height: 75,
    },
    [theme.breakpoints.down('sm')]: {
      width: 90,
      height: 65,
      border: `2px solid ${theme.palette.secondary.main}`,
    },
    '&:hover': {
      transform: 'scale(1.15)',
      boxShadow: `0 0 25px ${theme.palette.secondary.main}`,
    },
  },
  thumbCenterDisabled: {
    border: '2px solid transparent',
    transform: 'scale(1)',
    boxShadow: 'none',
    width: 120,
    height: 75,
    cursor: 'default',
    [theme.breakpoints.down('md')]: {
      width: 100,
      height: 65,
    },
    [theme.breakpoints.down('sm')]: {
      width: 80,
      height: 60,
    },
    '&:hover': {
      transform: 'scale(1)',
      boxShadow: 'none',
    },
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minHeight: 90,
    [theme.breakpoints.down('md')]: {
      minHeight: 75,
      gap: theme.spacing(1.2),
    },
    [theme.breakpoints.down('sm')]: {
      minHeight: 65,
      gap: theme.spacing(1),
    },
  },
  leftSection: {
    justifyContent: 'flex-end',
    opacity: 0.6,
  },
  centerSection: {
    justifyContent: 'center',
    opacity: 1,
  },
  rightSection: {
    justifyContent: 'flex-start',
    opacity: 0.6,
  },
}));

const MediaThumbnail = React.memo(({ url, isVideo, isImage, thumbnailCache }) => {
  const [thumbnail, setThumbnail] = React.useState(() => thumbnailCache.get(url));
  const [loading, setLoading] = React.useState(!thumbnailCache.has(url));
  const [error, setError] = React.useState(false);

  useEffect(() => {
    if (!url || thumbnailCache.has(url)) return;

    if (isImage) {
      thumbnailCache.set(url, url);
      setThumbnail(url);
      setLoading(false);
      return;
    }

    if (!isVideo) {
      setError(true);
      setLoading(false);
      return;
    }

    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanup = () => {
      video.src = '';
      video.load();
    };

    const timeout = setTimeout(() => {
      setError(true);
      setLoading(false);
      cleanup();
    }, 5000);

    const onLoadedData = () => {
      video.currentTime = Math.min(0.5, video.duration * 0.1);
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const aspect = video.videoWidth / video.videoHeight;
        canvas.width = 320;
        canvas.height = 320 / aspect;

        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        thumbnailCache.set(url, dataUrl);
        setThumbnail(dataUrl);
        setLoading(false);
        clearTimeout(timeout);
        cleanup();
      } catch (err) {
        setError(true);
        setLoading(false);
        clearTimeout(timeout);
        cleanup();
      }
    };

    const onError = () => {
      setError(true);
      setLoading(false);
      clearTimeout(timeout);
      cleanup();
    };

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
  }, [url, isVideo, isImage, thumbnailCache]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <CircularProgress size={24} sx={{ color: '#888' }} />
      </Box>
    );
  }

  if (error || !thumbnail) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        {isVideo ? <PlayCircleOutlineIcon sx={{ fontSize: 40, color: '#555' }} /> : <ImageIcon sx={{ fontSize: 40, color: '#555' }} />}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      <img src={thumbnail} alt="media" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
      {isVideo && (
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        >
          <PlayCircleOutlineIcon sx={{ fontSize: 20, color: 'white' }} />
        </Box>
      )}
    </Box>
  );
});

const MediaBar = ({
  mediaTimeline,
  displayedMedia,
  activeMediaIndex,
  thumbnailCache,
  onMediaClick,
  onScrollbarChange,
  onScroll,
  mediaBarStyle,
  isEnabled,
}) => {
  const classes = useStyles();
  const mediaBarRef = useRef(null);

  useEffect(() => {
    const el = mediaBarRef.current;
    if (!el || !onScroll) return;

    el.addEventListener('scroll', onScroll, { passive: true });
  }, [onScroll]);

  if (!mediaTimeline || mediaTimeline.length === 0) {
    return null;
  }

  return (
    <Box
      className={classes.mediaBarContainer}
      style={mediaBarStyle}
    >
      {/* Main MediaBar with 2-1-2 display */}
      <Paper
        ref={mediaBarRef}
        className={`${classes.mediaBar} ${
          !isEnabled ? classes.mediaBarDisabled : ''
        }`}
        elevation={6}
      >
        {/* LEFT */}
        <Box className={`${classes.section} ${classes.leftSection}`}>
          {(displayedMedia?.left || []).map((item) => (
            <Box key={item.id} className={classes.thumb}>
              <MediaThumbnail
                url={item.url}
                isVideo={item.isVideo}
                isImage={item.isImage}
                thumbnailCache={thumbnailCache}
              />
            </Box>
          ))}
        </Box>

        {/* CENTER */}
        <Box className={`${classes.section} ${classes.centerSection}`}>
          {displayedMedia?.center && (
            <Box
              key={displayedMedia.center.id}
              className={`${classes.thumb} ${
                isEnabled ? classes.thumbCenter : classes.thumbCenterDisabled
              }`}
              onClick={() => isEnabled && onMediaClick(displayedMedia.center, activeMediaIndex)}
            >
              <MediaThumbnail
                url={displayedMedia.center.url}
                isVideo={displayedMedia.center.isVideo}
                isImage={displayedMedia.center.isImage}
                thumbnailCache={thumbnailCache}
              />
            </Box>
          )}
        </Box>

        {/* RIGHT */}
        <Box className={`${classes.section} ${classes.rightSection}`}>
          {(displayedMedia?.right || []).map((item) => (
            <Box key={item.id} className={classes.thumb}>
              <MediaThumbnail
                url={item.url}
                isVideo={item.isVideo}
                isImage={item.isImage}
                thumbnailCache={thumbnailCache}
              />
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Simple Scrollbar - ALL media items */}
      {mediaTimeline.length > 1 && (
        <Paper
          className={`${classes.scrollbarContainer} ${
            !isEnabled ? classes.scrollbarDisabled : ''
          }`}
          elevation={4}
        >
          <Slider
            value={activeMediaIndex >= 0 ? activeMediaIndex : 0}
            min={0}
            max={mediaTimeline.length - 1}
            step={1}
            disabled={!isEnabled}
            onChange={(_, newValue) => {
              if (isEnabled && onScrollbarChange) {
                onScrollbarChange(newValue);
              }
            }}
            sx={{
              height: 4,
              padding: '8px 0',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
              '& .MuiSlider-rail': {
                opacity: 0.3,
              },
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default MediaBar;
