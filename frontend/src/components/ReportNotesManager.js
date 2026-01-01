import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { reportNoteService, domainService } from '../api/services';
import { formatToJalaliWithTime } from '../utils/dateUtils';
import { getCurrentJalaliDate, formatJalaliPeriod } from '../utils/jalaliReportUtils';
import TableControls from './TableControls';
import Pagination from './Pagination';

const PERIOD_TYPES = [
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' },
];

const ReportNotesManager = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [message, setMessage] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    period_type: '',
    domain: '',
  });

  const [formData, setFormData] = useState({
    period_type: 'weekly',
    jalali_year: getCurrentJalaliDate().year,
    jalali_month: null,
    jalali_day: null,
    jalali_week: null,
    domain: null,
    note: '',
  });

  const [domains, setDomains] = useState([]);

  const loadDomains = async () => {
    try {
      const response = await domainService.getAll();
      setDomains(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };

      if (search) {
        params.search = search;
      }

      if (filters.period_type) {
        params.period_type = filters.period_type;
      }

      if (filters.domain) {
        params.domain = filters.domain;
      }

      const response = await reportNoteService.getAll(params);
      const data = response.data.results || response.data;
      setNotes(Array.isArray(data) ? data : []);
      // Handle paginated response
      if (response.data.count !== undefined) {
        setTotalCount(Number(response.data.count) || 0);
      } else if (Array.isArray(data)) {
        setTotalCount(data.length);
      } else {
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setMessage({ type: 'error', text: 'خطا در بارگذاری یادداشت‌ها' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filters]);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleOpenDialog = (note = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        period_type: note.period_type,
        jalali_year: note.jalali_year,
        jalali_month: note.jalali_month,
        jalali_day: note.jalali_day,
        jalali_week: note.jalali_week,
        domain: note.domain || null,
        note: note.note,
      });
    } else {
      setEditingNote(null);
      setFormData({
        period_type: 'weekly',
        jalali_year: getCurrentJalaliDate().year,
        jalali_month: null,
        jalali_day: null,
        jalali_week: null,
        domain: null,
        note: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingNote(null);
    setFormData({
      period_type: 'weekly',
      jalali_year: getCurrentJalaliDate().year,
      jalali_month: null,
      jalali_day: null,
      jalali_week: null,
      domain: null,
      note: '',
    });
  };

  const handleSave = async () => {
    try {
      const data = { ...formData };

      // Only include relevant fields based on period_type
      if (data.period_type !== 'daily') {
        data.jalali_day = null;
      }
      if (data.period_type !== 'weekly') {
        data.jalali_week = null;
      }
      if (data.period_type !== 'monthly' && data.period_type !== 'yearly') {
        data.jalali_month = null;
      }
      if (!data.domain) {
        data.domain = null;
      }

      if (editingNote) {
        await reportNoteService.update(editingNote.id, data);
        setMessage({ type: 'success', text: 'یادداشت با موفقیت به‌روزرسانی شد' });
      } else {
        await reportNoteService.create(data);
        setMessage({ type: 'success', text: 'یادداشت با موفقیت ایجاد شد' });
      }

      handleCloseDialog();
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'خطا در ذخیره یادداشت' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این یادداشت را حذف کنید؟')) {
      return;
    }

    try {
      await reportNoteService.delete(id);
      setMessage({ type: 'success', text: 'یادداشت با موفقیت حذف شد' });
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      setMessage({ type: 'error', text: 'خطا در حذف یادداشت' });
    }
  };

  const getPeriodLabel = (note) => {
    return formatJalaliPeriod(
      note.period_type,
      note.jalali_year,
      note.jalali_month,
      note.jalali_week,
      note.jalali_day
    );
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={3}
      >
        <Box>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          مدیریت یادداشت‌های گزارش
        </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            افزودن، ویرایش و حذف یادداشت‌های مدیریتی مرتبط با دوره‌های مختلف گزارش.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          افزودن یادداشت
        </Button>
      </Box>

      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      {/* Filters */}
      <TableControls
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="جستجو در یادداشت‌ها..."
        filters={[
          {
            key: 'period_type',
            label: 'نوع دوره',
            value: filters.period_type || '',
            options: [
              { value: '', label: 'همه' },
              ...PERIOD_TYPES,
            ],
          },
          {
            key: 'domain',
            label: 'حوزه',
            value: filters.domain || '',
            options: [
              { value: '', label: 'همه' },
              { value: 'null', label: 'یادداشت عمومی' },
              ...(Array.isArray(domains) ? domains.map(d => ({ value: d.id, label: d.name })) : []),
            ],
          },
        ]}
        onFilterChange={(key, value) => {
          setFilters({ ...filters, [key]: value });
          setPage(1);
        }}
        onClearFilters={() => {
          setSearch('');
          setFilters({ period_type: '', domain: '' });
          setPage(1);
        }}
        filterModalTitle="فیلتر یادداشت‌های گزارش"
      />

      {/* Notes List */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <List>
            {notes.map((note, index) => (
              <React.Fragment key={note.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" gap={2} alignItems="center">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {getPeriodLabel(note)}
                        </Typography>
                        {note.domain_name && (
                          <Typography variant="body2" color="text.secondary">
                            (حوزه: {note.domain_name})
                          </Typography>
                        )}
                        {!note.domain_name && (
                          <Typography variant="body2" color="text.secondary">
                            (یادداشت عمومی)
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {note.note}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          ایجاد شده توسط: {note.created_by_username} - {formatToJalaliWithTime(note.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleOpenDialog(note)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDelete(note.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notes.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {notes.length === 0 && !loading && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">یادداشتی یافت نشد</Typography>
            </Box>
          )}
        </Paper>
      )}

      <Pagination
        count={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingNote ? 'ویرایش یادداشت' : 'افزودن یادداشت جدید'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>نوع دوره</InputLabel>
              <Select
                value={formData.period_type}
                label="نوع دوره"
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
              >
                {PERIOD_TYPES.map((pt) => (
                  <MenuItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="سال (جلالی)"
              type="number"
              value={formData.jalali_year}
              onChange={(e) => setFormData({ ...formData, jalali_year: parseInt(e.target.value) })}
              fullWidth
            />

            {formData.period_type === 'daily' && (
              <>
                <TextField
                  label="ماه (جلالی)"
                  type="number"
                  value={formData.jalali_month || ''}
                  onChange={(e) => setFormData({ ...formData, jalali_month: parseInt(e.target.value) })}
                  fullWidth
                />
                <TextField
                  label="روز (جلالی)"
                  type="number"
                  value={formData.jalali_day || ''}
                  onChange={(e) => setFormData({ ...formData, jalali_day: parseInt(e.target.value) })}
                  fullWidth
                />
              </>
            )}

            {formData.period_type === 'weekly' && (
              <TextField
                label="شماره هفته"
                type="number"
                value={formData.jalali_week || ''}
                onChange={(e) => setFormData({ ...formData, jalali_week: parseInt(e.target.value) })}
                fullWidth
              />
            )}

            {(formData.period_type === 'monthly' || formData.period_type === 'yearly') && (
              <TextField
                label="ماه (جلالی)"
                type="number"
                value={formData.jalali_month || ''}
                onChange={(e) => setFormData({ ...formData, jalali_month: parseInt(e.target.value) })}
                fullWidth
                disabled={formData.period_type === 'yearly'}
              />
            )}

            <FormControl fullWidth>
              <InputLabel>حوزه (اختیاری - خالی = عمومی)</InputLabel>
              <Select
                value={formData.domain || ''}
                label="حوزه (اختیاری - خالی = عمومی)"
                onChange={(e) => setFormData({ ...formData, domain: e.target.value || null })}
              >
                <MenuItem value="">یادداشت عمومی</MenuItem>
                {Array.isArray(domains) && domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="یادداشت"
              multiline
              rows={6}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.note.trim()}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportNotesManager;
