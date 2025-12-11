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
  const isDark = theme.palette.mode === 'dark';
  
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
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.3)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: isDark 
          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
        zIndex: 1,
      },
    }}>
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
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: isDark 
                ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.08), transparent)',
            },
          }}
        >
          <IconButton
            onClick={onToggleCollapse}
            sx={{
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
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
          justifyContent: 'flex-start', // Always align to right in RTL
          px: collapsed ? 1.5 : 2.5,
          py: 2.5,
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
          transition: 'padding 0.3s ease',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: isDark 
              ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.08), transparent)',
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: collapsed ? 0 : 1.5, 
          flexDirection: collapsed ? 'column' : 'row',
          justifyContent: 'flex-start', // Always align to right in RTL
        }}>
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
                color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
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
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
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
        background: 'transparent',
      }}>
        {allMenuItems.map((item) => {
          const isSelected = currentView === item.id;
          const buttonContent = (
            <ListItemButton
              onClick={() => handleMenuClick(item.id)}
              selected={isSelected}
              sx={{
                borderRadius: 12,
                pl: 1.5, // Left padding (right side in RTL) - consistent spacing from blue line
                pr: collapsed ? 1 : 1.5, // Right padding (left side in RTL) - changes based on state
                py: 1,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                position: 'relative',
                justifyContent: 'flex-start', // Always align to right in RTL
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                '&.Mui-selected': {
                  background: isDark 
                    ? 'rgba(99, 102, 241, 0.2)' 
                    : 'rgba(99, 102, 241, 0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: isDark 
                    ? '1px solid rgba(99, 102, 241, 0.3)' 
                    : '1px solid rgba(99, 102, 241, 0.4)',
                  color: isDark ? '#ffffff' : '#6366f1',
                  boxShadow: isDark
                    ? '0 4px 16px 0 rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 4px 16px 0 rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: isDark 
                      ? 'rgba(99, 102, 241, 0.25)' 
                      : 'rgba(99, 102, 241, 0.2)',
                    boxShadow: isDark
                      ? '0 6px 20px 0 rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      : '0 6px 20px 0 rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isDark ? '#ffffff' : '#6366f1',
                  },
                },
                '&:hover': {
                  background: isSelected 
                    ? 'rgba(99, 102, 241, 0.25)' 
                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: isSelected 
                    ? '1px solid rgba(99, 102, 241, 0.3)' 
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)'),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected 
                    ? (isDark ? '#ffffff' : '#6366f1')
                    : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'),
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
                    color: isSelected 
                      ? (isDark ? '#ffffff' : '#6366f1')
                      : (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)'),
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
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        transition: 'height 0.3s ease, padding 0.3s ease',
        position: 'relative',
        background: 'transparent',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: isDark 
            ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.08), transparent)',
        },
      }}>
        {collapsed ? (
          <Tooltip title="خروج" placement="left" arrow>
            <ListItemButton
              onClick={onLogout}
              sx={{
                borderRadius: 12,
                px: 1,
                py: 1,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                justifyContent: 'flex-start', // Always align to right in RTL
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                '&:hover': {
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  boxShadow: '0 4px 16px 0 rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
              borderRadius: 12,
              px: 1.5,
              py: 1,
              height: 48,
              minHeight: 48,
              maxHeight: 48,
              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              '&:hover': {
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 4px 16px 0 rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
              background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
              overflowX: 'hidden',
              boxShadow: isDark 
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
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
                borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRight: 'none',
                background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                position: 'relative',
                height: '100%',
                right: 'auto !important',
                left: 'auto !important',
                transform: 'none !important',
                transition: 'width 0.3s ease',
                overflowX: 'hidden',
                boxShadow: isDark 
                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 8px 32px 0 rgba(31, 38, 135, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
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
