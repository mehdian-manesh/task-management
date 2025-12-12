import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
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
import SystemLogs from './SystemLogs';
import Settings from './Settings';
import Sidebar from './Sidebar';
import UserProfile from './UserProfile';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('working-day');
  const [todayWorkingDay, setTodayWorkingDay] = useState(null);

  useEffect(() => {
    loadTodayWorkingDay();
    // Set default view based on user role
    if (user?.isAdmin && currentView === 'working-day') {
      setCurrentView('organizational-dashboard');
    }
  }, [user]);

  useEffect(() => {
    // Close sidebar on mobile when view changes
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [currentView, isMobile]);

  useEffect(() => {
    // #region agent log
    // Debug sidebar positioning - check after render
    const checkLayout = () => {
      const parentBox = document.querySelector('[data-testid="dashboard-container"]') || 
        document.querySelector('body > div#root > div > div');
      const mainContent = document.querySelector('main');
      const sidebarDrawer = document.querySelector('.MuiDrawer-root.MuiDrawer-anchorRight');
      const sidebarPaper = document.querySelector('.MuiDrawer-root.MuiDrawer-anchorRight .MuiDrawer-paper');
      
      if (parentBox) {
        const parentStyles = window.getComputedStyle(parentBox);
        const parentRect = parentBox.getBoundingClientRect();
      }
      
      if (mainContent) {
        const mainStyles = window.getComputedStyle(mainContent);
        const mainRect = mainContent.getBoundingClientRect();
      }
      
      const sidebarWrapper = document.querySelector('[data-testid="sidebar-wrapper"]')?.parentElement;
      if (sidebarWrapper) {
        const wrapperStyles = window.getComputedStyle(sidebarWrapper);
        const wrapperRect = sidebarWrapper.getBoundingClientRect();
      }
      
      if (sidebarDrawer) {
        const drawerStyles = window.getComputedStyle(sidebarDrawer);
        const drawerRect = sidebarDrawer.getBoundingClientRect();
      }
      
      if (sidebarPaper) {
        const paperStyles = window.getComputedStyle(sidebarPaper);
        const paperRect = sidebarPaper.getBoundingClientRect();
      }
      
      // Check if sidebar is visually on left or right
      if (mainContent && sidebarPaper) {
        const mainRect = mainContent.getBoundingClientRect();
        const sidebarRect = sidebarPaper.getBoundingClientRect();
        const sidebarOnRight = sidebarRect.left > mainRect.right;
        const computedDirection = parentBox ? window.getComputedStyle(parentBox).direction : 'unknown';
      }
    };
    
    // Run after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkLayout, 100);
    return () => clearTimeout(timeoutId);
    // #endregion
  }, [currentView, isMobile, sidebarOpen]);

  const loadTodayWorkingDay = async () => {
    try {
      const response = await workingDayService.getAll();
      const today = response.data.find(wd => !wd.check_out && !wd.is_on_leave);
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
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.15)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleSidebarToggle}
              sx={{ ml: 2, color: 'rgba(255, 255, 255, 0.9)' }}
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