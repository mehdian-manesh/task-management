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

const Dashboard = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
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

  const loadTodayWorkingDay = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:36',message:'loadTodayWorkingDay entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      const response = await workingDayService.getAll();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:39',message:'loadTodayWorkingDay response received',data:{responseDataLength:response.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const today = response.data.find(wd => !wd.check_out && !wd.is_on_leave);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:40',message:'loadTodayWorkingDay before setState',data:{today:today},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setTodayWorkingDay(today);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:41',message:'loadTodayWorkingDay after setState',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:43',message:'loadTodayWorkingDay error',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
        default:
          return <WorkingDayManager todayWorkingDay={todayWorkingDay} onUpdate={loadTodayWorkingDay} />;
      }
    }
  };

  const drawerWidth = 280;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top App Bar for Mobile */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(102, 126, 234, 0.3)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}`,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleSidebarToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          p: { xs: 2, sm: 3, md: 4 },
          mt: { xs: 7, md: 0 },
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 1.5,
            minHeight: 'calc(100vh - 64px)',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.6)'
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
          }}
        >
          {renderView()}
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;