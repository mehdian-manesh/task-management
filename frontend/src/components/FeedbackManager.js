import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Grid,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { feedbackService } from '../api/services';
import moment from 'moment-jalaali';
import TableControls from './TableControls';
import Pagination from './Pagination';

const FEEDBACK_TYPES = [
  { value: '', label: 'نامشخص' },
  { value: 'criticism', label: 'انتقاد' },
  { value: 'suggestion', label: 'پیشنهاد' },
  { value: 'question', label: 'سوال' },
];

const FeedbackManager = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [feedbacks, setFeedbacks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter and sort state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
  });
  const [ordering, setOrdering] = useState('-created_at');
  
  const [formData, setFormData] = useState({
    description: '',
    type: '',
  });

  const buildParams = useCallback(() => {
    const params = {
      page,
      page_size: pageSize,
    };
    
    if (search) {
      params.search = search;
    }
    
    if (filters.type) {
      params.type = filters.type;
    }
    
    if (ordering) {
      params.ordering = ordering;
    }
    
    return params;
  }, [page, pageSize, search, filters, ordering]);

  const loadFeedbacks = useCallback(async () => {
    try {
      const params = buildParams();
      const response = await feedbackService.getAll(params);
      
      // Handle paginated response
      if (response.data.results) {
        setFeedbacks(response.data.results);
        setTotalCount(response.data.count);
      } else {
        // Fallback for non-paginated response
        setFeedbacks(response.data);
        setTotalCount(response.data.length);
      }
    } catch (error) {
      enqueueSnackbar('خطا در بارگذاری بازخوردها', { variant: 'error' });
    }
  }, [buildParams, enqueueSnackbar]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleOpenDialog = (feedback = null) => {
    if (feedback) {
      setEditingFeedback(feedback);
      setFormData({
        description: feedback.description,
        type: feedback.type || '',
      });
    } else {
      setEditingFeedback(null);
      setFormData({
        description: '',
        type: '',
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFeedback(null);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    setFormErrors({});
    try {
      if (editingFeedback) {
        await feedbackService.update(editingFeedback.id, formData);
        enqueueSnackbar('بازخورد با موفقیت به‌روزرسانی شد', { variant: 'success' });
      } else {
        await feedbackService.create(formData);
        enqueueSnackbar('بازخورد با موفقیت ثبت شد', { variant: 'success' });
      }
      handleCloseDialog();
      loadFeedbacks();
    } catch (error) {
      // Extract field-specific errors
      const errors = {};
      if (error.response?.data) {
        Object.keys(error.response.data).forEach((key) => {
          if (key !== 'detail' && key !== 'non_field_errors') {
            const errorValue = error.response.data[key];
            errors[key] = Array.isArray(errorValue) ? errorValue[0] : errorValue;
          }
        });
        if (error.response.data.non_field_errors) {
          errors.description = Array.isArray(error.response.data.non_field_errors) 
            ? error.response.data.non_field_errors[0] 
            : error.response.data.non_field_errors;
        }
        if (error.response.data.detail && Object.keys(errors).length === 0) {
          // Only show detail as toast if no field-specific errors
          enqueueSnackbar(error.response.data.detail, { variant: 'error' });
        }
      }
      setFormErrors(errors);
    }
  };

  const handleDelete = async (feedbackId) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این بازخورد را حذف کنید؟')) {
      try {
        await feedbackService.delete(feedbackId);
        enqueueSnackbar('بازخورد با موفقیت حذف شد', { variant: 'success' });
        loadFeedbacks();
      } catch (error) {
        enqueueSnackbar('خطا در حذف بازخورد', { variant: 'error' });
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

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ type: '' });
    setOrdering('-created_at');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const getTypeColor = (type) => {
    const colors = {
      criticism: 'error',
      suggestion: 'success',
      question: 'info',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">بازخوردها</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          افزودن بازخورد
        </Button>
      </Box>


      <TableControls
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="جستجو در توضیحات..."
        filters={[
          {
            key: 'type',
            label: 'نوع',
            value: filters.type,
            options: FEEDBACK_TYPES.filter(f => f.value !== ''),
          },
        ]}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterModalTitle="فیلتر بازخوردها"
      />

      <Grid container spacing={2}>
        {feedbacks.map((feedback) => (
          <Grid size={{ xs: 12, md: 6 }} key={feedback.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    {feedback.type && (
                      <Chip
                        label={FEEDBACK_TYPES.find(t => t.value === feedback.type)?.label}
                        color={getTypeColor(feedback.type)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">
                      <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                        {moment(feedback.created_at).format('jYYYY/jMM/jDD - HH:mm')}
                      </Box>
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(feedback)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(feedback.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {feedback.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {feedbacks.length === 0 && (
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              هنوز بازخوردی ثبت نشده است
            </Typography>
          </Grid>
        )}
      </Grid>

      <Pagination
        count={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFeedback ? 'ویرایش بازخورد' : 'افزودن بازخورد جدید'}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="نوع بازخورد"
            value={formData.type}
            onChange={(e) => {
              setFormData({ ...formData, type: e.target.value });
              if (formErrors.type) {
                setFormErrors({ ...formErrors, type: '' });
              }
            }}
            margin="normal"
            dir="rtl"
            error={!!formErrors.type}
            helperText={formErrors.type}
          >
            {FEEDBACK_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="توضیحات"
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              if (formErrors.description) {
                setFormErrors({ ...formErrors, description: '' });
              }
            }}
            margin="normal"
            required
            dir="rtl"
            placeholder="لطفاً نظر، انتقاد، پیشنهاد یا سوال خود را بنویسید..."
            error={!!formErrors.description}
            helperText={formErrors.description}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.description.trim()}>
            {editingFeedback ? 'ذخیره تغییرات' : 'ثبت بازخورد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeedbackManager;
