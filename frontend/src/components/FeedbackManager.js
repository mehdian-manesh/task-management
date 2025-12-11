import React, { useState, useEffect } from 'react';
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
  Alert,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { feedbackService } from '../api/services';
import moment from 'moment-jalaali';

const FEEDBACK_TYPES = [
  { value: '', label: 'نامشخص' },
  { value: 'criticism', label: 'انتقاد' },
  { value: 'suggestion', label: 'پیشنهاد' },
  { value: 'question', label: 'سوال' },
];

const FeedbackManager = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    type: '',
  });

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const response = await feedbackService.getAll();
      setFeedbacks(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در بارگذاری بازخوردها' });
    }
  };

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
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFeedback(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingFeedback) {
        await feedbackService.update(editingFeedback.id, formData);
        setMessage({ type: 'success', text: 'بازخورد با موفقیت به‌روزرسانی شد' });
      } else {
        await feedbackService.create(formData);
        setMessage({ type: 'success', text: 'بازخورد با موفقیت ثبت شد' });
      }
      handleCloseDialog();
      loadFeedbacks();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ذخیره بازخورد' });
    }
  };

  const handleDelete = async (feedbackId) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این بازخورد را حذف کنید؟')) {
      try {
        await feedbackService.delete(feedbackId);
        setMessage({ type: 'success', text: 'بازخورد با موفقیت حذف شد' });
        loadFeedbacks();
      } catch (error) {
        setMessage({ type: 'error', text: 'خطا در حذف بازخورد' });
      }
    }
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

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        {feedbacks.map((feedback) => (
          <Grid item xs={12} md={6} key={feedback.id}>
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
                      {moment(feedback.created_at).format('jYYYY/jMM/jDD - HH:mm')}
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
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              هنوز بازخوردی ثبت نشده است
            </Typography>
          </Grid>
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFeedback ? 'ویرایش بازخورد' : 'افزودن بازخورد جدید'}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="نوع بازخورد"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            margin="normal"
            dir="rtl"
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
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            required
            dir="rtl"
            placeholder="لطفاً نظر، انتقاد، پیشنهاد یا سوال خود را بنویسید..."
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
