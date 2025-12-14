import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { meetingService, userService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import JalaliDateTimePicker from './JalaliDateTimePicker';
import { formatToJalaliWithTime } from '../utils/dateUtils';

const MEETING_TYPE_CHOICES = [
  { value: 'in_person', label: 'حضوری' },
  { value: 'online', label: 'آنلاین' },
];

const RECURRENCE_TYPE_CHOICES = [
  { value: 'none', label: 'بدون تکرار' },
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' },
];


const MeetingManager = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [message, setMessage] = useState(null);
  const [users, setUsers] = useState([]);
  
  const [formData, setFormData] = useState({
    datetime: '',
    type: 'in_person',
    topic: '',
    location: '',
    summary: '',
    recurrence_type: 'none',
    recurrence_end_date: '',
    recurrence_count: '',
    recurrence_interval: 1,
    participants: [],
    external_participants: [],
  });

  useEffect(() => {
    loadNextMeetings();
    if (user?.isAdmin) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const response = await userService.getAll({ page_size: 1000 });
      const usersList = response.data.results || response.data;
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadNextMeetings = async () => {
    try {
      // Load next 3 meetings using the next_meetings endpoint
      const response = await meetingService.getNextMeetings();
      setMeetings(response.data || []);
    } catch (error) {
      console.error('Error loading next meetings:', error);
      // Fallback to regular endpoint if next_meetings doesn't exist
      try {
        const response = await meetingService.getAll({ page_size: 3, ordering: 'datetime' });
        const data = response.data;
        const allMeetings = data.results || data;
        // Filter to only future meetings
        const now = new Date();
        const futureMeetings = allMeetings.filter(m => {
          const meetingDate = new Date(m.datetime);
          return meetingDate > now;
        });
        setMeetings(futureMeetings.slice(0, 3));
      } catch (fallbackError) {
        console.error('Error loading meetings:', fallbackError);
        setMessage({ type: 'error', text: 'خطا در بارگذاری جلسات' });
      }
    }
  };

  const handleOpenDialog = (meeting = null) => {
    if (!user?.isAdmin) {
      setMessage({ type: 'error', text: 'فقط مدیران می‌توانند جلسات را ایجاد یا ویرایش کنند' });
      return;
    }
    
    if (meeting) {
      setEditingMeeting(meeting);
      // Convert datetime to local format for input (Gregorian)
      const meetingDatetime = meeting.datetime ? new Date(meeting.datetime).toISOString().slice(0, 16) : '';
      const recurrenceEndDate = meeting.recurrence_end_date ? new Date(meeting.recurrence_end_date).toISOString().slice(0, 16) : '';
      setFormData({
        datetime: meetingDatetime,
        type: meeting.type || 'in_person',
        topic: meeting.topic || '',
        location: meeting.location || '',
        summary: meeting.summary || '',
        recurrence_type: meeting.recurrence_type || 'none',
        recurrence_end_date: recurrenceEndDate,
        recurrence_count: meeting.recurrence_count || '',
        recurrence_interval: meeting.recurrence_interval || 1,
        participants: meeting.participants_details || [],
        external_participants: meeting.external_participants_list?.map(p => p.name) || [],
      });
    } else {
      setEditingMeeting(null);
      setFormData({
        datetime: '',
        type: 'in_person',
        topic: '',
        location: '',
        summary: '',
        recurrence_type: 'none',
        recurrence_end_date: '',
        recurrence_count: '',
        recurrence_interval: 1,
        participants: [],
        external_participants: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMeeting(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.isAdmin) {
      setMessage({ type: 'error', text: 'فقط مدیران می‌توانند جلسات را ایجاد یا ویرایش کنند' });
      return;
    }

    try {
      const submitData = {
        datetime: formData.datetime,
        type: formData.type,
        topic: formData.topic,
        location: formData.location || '',
        summary: formData.summary || '',
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval || 1,
        participants: formData.participants.map(p => typeof p === 'object' ? p.id : p),
        external_participants: formData.external_participants.filter(name => name && name.trim()),
      };

      // Add recurrence fields if recurrence is enabled
      if (formData.recurrence_type !== 'none') {
        if (formData.recurrence_end_date) {
          submitData.recurrence_end_date = formData.recurrence_end_date;
        }
        if (formData.recurrence_count) {
          submitData.recurrence_count = parseInt(formData.recurrence_count);
        }
      } else {
        // Clear recurrence fields if recurrence is disabled
        submitData.recurrence_end_date = null;
        submitData.recurrence_count = null;
      }

      if (editingMeeting) {
        await meetingService.update(editingMeeting.id, submitData);
        setMessage({ type: 'success', text: 'جلسه با موفقیت به‌روزرسانی شد' });
      } else {
        await meetingService.create(submitData);
        setMessage({ type: 'success', text: 'جلسه با موفقیت ایجاد شد' });
      }
      
      handleCloseDialog();
      loadNextMeetings();
    } catch (error) {
      console.error('Error saving meeting:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'خطا در ذخیره جلسه';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleDelete = async (id) => {
    if (!user?.isAdmin) {
      setMessage({ type: 'error', text: 'فقط مدیران می‌توانند جلسات را حذف کنند' });
      return;
    }

    if (!window.confirm('آیا از حذف این جلسه اطمینان دارید؟')) {
      return;
    }

    try {
      await meetingService.delete(id);
      setMessage({ type: 'success', text: 'جلسه با موفقیت حذف شد' });
      loadNextMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      setMessage({ type: 'error', text: 'خطا در حذف جلسه' });
    }
  };

  const getTypeLabel = (type) => {
    return MEETING_TYPE_CHOICES.find(t => t.value === type)?.label || type;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">جلسات آینده (۳ جلسه بعدی)</Typography>
        {user?.isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            افزودن جلسه
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">موضوع</TableCell>
              <TableCell align="right">تاریخ و زمان</TableCell>
              <TableCell align="right">نوع</TableCell>
              <TableCell align="right">مکان/لینک</TableCell>
              <TableCell align="right">شرکت‌کنندگان</TableCell>
              {user?.isAdmin && <TableCell align="right">عملیات</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user?.isAdmin ? 6 : 5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    جلسه‌ای یافت نشد
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell align="right">{meeting.topic}</TableCell>
                  <TableCell align="right">
                    <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                      {meeting.occurrence_datetime 
                        ? formatToJalaliWithTime(meeting.occurrence_datetime)
                        : (meeting.datetime ? formatToJalaliWithTime(meeting.datetime) : '-')}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={getTypeLabel(meeting.type)}
                      size="small"
                      color={meeting.type === 'online' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {meeting.location ? (
                      meeting.type === 'online' ? (
                        <a href={meeting.location} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                          {meeting.location}
                        </a>
                      ) : (
                        meeting.location
                      )
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {meeting.participants_details?.map((p) => (
                        <Chip key={p.id} label={p.username} size="small" variant="outlined" />
                      ))}
                      {meeting.external_participants_list?.map((p, idx) => (
                        <Chip key={idx} label={p.name} size="small" variant="outlined" color="secondary" />
                      ))}
                      {(!meeting.participants_details || meeting.participants_details.length === 0) &&
                       (!meeting.external_participants_list || meeting.external_participants_list.length === 0) && (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  {user?.isAdmin && (
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(meeting)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(meeting.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>


      {/* Create/Edit Dialog */}
      {user?.isAdmin && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>{editingMeeting ? 'ویرایش جلسه' : 'ایجاد جلسه جدید'}</DialogTitle>
            <DialogContent>
              <JalaliDateTimePicker
                fullWidth
                label="تاریخ و زمان"
                value={formData.datetime}
                onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                required
                margin="normal"
              />
              <TextField
                fullWidth
                select
                label="نوع"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                margin="normal"
              >
                {MEETING_TYPE_CHOICES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                label="موضوع"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
                margin="normal"
              />
              <TextField
                fullWidth
                select
                label="تکرار"
                value={formData.recurrence_type}
                onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value })}
                margin="normal"
              >
                {RECURRENCE_TYPE_CHOICES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              {formData.recurrence_type !== 'none' && (
                <>
                  <TextField
                    fullWidth
                    label="فاصله تکرار"
                    type="number"
                    value={formData.recurrence_interval}
                    onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                    margin="normal"
                    inputProps={{ min: 1 }}
                    helperText="مثلاً: هر ۲ هفته (فاصله = ۲)"
                  />
                  <JalaliDateTimePicker
                    fullWidth
                    label="تاریخ پایان تکرار (اختیاری)"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    margin="normal"
                    helperText="یا تعداد تکرار را مشخص کنید"
                  />
                  <TextField
                    fullWidth
                    label="تعداد تکرار (اختیاری)"
                    type="number"
                    value={formData.recurrence_count}
                    onChange={(e) => setFormData({ ...formData, recurrence_count: e.target.value })}
                    margin="normal"
                    inputProps={{ min: 1 }}
                    helperText="تعداد کل جلسات (از جمله جلسه اول)"
                  />
                </>
              )}
              <TextField
                fullWidth
                label={formData.type === 'online' ? 'لینک جلسه' : 'مکان'}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                margin="normal"
                placeholder={formData.type === 'online' ? 'https://...' : 'آدرس محل برگزاری'}
              />
              <TextField
                fullWidth
                label="خلاصه"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                multiline
                rows={4}
                margin="normal"
              />
              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.username}
                value={formData.participants}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, participants: newValue });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="شرکت‌کنندگان (کاربران سیستم)"
                    margin="normal"
                    placeholder="کاربران را انتخاب کنید"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={typeof option === 'object' ? option.id : index}
                      label={typeof option === 'object' ? option.username : option}
                      size="small"
                    />
                  ))
                }
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={formData.external_participants}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, external_participants: newValue });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="شرکت‌کنندگان خارجی (غیر از کاربران سیستم)"
                    margin="normal"
                    placeholder="نام شرکت‌کنندگان خارجی را وارد کنید"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={index}
                      label={option}
                      size="small"
                      color="secondary"
                    />
                  ))
                }
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>انصراف</Button>
              <Button type="submit" variant="contained">
                {editingMeeting ? 'ذخیره تغییرات' : 'ایجاد'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </Box>
  );
};

export default MeetingManager;
