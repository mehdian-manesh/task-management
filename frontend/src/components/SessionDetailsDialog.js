import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  IconButton,
  useTheme,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { sessionService } from '../api/services';
import { formatToJalaliWithTime } from '../utils/dateUtils';
import { getBrowserDisplayName, getDeviceDisplayName } from '../utils/sessionIcons';

const SessionDetailsDialog = ({ open, onClose, session, onDelete, adminMode = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!session) {
    return null;
  }

  const handleDelete = async () => {
    if (!window.confirm('آیا از حذف این جلسه اطمینان دارید؟')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await sessionService.delete(session.id);
      if (onDelete) {
        onDelete();
      }
      onClose();
    } catch (error) {
      console.error('Error deleting session:', error);
      setError(error.response?.data?.detail || 'خطا در حذف جلسه');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            جزئیات جلسه
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              مرورگر
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {getBrowserDisplayName(session.browser_name)}
              {session.browser_version && ` ${session.browser_version}`}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              سیستم عامل
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {session.os_name}
              {session.os_version && ` ${session.os_version}`}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              نوع دستگاه
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {getDeviceDisplayName(session.device_type)}
              {session.device_name && ` - ${session.device_name}`}
            </Typography>
          </Grid>

          {session.screen_width && session.screen_height && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                وضوح صفحه نمایش
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {session.screen_width} × {session.screen_height}
              </Typography>
            </Grid>
          )}

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              آدرس IP
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
              {session.ip_address}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              تاریخ ورود
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {formatToJalaliWithTime(session.login_date)}
            </Typography>
          </Grid>

          {session.last_activity && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                آخرین فعالیت
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formatToJalaliWithTime(session.last_activity)}
              </Typography>
            </Grid>
          )}

          {session.user_agent && (
            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                User-Agent
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                }}
              >
                {session.user_agent}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} variant="outlined">
          بستن
        </Button>
        {(adminMode || session.is_active) && (
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={deleting}
          >
            {deleting ? 'در حال حذف...' : 'حذف جلسه'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SessionDetailsDialog;

