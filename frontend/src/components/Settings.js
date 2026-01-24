import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import { adminService } from '../api/services';
import { useThemeMode } from '../context/ThemeContext';

const Settings = () => {
  const { themeMode, setThemeMode } = useThemeMode();
  const [settings, setSettings] = useState({
    system_name: '',
    timezone: '',
    allow_user_registration: false,
    require_email_verification: false,
    max_working_hours_per_day: 12,
    min_working_hours_per_day: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await adminService.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminService.updateSettings(settings);
      setMessage({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ذخیره تنظیمات' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography>در حال بارگذاری...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        تنظیمات سیستم
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Theme Selection */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              تنظیمات نمایش
            </Typography>
            <FormControl fullWidth>
              <InputLabel>تم نمایش</InputLabel>
              <Select
                value={themeMode}
                label="تم نمایش"
                onChange={(e) => setThemeMode(e.target.value)}
              >
                <MenuItem value="light">روشن</MenuItem>
                <MenuItem value="dark">تاریک</MenuItem>
                <MenuItem value="system">هماهنگ با سیستم</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {themeMode === 'system' 
                ? 'تم بر اساس تنظیمات سیستم شما تنظیم می‌شود'
                : themeMode === 'dark'
                ? 'تم تاریک فعال است'
                : 'تم روشن فعال است'}
            </Typography>
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>

          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              تنظیمات سیستم
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="نام سیستم"
              value={settings.system_name}
              onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="منطقه زمانی"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="حداکثر ساعت کاری روزانه"
              type="number"
              value={settings.max_working_hours_per_day}
              onChange={(e) => setSettings({ ...settings, max_working_hours_per_day: parseInt(e.target.value) || 0 })}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="حداقل ساعت کاری روزانه"
              type="number"
              value={settings.min_working_hours_per_day}
              onChange={(e) => setSettings({ ...settings, min_working_hours_per_day: parseInt(e.target.value) || 0 })}
              fullWidth
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allow_user_registration}
                  onChange={(e) => setSettings({ ...settings, allow_user_registration: e.target.checked })}
                />
              }
              label="اجازه ثبت‌نام کاربر جدید"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.require_email_verification}
                  onChange={(e) => setSettings({ ...settings, require_email_verification: e.target.checked })}
                />
              }
              label="نیاز به تایید ایمیل"
            />
          </Grid>
          <Grid size={12}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Settings;
