const featureCache = new Map();
const lastPositions = new Map();

const isInBounds = (position, bounds, buffer) => {
  const latBuffer = (bounds.north - bounds.south) * buffer;
  const lngBuffer = (bounds.east - bounds.west) * buffer;

  return (
    position.latitude >= bounds.south - latBuffer
    && position.latitude <= bounds.north + latBuffer
    && position.longitude >= bounds.west - lngBuffer
    && position.longitude <= bounds.east + lngBuffer
  );
};

const getChangedPositions = (positions, precision) => {
  const currentIds = new Set();

  const result = positions.reduce((acc, position) => {
    const key = position.deviceId;
    currentIds.add(key);

    const last = lastPositions.get(key);
    const currentLat = position.latitude.toFixed(precision);
    const currentLng = position.longitude.toFixed(precision);

    if (!last || last.lat !== currentLat || last.lng !== currentLng) {
      acc.changed.push(position);
      lastPositions.set(key, { lat: currentLat, lng: currentLng });
    }

    return acc;
  }, { changed: [] });

  Array.from(lastPositions.keys())
    .filter((key) => !currentIds.has(key))
    .forEach((key) => lastPositions.delete(key));

  return result.changed;
};

const createFeatures = (positions, devices, selectedDeviceId, selectedPositionId, precision, changedPositions) => {
  changedPositions.forEach((position) => {
    const oldKey = `${position.deviceId}-`;
    Array.from(featureCache.keys())
      .filter((key) => key.startsWith(oldKey))
      .forEach((key) => featureCache.delete(key));
  });

  const features = positions.reduce((acc, position) => {
    if (!devices[position.deviceId]) {
      return acc;
    }
    if (position.deviceId === selectedDeviceId) {
      return acc;
    }

    const cacheKey = `${position.deviceId}-${position.latitude.toFixed(precision)}-${position.longitude.toFixed(precision)}-${selectedPositionId}-${position.course}`;

    if (!featureCache.has(cacheKey)) {
      const device = devices[position.deviceId];
      featureCache.set(cacheKey, {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [position.longitude, position.latitude],
        },
        properties: {
          id: position.id,
          deviceId: position.deviceId,
          name: device.name || '',
          category: device.category || 'default',
          color: device.status === 'online' ? 'green' : 'neutral',
          rotation: position.course || 0,
          direction: selectedPositionId === position.id && position.course > 0,
        },
      });
    }

    acc.push(featureCache.get(cacheKey));
    return acc;
  }, []);

  if (featureCache.size > 2500) {
    Array.from(featureCache.keys())
      .slice(0, 1200)
      .forEach((key) => featureCache.delete(key));
  }

  return features;
};

// Progressive chunk processing
const CHUNK_SIZE = 150; // Process 150 positions at a time
const CHUNK_DELAY = 8; // 8ms delay between chunks (~120fps)

let processingController = null;

const processInChunks = (positions, devices, selectedDeviceId, selectedPositionId, bounds, precision) => {
  // Cancel any ongoing processing
  if (processingController) {
    clearTimeout(processingController.timeoutId);
  }

  // Separate ALL positions into viewport and non-viewport (prioritize, don't filter)
  const inViewport = [];
  const outViewport = [];

  if (bounds) {
    positions.forEach((p) => {
      // Use generous buffer to include nearby markers
      if (isInBounds(p, bounds, 0.5)) {
        inViewport.push(p);
      } else {
        outViewport.push(p);
      }
    });
  } else {
    inViewport.push(...positions);
  }

  // Prioritize viewport positions first, but process ALL positions eventually
  const sortedPositions = [...inViewport, ...outViewport];
  const changed = getChangedPositions(sortedPositions, precision);

  let processedCount = 0;
  const totalToProcess = sortedPositions.length;

  const processChunk = () => {
    const chunk = sortedPositions.slice(processedCount, processedCount + CHUNK_SIZE);

    if (chunk.length === 0) {
      // Processing complete
      processingController = null;
      postMessage({
        type: 'PROCESSING_COMPLETE',
        payload: {
          stats: {
            total: positions.length,
            visible: inViewport.length,
            processed: processedCount,
            cached: featureCache.size,
          },
        },
      });
      return;
    }

    const features = createFeatures(
      chunk,
      devices,
      selectedDeviceId,
      selectedPositionId,
      precision,
      changed,
    );

    processedCount += chunk.length;
    const progress = Math.round((processedCount / totalToProcess) * 100);

    // Send incremental update
    postMessage({
      type: 'FEATURES_CHUNK',
      payload: {
        features,
        progress,
        isFirstChunk: processedCount === chunk.length,
        isViewport: processedCount <= inViewport.length,
        stats: {
          total: positions.length,
          visible: inViewport.length,
          processed: processedCount,
          cached: featureCache.size,
        },
      },
    });

    // Schedule next chunk
    processingController = {
      timeoutId: setTimeout(processChunk, CHUNK_DELAY),
    };
  };

  // Start processing
  processChunk();
};

onmessage = (e) => {
  const { type, payload } = e.data;

  if (type === 'PROCESS_POSITIONS') {
    const {
      positions,
      devices,
      selectedDeviceId,
      selectedPositionId,
      bounds,
      precision,
      skipProgressiveLoad = false,
    } = payload;

    // For subsequent updates, process all at once (fast path)
    // DON'T filter by viewport - show all positions even when zoomed
    if (skipProgressiveLoad) {
      const changed = getChangedPositions(positions, precision);

      const features = createFeatures(
        positions,
        devices,
        selectedDeviceId,
        selectedPositionId,
        precision,
        changed,
      );

      postMessage({
        type: 'FEATURES_READY',
        payload: {
          features,
          stats: {
            total: positions.length,
            visible: positions.length,
            changed: changed.length,
            cached: featureCache.size,
          },
        },
      });
    } else {
      // Initial load - use progressive chunking with viewport priority
      processInChunks(positions, devices, selectedDeviceId, selectedPositionId, bounds, precision);
    }
  }

  if (type === 'CLEAR_CACHE') {
    featureCache.clear();
    lastPositions.clear();
  }
};
