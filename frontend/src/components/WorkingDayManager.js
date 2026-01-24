import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
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
import { useSnackbar } from 'notistack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AddIcon from '@mui/icons-material/Add';
import { workingDayService, reportService, taskService } from '../api/services';
import { formatToJalaliWithTime, REPORT_RESULT_LABELS } from '../utils/dateUtils';
import TableControls from './TableControls';
import Pagination from './Pagination';
import PaginatedSelect from './PaginatedSelect';

const RESULT_CHOICES = Object.entries(REPORT_RESULT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const WorkingDayManager = ({ todayWorkingDay, onUpdate }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [workingDay, setWorkingDay] = useState(todayWorkingDay);
  const [reports, setReports] = useState([]);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    task_id: '',
    task_name: '',
    result: 'ongoing',
    comment: '',
  });
  const [reportErrors, setReportErrors] = useState({});

  // Pagination state for reports
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize] = useState(20);
  const [reportsTotalCount, setReportsTotalCount] = useState(0);
  
  // Filter and sort state for reports
  const [reportsSearch, setReportsSearch] = useState('');
  const [reportsFilters, setReportsFilters] = useState({
    result: '',
  });
  const [reportsOrdering, setReportsOrdering] = useState('-start_time');

  const buildReportsParams = useCallback(() => {
    const params = {
      page: reportsPage,
      page_size: reportsPageSize,
    };
    
    if (reportsFilters.result) {
      params.result = reportsFilters.result;
    }
    
    if (reportsOrdering) {
      params.ordering = reportsOrdering;
    }
    
    return params;
  }, [reportsPage, reportsPageSize, reportsFilters, reportsOrdering]);

  const loadReports = useCallback(async (workingDayId) => {
    try {
      const params = buildReportsParams();
      const response = await reportService.getByWorkingDay(workingDayId, params);
      
      // Handle paginated response
      if (response.data.results) {
        setReports(response.data.results);
        setReportsTotalCount(response.data.count);
      } else {
        // Fallback for non-paginated response
        setReports(response.data);
        setReportsTotalCount(response.data.length);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }, [buildReportsParams]);

  useEffect(() => {
    setWorkingDay(todayWorkingDay);
    if (todayWorkingDay) {
      loadReports(todayWorkingDay.id);
    }
  }, [todayWorkingDay, loadReports, reportsPage, reportsFilters, reportsOrdering]);



  const handleCheckIn = async () => {
    try {
      const response = await workingDayService.checkIn();
      setWorkingDay(response.data);
      enqueueSnackbar('با موفقیت ورود کردید', { variant: 'success' });
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate();
      }
    } catch (error) {
      enqueueSnackbar(error.response?.data?.detail || 'خطا در ورود', { variant: 'error' });
    }
  };

  const handleCheckOut = async () => {
    if (!workingDay?.id) {
      enqueueSnackbar('روز کاری یافت نشد', { variant: 'error' });
      return;
    }
    try {
      await workingDayService.checkOut(workingDay.id);
      enqueueSnackbar('با موفقیت خروج کردید', { variant: 'success' });
      onUpdate();
      setWorkingDay(null);
    } catch (error) {
      enqueueSnackbar(error.response?.data?.detail || 'خطا در خروج', { variant: 'error' });
    }
  };

  const handleLeave = async () => {
    if (!workingDay?.id) {
      enqueueSnackbar('روز کاری یافت نشد', { variant: 'error' });
      return;
    }
    try {
      await workingDayService.leave(workingDay.id);
      enqueueSnackbar('روز به عنوان مرخصی ثبت شد', { variant: 'success' });
      onUpdate();
      setWorkingDay(null);
    } catch (error) {
      enqueueSnackbar(error.response?.data?.detail || 'خطا در ثبت مرخصی', { variant: 'error' });
    }
  };

  const handleAddReport = async () => {
    if (!workingDay?.id) {
      enqueueSnackbar('روز کاری یافت نشد', { variant: 'error' });
      return;
    }
    
    // Clear previous errors
    setReportErrors({});
    
    // Validate that either task_id or task_name is provided
    const taskId = newReport.task_id ? (typeof newReport.task_id === 'string' ? newReport.task_id.trim() : String(newReport.task_id)) : '';
    const taskName = newReport.task_name ? newReport.task_name.trim() : '';
    
    if (!taskId && !taskName) {
      setReportErrors({ task_id: 'لطفاً یک وظیفه انتخاب کنید یا عنوان وظیفه جدید را وارد کنید' });
      return;
    }
    
    try {
      // Prepare report data - only send non-empty values
      const reportData = {
        result: newReport.result || 'ongoing',
        comment: newReport.comment || '',
      };
      
      // Add task_id or task_name (not both, and only if not empty)
      if (taskId) {
        reportData.task_id = parseInt(taskId, 10);
        if (isNaN(reportData.task_id)) {
          setReportErrors({ task_id: 'شناسه وظیفه نامعتبر است' });
          return;
        }
      } else if (taskName) {
        reportData.task_name = taskName;
      }
      
      await reportService.create(workingDay.id, reportData);
      
      enqueueSnackbar('گزارش با موفقیت ثبت شد', { variant: 'success' });
      setOpenReportDialog(false);
      setNewReport({ task_id: '', task_name: '', result: 'ongoing', comment: '' });
      setReportErrors({});
      loadReports(workingDay.id);
    } catch (error) {
      // Extract field-specific errors
      const errors = {};
      if (error.response?.data) {
        if (error.response.data.task_id) {
          errors.task_id = Array.isArray(error.response.data.task_id) 
            ? error.response.data.task_id[0] 
            : error.response.data.task_id;
        }
        if (error.response.data.task_name) {
          errors.task_name = Array.isArray(error.response.data.task_name) 
            ? error.response.data.task_name[0] 
            : error.response.data.task_name;
        }
        if (error.response.data.result) {
          errors.result = Array.isArray(error.response.data.result) 
            ? error.response.data.result[0] 
            : error.response.data.result;
        }
        if (error.response.data.comment) {
          errors.comment = Array.isArray(error.response.data.comment) 
            ? error.response.data.comment[0] 
            : error.response.data.comment;
        }
        if (error.response.data.non_field_errors) {
          errors.task_id = Array.isArray(error.response.data.non_field_errors) 
            ? error.response.data.non_field_errors[0] 
            : error.response.data.non_field_errors;
        }
        if (error.response.data.detail && Object.keys(errors).length === 0) {
          // Only show detail as toast if no field-specific errors
          enqueueSnackbar(error.response.data.detail, { variant: 'error' });
        }
      }
      setReportErrors(errors);
    }
  };

  const handleReportsSearchChange = (value) => {
    setReportsSearch(value);
    setReportsPage(1);
  };

  const handleReportsFilterChange = (key, value) => {
    setReportsFilters({ ...reportsFilters, [key]: value });
    setReportsPage(1);
  };

  const handleReportsClearFilters = () => {
    setReportsSearch('');
    setReportsFilters({ result: '' });
    setReportsOrdering('-start_time');
    setReportsPage(1);
  };

  const handleReportsPageChange = (newPage) => {
    setReportsPage(newPage);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        مدیریت روز کاری
      </Typography>

      {!workingDay ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              شما هنوز ورود نکرده‌اید
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              برای شروع ثبت گزارش کار، ابتدا ورود کنید
            </Typography>
            <Button
              variant="contained"
              startIcon={<AccessTimeIcon />}
              onClick={handleCheckIn}
            >
              ورود
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  وضعیت روز کاری
                </Typography>
                <Typography variant="body1">
                  زمان ورود: <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>{workingDay?.check_in ? formatToJalaliWithTime(workingDay.check_in) : '-'}</Box>
                </Typography>
                {workingDay?.check_out && (
                  <Typography variant="body1">
                    زمان خروج: <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>{formatToJalaliWithTime(workingDay.check_out)}</Box>
                  </Typography>
                )}
                {!workingDay?.check_out && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ExitToAppIcon />}
                      onClick={handleCheckOut}
                      sx={{ mr: 2 }}
                    >
                      خروج
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

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    گزارش‌های کاری امروز
                  </Typography>
                  {!workingDay?.check_out && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenReportDialog(true)}
                    >
                      افزودن گزارش
                    </Button>
                  )}
                </Box>

                {reports.length > 0 && (
                  <TableControls
                    searchValue={reportsSearch}
                    onSearchChange={handleReportsSearchChange}
                    searchPlaceholder="جستجو در گزارش‌ها..."
                    filters={[
                      {
                        key: 'result',
                        label: 'نتیجه',
                        value: reportsFilters.result,
                        options: RESULT_CHOICES,
                      },
                    ]}
                    onFilterChange={handleReportsFilterChange}
                    onClearFilters={handleReportsClearFilters}
                    filterModalTitle="فیلتر گزارش‌ها"
                  />
                )}

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

                {reports.length > 0 && (
                  <Pagination
                    count={reportsTotalCount}
                    page={reportsPage}
                    pageSize={reportsPageSize}
                    onPageChange={handleReportsPageChange}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Add Report Dialog */}
      <Dialog 
        open={openReportDialog} 
        onClose={() => {
          setOpenReportDialog(false);
          setReportErrors({});
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>افزودن گزارش کاری</DialogTitle>
        <DialogContent>
          <PaginatedSelect
            fetchFunction={taskService.getAll}
            value={newReport.task_id}
            onChange={(e) => {
              setNewReport({ ...newReport, task_id: e.target.value });
              if (reportErrors.task_id) {
                setReportErrors({ ...reportErrors, task_id: '' });
              }
            }}
            label="انتخاب وظیفه"
            emptyOptionLabel="وظیفه جدید"
            emptyOptionValue=""
            getOptionValue={(opt) => opt.id}
            getOptionLabel={(opt) => opt.name}
            margin="normal"
            fullWidth
            error={!!reportErrors.task_id}
            helperText={reportErrors.task_id}
          />

          {!newReport.task_id && (
            <TextField
              fullWidth
              label="عنوان وظیفه جدید"
              value={newReport.task_name}
              onChange={(e) => {
                setNewReport({ ...newReport, task_name: e.target.value });
                if (reportErrors.task_name) {
                  setReportErrors({ ...reportErrors, task_name: '' });
                }
              }}
              margin="normal"
              dir="rtl"
              required
              error={!!reportErrors.task_name}
              helperText={reportErrors.task_name}
            />
          )}

          <TextField
            select
            fullWidth
            label="نتیجه"
            value={newReport.result}
            onChange={(e) => {
              setNewReport({ ...newReport, result: e.target.value });
              if (reportErrors.result) {
                setReportErrors({ ...reportErrors, result: '' });
              }
            }}
            margin="normal"
            dir="rtl"
            required
            error={!!reportErrors.result}
            helperText={reportErrors.result}
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
            onChange={(e) => {
              setNewReport({ ...newReport, comment: e.target.value });
              if (reportErrors.comment) {
                setReportErrors({ ...reportErrors, comment: '' });
              }
            }}
            margin="normal"
            dir="rtl"
            error={!!reportErrors.comment}
            helperText={reportErrors.comment}
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