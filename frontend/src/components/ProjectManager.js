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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { projectService } from '../api/services';
import moment from 'moment-jalaali';
import { toPersianNumbers } from '../utils/numberUtils';

const STATUS_CHOICES = [
  { value: 'postpone', label: 'معوق شده' },
  { value: 'backlog', label: 'لیست انتظار' },
  { value: 'todo', label: 'باید انجام شود' },
  { value: 'doing', label: 'در حال انجام' },
  { value: 'test', label: 'در حال تست' },
  { value: 'done', label: 'انجام شده' },
  { value: 'archive', label: 'بایگانی' },
];

const ProjectManager = () => {
  const [projects, setProjects] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1976d2',
    start_date: '',
    deadline: '',
    estimated_hours: 0,
    status: 'backlog',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectService.getAll();
      setProjects(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در بارگذاری پروژه‌ها' });
    }
  };

  const handleOpenDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        color: project.color || '#1976d2',
        start_date: project.start_date || '',
        deadline: project.deadline || '',
        estimated_hours: project.estimated_hours || 0,
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
        start_date: '',
        deadline: '',
        estimated_hours: 0,
        status: 'backlog',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProject(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingProject) {
        await projectService.update(editingProject.id, formData);
        setMessage({ type: 'success', text: 'پروژه با موفقیت به‌روزرسانی شد' });
      } else {
        await projectService.create(formData);
        setMessage({ type: 'success', text: 'پروژه با موفقیت ایجاد شد' });
      }
      handleCloseDialog();
      loadProjects();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ذخیره پروژه' });
    }
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این پروژه را حذف کنید؟')) {
      try {
        await projectService.delete(projectId);
        setMessage({ type: 'success', text: 'پروژه با موفقیت حذف شد' });
        loadProjects();
      } catch (error) {
        setMessage({ type: 'error', text: 'خطا در حذف پروژه' });
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
        <Typography variant="h5">مدیریت پروژه‌ها</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          افزودن پروژه
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
              <TableCell align="right">وضعیت</TableCell>
              <TableCell align="right">تاریخ شروع</TableCell>
              <TableCell align="right">موعد</TableCell>
              <TableCell align="right">برآورد (نفر-ساعت)</TableCell>
              <TableCell align="right">عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: project.color || '#1976d2',
                      }}
                    />
                    {project.name}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={STATUS_CHOICES.find(s => s.value === project.status)?.label}
                    color={getStatusColor(project.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {project.start_date ? moment(project.start_date).format('jYYYY/jMM/jDD') : '-'}
                </TableCell>
                <TableCell align="right">
                  {project.deadline ? moment(project.deadline).format('jYYYY/jMM/jDD') : '-'}
                </TableCell>
                <TableCell align="right">{project.estimated_hours ? toPersianNumbers(project.estimated_hours) : '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(project)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(project.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingProject ? 'ویرایش پروژه' : 'افزودن پروژه جدید'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام پروژه"
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
            {editingProject ? 'ذخیره تغییرات' : 'ایجاد پروژه'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManager;
