import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { sessionService } from '../api/services';
import { formatToJalaliWithTime } from '../utils/dateUtils';
import { getDeviceIcon, getBrowserIcon, getBrowserDisplayName, getDeviceDisplayName } from '../utils/sessionIcons';
import Tooltip from '@mui/material/Tooltip';
import SessionDetailsDialog from './SessionDetailsDialog';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const SessionList = ({ userId = null, adminMode = false, onSessionDeleted }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentSessionJti, setCurrentSessionJti] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (adminMode && userId) {
        response = await sessionService.getUserSessions(userId);
      } else {
        response = await sessionService.getAll();
      }
      
      // Handle paginated response
      const sessionsData = response.data.results || response.data;
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('خطا در بارگذاری جلسات');
    } finally {
      setLoading(false);
    }
  }, [adminMode, userId]);

  useEffect(() => {
    // Get current session JTI from token
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const decoded = jwtDecode(token);
        setCurrentSessionJti(decoded.jti);
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }

    loadSessions();
  }, [userId, loadSessions]);

  const handleDelete = async (sessionId, event) => {
    event.stopPropagation();
    
    if (!window.confirm('آیا از حذف این جلسه اطمینان دارید؟')) {
      return;
    }

    try {
      await sessionService.delete(sessionId);
      await loadSessions();
      if (onSessionDeleted) {
        onSessionDeleted();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert(error.response?.data?.detail || 'خطا در حذف جلسه');
    }
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setDetailsOpen(true);
  };

  const canDeleteSession = (session) => {
    // Admins can always delete
    if (adminMode && user?.isAdmin) {
      return true;
    }
    
    // Users can delete if session is not the current one
    // and if it's newer than current (older sessions can delete newer ones)
    if (currentSessionJti && session.token_jti) {
      // Find current session
      const currentSession = sessions.find(s => s.token_jti === currentSessionJti);
      if (currentSession) {
        // Can't delete current session
        if (session.id === currentSession.id) {
          return false;
        }
        // Older sessions can delete newer ones
        const currentDate = new Date(currentSession.login_date);
        const targetDate = new Date(session.login_date);
        return currentDate < targetDate;
      }
    }
    
    // If we can't determine, allow deletion (backend will enforce)
    return true;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (sessions.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Typography color="text.secondary">
          هیچ جلسه فعالی یافت نشد
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <List>
        {sessions.map((session) => {
          const isCurrentSession = currentSessionJti === session.token_jti;
          const canDelete = canDeleteSession(session);

          // Get icon objects with tooltips
          const browserIconData = getBrowserIcon(session.browser_name);
          const deviceIconData = getDeviceIcon(session.device_type);

          return (
            <ListItem
              key={session.id}
              disablePadding
              sx={{ mb: 1.5 }}
            >
              <Paper
                sx={{
                  width: '100%',
                  p: 0,
                  background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: 2,
                  '&:hover': {
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                <ListItemButton onClick={() => handleSessionClick(session)}>
                  <ListItemIcon>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mr: 1 }}>
                      <Tooltip title={browserIconData.tooltip} placement="top">
                        <Box
                          sx={{
                            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                            },
                          }}
                        >
                          {browserIconData.icon}
                        </Box>
                      </Tooltip>
                      <Tooltip title={deviceIconData.tooltip} placement="top">
                        <Box
                          sx={{
                            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                            },
                          }}
                        >
                          {deviceIconData.icon}
                        </Box>
                      </Tooltip>
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {getBrowserDisplayName(session.browser_name)}
                          {session.browser_version && ` ${session.browser_version}`}
                        </Typography>
                        {isCurrentSession && (
                          <Chip
                            label="جاری"
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, ml: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {getDeviceDisplayName(session.device_type)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.ip_address}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatToJalaliWithTime(session.login_date)}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    edge="end"
                    onClick={(e) => handleDelete(session.id, e)}
                    disabled={!canDelete}
                    sx={{
                      color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      '&:hover': {
                        color: '#ef4444',
                      },
                      '&.Mui-disabled': {
                        opacity: 0.3,
                      },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemButton>
              </Paper>
            </ListItem>
          );
        })}
      </List>

      <SessionDetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onDelete={() => {
          loadSessions();
          setDetailsOpen(false);
          setSelectedSession(null);
          if (onSessionDeleted) {
            onSessionDeleted();
          }
        }}
        adminMode={adminMode}
      />
    </Box>
  );
};

export default SessionList;

