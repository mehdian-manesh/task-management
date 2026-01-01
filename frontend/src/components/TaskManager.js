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
import { formatToJalali } from '../utils/dateUtils';
import { toPersianNumbers } from '../utils/numberUtils';
import TableControls from './TableControls';
import Pagination from './Pagination';
import SortableTableHeader from './SortableTableHeader';
import PaginatedSelect from './PaginatedSelect';
import JalaliDatePicker from './JalaliDatePicker';

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

  const loadTasks = useCallback(async () => {
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
  }, [buildParams]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);


  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        description: task.description || '',
        color: task.color || '#1976d2',
        project_id: task.project_id ? String(task.project_id) : '',
        domain_id: task.domain_id ? String(task.domain_id) : '',
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
      // Prepare data: convert empty strings to null for optional fields, ensure integers are numbers
      const submitData = { ...formData };

      // Convert project_id: empty string -> null, otherwise ensure it's an integer
      if (submitData.project_id === '' || submitData.project_id === null || submitData.project_id === undefined) {
        submitData.project_id = null;
      } else {
        const projectIdNum = parseInt(submitData.project_id);
        submitData.project_id = isNaN(projectIdNum) ? null : projectIdNum;
      }

      // Convert domain_id: empty string -> null, otherwise ensure it's an integer
      if (submitData.domain_id === '' || submitData.domain_id === null || submitData.domain_id === undefined) {
        submitData.domain_id = null;
      } else {
        const domainIdNum = parseInt(submitData.domain_id);
        submitData.domain_id = isNaN(domainIdNum) ? null : domainIdNum;
      }

      // Convert empty date strings to null
      if (submitData.start_date === '') submitData.start_date = null;
      if (submitData.deadline === '') submitData.deadline = null;

      // Ensure numeric fields are numbers
      submitData.estimated_hours = parseInt(submitData.estimated_hours) || 0;
      submitData.phase = parseInt(submitData.phase) || 0;

      if (editingTask) {
        await taskService.update(editingTask.id, submitData);
        setMessage({ type: 'success', text: 'وظیفه با موفقیت به‌روزرسانی شد' });
      } else {
        await taskService.create(submitData);
        setMessage({ type: 'success', text: 'وظیفه با موفقیت ایجاد شد' });
      }
      handleCloseDialog();
      loadTasks();
    } catch (error) {
      // Extract detailed error message
      let errorMessage = 'خطا در ذخیره وظیفه';
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.project_id) {
          errorMessage = `پروژه: ${Array.isArray(error.response.data.project_id) ? error.response.data.project_id[0] : error.response.data.project_id}`;
        } else if (typeof error.response.data === 'object') {
          // Try to get first error message
          const firstError = Object.values(error.response.data)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      setMessage({ type: 'error', text: errorMessage });
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
                  <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                    {formatToJalali(task.deadline)}
                  </Box>
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
            value={formData.project_id === null || formData.project_id === '' ? '' : String(formData.project_id)}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ ...formData, project_id: val === '' ? '' : val });
            }}
            label="پروژه"
            emptyOptionLabel="بدون پروژه"
            emptyOptionValue=""
            initialLabel={editingTask?.project?.name || ''}
            getOptionValue={(opt) => opt.id}
            getOptionLabel={(opt) => opt.name}
            margin="normal"
            fullWidth
          />
          <PaginatedSelect
            fetchFunction={domainService.getAll}
            value={formData.domain_id === null || formData.domain_id === '' ? '' : String(formData.domain_id)}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ ...formData, domain_id: val === '' ? '' : val });
            }}
            label="دامنه (اختیاری - در صورت عدم انتخاب از پروژه به ارث می‌برد)"
            emptyOptionLabel="بدون دامنه"
            emptyOptionValue=""
            initialLabel={editingTask?.domain?.name || ''}
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
          <JalaliDatePicker
            fullWidth
            label="تاریخ شروع"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            margin="normal"
          />
          <JalaliDatePicker
            fullWidth
            label="موعد نهایی"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            margin="normal"
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
