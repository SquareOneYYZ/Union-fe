import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Box, Fab, Paper, Typography, IconButton, TextField,
  CircularProgress, Tooltip, Avatar, Divider,
  useTheme, useMediaQuery, Zoom,
} from '@mui/material';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';

import { devicesActions } from '../../store';
import { chatActions } from '../../store/chatStore';
import {
  CHAT_URL, PROMPTS_URL, PANEL_WIDTH, PANEL_HEIGHT, parseResponse,
} from './chatConfig';
import {
  MessageBubble, TypingBubble, WelcomeState, ErrorBanner,
} from './ChatComponents';

const ChatAssistant = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();

  const messages = useSelector((state) => state.chats?.messages ?? []);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prompts, setPrompts] = useState([]);

  const tokenRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const panelWidth = expanded ? Math.min(660, window.innerWidth - 48) : PANEL_WIDTH;
  const panelHeight = expanded ? Math.min(720, window.innerHeight - 120) : PANEL_HEIGHT;

  const getToken = useCallback(async () => {
    if (tokenRef.current) return tokenRef.current;
    const response = await fetch('/api/session/token', {
      method: 'POST',
      body: new URLSearchParams(`expiration=${dayjs().add(1, 'hour').toISOString()}`),
    });
    const token = await response.text();
    tokenRef.current = token;
    return token;
  }, []);

  useEffect(() => {
    fetch(PROMPTS_URL)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.prompts || []);
        setPrompts(list.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 280);
  }, [open]);

  const handleToggle = () => setOpen((v) => !v);
  const handleExpand = () => setExpanded((v) => !v);
  const handleClear = () => { dispatch(chatActions.clearMessages()); setError(null); };

  const handleLocate = useCallback((device) => {
    if (!device?.id) return;
    try { dispatch(devicesActions.selectId(device.id)); } catch { console.warn('Failed to select device from chat'); }
    if (isMobile) setOpen(false);
  }, [dispatch, isMobile]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');
    dispatch(chatActions.addMessage({ role: 'user', content: trimmed, ts: new Date().toISOString() }));
    setLoading(true);

    try {
      const token = await getToken();

      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        let msg = `Server error ${res.status}`;
        try { const j = await res.json(); msg = j.error || j.message || msg; } catch { console.warn('Failed to parse error response from chat API'); }
        if (res.status === 401) tokenRef.current = null;
        throw new Error(msg);
      }

      const json = await res.json();
      const parsed = parseResponse(json);

      dispatch(chatActions.addMessage({
        role: 'assistant', content: parsed.reply, data: parsed.data, ts: new Date().toISOString(),
      }));

      const devices = parsed.data?.devices;
      if (devices?.length === 1 && devices[0].latitude != null) handleLocate(devices[0]);
    } catch (err) {
      setError(err.message || 'Could not reach the assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, handleLocate, getToken, dispatch]);

  const handleSubmit = () => sendMessage(input);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const hydratedMessages = messages.map((m) => ({ ...m, ts: new Date(m.ts) }));

  return (
    <>
      <Zoom in={open} unmountOnExit>
        <Paper
          elevation={10}
          sx={{
            position: 'fixed',
            bottom: isMobile ? 0 : 84,
            right: isMobile ? 0 : 24,
            width: isMobile ? '100vw' : panelWidth,
            height: isMobile ? '100dvh' : panelHeight,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: isMobile ? 0 : 3,
            overflow: 'hidden',
            zIndex: 1300,
            border: `1px solid ${theme.palette.divider}`,
            transition: 'width 0.25s ease, height 0.25s ease',
          }}
        >
          <Box
            sx={{
              px: 1.5,
              height: 52,
              minHeight: 52,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <SmartToyRoundedIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  bgcolor: '#4ade80',
                  border: '2px solid',
                  borderColor: 'primary.main',
                }}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap lineHeight={1.2}>Fleet Assistant</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem', lineHeight: 1.2 }}>
                {loading ? 'Thinking…' : 'Ask about any vehicle or event'}
              </Typography>
            </Box>

            {!isMobile && (
              <Tooltip title={expanded ? 'Compact' : 'Expand'}>
                <IconButton size="small" onClick={handleExpand} sx={{ color: 'inherit', opacity: 0.75, '&:hover': { opacity: 1 } }}>
                  {expanded
                    ? <CloseFullscreenRoundedIcon sx={{ fontSize: 15 }} />
                    : <OpenInFullRoundedIcon sx={{ fontSize: 15 }} />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Clear chat">
              <IconButton size="small" onClick={handleClear} sx={{ color: 'inherit', opacity: 0.75, '&:hover': { opacity: 1 } }}>
                <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton size="small" onClick={handleToggle} sx={{ color: 'inherit', opacity: 0.75, '&:hover': { opacity: 1 } }}>
                <CloseRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ flexShrink: 0 }} />

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'scroll',
              overflowX: 'hidden',
              px: 1.5,
              pt: 1.5,
              pb: 0.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              scrollbarWidth: 'thin',
              scrollbarColor: theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.2) transparent'
                : 'rgba(0,0,0,0.18) transparent',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(0,0,0,0.18)',
                borderRadius: 99,
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.35)'
                  : 'rgba(0,0,0,0.32)',
              },
            }}
          >
            {hydratedMessages.length === 0 && <WelcomeState prompts={prompts} />}
            {hydratedMessages.map((msg) => (
              <MessageBubble key={msg.ts.getTime()} msg={msg} onLocate={handleLocate} />
            ))}
            {loading && <TypingBubble />}
            {error && <ErrorBanner message={error} />}
            <div ref={messagesEndRef} />
          </Box>

          <Divider sx={{ flexShrink: 0 }} />

          <Box
            sx={{
              px: 1.25,
              py: 0.9,
              display: 'flex',
              gap: 0.75,
              alignItems: 'flex-end',
              flexShrink: 0,
              bgcolor: 'background.paper',
            }}
          >
            <TextField
              inputRef={inputRef}
              multiline
              maxRows={4}
              fullWidth
              size="small"
              placeholder='e.g. "How many vehicles are online?"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.82rem' } }}
            />
            <Tooltip title="Send (Enter)">
              <span>
                <IconButton
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                  }}
                >
                  {loading
                    ? <CircularProgress size={15} sx={{ color: 'inherit' }} />
                    : <SendRoundedIcon sx={{ fontSize: 17 }} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Typography
            variant="caption"
            sx={{
              textAlign: 'center',
              color: 'text.disabled',
              fontSize: '0.6rem',
              pb: 0.6,
              flexShrink: 0,
              letterSpacing: 0.2,
            }}
          >
            Powered by Fleet API
          </Typography>
        </Paper>
      </Zoom>

      <Tooltip title={open ? 'Close' : 'Fleet Assistant'} placement="left">
        <Fab color="primary" onClick={handleToggle} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, boxShadow: 6 }}>
          {open ? <CloseRoundedIcon /> : <SmartToyRoundedIcon />}
        </Fab>
      </Tooltip>
    </>
  );
};

export default ChatAssistant;
