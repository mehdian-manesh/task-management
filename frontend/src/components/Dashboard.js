import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { workingDayService } from '../api/services';
import WorkingDayManager from './WorkingDayManager';
import TaskManager from './TaskManager';
import ProjectManager from './ProjectManager';
import FeedbackManager from './FeedbackManager';
import Kanban from './Kanban';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentView, setCurrentView] = useState('working-day');
  const [todayWorkingDay, setTodayWorkingDay] = useState(null);

  useEffect(() => {
    loadTodayWorkingDay();
  }, []);

  const loadTodayWorkingDay = async () => {
    try {
      const response = await workingDayService.getAll();
      const today = response.data.find(wd => !wd.check_out && !wd.is_on_leave);
      setTodayWorkingDay(today);
    } catch (error) {
      console.error('Error loading working day:', error);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const renderView = () => {
    switch (currentView) {
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
        return <WorkingDayManager todayWorkingDay={todayWorkingDay} onUpdate={loadTodayWorkingDay} />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <AccessTimeIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            سیستم مدیریت زمان و گزارش کار
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleLogout}>خروج</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item>
            <Button
              variant={currentView === 'working-day' ? 'contained' : 'outlined'}
              onClick={() => setCurrentView('working-day')}
              startIcon={<AccessTimeIcon />}
            >
              روز کاری
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={currentView === 'tasks' ? 'contained' : 'outlined'}
              onClick={() => setCurrentView('tasks')}
              startIcon={<AssignmentIcon />}
            >
              وظایف
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={currentView === 'kanban' ? 'contained' : 'outlined'}
              onClick={() => setCurrentView('kanban')}
            >
              کانبان
            </Button>
          </Grid>
          {user?.isAdmin && (
            <Grid item>
              <Button
                variant={currentView === 'projects' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('projects')}
              >
                پروژه‌ها
              </Button>
            </Grid>
          )}
          <Grid item>
            <Button
              variant={currentView === 'feedback' ? 'contained' : 'outlined'}
              onClick={() => setCurrentView('feedback')}
            >
              بازخورد
            </Button>
          </Grid>
        </Grid>

        <Paper sx={{ p: 3 }}>
          {renderView()}
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;