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
      {/* Page Title - Windows 11 Style */}
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 3,
          fontWeight: 600,
          fontSize: '1.75rem',
          color: '#ffffff',
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
              borderRadius: '8px',
              background: '#1e1e1e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600, 
                color: '#ffffff',
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
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    <Typography 
                      sx={{ 
                        fontWeight: 500, 
                        color: 'rgba(255, 255, 255, 0.9)',
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
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
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
              borderRadius: '8px',
              background: '#1e1e1e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600, 
                color: '#ffffff',
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
                        color: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.875rem',
                      }}
                    >
                      پروژه
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        },
                        '& td': {
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          color: 'rgba(255, 255, 255, 0.9)',
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
              borderRadius: '8px',
              background: '#1e1e1e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600, 
                color: '#ffffff',
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
                        color: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.875rem',
                      }}
                    >
                      کاربر
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        },
                        '& td': {
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          color: 'rgba(255, 255, 255, 0.9)',
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
