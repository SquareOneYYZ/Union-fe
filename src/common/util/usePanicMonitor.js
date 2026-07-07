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
  if (!events.length) return;
  const newEvents = [];
  for (const event of events) {
    if (event.id === lastSeenIdRef.current) {
      break;
    }
    newEvents.push(event);
  }

  if (!newEvents.length) return;
  lastSeenIdRef.current = newEvents[0].id;
  const panic = newEvents.find(isPanicEvent);
  if (panic) {
    setPanicEvent(panic);
  }
}, [events]);

  const dismiss = useCallback(() => setPanicEvent(null), []);

  return { panicEvent, dismiss };
};

export default usePanicMonitor;