import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Avatar,
  IconButton,
  useTheme,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authService, adminService } from '../api/services';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import SessionList from './SessionList';

const UserProfile = () => {
  const { user, setUser } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '',
        confirmPassword: '',
      });
      // Set preview URL from user profile picture
      if (user.profile_picture) {
        setPreviewUrl(user.profile_picture);
      } else {
        setPreviewUrl(null);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 1024 * 1024; // 1MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        type: 'error', 
        text: 'فقط فایل‌های تصویری با فرمت JPG یا PNG مجاز هستند' 
      });
      return;
    }

    if (file.size > maxSize) {
      setMessage({ 
        type: 'error', 
        text: 'حجم فایل نباید بیشتر از 1MB باشد' 
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
    setMessage(null);
  };

  const handleRemovePicture = () => {
    setSelectedFile(null);
    setPreviewUrl(user?.profile_picture || null);
  };

  const handleUploadPicture = async () => {
    if (!selectedFile) return;

    setUploadingPicture(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('profile_picture', selectedFile);

      const response = await authService.updateProfile(formData);
      
      // Update user in context
      const updatedUser = {
        ...user,
        ...response.data,
      };
      
      setUser(updatedUser);
      
      // Immediately update previewUrl with the new profile picture URL
      if (response.data.profile_picture) {
        // Ensure URL uses HTTPS if we're on HTTPS (fix mixed content issues)
        let imageUrl = response.data.profile_picture;
        if (window.location.protocol === 'https:' && imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }
        // Add cache-busting parameter to force image reload
        imageUrl = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        setPreviewUrl(imageUrl);
      } else {
        setPreviewUrl(null);
      }

      setSelectedFile(null);
      setMessage({ type: 'success', text: 'عکس پروفایل با موفقیت به‌روزرسانی شد' });
    } catch (error) {
      const errorMessage = error.response?.data?.profile_picture?.[0] 
        || error.response?.data?.detail 
        || error.response?.data?.message 
        || 'خطا در آپلود عکس پروفایل';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    // Validate password match if password is provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'رمز عبور و تکرار آن باید یکسان باشند' });
      setSaving(false);
      return;
    }

    try {
      // Use FormData if profile picture is being uploaded, otherwise use JSON
      let updateData;
      if (selectedFile) {
        updateData = new FormData();
        updateData.append('username', formData.username);
        updateData.append('email', formData.email);
        updateData.append('first_name', formData.first_name);
        updateData.append('last_name', formData.last_name);
        if (formData.password) {
          updateData.append('password', formData.password);
        }
        updateData.append('profile_picture', selectedFile);
      } else {
        updateData = {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
        };
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
      }

      // Try to use current-user endpoint first, fallback to admin endpoint
      let response;
      try {
        response = await authService.updateProfile(updateData);
      } catch (error) {
        // If current-user endpoint doesn't exist, try admin endpoint
        if (error.response?.status === 404 || error.response?.status === 405) {
          response = await adminService.updateUser(user.id, updateData);
        } else {
          throw error;
        }
      }
      
      // Update user in context
      setUser({
        ...user,
        ...response.data,
      });

      setMessage({ type: 'success', text: 'پروفایل با موفقیت به‌روزرسانی شد' });
      
      // Clear password fields and selected file
      setFormData({
        ...formData,
        password: '',
        confirmPassword: '',
      });
      setSelectedFile(null);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || error.response?.data?.message || 'خطا در به‌روزرسانی پروفایل' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 3,
          fontWeight: 600,
          fontSize: '1.75rem',
          color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
          lineHeight: 1.3,
        }}
      >
        پروفایل کاربری
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }} 
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Paper
        sx={{
          borderRadius: 6,
          background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: isDark
            ? '0 2px 8px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.12)',
            '& .MuiTab-root': {
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              '&.Mui-selected': {
                color: isDark ? '#ffffff' : '#6366f1',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#6366f1',
            },
          }}
        >
          <Tab label="اطلاعات پروفایل" />
          <Tab label="جلسات فعال" />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              src={previewUrl || undefined}
              sx={{ 
                width: 100, 
                height: 100, 
                bgcolor: '#6366f1',
                fontSize: '2.5rem',
                fontWeight: 600,
                border: `3px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'}`,
              }}
            >
              {!previewUrl && (user?.username?.charAt(0)?.toUpperCase() || <AccountCircleIcon sx={{ fontSize: 50 }} />)}
            </Avatar>
            <input
              accept="image/jpeg,image/jpg,image/png"
              style={{ display: 'none' }}
              id="profile-picture-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="profile-picture-upload">
              <IconButton
                color="primary"
                component="span"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'}`,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(15, 23, 42, 1)' : 'rgba(255, 255, 255, 1)',
                  },
                }}
              >
                <PhotoCameraIcon />
              </IconButton>
            </label>
            {selectedFile && (
              <IconButton
                color="error"
                onClick={handleRemovePicture}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'}`,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(15, 23, 42, 1)' : 'rgba(255, 255, 255, 1)',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600,
                color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                mb: 0.5,
              }}
            >
              {user?.username || 'کاربر'}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
              }}
            >
              {user?.email || ''}
            </Typography>
            {user?.isAdmin && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#6366f1',
                  fontWeight: 500,
                  mt: 0.5,
                  display: 'block',
                }}
              >
                مدیر سیستم
              </Typography>
            )}
          </Box>
          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleUploadPicture}
                disabled={uploadingPicture}
                startIcon={uploadingPicture ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
              >
                {uploadingPicture ? 'در حال آپلود...' : 'آپلود عکس'}
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                حداکثر اندازه: 1MB، حداکثر ابعاد: 100x100px
              </Typography>
            </Box>
          )}
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="نام کاربری"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                dir="rtl"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="ایمیل"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                dir="rtl"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="نام"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                dir="rtl"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="نام خانوادگی"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                dir="rtl"
              />
            </Grid>
            <Grid size={12}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2,
                  fontWeight: 600,
                  color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                }}
              >
                تغییر رمز عبور
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="رمز عبور جدید"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                dir="rtl"
                helperText="در صورت عدم نیاز به تغییر رمز عبور، این فیلد را خالی بگذارید"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="تکرار رمز عبور"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                dir="rtl"
              />
            </Grid>
            <Grid size={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={<EditIcon />}
                sx={{ minWidth: 150 }}
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </Button>
            </Grid>
          </Grid>
        </Box>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <SessionList />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default UserProfile;
