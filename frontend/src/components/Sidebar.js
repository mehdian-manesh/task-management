import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListIcon from '@mui/icons-material/List';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import FolderIcon from '@mui/icons-material/Folder';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const drawerWidth = 240;
const collapsedWidth = 64;

const Sidebar = ({ open, onClose, user, onLogout, currentView, setCurrentView, collapsed, onToggleCollapse }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/f44376ad-653c-4bd4-9eca-7540f6fc0e32',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sidebar.js:39',message:'Sidebar render',data:{isMobile,open,anchor:'right'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  }, [isMobile, open]);
  // #endregion

  const adminMenuItems = [
    { id: 'organizational-dashboard', label: 'داشبورد سازمانی', icon: <DashboardIcon /> },
    { id: 'user-management', label: 'مدیریت کاربران', icon: <PeopleIcon /> },
    { id: 'statistics', label: 'آمار', icon: <BarChartIcon /> },
    { id: 'system-logs', label: 'لاگ‌های سیستم', icon: <ListIcon /> },
    { id: 'settings', label: 'تنظیمات', icon: <SettingsIcon /> },
  ];

  const commonMenuItems = [
    { id: 'working-day', label: 'روز کاری', icon: <AccessTimeIcon /> },
    { id: 'tasks', label: 'وظایف', icon: <AssignmentIcon /> },
    { id: 'kanban', label: 'کانبان', icon: <ViewKanbanIcon /> },
  ];

  const adminOnlyItems = [
    { id: 'projects', label: 'پروژه‌ها', icon: <FolderIcon /> },
  ];

  const allMenuItems = user?.isAdmin
    ? [...adminMenuItems, ...commonMenuItems, ...adminOnlyItems, { id: 'feedback', label: 'بازخورد', icon: <FeedbackIcon /> }]
    : [...commonMenuItems, { id: 'feedback', label: 'بازخورد', icon: <FeedbackIcon /> }];

  const handleMenuClick = (viewId) => {
    setCurrentView(viewId);
    if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
      {/* Toggle Button */}
      {!isMobile && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            height: 56,
            minHeight: 56,
            maxHeight: 56,
            px: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <IconButton
            onClick={onToggleCollapse}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
              },
            }}
          >
            {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
      )}

      {/* User Info - Windows 11 Style */}
      <Box
        sx={{
          height: 96,
          minHeight: 96,
          maxHeight: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1.5 : 2.5,
          py: 2.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#1e1e1e',
          transition: 'padding 0.3s ease, justify-content 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 1.5, flexDirection: collapsed ? 'column' : 'row' }}>
          <Avatar 
            sx={{ 
              width: collapsed ? 36 : 40, 
              height: collapsed ? 36 : 40, 
              bgcolor: '#6366f1',
              fontSize: '1rem',
              fontWeight: 600,
              transition: 'width 0.3s ease, height 0.3s ease',
            }}
          >
            {user?.username?.charAt(0)?.toUpperCase() || <AccountCircleIcon />}
          </Avatar>
          {!collapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 600, 
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  lineHeight: 1.4,
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.username || 'کاربر'}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.8125rem',
                  display: 'block',
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email || (user?.isAdmin ? 'مدیر سیستم' : 'کاربر عادی')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Menu Items - Windows 11 Style */}
      <List sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 1, 
        pt: 0.5,
        transition: 'padding 0.3s ease',
      }}>
        {allMenuItems.map((item) => {
          const isSelected = currentView === item.id;
          const buttonContent = (
            <ListItemButton
              onClick={() => handleMenuClick(item.id)}
              selected={isSelected}
              sx={{
                borderRadius: '6px',
                pl: 1.5, // Left padding (right side in RTL) - consistent spacing from blue line
                pr: collapsed ? 1 : 1.5, // Right padding (left side in RTL) - changes based on state
                py: 1,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                position: 'relative',
                justifyContent: 'flex-start', // Always align to right in RTL
                transition: 'padding 0.3s ease',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '60%',
                    backgroundColor: '#6366f1',
                    borderRadius: '2px 0 0 2px',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#ffffff',
                  },
                },
                '&:hover': {
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: collapsed ? 0 : 36,
                  justifyContent: 'center',
                  transition: 'min-width 0.3s ease',
                  '& svg': {
                    fontSize: '1.25rem',
                  },
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '0.9375rem',
                    color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
                  }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem 
              key={item.id} 
              disablePadding 
              sx={{ 
                mb: 0.25,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
              }}
            >
              {collapsed ? (
                <Tooltip title={item.label} placement="left" arrow>
                  {buttonContent}
                </Tooltip>
              ) : (
                buttonContent
              )}
            </ListItem>
          );
        })}
      </List>

      {/* Logout - Windows 11 Style */}
      <Box sx={{ 
        height: 72,
        minHeight: 72,
        maxHeight: 72,
        display: 'flex',
        alignItems: 'center',
        p: 1, 
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'height 0.3s ease, padding 0.3s ease',
      }}>
        {collapsed ? (
          <Tooltip title="خروج" placement="left" arrow>
            <ListItemButton
              onClick={onLogout}
              sx={{
                borderRadius: '6px',
                px: 1,
                py: 1,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                color: 'rgba(255, 255, 255, 0.9)',
                justifyContent: 'flex-start', // Always align to right in RTL
                transition: 'padding 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}>
                <LogoutIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton
            onClick={onLogout}
            sx={{
              borderRadius: '6px',
              px: 1.5,
              py: 1,
              height: 48,
              minHeight: 48,
              maxHeight: 48,
              color: 'rgba(255, 255, 255, 0.9)',
              transition: 'padding 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="خروج"
              primaryTypographyProps={{
                fontSize: '0.9375rem',
              }}
            />
          </ListItemButton>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          anchor="right"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              background: '#1e1e1e',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Box
          data-testid="sidebar-wrapper"
          sx={{
            width: collapsed ? collapsedWidth : drawerWidth,
            flexShrink: 0,
            position: 'relative',
            transition: 'width 0.3s ease',
          }}
        >
          <Drawer
            variant="permanent"
            anchor="right"
            open
            sx={{
              width: collapsed ? collapsedWidth : drawerWidth,
              flexShrink: 0,
              transition: 'width 0.3s ease',
              '& .MuiDrawer-paper': {
                width: collapsed ? collapsedWidth : drawerWidth,
                boxSizing: 'border-box',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                borderRight: 'none',
                background: '#1e1e1e',
                position: 'relative',
                height: '100%',
                right: 'auto !important',
                left: 'auto !important',
                transform: 'none !important',
                transition: 'width 0.3s ease',
                overflowX: 'hidden',
              },
              '&.MuiDrawer-root': {
                position: 'relative',
                right: 'auto',
                left: 'auto',
                transform: 'none',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </Box>
      )}
    </>
  );
};

export default Sidebar;
