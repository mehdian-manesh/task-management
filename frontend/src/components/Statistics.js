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

  // Consistent card gradient - theme-aware (brighter for better contrast)
  const getCardGradient = () => {
    if (isDark) {
      return 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'; // Bright blue to bright purple
    } else {
      return 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'; // Primary to secondary
    }
  };

  // Consistent accent color for borders and highlights
  const getAccentColor = () => {
    return 'rgba(37, 99, 235, 0.4)'; // Primary color
  };

  const StatCard = ({ title, value, subtitle }) => {
    const gradient = getCardGradient();
    const accentColor = getAccentColor();

    return (
      <Card
        sx={{
          height: '100%',
          minHeight: 140,
          position: 'relative',
          background: isDark
            ? 'rgba(30, 41, 59, 0.4)'
            : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 2,
          border: isDark
            ? `1px solid rgba(255, 255, 255, 0.08)`
            : `1px solid rgba(255, 255, 255, 0.6)`,
          boxShadow: isDark
            ? '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: gradient,
            opacity: 0.8,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: gradient,
            opacity: 0.1,
            pointerEvents: 'none',
          },
          '&:hover': {
            transform: 'translateY(-6px) scale(1.02)',
            boxShadow: isDark
              ? '0 16px 48px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
              : '0 16px 48px 0 rgba(31, 38, 135, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
            borderColor: accentColor,
            '&::before': {
              opacity: 1,
              height: '3px',
            },
            '&::after': {
              opacity: 0.15,
            },
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
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: subtitle ? 1.5 : 0,
              background: gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
              textShadow: isDark
                ? '0 0 20px rgba(96, 165, 250, 0.3)'
                : '0 0 10px rgba(37, 99, 235, 0.2)',
              filter: 'brightness(1.1)',
            }}
          >
            {toPersianNumbers(value)}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.55)',
                mt: 1,
                fontSize: '0.8125rem',
                fontWeight: 500,
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
      <Typography variant="h5" sx={{ mb: 3 }}>
        آمار سیستم
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل کاربران"
            value={stats.users?.total || 0}
            subtitle={toPersianNumbers(`${stats.users?.active || 0} کاربر فعال`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کاربران مدیر"
            value={stats.users?.admins || 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل پروژه‌ها"
            value={stats.projects?.total || 0}
            subtitle={toPersianNumbers(`${stats.projects?.active || 0} پروژه فعال`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل وظایف"
            value={stats.tasks?.total || 0}
            subtitle={toPersianNumbers(`${stats.tasks?.drafts || 0} پیش‌نویس`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="روزهای کاری"
            value={stats.working_days?.total || 0}
            subtitle={toPersianNumbers(`${stats.working_days?.today_check_ins || 0} چک‌این امروز`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل گزارش‌ها"
            value={stats.reports?.total || 0}
            subtitle={toPersianNumbers(`${stats.reports?.this_week || 0} این هفته`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="گزارش‌های این ماه"
            value={stats.reports?.this_month || 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
            borderRadius: 2,
            background: isDark
              ? 'rgba(30, 41, 59, 0.4)'
              : 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: isDark
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
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
              <Grid item xs={6} sm={4} md={3} key={status}>
                <Card
                  sx={{
                    p: 2.5,
                    background: isDark
                      ? 'rgba(30, 41, 59, 0.5)'
                      : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(15px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(15px) saturate(180%)',
                    border: isDark
                      ? '1px solid rgba(255, 255, 255, 0.08)'
                      : '1px solid rgba(255, 255, 255, 0.7)',
                    borderRadius: 1.5,
                    boxShadow: isDark
                      ? '0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
                      : '0 4px 16px 0 rgba(31, 38, 135, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: getCardGradient(),
                      opacity: 0.6,
                    },
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.02)',
                      boxShadow: isDark
                        ? '0 8px 24px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
                        : '0 8px 24px 0 rgba(31, 38, 135, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
                      borderColor: getAccentColor(),
                      '&::before': {
                        opacity: 1,
                        height: '3px',
                      },
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1.5,
                      fontWeight: 600,
                      color: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.6)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {status}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      background: getCardGradient(),
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: isDark
                        ? '0 0 15px rgba(96, 165, 250, 0.3)'
                        : '0 0 8px rgba(37, 99, 235, 0.2)',
                      filter: 'brightness(1.1)',
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
