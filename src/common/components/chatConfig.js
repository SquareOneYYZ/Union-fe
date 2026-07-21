export const CHAT_URL = '/chatapi/v1/chat';
export const PROMPTS_URL = '/chatapi/v1/chat/prompts';

export const PANEL_WIDTH = 400;
export const PANEL_HEIGHT = 520;

export function fmtTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleString(); } catch { return str; }
}

export function statusColor(s) {
  switch ((s || '').toLowerCase()) {
    case 'online': return 'success';
    case 'offline': return 'default';
    default: return 'warning';
  }
}

export function parseResponse(json) {
  const reply = json.content || json.reply || json.message || json.text || 'No response';

  const toolResults = json.toolResults || [];
  const merged = {};
  toolResults.forEach(({ data }) => {
    if (data && typeof data === 'object') Object.assign(merged, data);
  });

  const data = Object.keys(merged).length > 0 ? merged : null;

  return { reply, data };
}
