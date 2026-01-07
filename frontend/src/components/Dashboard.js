import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { workingDayService } from '../api/services';
import WorkingDayManager from './WorkingDayManager';
import TaskManager from './TaskManager';
import ProjectManager from './ProjectManager';
import FeedbackManager from './FeedbackManager';
import Kanban from './Kanban';
import UserManagement from './UserManagement';
import Statistics from './Statistics';
import OrganizationalDashboard from './OrganizationalDashboard';
import OrganizationalStructure from './OrganizationalStructure';
import SystemLogs from './SystemLogs';
import Settings from './Settings';
import Sidebar from './Sidebar';
import UserProfile from './UserProfile';
import MeetingManager from './MeetingManager';
import Reports from './Reports';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('working-day');
  const [todayWorkingDay, setTodayWorkingDay] = useState(null);

  const hasSetAdminDefaultView = React.useRef(false);

  useEffect(() => {
    loadTodayWorkingDay();
    // Set default view for admin only once on mount; allow manual switch afterwards
    if (user?.isAdmin && !hasSetAdminDefaultView.current && currentView === 'working-day') {
      setCurrentView('organizational-dashboard');
      hasSetAdminDefaultView.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Close sidebar on mobile when view changes
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [currentView, isMobile]);

  useEffect(() => {
    // Sidebar positioning is handled by Material-UI Drawer component
  }, [currentView, isMobile, sidebarOpen]);

  const loadTodayWorkingDay = async () => {
    try {
      const response = await workingDayService.getAll();
      // Handle paginated response
      const workingDays = response.data.results || response.data;
      const today = Array.isArray(workingDays)
        ? workingDays.find(wd => !wd.check_out && !wd.is_on_leave)
        : null;
      setTodayWorkingDay(today);
    } catch (error) {
      console.error('Error loading working day:', error);
    }
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout();
  };

  const renderView = () => {
    if (user?.isAdmin) {
      // Admin views
      switch (currentView) {
        case 'user-management':
          return <UserManagement />;
        case 'statistics':
          return <Statistics />;
        case 'organizational-dashboard':
          return <OrganizationalDashboard />;
        case 'organizational-structure':
          return <OrganizationalStructure />;
        case 'system-logs':
          return <SystemLogs />;
        case 'settings':
          return <Settings />;
        case 'working-day':
          return <WorkingDayManager todayWorkingDay={todayWorkingDay} onUpdate={loadTodayWorkingDay} />;
        case 'tasks':
          return <TaskManager />;
        case 'kanban':
          return <Kanban />;
        case 'projects':
          return <ProjectManager />;
        case 'feedback':
          return <FeedbackManager />;
        case 'meetings':
          return <MeetingManager />;
        case 'reports':
          return <Reports />;
        case 'profile':
          return <UserProfile />;
        default:
          return <OrganizationalDashboard />;
      }
    } else {
      // Normal user views
      switch (currentView) {
        case 'working-day':
          return <WorkingDayManager todayWorkingDay={todayWorkingDay} onUpdate={loadTodayWorkingDay} />;
        case 'tasks':
          return <TaskManager />;
        case 'kanban':
          return <Kanban />;
        case 'feedback':
          return <FeedbackManager />;
        case 'meetings':
          return <MeetingManager />;
        case 'reports':
          return <Reports />;
        case 'profile':
          return <UserProfile />;
        default:
          return <WorkingDayManager todayWorkingDay={todayWorkingDay} onUpdate={loadTodayWorkingDay} />;
      }
    }
  };

  const drawerWidth = 240;
  const collapsedWidth = 64;
  const sidebarWidth = sidebarCollapsed ? collapsedWidth : drawerWidth;
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.direction = 'rtl';
    }
  }, []);

  return (
    <Box
      ref={containerRef}
      data-testid="dashboard-container"
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'transparent',
        flexDirection: 'row-reverse',
        position: 'relative',
      }}
    >
      {/* Top App Bar for Mobile */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.4)'
              : 'rgba(255, 255, 255, 0.15)',
            borderBottom: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.15)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/logo.svg`}
                alt="Logo"
                sx={{
                  height: 32,
                  width: 32,
                  filter: (theme) => theme.palette.mode === 'dark' 
                    ? 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))' 
                    : 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2))',
                }}
              />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  color: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.9)' 
                    : 'rgba(0, 0, 0, 0.87)',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                مدیریت زمان
              </Typography>
            </Box>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleSidebarToggle}
              sx={{ 
                color: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(0, 0, 0, 0.87)',
              }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content - Windows 11 Style */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarWidth}px)` },
          minHeight: '100vh',
          background: 'transparent',
          mt: { xs: 7, md: 0 },
          overflow: 'auto',
          transition: 'width 0.3s ease',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 3, md: 3 },
            maxWidth: '100%',
          }}
        >
          {renderView()}
        </Box>
      </Box>

      {/* Sidebar - Right Side */}
      <Box>
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onLogout={handleLogout}
          currentView={currentView}
          setCurrentView={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onProfileClick={() => setCurrentView('profile')}
        />
      </Box>
    </Box>
  );
};

export default Dashboard;