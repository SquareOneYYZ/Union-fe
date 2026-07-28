import React, {
  useRef, useState, useEffect,
} from 'react';
import { PlayArrow, ZoomOutMap } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import LaunchIcon from '@mui/icons-material/Launch';
import { Tooltip } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useCatchCallback } from '../../reactHelper';

const COMMAND_COOLDOWN_MS = 15000;

const VideoBlock = ({
  src,
  className,
  title,
  showLaunch,
  showFocusIcon,
  onFocus,
  deviceId,
  channelId,
  isVidPlaying = true,
  showBothIcons,
}) => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isStarted, setIsStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastCommandTime, setLastCommandTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const controlScale = Math.max(0.6, Math.min(1, size.width / 600));
  const iconSize = 30 * controlScale;

  const sendLiveStreamCommand = useCatchCallback(async () => {
    const currentTime = Date.now();
    if (currentTime - lastCommandTime < COMMAND_COOLDOWN_MS) {
      setIsStarted(true);
      setIsPlaying(true);
      return;
    }

    const payload = {
      deviceId,
      type: 'liveStream',
      attributes: {
        channels: [channelId],
        noQueue: false,
      },
    };

    try {
      const response = await fetch('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setLastCommandTime(currentTime);
      } else {
        throw Error(await response.text());
      }
    } catch (err) {
      console.error('Failed to send livestream command:', err);
    }
  }, [deviceId, channelId, lastCommandTime, dispatch]);

  const handlePlayPause = () => {
    const newIsPlaying = !isPlaying;
    if (!isStarted && newIsPlaying) {
      sendLiveStreamCommand();
    }
    setIsStarted(true);
    setIsPlaying(newIsPlaying);
  };

  const handleIframeLoad = () => {
    setIsLoaded(true);
    setTimeout(() => {
      if (!isPlaying) {
        setHasError(true);
      } else {
        setHasError(false);
      }
    }, 500);
  };

  const handleMouseMove = () => {
    if (isStarted) {
      setShowControls(true);
      if (controlsTimeout) clearTimeout(controlsTimeout);

      const timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 2000);

      setControlsTimeout(timeout);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying && isStarted) setShowControls(false);
  };

  const handleLaunch = () => navigate('/livestream');

  const handleFocusClick = (e) => {
    e.stopPropagation();
    if (onFocus) onFocus(channelId);
  };

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      });
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    sendLiveStreamCommand();
    setIsStarted(true);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (!isStarted) return () => {};

    const retryTimer = setTimeout(() => {
      if (!isLoaded) {
        console.log('Retrying livestream command…');
        setHasError(false);
        sendLiveStreamCommand();
      }
    }, 15000);

    return () => clearTimeout(retryTimer);
  }, [isStarted, isLoaded, sendLiveStreamCommand]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {!isStarted && (
        <div
          role="button"
          tabIndex={0}
          aria-label={title || 'Video player'}
          onClick={handlePlayPause}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePlayPause();
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            zIndex: 5,
          }}
        >
          <PlayArrow sx={{ fontSize: iconSize * 1.5, color: 'white' }} />
        </div>
      )}

      {/* Launch Icon */}
      {showLaunch && (
      <Tooltip title="Open Livestream">
        <LaunchIcon
          onClick={handleLaunch}
          style={{
            position: 'absolute',
            top: `${12 * controlScale}px`,
            right: `${12 * controlScale}px`,
            color: 'white',
            fontSize: `${25 * controlScale}px`,
            zIndex: 15,
            cursor: 'pointer',
            opacity: 0.85,
          }}
        />
      </Tooltip>
      )}

      {/* Focus Icon */}
      {(showBothIcons || (!showLaunch && showFocusIcon)) && (
      <Tooltip title="Focus this camera">
        <ZoomOutMap
          onClick={handleFocusClick}
          style={{
            position: 'absolute',
            top: `${12 * controlScale}px`,
            right: `${12 * controlScale + 35}px`, // ← SHIFTED TO LEFT IF BOTH ACTIVE
            color: 'white',
            fontSize: `${25 * controlScale}px`,
            zIndex: 15,
            cursor: 'pointer',
            opacity: 0.85,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 4,
            padding: 4,
          }}
        />
      </Tooltip>
      )}

      {/* Title */}
      {title && (
        <div
          style={{
            position: 'absolute',
            top: 8 * controlScale,
            left: 8 * controlScale,
            padding: '3px 8px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            fontSize: `${14 * controlScale}px`,
            borderRadius: 4,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {title}
        </div>
      )}

      {hasError && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.65)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${18 * controlScale}px`,
          zIndex: 50,
        }}
      >
        Not Available
      </div>
      )}

      <iframe
        src={src}
        title={title}
        onLoad={handleIframeLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: isStarted && isVidPlaying ? 'block' : 'none',
          visibility: hasError ? 'hidden' : 'visible',
        }}
        autoPlay="true"
        onError={() => {
          console.log('Stream failed to load, will retry...');
          setIsLoaded(false);
          setHasError(true);
        }}
      />

    </div>
  );
};

VideoBlock.propTypes = {
  src: PropTypes.string.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
  showLaunch: PropTypes.bool,
  showFocusIcon: PropTypes.bool,
  onFocus: PropTypes.func,
  deviceId: PropTypes.number.isRequired,
  channelId: PropTypes.number.isRequired,
  isVidPlaying: PropTypes.bool,
  showBothIcons: PropTypes.bool,
};

VideoBlock.defaultProps = {
  className: '',
  title: '',
  showLaunch: false,
  showFocusIcon: false,
  onFocus: null,
  isVidPlaying: true,
  showBothIcons: false,
};

export default VideoBlock;
