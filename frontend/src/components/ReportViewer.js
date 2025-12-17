import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { reportService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { getCurrentJalaliDate, formatJalaliPeriod } from '../utils/jalaliReportUtils';
import { toPersianNumbers } from '../utils/numberUtils';
import { formatToJalaliWithTime } from '../utils/dateUtils';
import JalaliDatePicker from './JalaliDatePicker';
import PaginatedSelect from './PaginatedSelect';
import { domainService } from '../api/services';

const PERIOD_TYPES = [
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' },
];

const REPORT_RESULT_LABELS = {
  ongoing: 'هنوز تمام نشده',
  success: 'با موفقیت انجام شد',
  postponed: 'به تعویق افتاد',
  failed: 'موفق به انجام آن نشدم',
  cancelled: 'کنسل شد',
};

const ReportViewer = ({ reportType = 'individual' }) => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Period selection state
  const [periodType, setPeriodType] = useState('weekly');
  const currentJalali = getCurrentJalaliDate();
  const [jalaliYear, setJalaliYear] = useState(currentJalali.year);
  const [jalaliMonth, setJalaliMonth] = useState(currentJalali.month);
  const [jalaliWeek, setJalaliWeek] = useState(currentJalali.week);
  const [jalaliDay, setJalaliDay] = useState(currentJalali.day);
  
  // Domain selection for team reports
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  const [domains, setDomains] = useState([]);
  
  useEffect(() => {
    if (reportType === 'team') {
      loadDomains();
    }
  }, [reportType]);
  
  const loadDomains = async () => {
    try {
      const response = await domainService.getAll();
      setDomains(response.data.results || response.data);
      if (response.data.results?.length > 0 || response.data?.length > 0) {
        const firstDomain = response.data.results?.[0] || response.data[0];
        setSelectedDomainId(firstDomain.id);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };
  
  const loadReport = async () => {
    if (reportType === 'team' && !selectedDomainId) {
      setError(null);
      setReportData(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        period_type: periodType,
        year: jalaliYear,
      };
      
      if (periodType === 'daily') {
        params.month = jalaliMonth;
        params.day = jalaliDay;
      } else if (periodType === 'weekly') {
        params.week = jalaliWeek;
      } else if (periodType === 'monthly') {
        params.month = jalaliMonth;
      }
      
      let response;
      if (reportType === 'individual') {
        response = await reportService.generateIndividualReport(params);
      } else {
        params.domain_id = selectedDomainId;
        response = await reportService.generateTeamReport(params);
      }
      
      setReportData(response.data);
    } catch (error) {
      console.error('Error loading report:', error);
      setError(error.response?.data?.detail || 'خطا در بارگذاری گزارش');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (reportType === 'team' && !selectedDomainId) {
      return;
    }
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, jalaliYear, jalaliMonth, jalaliWeek, jalaliDay, selectedDomainId, reportType]);
  
  const handleExportPDF = async () => {
    if (reportType === 'team' && !selectedDomainId) {
      setError('لطفاً یک حوزه انتخاب کنید');
      return;
    }
    
    try {
      const params = {
        period_type: periodType,
        year: jalaliYear,
      };
      
      if (periodType === 'daily') {
        params.month = jalaliMonth;
        params.day = jalaliDay;
      } else if (periodType === 'weekly') {
        params.week = jalaliWeek;
      } else if (periodType === 'monthly') {
        params.month = jalaliMonth;
      }
      
      let response;
      if (reportType === 'individual') {
        response = await reportService.exportIndividualReportPDF(params);
      } else {
        params.domain_id = selectedDomainId;
        response = await reportService.exportTeamReportPDF(params);
      }
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const periodStr = formatJalaliPeriod(periodType, jalaliYear, jalaliMonth, jalaliWeek, jalaliDay);
      link.download = `report_${periodStr.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('خطا در تولید PDF');
    }
  };
  
  if (error && !loading) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {reportType === 'individual' ? 'گزارش کار' : 'گزارش تیمی'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportPDF}
          disabled={!reportData || loading}
        >
          دانلود PDF
        </Button>
      </Box>
      
      {/* Period Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>نوع دوره</InputLabel>
            <Select
              value={periodType}
              label="نوع دوره"
              onChange={(e) => setPeriodType(e.target.value)}
            >
              {PERIOD_TYPES.map((pt) => (
                <MenuItem key={pt.value} value={pt.value}>
                  {pt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {periodType === 'daily' && (
            <>
              <JalaliDatePicker
                label="تاریخ"
                value={`${jalaliYear}-${String(jalaliMonth).padStart(2, '0')}-${String(jalaliDay).padStart(2, '0')}`}
                onChange={(e) => {
                  const dateParts = e.target.value.split('-');
                  setJalaliYear(parseInt(dateParts[0]));
                  setJalaliMonth(parseInt(dateParts[1]));
                  setJalaliDay(parseInt(dateParts[2]));
                }}
                fullWidth={false}
              />
            </>
          )}
          
          {periodType === 'weekly' && (
            <>
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>سال</InputLabel>
                <Select
                  value={jalaliYear}
                  label="سال"
                  onChange={(e) => setJalaliYear(e.target.value)}
                >
                  {Array.from({ length: 5 }, (_, i) => currentJalali.year - 2 + i).map((year) => (
                    <MenuItem key={year} value={year}>
                      {toPersianNumbers(year)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>هفته</InputLabel>
                <Select
                  value={jalaliWeek}
                  label="هفته"
                  onChange={(e) => setJalaliWeek(e.target.value)}
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                    <MenuItem key={week} value={week}>
                      {toPersianNumbers(week)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          
          {periodType === 'monthly' && (
            <>
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>سال</InputLabel>
                <Select
                  value={jalaliYear}
                  label="سال"
                  onChange={(e) => setJalaliYear(e.target.value)}
                >
                  {Array.from({ length: 5 }, (_, i) => currentJalali.year - 2 + i).map((year) => (
                    <MenuItem key={year} value={year}>
                      {toPersianNumbers(year)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>ماه</InputLabel>
                <Select
                  value={jalaliMonth}
                  label="ماه"
                  onChange={(e) => setJalaliMonth(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <MenuItem key={month} value={month}>
                      {toPersianNumbers(month)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          
          {periodType === 'yearly' && (
            <FormControl sx={{ minWidth: 100 }}>
              <InputLabel>سال</InputLabel>
              <Select
                value={jalaliYear}
                label="سال"
                onChange={(e) => setJalaliYear(e.target.value)}
              >
                {Array.from({ length: 5 }, (_, i) => currentJalali.year - 2 + i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {toPersianNumbers(year)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {reportType === 'team' && (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>حوزه</InputLabel>
              <Select
                value={selectedDomainId || ''}
                label="حوزه"
                onChange={(e) => setSelectedDomainId(e.target.value)}
              >
                {domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>
      
      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && reportData && (
        <Box>
          {/* Period Info */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {reportData.period?.formatted}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              از {reportData.period?.start_date} تا {reportData.period?.end_date}
            </Typography>
          </Paper>
          
          {/* Completed Tasks */}
          {reportData.completed_tasks && reportData.completed_tasks.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                وظایف انجام شده ({toPersianNumbers(reportData.completed_tasks.length)})
              </Typography>
              <List>
                {reportData.completed_tasks.map((task, index) => (
                  <React.Fragment key={task.id || index}>
                    <ListItem>
                      <ListItemText
                        primary={task.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              وضعیت: {task.status} | تعداد گزارش‌ها: {toPersianNumbers(task.reports?.length || 0)}
                            </Typography>
                            {task.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {task.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < reportData.completed_tasks.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Projects */}
          {reportData.projects && reportData.projects.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                پروژه‌ها ({toPersianNumbers(reportData.projects.length)})
              </Typography>
              <List>
                {reportData.projects.map((project, index) => (
                  <React.Fragment key={project.id || index}>
                    <ListItem>
                      <ListItemText
                        primary={project.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              وضعیت: {project.status}
                              {project.assignees && project.assignees.length > 0 && (
                                <> | اعضا: {project.assignees.map(a => a.username || a.first_name).join(', ')}</>
                              )}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < reportData.projects.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Meetings */}
          {reportData.meetings && reportData.meetings.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                جلسات ({toPersianNumbers(reportData.meetings.length)})
              </Typography>
              <List>
                {reportData.meetings.map((meeting, index) => (
                  <React.Fragment key={meeting.id || index}>
                    <ListItem>
                      <ListItemText
                        primary={meeting.topic}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {formatToJalaliWithTime(meeting.datetime)} | نوع: {meeting.type}
                            </Typography>
                            {meeting.summary && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {meeting.summary}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < reportData.meetings.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Working Hours */}
          {reportData.working_hours && reportData.working_hours.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ساعات کاری ({toPersianNumbers(reportData.working_hours.length)} روز)
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {reportType === 'team' && <TableCell>کاربر</TableCell>}
                      <TableCell>تاریخ</TableCell>
                      <TableCell>ورود</TableCell>
                      <TableCell>خروج</TableCell>
                      <TableCell>ساعات کار</TableCell>
                      <TableCell>تعداد گزارش‌ها</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.working_hours.map((wh, index) => (
                      <TableRow key={index}>
                        {reportType === 'team' && (
                          <TableCell>
                            {wh.user?.username || wh.user?.first_name || '-'}
                          </TableCell>
                        )}
                        <TableCell>{wh.date}</TableCell>
                        <TableCell>{wh.check_in ? formatToJalaliWithTime(wh.check_in) : '-'}</TableCell>
                        <TableCell>{wh.check_out ? formatToJalaliWithTime(wh.check_out) : '-'}</TableCell>
                        <TableCell>{toPersianNumbers(wh.total_hours?.toFixed(2) || '0')}</TableCell>
                        <TableCell>{toPersianNumbers(wh.reports_count || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
          
          {/* Feedbacks */}
          {reportData.feedbacks && reportData.feedbacks.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                بازخوردها ({toPersianNumbers(reportData.feedbacks.length)})
              </Typography>
              <List>
                {reportData.feedbacks.map((feedback, index) => (
                  <React.Fragment key={feedback.id || index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" gap={1} alignItems="center">
                            <Chip label={feedback.type || 'نامشخص'} size="small" />
                            <Typography variant="body2" color="text.secondary">
                              {formatToJalaliWithTime(feedback.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={feedback.description}
                      />
                    </ListItem>
                    {index < reportData.feedbacks.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Admin Notes */}
          {reportData.admin_notes && reportData.admin_notes.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                یادداشت‌های مدیر ({toPersianNumbers(reportData.admin_notes.length)})
              </Typography>
              <List>
                {reportData.admin_notes.map((note, index) => (
                  <React.Fragment key={note.id || index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" gap={1} alignItems="center">
                            <Typography variant="subtitle2">{note.created_by}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatToJalaliWithTime(note.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={note.note}
                      />
                    </ListItem>
                    {index < reportData.admin_notes.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ReportViewer;
