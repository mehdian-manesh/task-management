import React, { useState, useEffect, useCallback } from 'react';
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
import { taskService, projectService, domainService } from '../api/services';
import { formatToJalali, jalaliToGregorian } from '../utils/dateUtils';
import { toPersianNumbers } from '../utils/numberUtils';
import TableControls from './TableControls';
import Pagination from './Pagination';
import SortableTableHeader from './SortableTableHeader';
import PaginatedSelect from './PaginatedSelect';

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
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter and sort state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    project: '',
    is_draft: '',
  });
  const [ordering, setOrdering] = useState('-created_at');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1976d2',
    project_id: '',
    domain_id: '',
    start_date: '',
    deadline: '',
    estimated_hours: 0,
    phase: 0,
    status: 'backlog',
  });

  useEffect(() => {
    loadTasks();
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
    
    if (filters.project) {
      params.project = filters.project;
    }
    
    if (filters.is_draft !== '') {
      params.is_draft = filters.is_draft === 'true';
    }
    
    if (ordering) {
      params.ordering = ordering;
    }
    
    return params;
  }, [page, pageSize, search, filters, ordering]);

  const loadTasks = async () => {
    try {
      const params = buildParams();
      const response = await taskService.getAll(params);
      
      // Handle paginated response
      if (response.data.results) {
        setTasks(response.data.results);
        setTotalCount(response.data.count);
      } else {
        // Fallback for non-paginated response
        setTasks(response.data);
        setTotalCount(response.data.length);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در بارگذاری وظایف' });
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
        domain_id: task.domain_id || '',
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
        domain_id: '',
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

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Reset to first page on filter change
  };

  const handleSortChange = (sortKey) => {
    if (sortKey) {
      // Toggle if same column, otherwise set new sort
      const currentKey = ordering.startsWith('-') ? ordering.substring(1) : ordering;
      if (currentKey === sortKey) {
        // Toggle direction
        setOrdering(ordering.startsWith('-') ? sortKey : `-${sortKey}`);
      } else {
        // New column, default to ascending
        setOrdering(sortKey);
      }
    } else {
      setOrdering('-created_at');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ status: '', project: '', is_draft: '' });
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
          {
            key: 'project',
            label: 'پروژه',
            value: filters.project,
            options: [], // Will be loaded dynamically via PaginatedSelect in filter modal if needed
          },
          {
            key: 'is_draft',
            label: 'پیش‌نویس',
            value: filters.is_draft,
            options: [
              { value: 'true', label: 'بله' },
              { value: 'false', label: 'خیر' },
            ],
          },
        ]}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterModalTitle="فیلتر وظایف"
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
                sortKey="project"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                پروژه
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="status"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                وضعیت
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="phase"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                فاز
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="deadline"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                موعد
              </SortableTableHeader>
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
                  {task.project?.name || '-'}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={STATUS_CHOICES.find(s => s.value === task.status)?.label}
                    color={getStatusColor(task.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{task.phase ? toPersianNumbers(task.phase) : '-'}</TableCell>
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

      <Pagination
        count={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

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
          <PaginatedSelect
            fetchFunction={projectService.getAll}
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            label="پروژه"
            emptyOptionLabel="بدون پروژه"
            emptyOptionValue=""
            getOptionValue={(opt) => opt.id}
            getOptionLabel={(opt) => opt.name}
            margin="normal"
            fullWidth
          />
          <PaginatedSelect
            fetchFunction={domainService.getAll}
            value={formData.domain_id}
            onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
            label="دامنه (اختیاری - در صورت عدم انتخاب از پروژه به ارث می‌برد)"
            emptyOptionLabel="بدون دامنه"
            emptyOptionValue=""
            getOptionValue={(opt) => opt.id}
            getOptionLabel={(opt) => opt.name}
            margin="normal"
            fullWidth
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
