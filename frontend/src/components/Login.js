import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
} from '@mui/material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      // Try to extract field-specific errors
      if (result.error && result.error.includes('نام کاربری')) {
        setErrors({ username: result.error });
      } else if (result.error && result.error.includes('رمز عبور')) {
        setErrors({ password: result.error });
      } else {
        setErrors({ username: result.error });
      }
    }
    
    setLoading(false);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 0.75,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(30, 41, 59, 0.6)'
              : 'rgba(255, 255, 255, 0.7)',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL}/logo.svg`}
              alt="Logo"
              sx={{
                height: 80,
                width: 80,
                mb: 2,
                filter: (theme) => theme.palette.mode === 'dark' 
                  ? 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.3))' 
                  : 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.2))',
              }}
            />
            <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
              ورود به سیستم
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              سیستم مدیریت زمان و گزارش کار
            </Typography>
          </Box>


          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TextField
              margin="normal"
              required
              id="username"
              label="نام کاربری"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) {
                  setErrors({ ...errors, username: '' });
                }
              }}
              dir="rtl"
              error={!!errors.username}
              helperText={errors.username}
              sx={{ 
                width: '60%',
                '& .MuiInputBase-input': {
                  height: '1.5rem',
                  textAlign: 'center',
                  padding: '8px 14px'
                }
              }}
              inputProps={{
                style: { textAlign: 'center' }
              }}
            />
            <TextField
              margin="normal"
              required
              name="password"
              label="رمز عبور"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors({ ...errors, password: '' });
                }
              }}
              dir="rtl"
              error={!!errors.password}
              helperText={errors.password}
              sx={{ 
                width: '60%',
                '& .MuiInputBase-input': {
                  height: '1.5rem',
                  textAlign: 'center',
                  padding: '8px 14px'
                }
              }}
              inputProps={{
                style: { textAlign: 'center' }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 3, mb: 2, width: '40%' }}
              disabled={loading}
            >
              {loading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;