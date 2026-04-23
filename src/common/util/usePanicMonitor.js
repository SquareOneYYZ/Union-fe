import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const PANIC_TYPES = ['alarm'];
const PANIC_ALARMS = ['sos', 'panic'];

const usePanicMonitor = () => {
  const events = useSelector((state) => state.events.items);
  const [panicEvent, setPanicEvent] = useState(null);

  useEffect(() => {
    console.log('ALL EVENTS:', events);
    const latest = events[0];
    if (!latest) return;

    console.log('LATEST EVENT TYPE:', latest.type);
    console.log('LATEST EVENT ALARM:', latest.attributes?.alarm);

    const isPanic =
      PANIC_TYPES.includes(latest.type) &&
      PANIC_ALARMS.includes(latest.attributes?.alarm?.toLowerCase());

    console.log('IS PANIC:', isPanic);

    if (isPanic) {
      setPanicEvent(latest);
    }
  }, [events]);

  const dismiss = () => setPanicEvent(null);

  return { panicEvent, dismiss };
};

export default usePanicMonitor;