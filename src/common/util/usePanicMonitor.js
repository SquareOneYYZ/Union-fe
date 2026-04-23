import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const PANIC_TYPES = ['alarm'];
const PANIC_ALARMS = ['sos', 'panic'];

const usePanicMonitor = () => {
    const events = useSelector((state) => state.events.items);
    const [panicEvent, setPanicEvent] = useState(null);

    useEffect(() => {
        const latest = events[0];
        if (!latest) return;

        const isPanic =
            PANIC_TYPES.includes(latest.type) &&
            PANIC_ALARMS.includes(latest.attributes?.alarm?.toLowerCase());

        if (isPanic) {
            setPanicEvent(latest);
        }
    }, [events]);

    const dismiss = () => setPanicEvent(null);

    return { panicEvent, dismiss };
};

export default usePanicMonitor;