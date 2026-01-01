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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { adminService } from '../api/services';
import { toPersianNumbers } from '../utils/numberUtils';
import { useTheme } from '@mui/material';
import moment from 'moment-jalaali';

const OrganizationalDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await adminService.getOrganizationalDashboard();
      if (response && response.data) {
        setDashboard(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      let errorMessage = 'خطا در بارگذاری داشبورد';
      
      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        if (status === 502 || status === 503) {
          errorMessage = 'سرور در دسترس نیست. لطفاً اتصال خود را بررسی کنید.';
        } else if (status === 401 || status === 403) {
          errorMessage = 'شما دسترسی لازم برای مشاهده این صفحه را ندارید.';
        } else if (status === 404) {
          errorMessage = 'صفحه مورد نظر یافت نشد.';
        } else if (status >= 500) {
          errorMessage = 'خطای سرور. لطفاً بعداً دوباره تلاش کنید.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message ||
                        `خطا در بارگذاری (کد: ${status})`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>در حال بارگذاری...</Typography>;
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          داشبورد سازمانی
        </Typography>
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          لطفاً صفحه را رفرش کنید یا بعداً دوباره تلاش کنید.
        </Typography>
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          داشبورد سازمانی
        </Typography>
        <Typography color="error">
          خطا در بارگذاری داشبورد
        </Typography>
      </Box>
    );
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              minHeight: 200,
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
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

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              minHeight: 200,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '6px !important',
              border: '1px solid rgba(255, 255, 255, 0.2)',
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

        <Grid size={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
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

        <Grid size={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
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

        <Grid size={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '6px !important',
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
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
              وظایف در حال انجام کارکنان
            </Typography>
            
            {dashboard.employee_tasks && dashboard.employee_tasks.length > 0 ? (
              <Box>
                {dashboard.employee_tasks.map((employee) => (
                  <Accordion
                    key={employee.user_id}
                    sx={{
                      mb: 2,
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '6px !important',
                      boxShadow: 'none',
                      '&:before': {
                        display: 'none',
                      },
                      '&.Mui-expanded': {
                        margin: '0 0 16px 0',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={
                        <ExpandMoreIcon 
                          sx={{ 
                            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)',
                          }} 
                        />
                      }
                      sx={{
                        '& .MuiAccordionSummary-content': {
                          alignItems: 'center',
                          gap: 2,
                        },
                      }}
                    >
                      <Typography 
                        sx={{ 
                          fontWeight: 600,
                          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                          fontSize: '0.9375rem',
                        }}
                      >
                        {employee.full_name}
                      </Typography>
                      <Chip 
                        label={toPersianNumbers(employee.task_count)} 
                        size="small" 
                        sx={{ 
                          background: '#6366f1',
                          color: '#ffffff',
                          height: 24,
                          fontWeight: 600,
                          '& .MuiChip-label': {
                            px: 1.5,
                            fontSize: '0.8125rem',
                          },
                        }} 
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
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
                                وظیفه
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
                                وضعیت
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
                                موعد
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {employee.tasks.map((task) => {
                              const statusLabels = {
                                'backlog': 'لیست انتظار',
                                'todo': 'باید انجام شود',
                                'doing': 'در حال انجام',
                                'test': 'در حال تست',
                                'postpone': 'معوق شده',
                                'done': 'انجام شده',
                                'archive': 'بایگانی',
                              };
                              
                              const statusColors = {
                                'backlog': '#9e9e9e',
                                'todo': '#2196f3',
                                'doing': '#ff9800',
                                'test': '#9c27b0',
                                'postpone': '#f44336',
                                'done': '#4caf50',
                                'archive': '#607d8b',
                              };
                              
                              return (
                                <TableRow
                                  key={task.id}
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
                                  <TableCell align="right">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {task.color && (
                                        <Box
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: task.color,
                                          }}
                                        />
                                      )}
                                      {task.name}
                                      {task.is_draft && (
                                        <Chip 
                                          label="پیش‌نویس" 
                                          size="small" 
                                          color="warning"
                                          sx={{ height: 20, fontSize: '0.75rem' }}
                                        />
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    {task.project?.name || '-'}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={statusLabels[task.status] || task.status}
                                      size="small"
                                      sx={{
                                        backgroundColor: statusColors[task.status] || '#9e9e9e',
                                        color: '#ffffff',
                                        height: 24,
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    {task.deadline ? (
                                      <Typography 
                                        variant="body2" 
                                        color="error"
                                        sx={{ fontSize: '0.875rem' }}
                                      >
                                        <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                                          {moment(task.deadline).format('jYYYY/jMM/jDD')}
                                        </Box>
                                      </Typography>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ textAlign: 'center', py: 3 }}
              >
                هیچ وظیفه در حال انجام برای کارکنان یافت نشد
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrganizationalDashboard;
