import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
} from '@mui/material';
import { adminService } from '../api/services';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const StatCard = ({ title, value, subtitle, gradient }) => (
    <Card
      sx={{
        height: '100%',
        minHeight: 140,
        background: gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: subtitle ? 1 : 0 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

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
            subtitle={`${stats.users?.active || 0} کاربر فعال`}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کاربران مدیر"
            value={stats.users?.admins || 0}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل پروژه‌ها"
            value={stats.projects?.total || 0}
            subtitle={`${stats.projects?.active || 0} پروژه فعال`}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل وظایف"
            value={stats.tasks?.total || 0}
            subtitle={`${stats.tasks?.drafts || 0} پیش‌نویس`}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="روزهای کاری"
            value={stats.working_days?.total || 0}
            subtitle={`${stats.working_days?.today_check_ins || 0} چک‌این امروز`}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل گزارش‌ها"
            value={stats.reports?.total || 0}
            subtitle={`${stats.reports?.this_week || 0} این هفته`}
            gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="گزارش‌های این ماه"
            value={stats.reports?.this_month || 0}
            gradient="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="کل بازخوردها"
            value={stats.feedbacks?.total || 0}
            gradient="linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
          />
        </Grid>
      </Grid>

      {stats.tasks?.by_status && (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            توزیع وظایف بر اساس وضعیت
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(stats.tasks.by_status).map(([status, count]) => (
              <Grid item xs={6} sm={4} md={3} key={status}>
                <Card
                  sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                    {status}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {count}
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
