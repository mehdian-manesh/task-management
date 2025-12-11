import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { adminService } from '../api/services';
import { toPersianNumbers } from '../utils/numberUtils';

const OrganizationalDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await adminService.getOrganizationalDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>در حال بارگذاری...</Typography>;
  }

  if (!dashboard) {
    return <Typography>خطا در بارگذاری داشبورد</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        داشبورد سازمانی
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              minHeight: 200,
              borderRadius: 1.5,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              وضعیت پروژه‌ها
            </Typography>
            {dashboard.projects?.by_status && (
              <Box>
                {Object.entries(dashboard.projects.by_status).map(([status, count]) => (
                  <Box
                    key={status}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                      p: 1.5,
                      borderRadius: 1.5,
                      background: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.4)'
                        : 'rgba(245, 247, 250, 0.6)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>{status}</Typography>
                    <Chip label={toPersianNumbers(count)} size="medium" color="primary" sx={{ fontWeight: 600 }} />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              minHeight: 200,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 1.5,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, opacity: 0.9 }}>
              فعالیت کاربران این هفته
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
              {toPersianNumbers(dashboard.user_activity?.active_users_this_week || 0)}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              کاربر فعال
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 1.5,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(30, 41, 59, 0.6)'
                : 'rgba(255, 255, 255, 0.7)',
              border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              توزیع وظایف بر اساس پروژه
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>پروژه</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>تعداد وظایف</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.tasks?.by_project?.map((item, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <TableCell align="right" sx={{ color: 'text.primary' }}>{item.project}</TableCell>
                      <TableCell align="right">
                        <Chip label={toPersianNumbers(item.count)} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 1.5,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(30, 41, 59, 0.6)'
                : 'rgba(255, 255, 255, 0.7)',
              border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              بهره‌وری کاربران (این ماه)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>کاربر</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>تعداد گزارش</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.productivity?.map((item, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <TableCell align="right" sx={{ color: 'text.primary' }}>{item.user}</TableCell>
                      <TableCell align="right">
                        <Chip label={toPersianNumbers(item.reports)} size="small" color="success" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrganizationalDashboard;
