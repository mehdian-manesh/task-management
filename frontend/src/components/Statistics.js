import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { adminService } from '../api/services';
import { toPersianNumbers } from '../utils/numberUtils';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await adminService.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>در حال بارگذاری...</Typography>;
  }

  if (!stats) {
    return <Typography>خطا در بارگذاری آمار</Typography>;
  }

  const StatCard = ({ title, value, subtitle }) => {

    return (
      <Card
        sx={{
          height: '100%',
          minHeight: 140,
          position: 'relative',
          background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
            background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <CardContent
          sx={{
            p: 3,
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              mb: 1.5,
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: subtitle ? 1.5 : 0,
              color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
              lineHeight: 1.2,
              fontSize: '2rem',
            }}
          >
            {toPersianNumbers(value)}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                mt: 1,
                fontSize: '0.8125rem',
                fontWeight: 400,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
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
        آمار سیستم
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="کل کاربران"
            value={stats.users?.total || 0}
            subtitle={toPersianNumbers(`${stats.users?.active || 0} کاربر فعال`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="کاربران مدیر"
            value={stats.users?.admins || 0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="کل پروژه‌ها"
            value={stats.projects?.total || 0}
            subtitle={toPersianNumbers(`${stats.projects?.active || 0} پروژه فعال`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="کل وظایف"
            value={stats.tasks?.total || 0}
            subtitle={toPersianNumbers(`${stats.tasks?.drafts || 0} پیش‌نویس`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="روزهای کاری"
            value={stats.working_days?.total || 0}
            subtitle={toPersianNumbers(`${stats.working_days?.today_check_ins || 0} ورود امروز`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="کل گزارش‌ها"
            value={stats.reports?.total || 0}
            subtitle={toPersianNumbers(`${stats.reports?.this_week || 0} این هفته`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="گزارش‌های این ماه"
            value={stats.reports?.this_month || 0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="کل بازخوردها"
            value={stats.feedbacks?.total || 0}
          />
        </Grid>
      </Grid>

      {stats.tasks?.by_status && (
        <Paper
          sx={{
            p: 3,
            mt: 4,
            borderRadius: '6px !important',
            background: isDark
              ? 'rgba(15, 23, 42, 0.4)'
              : 'rgba(255, 255, 255, 0.15)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: isDark
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 700,
              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.85)',
            }}
          >
            توزیع وظایف بر اساس وضعیت
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(stats.tasks.by_status).map(([status, count], index) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={status}>
                <Card
                  sx={{
                    p: 2.5,
                    background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)',
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1.5,
                      fontWeight: 500,
                      color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {status}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                      fontSize: '1.5rem',
                    }}
                  >
                    {toPersianNumbers(count)}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default Statistics;
