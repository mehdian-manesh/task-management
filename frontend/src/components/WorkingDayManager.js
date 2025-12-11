import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AddIcon from '@mui/icons-material/Add';
import { workingDayService, reportService, taskService } from '../api/services';
import { formatToJalaliWithTime, REPORT_RESULTS, REPORT_RESULT_LABELS } from '../utils/dateUtils';

const RESULT_CHOICES = Object.entries(REPORT_RESULT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const WorkingDayManager = ({ todayWorkingDay, onUpdate }) => {
  const [workingDay, setWorkingDay] = useState(todayWorkingDay);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    task_id: '',
    task_name: '',
    result: 'ongoing',
    comment: '',
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setWorkingDay(todayWorkingDay);
    if (todayWorkingDay) {
      loadReports(todayWorkingDay.id);
    }
  }, [todayWorkingDay]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadReports = async (workingDayId) => {
    try {
      const response = await reportService.getByWorkingDay(workingDayId);
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await taskService.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await workingDayService.checkIn();
      setWorkingDay(response.data);
      setMessage({ type: 'success', text: 'با موفقیت چک‌این شدید' });
      onUpdate();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در چک‌این' });
    }
  };

  const handleCheckOut = async () => {
    try {
      await workingDayService.checkOut(workingDay.id);
      setMessage({ type: 'success', text: 'با موفقیت چک‌اوت شدید' });
      onUpdate();
      setWorkingDay(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در چک‌اوت' });
    }
  };

  const handleLeave = async () => {
    try {
      await workingDayService.leave(workingDay.id);
      setMessage({ type: 'success', text: 'روز به عنوان مرخصی ثبت شد' });
      onUpdate();
      setWorkingDay(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ثبت مرخصی' });
    }
  };

  const handleAddReport = async () => {
    try {
      let taskId = newReport.task_id;
      
      // Create a draft task if no task is selected
      if (!taskId && newReport.task_name) {
        const taskResponse = await taskService.create({
          name: newReport.task_name,
          status: 'todo',
          is_draft: true,
        });
        taskId = taskResponse.data.id;
      }
      
      const reportData = {
        ...newReport,
        task_id: taskId,
      };
      
      const response = await reportService.create(workingDay.id, reportData);
      
      // Update task status based on report result
      if (response.data.result === REPORT_RESULTS.SUCCESS) {
        await taskService.update(taskId, { status: 'done' });
      } else if (response.data.result === REPORT_RESULTS.POSTPONED) {
        await taskService.update(taskId, { status: 'postpone' });
      } else if (response.data.result === REPORT_RESULTS.CANCELLED) {
        await taskService.update(taskId, { status: 'archive' });
      }
      setMessage({ type: 'success', text: 'گزارش با موفقیت ثبت شد' });
      setOpenReportDialog(false);
      setNewReport({ task_id: '', task_name: '', result: 'ongoing', comment: '' });
      loadReports(workingDay.id);
      loadTasks();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ثبت گزارش' });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        مدیریت روز کاری
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {!workingDay ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              شما هنوز چک‌این نکرده‌اید
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              برای شروع ثبت گزارش کار، ابتدا چک‌این کنید
            </Typography>
            <Button
              variant="contained"
              startIcon={<AccessTimeIcon />}
              onClick={handleCheckIn}
            >
              چک‌این
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  وضعیت روز کاری
                </Typography>
                <Typography variant="body1">
                  زمان ورود: {formatToJalaliWithTime(workingDay.check_in)}
                </Typography>
                {workingDay.check_out && (
                  <Typography variant="body1">
                    زمان خروج: {formatToJalaliWithTime(workingDay.check_out)}
                  </Typography>
                )}
                {!workingDay.check_out && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ExitToAppIcon />}
                      onClick={handleCheckOut}
                      sx={{ mr: 2 }}
                    >
                      چک‌اوت
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<BeachAccessIcon />}
                      onClick={handleLeave}
                    >
                      ثبت مرخصی
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    گزارش‌های کاری امروز
                  </Typography>
                  {!workingDay.check_out && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenReportDialog(true)}
                    >
                      افزودن گزارش
                    </Button>
                  )}
                </Box>

                {reports.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    هنوز گزارشی ثبت نشده است
                  </Typography>
                ) : (
                  <List>
                    {reports.map((report, index) => (
                      <React.Fragment key={report.id}>
                        <ListItem>
                          <ListItemText
                            primary={`وظیفه: ${report.task?.name || 'بدون عنوان'}`}
                            secondary={
                              <>
                                <Typography component="span" variant="body2">
                                  نتیجه: {RESULT_CHOICES.find(r => r.value === report.result)?.label}
                                </Typography>
                                <br />
                                {report.comment && (
                                  <Typography component="span" variant="body2">
                                    توضیحات: {report.comment}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                        </ListItem>
                        {index < reports.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Add Report Dialog */}
      <Dialog open={openReportDialog} onClose={() => setOpenReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>افزودن گزارش کاری</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="انتخاب وظیفه"
            value={newReport.task_id}
            onChange={(e) => setNewReport({ ...newReport, task_id: e.target.value })}
            margin="normal"
            dir="rtl"
          >
            <MenuItem value="">وظیفه جدید</MenuItem>
            {tasks.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </TextField>

          {!newReport.task_id && (
            <TextField
              fullWidth
              label="عنوان وظیفه جدید"
              value={newReport.task_name}
              onChange={(e) => setNewReport({ ...newReport, task_name: e.target.value })}
              margin="normal"
              dir="rtl"
            />
          )}

          <TextField
            select
            fullWidth
            label="نتیجه"
            value={newReport.result}
            onChange={(e) => setNewReport({ ...newReport, result: e.target.value })}
            margin="normal"
            dir="rtl"
          >
            {RESULT_CHOICES.map((choice) => (
              <MenuItem key={choice.value} value={choice.value}>
                {choice.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="توضیحات"
            value={newReport.comment}
            onChange={(e) => setNewReport({ ...newReport, comment: e.target.value })}
            margin="normal"
            dir="rtl"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReportDialog(false)}>انصراف</Button>
          <Button onClick={handleAddReport} variant="contained">
            ثبت گزارش
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkingDayManager;