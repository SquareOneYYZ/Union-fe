import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useSelector } from 'react-redux';

const PANIC_ALARM_TYPES = ['sos', 'panic'];

const isPanicEvent = (event) => {
  if (!event) return false;
  if (event.type !== 'alarm') return false;
  return PANIC_ALARM_TYPES.includes(event.attributes?.alarm);
};

const usePanicMonitor = () => {
  const events = useSelector((state) => state.events.items);
  const [panicEvent, setPanicEvent] = useState(null);
  const lastSeenIdRef = useRef(events[0]?.id);

  useEffect(() => {
    const latest = events[0];
    if (!latest) return;

    if (lastSeenIdRef.current === latest.id) {
      return;
    }

    lastSeenIdRef.current = latest.id;

    if (isPanicEvent(latest)) {
      setPanicEvent(latest);
    }
  }, [events]);

  const dismiss = useCallback(() => setPanicEvent(null), []);

  return { panicEvent, dismiss };
};

export default usePanicMonitor;