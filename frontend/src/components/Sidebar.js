import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import FolderIcon from '@mui/icons-material/Folder';
import FeedbackIcon from '@mui/icons-material/Feedback';
import EventIcon from '@mui/icons-material/Event';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DescriptionIcon from '@mui/icons-material/Description';
import NoteIcon from '@mui/icons-material/Note';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const drawerWidth = 240;
const collapsedWidth = 64;

const Sidebar = ({ open, onClose, user, onLogout, currentView, setCurrentView, collapsed, onToggleCollapse, onProfileClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  // Menu items organized by desired order
  const allMenuItems = user?.isAdmin
    ? [
        // Top section: Dashboard and core features
        { id: 'organizational-dashboard', label: 'داشبورد سازمانی', icon: <DashboardIcon /> },
        { id: 'working-day', label: 'روز کاری', icon: <AccessTimeIcon /> },
        { id: 'statistics', label: 'آمار', icon: <BarChartIcon /> },
        { id: 'projects', label: 'پروژه‌ها', icon: <FolderIcon /> },
        { id: 'kanban', label: 'کانبان', icon: <ViewKanbanIcon /> },
        { id: 'meetings', label: 'جلسات', icon: <EventIcon /> },
        { id: 'tasks', label: 'وظایف', icon: <AssignmentIcon /> },
        // Reports section
        { id: 'reports', label: 'گزارش‌ها', icon: <DescriptionIcon /> },
        // Feedback
        { id: 'feedback', label: 'بازخورد', icon: <FeedbackIcon /> },
        // Admin section at bottom
        { id: 'organizational-structure', label: 'ساختار سازمانی', icon: <AccountTreeIcon /> },
        { id: 'user-management', label: 'مدیریت کاربران', icon: <PeopleIcon /> },
        { id: 'settings', label: 'تنظیمات', icon: <SettingsIcon /> },
        { id: 'system-logs', label: 'لاگ‌های سیستم', icon: <ListIcon /> },
      ]
    : [
        // Non-admin menu items
        { id: 'working-day', label: 'روز کاری', icon: <AccessTimeIcon /> },
        { id: 'tasks', label: 'وظایف', icon: <AssignmentIcon /> },
        { id: 'kanban', label: 'کانبان', icon: <ViewKanbanIcon /> },
        { id: 'meetings', label: 'جلسات', icon: <EventIcon /> },
        { id: 'reports', label: 'گزارش‌ها', icon: <DescriptionIcon /> },
        { id: 'feedback', label: 'بازخورد', icon: <FeedbackIcon /> },
      ];

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
      {/* Toggle Button and Logo */}
      {!isMobile && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
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
          {!collapsed && (
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL}/logo.svg`}
              alt="Logo"
              sx={{
                height: 32,
                width: 32,
                ml: 1,
                filter: isDark 
                  ? 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))' 
                  : 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2))',
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
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
        <Box 
          onClick={onProfileClick}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: collapsed ? 0 : 1.5, 
            flexDirection: collapsed ? 'column' : 'row',
            justifyContent: 'flex-start', // Always align to right in RTL
            cursor: 'pointer',
            borderRadius: '6px',
            p: collapsed ? 1 : 1.5,
            transition: 'background-color 0.2s ease, transform 0.2s ease',
            '&:hover': {
              backgroundColor: isDark 
                ? 'rgba(99, 102, 241, 0.1)' 
                : 'rgba(99, 102, 241, 0.08)',
              transform: 'translateX(-2px)',
            },
            '&:active': {
              transform: 'translateX(0)',
            },
          }}
        >
          <Avatar 
            src={user?.profile_picture || undefined}
            sx={{ 
              width: collapsed ? 36 : 40, 
              height: collapsed ? 36 : 40, 
              bgcolor: '#6366f1',
              fontSize: '1rem',
              fontWeight: 600,
              transition: 'width 0.3s ease, height 0.3s ease, transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: isDark 
                  ? '0 4px 12px 0 rgba(99, 102, 241, 0.4)'
                  : '0 4px 12px 0 rgba(99, 102, 241, 0.3)',
              },
            }}
          >
            {!user?.profile_picture && (user?.username?.charAt(0)?.toUpperCase() || <AccountCircleIcon />)}
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
                borderRadius: 6,
                pl: 1.5, // Left padding (right side in RTL) - consistent spacing from blue line
                pr: collapsed ? 1 : 1.5, // Right padding (left side in RTL) - changes based on state
                py: 1,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                position: 'relative',
                justifyContent: 'flex-start', // Always align to right in RTL
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-selected': {
                  background: isDark 
                    ? 'rgba(99, 102, 241, 0.2)' 
                    : 'rgba(99, 102, 241, 0.15)',
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
                borderRadius: 6,
                px: 1,
                py: 1,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                justifyContent: 'flex-start', // Always align to right in RTL
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              borderRadius: 6,
              px: 1.5,
              py: 1,
              height: 48,
              minHeight: 48,
              maxHeight: 48,
              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              background: isDark ? '#0f172a' : '#ffffff',
              backgroundImage: 'none',
              '--Paper-overlay': 'none',
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
                background: isDark ? '#0f172a' : '#ffffff',
                backgroundImage: 'none',
                '--Paper-overlay': 'none',
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
