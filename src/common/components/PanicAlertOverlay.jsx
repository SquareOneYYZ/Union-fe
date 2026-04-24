import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const AUTO_DISMISS_MS = 2500;

const PanicAlertOverlay = ({ panicEvent, onDismiss }) => {
  const devices = useSelector((state) => state.devices.items);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!panicEvent) return undefined;

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [panicEvent, onDismiss]);

  if (!visible || !panicEvent) return null;

  const deviceName = devices[panicEvent.deviceId]?.name || 'Unknown';

  return (
    <>
      <style>{`
        @keyframes flashGlow {
          0%   { opacity: 1; }
          60%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .panic-border-flash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          box-shadow:
            inset 0 0 60px 20px rgba(255, 0, 0, 0.6),
            inset 0 0 120px 40px rgba(255, 0, 0, 0.3);
          animation: flashGlow 2.5s ease-out forwards;
        }
      `}</style>
      <div
        className="panic-border-flash"
        role="alert"
        aria-live="assertive"
        title={`Alert: ${deviceName}`}
      />
    </>
  );
};

export default PanicAlertOverlay;