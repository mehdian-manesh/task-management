import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  useTheme,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import NoteIcon from '@mui/icons-material/Note';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useAuth } from '../context/AuthContext';
import ReportViewer from './ReportViewer';
import ReportNotesManager from './ReportNotesManager';
import SavedReportsList from './SavedReportsList';

const Reports = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [];

  // Individual Reports tab - available to all users
  tabs.push({
    label: 'گزارش کار',
    icon: <DescriptionIcon />,
    component: <ReportViewer reportType="individual" />,
  });

  // Team Reports tab - only for admins
  if (user?.isAdmin) {
    tabs.push({
      label: 'گزارش تیمی',
      icon: <DescriptionIcon />,
      component: <ReportViewer reportType="team" />,
    });
  }

  // Report Notes tab - only for admins
  if (user?.isAdmin) {
    tabs.push({
      label: 'یادداشت‌های گزارش',
      icon: <NoteIcon />,
      component: <ReportNotesManager />,
    });
  }

  // Saved Reports tab - available to all users
  tabs.push({
    label: 'گزارش‌های ذخیره شده',
    icon: <FolderOpenIcon />,
    component: <SavedReportsList />,
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        گزارش‌ها
      </Typography>

      <Paper
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.6)'
              : 'rgba(255, 255, 255, 0.8)',
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '0.95rem',
              fontWeight: 500,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'rgba(99, 102, 241, 0.08)',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              backgroundColor: theme.palette.mode === 'dark' ? '#6366f1' : '#6366f1',
              borderRadius: '3px 3px 0 0',
            },
            '& .Mui-selected': {
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#6366f1',
              fontWeight: 600,
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{
                flexDirection: 'row',
                gap: 1,
                alignItems: 'center',
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3, md: 3 } }}>
          {tabs[activeTab]?.component}
        </Box>
      </Paper>
    </Box>
  );
};

export default Reports;
