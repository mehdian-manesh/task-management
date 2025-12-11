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
        fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:49',message:'Parent Box styles',data:{flexDirection:parentStyles.flexDirection,direction:parentStyles.direction,display:parentStyles.display,left:parentRect.left,right:parentRect.right,width:parentRect.width},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      }
      
      if (mainContent) {
        const mainStyles = window.getComputedStyle(mainContent);
        const mainRect = mainContent.getBoundingClientRect();
        fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:56',message:'Main content position',data:{left:mainRect.left,right:mainRect.right,width:mainRect.width,order:mainStyles.order},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'B'})}).catch(()=>{});
      }
      
      const sidebarWrapper = document.querySelector('[data-testid="sidebar-wrapper"]')?.parentElement;
      if (sidebarWrapper) {
        const wrapperStyles = window.getComputedStyle(sidebarWrapper);
        const wrapperRect = sidebarWrapper.getBoundingClientRect();
        fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:60',message:'Sidebar wrapper position',data:{left:wrapperRect.left,right:wrapperRect.right,width:wrapperRect.width,order:wrapperStyles.order},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'H'})}).catch(()=>{});
      }
      
      if (sidebarDrawer) {
        const drawerStyles = window.getComputedStyle(sidebarDrawer);
        const drawerRect = sidebarDrawer.getBoundingClientRect();
        fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:66',message:'Drawer root position',data:{left:drawerRect.left,right:drawerRect.right,width:drawerRect.width,position:drawerStyles.position,transform:drawerStyles.transform},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'C'})}).catch(()=>{});
      }
      
      if (sidebarPaper) {
        const paperStyles = window.getComputedStyle(sidebarPaper);
        const paperRect = sidebarPaper.getBoundingClientRect();
        fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:72',message:'Drawer paper position',data:{left:paperRect.left,right:paperRect.right,width:paperRect.width,position:paperStyles.position,transform:paperStyles.transform,rightStyle:paperStyles.right,leftStyle:paperStyles.left},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'D'})}).catch(()=>{});
      }
      
      // Check if sidebar is visually on left or right
      if (mainContent && sidebarPaper) {
        const mainRect = mainContent.getBoundingClientRect();
        const sidebarRect = sidebarPaper.getBoundingClientRect();
        const sidebarOnRight = sidebarRect.left > mainRect.right;
        const computedDirection = parentBox ? window.getComputedStyle(parentBox).direction : 'unknown';
        fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:79',message:'Sidebar position relative to main',data:{sidebarOnRight,mainLeft:mainRect.left,mainRight:mainRect.right,sidebarLeft:sidebarRect.left,sidebarRight:sidebarRect.right,computedDirection},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'E'})}).catch(()=>{});
      }
    };
    
    // Run after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkLayout, 100);
    return () => clearTimeout(timeoutId);
    // #endregion
  }, [currentView, isMobile, sidebarOpen]);

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

  const drawerWidth = 240;
  const collapsedWidth = 64;
  const sidebarWidth = sidebarCollapsed ? collapsedWidth : drawerWidth;
  const containerRef = React.useRef(null);

  // #region agent log
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.direction = 'rtl';
      const computed = window.getComputedStyle(containerRef.current).direction;
      fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.js:180',message:'Setting direction via ref',data:{setDirection:'rtl',computedDirection:computed},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'G'})}).catch(()=>{});
    }
  }, []);
  // #endregion

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
        />
      </Box>
    </Box>
  );
};

export default Dashboard;