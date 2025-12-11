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

const drawerWidth = 280;

const Sidebar = ({ open, onClose, user, onLogout, currentView, setCurrentView }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            مدیریت زمان
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* User Info */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            {user?.username?.charAt(0)?.toUpperCase() || <AccountCircleIcon />}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username || 'کاربر'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.isAdmin ? 'مدیر سیستم' : 'کاربر عادی'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Menu Items */}
      <List sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {allMenuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleMenuClick(item.id)}
              selected={currentView === item.id}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: currentView === item.id ? 'white' : 'text.secondary',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: currentView === item.id ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Logout */}
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <ListItemButton
          onClick={onLogout}
          sx={{
            borderRadius: 2,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="خروج" />
        </ListItemButton>
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
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderLeft: 'none',
              boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
