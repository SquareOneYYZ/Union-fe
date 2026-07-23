const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return '';
  return [...arr].sort((a, b) => a - b).join(',');
};

const safeJsonParse = (jsonStr, defaultValue = null) => {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return defaultValue;
  }
};

export const getPeriodLabel = (from, to) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fromDateOnly = new Date(fromDate);
  fromDateOnly.setHours(0, 0, 0, 0);

  const toDateOnly = new Date(toDate);
  toDateOnly.setHours(0, 0, 0, 0);

  if (fromDateOnly.getTime() === today.getTime() && toDateOnly.getTime() === today.getTime()) {
    return 'Today';
  }

  if (fromDateOnly.getTime() === yesterday.getTime() && toDateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  if (fromDateOnly.getTime() === weekStart.getTime() && toDateOnly.getTime() === weekEnd.getTime()) {
    return 'This Week';
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (fromDateOnly.getTime() === monthStart.getTime() && toDateOnly.getTime() === monthEnd.getTime()) {
    return 'This Month';
  }

  return 'Custom';
};

export const fetchReportHistory = async (userId, reportType) => {
  try {
    const response = await fetch(`/api/reporthistory?userId=${userId}&reportType=${reportType}`);

    if (!response.ok) {
      throw new Error('Failed to fetch report history');
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data.filter((item) => item.reportType === reportType);
    } if (data && data.reportType === reportType) {
      return [data];
    }

    return [];
  } catch (error) {
    console.error('Error fetching report history:', error);
    return [];
  }
};

export const deleteReportHistory = async (reportId) => {
  try {
    const response = await fetch(`/api/reporthistory/${reportId}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting report history:', error);
    return false;
  }
};

export const fetchFavoriteReports = async (userId, reportType) => {
  try {
    const response = await fetch(`/api/favoritereports?userId=${userId}&reportType=${reportType}`);

    if (!response.ok) {
      throw new Error('Failed to fetch favorite reports');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error fetching favorite reports:', error);
    return [];
  }
};

export const createFavoriteReport = async ({
  name,
  description,
  reportType,
  deviceIds = [],
  groupIds = [],
  additionalParams = {},
  period = 'Custom',
  fromDate,
  toDate,
}) => {
  try {
    const payload = {
      name,
      description,
      reportType,
      deviceIds: JSON.stringify(deviceIds),
      groupIds: JSON.stringify(groupIds),
      additionalParams: JSON.stringify(additionalParams),
      period,
      fromDate,
      toDate,
    };

    const response = await fetch('/api/favoritereports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to create favorite report');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating favorite report:', error);
    return null;
  }
};

export const updateFavoriteReport = async (favoriteId, updates) => {
  try {
    const response = await fetch(`/api/favoritereports/${favoriteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update favorite report');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating favorite report:', error);
    return null;
  }
};

export const deleteFavoriteReport = async (favoriteId) => {
  try {
    const response = await fetch(`/api/favoritereports/${favoriteId}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting favorite report:', error);
    return false;
  }
};

export const parseReportConfig = (report) => {
  if (!report) {
    console.error('parseReportConfig: No report provided');
    return null;
  }

  if (!report.fromDate || !report.toDate) {
    console.error('parseReportConfig: Missing fromDate or toDate');
    return null;
  }

  return {
    deviceIds: safeJsonParse(report.deviceIds, []),
    groupIds: safeJsonParse(report.groupIds, []),
    from: report.fromDate,
    to: report.toDate,
    period: report.period || 'Custom',
    additionalParams: safeJsonParse(report.additionalParams, {}),
  };
};

export default {
  getPeriodLabel,
  deleteReportHistory,
  fetchReportHistory,
  fetchFavoriteReports,
  createFavoriteReport,
  updateFavoriteReport,
  deleteFavoriteReport,
  parseReportConfig,
};
