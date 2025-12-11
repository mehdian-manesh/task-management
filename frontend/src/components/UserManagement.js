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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { adminService } from '../api/services';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminService.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        is_staff: user.is_staff || false,
        is_active: user.is_active !== undefined ? user.is_active : true,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedUser) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await adminService.updateUser(selectedUser.id, updateData);
      } else {
        await adminService.createUser(formData);
      }
      handleCloseDialog();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.detail || 'خطا در ذخیره کاربر');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
      try {
        await adminService.deleteUser(id);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(error.response?.data?.detail || 'خطا در حذف کاربر');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">مدیریت کاربران</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          افزودن کاربر
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">نام کاربری</TableCell>
              <TableCell align="right">ایمیل</TableCell>
              <TableCell align="right">نام</TableCell>
              <TableCell align="right">نام خانوادگی</TableCell>
              <TableCell align="right">نقش</TableCell>
              <TableCell align="right">وضعیت</TableCell>
              <TableCell align="right">عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell align="right">{user.username}</TableCell>
                <TableCell align="right">{user.email || '-'}</TableCell>
                <TableCell align="right">{user.first_name || '-'}</TableCell>
                <TableCell align="right">{user.last_name || '-'}</TableCell>
                <TableCell align="right">
                  {user.is_staff ? (
                    <Chip label="مدیر" color="primary" size="small" />
                  ) : (
                    <Chip label="کاربر عادی" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  {user.is_active ? (
                    <Chip label="فعال" color="success" size="small" />
                  ) : (
                    <Chip label="غیرفعال" color="error" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(user.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="نام کاربری *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="ایمیل"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label={selectedUser ? 'رمز عبور (خالی بگذارید برای عدم تغییر)' : 'رمز عبور *'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required={!selectedUser}
            />
            <TextField
              label="نام"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="نام خانوادگی"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_staff}
                  onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })}
                />
              }
              label="مدیر سیستم"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="فعال"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedUser ? 'ذخیره' : 'ایجاد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
