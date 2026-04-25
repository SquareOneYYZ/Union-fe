import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { prefixString } from '../util/stringUtils';
import { useTranslation } from './LocalizationProvider';

const AUTO_DISMISS_MS = 5000;

const PanicAlertOverlay = ({
  panicEvent, onDismiss, eventsOpen, notificationButtonRef,
}) => {
  const theme = useTheme();
  const devices = useSelector((state) => state.devices.items);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(null);
  const t = useTranslation();
  const lastHandledIdRef = useRef(null);

  const computePosition = () => {
    const button = notificationButtonRef?.current;
    if (!button) return false;
    const rect = button.getBoundingClientRect();
    setPosition({
      top: rect.top + rect.height / 2,
      right: window.innerWidth - rect.left + 8,
    });
    return true;
  };

  useEffect(() => {
    const handleResize = () => computePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (eventsOpen && visible) {
      setVisible(false);
      onDismiss?.();
    }
  }, [eventsOpen, visible, onDismiss]);

  useEffect(() => {
    if (!panicEvent) return undefined;
    if (lastHandledIdRef.current === panicEvent.id) return undefined;

    lastHandledIdRef.current = panicEvent.id;
    computePosition();
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [panicEvent]);

  if (!visible || !panicEvent || !position) return null;

  const deviceName = devices[panicEvent.deviceId]?.name || t('sharedUnknown') || 'Unknown';
  const eventType = panicEvent.attributes?.alarm || panicEvent.type;
  const translatedEvent = panicEvent.type === 'alarm'
    ? t(prefixString('alarm', eventType))
    : t(prefixString('event', eventType));

  const bubbleStyle = {
    position: 'fixed',
    top: `${position.top}px`,
    right: `${position.right}px`,
    transform: 'translateY(-50%)',
    zIndex: 9999,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: theme.typography.fontFamily,
    padding: 10,
    borderRadius: 20,
    boxShadow: theme.shadows[4],
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="panic-bubble"
      style={bubbleStyle}
      role="alert"
      aria-live="assertive"
    >
      {deviceName}
      {' - '}
      {translatedEvent}
    </div>
  );
};

export default PanicAlertOverlay;