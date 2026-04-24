import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const usePanicMonitor = () => {
  const events = useSelector((state) => state.events.items);
  const [panicEvent, setPanicEvent] = useState(null);

  useEffect(() => {
    const latest = events[0];
    if (!latest) return;

    console.log('LATEST EVENT TYPE:', latest.type);
    console.log('LATEST EVENT ALARM:', latest.attributes?.alarm);

    setPanicEvent(latest);
  }, [events]);

  const dismiss = () => setPanicEvent(null);

  return { panicEvent, dismiss };
};

export default usePanicMonitor;