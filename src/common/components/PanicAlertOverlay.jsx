import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { prefixString } from '../util/stringUtils';
import { useTranslation } from './LocalizationProvider';

const PanicAlertOverlay = ({ panicEvent, onDismiss }) => {
    const theme = useTheme();
    const devices = useSelector((state) => state.devices.items);
    const [visible, setVisible] = useState(false);
    const t = useTranslation();

    useEffect(() => {
        if (!panicEvent) return;

        setVisible(true);

        const timer = setTimeout(() => {
            setVisible(false);
            onDismiss();
        }, 50000000);

        return () => clearTimeout(timer);
    }, [panicEvent, onDismiss]);

    if (!visible || !panicEvent) return null;

    const deviceName = devices[panicEvent.deviceId]?.name || 'Unknown';
    const eventType = panicEvent.attributes?.alarm || panicEvent.type || 'alert';
    const translatedEvent = t(prefixString('event', eventType));
    
    return (
        <>
            <style>{`
        @keyframes bubbleFadeIn {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .panic-bubble {
          position: fixed;
          top: 158px;
          right: 50px;
          z-index: 9999;
          background: ${theme.palette.background.paper};
          font-size: 13px;
          font-weight: 600;
          font-family: ${theme.typography.fontFamily};
          padding: 10px 10px;
          border-radius: 20px;
          box-shadow: ${theme.shadows[4]};
          white-space: nowrap;
          pointer-events: none;
          animation: bubbleFadeIn 0.2s ease;
        }
        .panic-bubble::after {
          content: '';
          position: absolute;
          top: 50%;
          right: -7px;
          transform: translateY(-50%);
          border-width: 6px 0 6px 8px;
          border-style: solid;
          border-color: transparent transparent transparent #212121;
        }
      `}</style>
            <div className="panic-bubble">
                {deviceName} - {translatedEvent}
            </div>
        </>
    );
};

export default PanicAlertOverlay;