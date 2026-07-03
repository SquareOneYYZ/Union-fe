import { useState, useRef, useCallback } from 'react';

export const CHUNK_SIZE = 500;
const LONG_RANGE_HOURS = 24;
const PREFETCH_THRESHOLD = 100;
const LS_KEY = 'replay_session';

export const isLongRange = (from, to) => {
  if (!from || !to) return false;
  const diffHours = (new Date(to) - new Date(from)) / (1000 * 60 * 60);
  return diffHours > LONG_RANGE_HOURS;
};

const lsSave = (payload) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
  } catch (e) { /* silent */ }
};

const lsLoad = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const lsClear = () => {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (e) { /* silent */ }
};

const useReplaySession = () => {
  const [positions, setPositions] = useState([]);
  const [overviewPositions, setOverviewPositions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState(null);
  const [isLongRangeMode, setIsLongRangeMode] = useState(false);
  const [windowStart, setWindowStart] = useState(0);

  const sessionIdRef = useRef(null);
  const loadedUpToRef = useRef(0);
  const totalCountRef = useRef(0);
  const isFetchingRef = useRef(false);
  const pendingResumeRef = useRef(null);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    loadedUpToRef.current = 0;
    totalCountRef.current = 0;
    isFetchingRef.current = false;
    pendingResumeRef.current = null;
    lsClear();
    setPositions([]);
    setOverviewPositions([]);
    setTotalCount(0);
    setWindowStart(0);
    setIsBuffering(false);
    setError(null);
    setIsLongRangeMode(false);
  }, []);

  const fetchChunk = useCallback(async (offset, mode = 'append') => {
    if (!sessionIdRef.current) return null;
    if (isFetchingRef.current) return null;
    if (totalCountRef.current > 0 && offset >= totalCountRef.current) return null;

    isFetchingRef.current = true;
    const url = `/api/replay/session/${sessionIdRef.current}/chunk?offset=${offset}&limit=${CHUNK_SIZE}`;

    try {
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const chunk = await res.json();

      if (!chunk || chunk.length === 0) {
        return [];
      }

      if (mode === 'replace') {
        setWindowStart(offset);
        setPositions(chunk);
        loadedUpToRef.current = offset + chunk.length;
      } else {
        setPositions((prev) => {
          const merged = [...prev, ...chunk];
          loadedUpToRef.current = merged.length;
          return merged;
        });
      }

      if (pendingResumeRef.current) {
        setIsBuffering(false);
        pendingResumeRef.current();
        pendingResumeRef.current = null;
      }

      return chunk;
    } catch (err) {
      setError(err.message);
      setIsBuffering(false);
      pendingResumeRef.current = null;
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const fetchOverview = useCallback(async (sessionId) => {
    const url = `/api/replay/session/${sessionId}/overview`;
    setLoadingOverview(true);

    try {
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const data = await res.json();
      const pts = Array.isArray(data) ? data : (data.positions ?? data.data ?? []);

      setOverviewPositions(pts);
      return pts;
    } catch (err) {
      setOverviewPositions([]);
      return [];
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const checkAndPrefetch = useCallback((currentIndex, onResume) => {
    const loaded = loadedUpToRef.current;
    const total = totalCountRef.current;

    if (currentIndex >= loaded && loaded < total) {
      pendingResumeRef.current = onResume;
      setIsBuffering(true);
      fetchChunk(loaded, 'append');
      return true;
    }

    if (loaded < total && currentIndex >= loaded - PREFETCH_THRESHOLD && !isFetchingRef.current) {
      fetchChunk(loaded, 'append');
    }

    return false;
  }, [fetchChunk]);

  const sliderSeek = useCallback(async (sliderValue) => {
    const offset = Math.floor(sliderValue / CHUNK_SIZE) * CHUNK_SIZE;
    setIsBuffering(true);
    await fetchChunk(offset, 'replace');
    setIsBuffering(false);
  }, [fetchChunk]);

  const initOldApi = useCallback(async (deviceId, from, to) => {
    setLoadingSession(true);
    setError(null);
    setIsLongRangeMode(false);
    lsClear();

    try {
      const query = new URLSearchParams({ deviceId, from, to });
      const url = `/api/positions?${query.toString()}`;

      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const data = await res.json();

      if (!data.length) {
        return false;
      }

      setPositions(data);
      setTotalCount(data.length);
      totalCountRef.current = data.length;
      loadedUpToRef.current = data.length;

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const initLongRange = useCallback(async (deviceId, from, to) => {
    setLoadingSession(true);
    setError(null);
    setIsLongRangeMode(true);

    try {
      const sessionRes = await fetch(`/api/replay/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, from, to }),
      });

      if (!sessionRes.ok) {
        throw new Error(`HTTP ${sessionRes.status}: ${await sessionRes.text()}`);
      }

      const data = await sessionRes.json();

      const sessionId = data.sessionId ?? data.id ?? data.session_id;
      const count = data.totalCount ?? data.total ?? data.count ?? data.size ?? 0;

      if (!sessionId) {
        throw new Error(`No sessionId in response. Keys: ${Object.keys(data).join(', ')}`);
      }

      sessionIdRef.current = sessionId;
      totalCountRef.current = count;
      setTotalCount(count);
      lsSave({ sessionId, totalCount: count, deviceId, from, to });

      if (count === 0) {
        return false;
      }

      fetchOverview(sessionId);
      const firstChunk = await fetchChunk(0, 'append');

      if (!firstChunk) {
        lsClear();
        sessionIdRef.current = null;
        totalCountRef.current = 0;
        setLoadingSession(false);
        return initOldApi(deviceId, from, to);
      }

      return true;
    } catch (err) {
      lsClear();
      sessionIdRef.current = null;
      totalCountRef.current = 0;
      setLoadingSession(false);
      return initOldApi(deviceId, from, to);
    } finally {
      setLoadingSession(false);
    }
  }, [fetchOverview, fetchChunk, initOldApi]);

  const init = useCallback(async (deviceId, from, to) => {
    reset();

    const saved = lsLoad();
    const sameQuery = saved
      && saved.sessionId
      && String(saved.deviceId) === String(deviceId)
      && saved.from === from
      && saved.to === to;

    if (sameQuery) {
      const testUrl = `/api/replay/session/${saved.sessionId}/chunk?offset=0&limit=1`;

      try {
        const testRes = await fetch(testUrl);
        if (testRes.ok) {
          sessionIdRef.current = saved.sessionId;
          totalCountRef.current = saved.totalCount;
          setTotalCount(saved.totalCount);
          setIsLongRangeMode(true);
          fetchOverview(saved.sessionId);
          await fetchChunk(0, 'append');
          return true;
        }
        lsClear();
      } catch (e) {
        lsClear();
      }
    }

    if (isLongRange(from, to)) {
      return initLongRange(deviceId, from, to);
    }
    return initOldApi(deviceId, from, to);
  }, [reset, initLongRange, initOldApi, fetchOverview, fetchChunk]);

  const getStoredSession = useCallback(() => lsLoad(), []);

  return {
    positions,
    overviewPositions,
    totalCount,
    isBuffering,
    windowStart,
    loadingSession,
    loadingOverview,
    error,
    isLongRangeMode,
    init,
    sliderSeek,
    checkAndPrefetch,
    reset,
    getStoredSession,
  };
};

export default useReplaySession;