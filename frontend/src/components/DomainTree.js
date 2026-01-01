import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { domainService } from '../api/services';
import { useTheme } from '@mui/material';
import { toPersianNumbers } from '../utils/numberUtils';

const TreeNode = ({ node, level = 0, onAdd, onEdit, onDelete, onExpand, expandedNodes, isDark }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box sx={{ ml: level * 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          mb: 0.5,
          borderRadius: '6px',
          background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          '&:hover': {
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={() => onExpand(node.id)}
            sx={{
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)',
              p: 0.5,
            }}
          >
            {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </IconButton>
        ) : (
          <Box sx={{ width: 32 }} />
        )}
        
        <Typography
          sx={{
            flex: 1,
            fontWeight: 600,
            color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
            fontSize: '0.9375rem',
          }}
        >
          {node.name}
        </Typography>

        <Chip
          label={`${toPersianNumbers(node.projects_count || 0)} پروژه`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            background: '#6366f1',
            color: '#ffffff',
            mr: 0.5,
          }}
        />
        <Chip
          label={`${toPersianNumbers(node.tasks_count || 0)} وظیفه`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            background: '#10b981',
            color: '#ffffff',
            mr: 0.5,
          }}
        />
        <Chip
          label={`${toPersianNumbers(node.users_count || 0)} کاربر`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            background: '#f59e0b',
            color: '#ffffff',
            mr: 0.5,
          }}
        />

        <Tooltip title="افزودن زیردامنه">
          <IconButton
            size="small"
            onClick={() => onAdd(node.id)}
            sx={{
              color: '#6366f1',
              '&:hover': { background: 'rgba(99, 102, 241, 0.1)' },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="ویرایش">
          <IconButton
            size="small"
            onClick={() => onEdit(node)}
            sx={{
              color: '#f59e0b',
              '&:hover': { background: 'rgba(245, 158, 11, 0.1)' },
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            onClick={() => onDelete(node)}
            sx={{
              color: '#ef4444',
              '&:hover': { background: 'rgba(239, 68, 68, 0.1)' },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {isExpanded && hasChildren && (
        <Box>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onExpand={onExpand}
              expandedNodes={expandedNodes}
              isDark={isDark}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const DomainTree = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tree, setTree] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [formData, setFormData] = useState({ name: '', parent: '' });
  const [message, setMessage] = useState(null);

  const getAllNodeIds = useCallback((nodes) => {
    let ids = [];
    nodes.forEach((node) => {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        ids = ids.concat(getAllNodeIds(node.children));
      }
    });
    return ids;
  }, []);

  const loadTree = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await domainService.getTree();
      setTree(response.data || []);
      // Expand all nodes by default
      const allIds = getAllNodeIds(response.data || []);
      setExpandedNodes(new Set(allIds));
    } catch (error) {
      console.error('Error loading domain tree:', error);
      setError('خطا در بارگذاری ساختار سازمانی');
    } finally {
      setLoading(false);
    }
  }, [getAllNodeIds]);

  const loadDomains = useCallback(async () => {
    try {
      const response = await domainService.getAll();
      setDomains(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  }, []);

  useEffect(() => {
    loadTree();
    loadDomains();
  }, [loadTree, loadDomains]);


  const handleExpand = (nodeId) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleOpenDialog = (parentId = null, domain = null) => {
    if (domain) {
      setEditingDomain(domain);
      setFormData({
        name: domain.name,
        parent: domain.parent || '',
      });
    } else {
      setEditingDomain(null);
      setFormData({
        name: '',
        parent: parentId || '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDomain(null);
    setFormData({ name: '', parent: '' });
    setMessage(null);
  };

  const handleSubmit = async () => {
    try {
      setMessage(null);
      const data = {
        name: formData.name,
        parent: formData.parent || null,
      };

      if (editingDomain) {
        await domainService.update(editingDomain.id, data);
        setMessage({ type: 'success', text: 'دامنه با موفقیت به‌روزرسانی شد' });
      } else {
        await domainService.create(data);
        setMessage({ type: 'success', text: 'دامنه با موفقیت ایجاد شد' });
      }

      setTimeout(() => {
        handleCloseDialog();
        loadTree();
        loadDomains();
      }, 1000);
    } catch (error) {
      console.error('Error saving domain:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || error.response?.data?.name?.[0] || 'خطا در ذخیره دامنه',
      });
    }
  };

  const handleDelete = async (domain) => {
    if (!window.confirm(`آیا از حذف دامنه "${domain.name}" و تمام زیردامنه‌های آن اطمینان دارید؟`)) {
      return;
    }

    try {
      await domainService.delete(domain.id);
      setMessage({ type: 'success', text: 'دامنه با موفقیت حذف شد' });
      loadTree();
      loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      alert(error.response?.data?.detail || 'خطا در حذف دامنه');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
            fontSize: '1.125rem',
          }}
        >
          ساختار سازمانی
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: '#6366f1',
            '&:hover': { background: '#4f46e5' },
          }}
        >
          افزودن دامنه ریشه
        </Button>
      </Box>

      <Paper
        sx={{
          p: 3,
          borderRadius: '6px !important',
          background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: isDark
            ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 2px 8px 0 rgba(31, 38, 135, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        {tree.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 4 }}
          >
            هیچ دامنه‌ای تعریف نشده است. برای شروع، یک دامنه ریشه ایجاد کنید.
          </Typography>
        ) : (
          <Box>
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                onAdd={handleOpenDialog}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
                onExpand={handleExpand}
                expandedNodes={expandedNodes}
                isDark={isDark}
              />
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle>
          {editingDomain ? 'ویرایش دامنه' : 'افزودن دامنه جدید'}
        </DialogTitle>
        <DialogContent>
          {message && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}
          <TextField
            fullWidth
            label="نام دامنه"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
            dir="rtl"
          />
          <TextField
            select
            fullWidth
            label="دامنه والد (اختیاری)"
            value={formData.parent}
            onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
            margin="normal"
            dir="rtl"
            disabled={!!editingDomain} // Can't change parent when editing
          >
            <MenuItem value="">بدون والد (ریشه)</MenuItem>
            {domains
              .filter((d) => !editingDomain || d.id !== editingDomain.id)
              .map((domain) => (
                <MenuItem key={domain.id} value={domain.id}>
                  {domain.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim()}
            sx={{ background: '#6366f1', '&:hover': { background: '#4f46e5' } }}
          >
            {editingDomain ? 'ذخیره' : 'ایجاد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DomainTree;
