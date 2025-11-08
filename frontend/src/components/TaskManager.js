import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { taskService, projectService } from '../api/services';
import { formatToJalali, jalaliToGregorian } from '../utils/dateUtils';

const STATUS_CHOICES = [
  { value: 'postpone', label: 'معوق شده' },
  { value: 'backlog', label: 'لیست انتظار' },
  { value: 'todo', label: 'باید انجام شود' },
  { value: 'doing', label: 'در حال انجام' },
  { value: 'test', label: 'در حال تست' },
  { value: 'done', label: 'انجام شده' },
  { value: 'archive', label: 'بایگانی' },
];

const TaskManager = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1976d2',
    project_id: '',
    start_date: '',
    deadline: '',
    estimated_hours: 0,
    phase: 0,
    status: 'backlog',
  });

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.getAll();
      setTasks(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در بارگذاری وظایف' });
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectService.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        description: task.description || '',
        color: task.color || '#1976d2',
        project_id: task.project_id || '',
        start_date: task.start_date || '',
        deadline: task.deadline || '',
        estimated_hours: task.estimated_hours || 0,
        phase: task.phase || 0,
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
        project_id: '',
        start_date: '',
        deadline: '',
        estimated_hours: 0,
        phase: 0,
        status: 'backlog',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingTask) {
        await taskService.update(editingTask.id, formData);
        setMessage({ type: 'success', text: 'وظیفه با موفقیت به‌روزرسانی شد' });
      } else {
        await taskService.create(formData);
        setMessage({ type: 'success', text: 'وظیفه با موفقیت ایجاد شد' });
      }
      handleCloseDialog();
      loadTasks();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ذخیره وظیفه' });
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این وظیفه را حذف کنید؟')) {
      try {
        await taskService.delete(taskId);
        setMessage({ type: 'success', text: 'وظیفه با موفقیت حذف شد' });
        loadTasks();
      } catch (error) {
        setMessage({ type: 'error', text: 'خطا در حذف وظیفه' });
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      postpone: 'warning',
      backlog: 'default',
      todo: 'info',
      doing: 'primary',
      test: 'secondary',
      done: 'success',
      archive: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">مدیریت وظایف</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          افزودن وظیفه
        </Button>
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
              <TableCell align="right">نام</TableCell>
              <TableCell align="right">پروژه</TableCell>
              <TableCell align="right">وضعیت</TableCell>
              <TableCell align="right">فاز</TableCell>
              <TableCell align="right">موعد</TableCell>
              <TableCell align="right">پیش‌نویس</TableCell>
              <TableCell align="right">عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: task.color || '#1976d2',
                      }}
                    />
                    {task.name}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {projects.find(p => p.id === task.project_id)?.name || '-'}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={STATUS_CHOICES.find(s => s.value === task.status)?.label}
                    color={getStatusColor(task.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{task.phase || '-'}</TableCell>
                <TableCell align="right">
                  {formatToJalali(task.deadline)}
                </TableCell>
                <TableCell align="right">
                  {task.is_draft && <Chip label="پیش‌نویس" size="small" color="warning" />}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(task)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {(user?.isAdmin || task.is_draft) && (
                    <IconButton size="small" onClick={() => handleDelete(task.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingTask ? 'ویرایش وظیفه' : 'افزودن وظیفه جدید'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام وظیفه"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
            dir="rtl"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="توضیحات"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            dir="rtl"
          />
          <TextField
            select
            fullWidth
            label="پروژه"
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            margin="normal"
            dir="rtl"
          >
            <MenuItem value="">بدون پروژه</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="وضعیت"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            margin="normal"
            dir="rtl"
          >
            {STATUS_CHOICES.map((choice) => (
              <MenuItem key={choice.value} value={choice.value}>
                {choice.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="number"
            label="فاز پروژه"
            value={formData.phase}
            onChange={(e) => setFormData({ ...formData, phase: parseInt(e.target.value) })}
            margin="normal"
            dir="rtl"
          />
          <TextField
            fullWidth
            type="date"
            label="تاریخ شروع"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="date"
            label="موعد نهایی"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="number"
            label="برآورد نفر-ساعت"
            value={formData.estimated_hours}
            onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) })}
            margin="normal"
            dir="rtl"
          />
          <TextField
            fullWidth
            type="color"
            label="رنگ"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTask ? 'ذخیره تغییرات' : 'ایجاد وظیفه'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskManager;
