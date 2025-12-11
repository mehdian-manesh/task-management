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
import { useTheme } from '@mui/material';

const OrganizationalDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      {/* Page Title - Windows 11 Style */}
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
        داشبورد سازمانی
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              minHeight: 200,
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: isDark 
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: isDark
                  ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                zIndex: 1,
              },
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600, 
                color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '1.125rem',
              }}
            >
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
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: '6px',
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                      '&:hover': {
                        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <Typography 
                      sx={{ 
                        fontWeight: 500, 
                        color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                        fontSize: '0.9375rem',
                      }}
                    >
                      {status}
                    </Typography>
                    <Chip 
                      label={toPersianNumbers(count)} 
                      size="small" 
                      sx={{ 
                        fontWeight: 600,
                        background: '#6366f1',
                        color: '#ffffff',
                        height: 24,
                        '& .MuiChip-label': {
                          px: 1.5,
                          fontSize: '0.8125rem',
                        },
                      }} 
                    />
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
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '6px !important',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 2px 8px 0 rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                zIndex: 1,
              },
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                fontWeight: 600,
                fontSize: '1.125rem',
                opacity: 0.95,
              }}
            >
              فعالیت کاربران این هفته
            </Typography>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 1,
                fontSize: '2.5rem',
                lineHeight: 1.2,
              }}
            >
              {toPersianNumbers(dashboard.user_activity?.active_users_this_week || 0)}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                opacity: 0.85,
                fontSize: '0.9375rem',
              }}
            >
              کاربر فعال
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: isDark 
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: isDark
                  ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                zIndex: 1,
              },
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600, 
                color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '1.125rem',
              }}
            >
              توزیع وظایف بر اساس پروژه
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                        fontSize: '0.875rem',
                      }}
                    >
                      پروژه
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                        fontSize: '0.875rem',
                      }}
                    >
                      تعداد وظایف
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.tasks?.by_project?.map((item, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:hover': {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        },
                        '& td': {
                          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                          fontSize: '0.9375rem',
                        },
                      }}
                    >
                      <TableCell align="right">{item.project}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={toPersianNumbers(item.count)} 
                          size="small" 
                          sx={{ 
                            background: '#6366f1',
                            color: '#ffffff',
                            height: 24,
                            '& .MuiChip-label': {
                              px: 1.5,
                              fontSize: '0.8125rem',
                            },
                          }} 
                        />
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
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: isDark 
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: isDark
                  ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                zIndex: 1,
              },
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600, 
                color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '1.125rem',
              }}
            >
              بهره‌وری کاربران (این ماه)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                        fontSize: '0.875rem',
                      }}
                    >
                      کاربر
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                        fontSize: '0.875rem',
                      }}
                    >
                      تعداد گزارش
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.productivity?.map((item, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:hover': {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        },
                        '& td': {
                          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                          fontSize: '0.9375rem',
                        },
                      }}
                    >
                      <TableCell align="right">{item.user}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={toPersianNumbers(item.reports)} 
                          size="small" 
                          sx={{ 
                            background: '#10b981',
                            color: '#ffffff',
                            height: 24,
                            '& .MuiChip-label': {
                              px: 1.5,
                              fontSize: '0.8125rem',
                            },
                          }} 
                        />
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
