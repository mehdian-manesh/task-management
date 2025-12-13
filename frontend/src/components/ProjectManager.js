import React, { useState, useEffect, useCallback } from 'react';
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
import TableControls from './TableControls';
import Pagination from './Pagination';
import SortableTableHeader from './SortableTableHeader';

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
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter and sort state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
  });
  const [ordering, setOrdering] = useState('-created_at');
  
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
  }, [page, search, filters, ordering]);

  const buildParams = useCallback(() => {
    const params = {
      page,
      page_size: pageSize,
    };
    
    if (search) {
      params.search = search;
    }
    
    if (filters.status) {
      params.status = filters.status;
    }
    
    if (ordering) {
      params.ordering = ordering;
    }
    
    return params;
  }, [page, pageSize, search, filters, ordering]);

  const loadProjects = async () => {
    try {
      const params = buildParams();
      const response = await projectService.getAll(params);
      
      // Handle paginated response
      if (response.data.results) {
        setProjects(response.data.results);
        setTotalCount(response.data.count);
      } else {
        // Fallback for non-paginated response
        setProjects(response.data);
        setTotalCount(response.data.length);
      }
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

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const handleSortChange = (sortKey) => {
    if (sortKey) {
      const currentKey = ordering.startsWith('-') ? ordering.substring(1) : ordering;
      if (currentKey === sortKey) {
        setOrdering(ordering.startsWith('-') ? sortKey : `-${sortKey}`);
      } else {
        setOrdering(sortKey);
      }
    } else {
      setOrdering('-created_at');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ status: '' });
    setOrdering('-created_at');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
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

      <TableControls
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="جستجو در نام و توضیحات..."
        filters={[
          {
            key: 'status',
            label: 'وضعیت',
            value: filters.status,
            options: STATUS_CHOICES,
          },
        ]}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterModalTitle="فیلتر پروژه‌ها"
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableHeader
                sortKey="name"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                نام
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="status"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                وضعیت
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="start_date"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                تاریخ شروع
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="deadline"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                موعد
              </SortableTableHeader>
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

      <Pagination
        count={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

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
