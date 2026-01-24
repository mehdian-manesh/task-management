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
import SecurityIcon from '@mui/icons-material/Security';
import { adminService, domainService } from '../api/services';
import TableControls from './TableControls';
import Pagination from './Pagination';
import SortableTableHeader from './SortableTableHeader';
import PaginatedSelect from './PaginatedSelect';
import SessionList from './SessionList';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [selectedUserForSessions, setSelectedUserForSessions] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter and sort state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    is_staff: '',
    is_active: '',
  });
  const [ordering, setOrdering] = useState('-date_joined');
  
  const [domains, setDomains] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_active: true,
    domain_id: '',
  });

  const buildParams = useCallback(() => {
    const params = {
      page,
      page_size: pageSize,
    };
    
    if (search) {
      params.search = search;
    }
    
    if (filters.is_staff !== '') {
      params.is_staff = filters.is_staff === 'true';
    }
    
    if (filters.is_active !== '') {
      params.is_active = filters.is_active === 'true';
    }
    
    if (ordering) {
      params.ordering = ordering;
    }
    
    return params;
  }, [page, pageSize, search, filters, ordering]);

  const loadDomains = useCallback(async () => {
    try {
      const response = await domainService.getAll();
      const domainsData = response.data.results || response.data;
      setDomains(Array.isArray(domainsData) ? domainsData : []);
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const params = buildParams();
      const response = await adminService.getAllUsers(params);
      
      // Handle paginated response
      if (response.data.results) {
        setUsers(response.data.results);
        setTotalCount(response.data.count);
      } else {
        // Fallback for non-paginated response
        setUsers(response.data);
        setTotalCount(response.data.length);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [buildParams]);

  useEffect(() => {
    loadUsers();
    loadDomains();
  }, [loadUsers, loadDomains]);

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
        domain_id: user.domain || '',
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
        domain_id: '',
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
        // Convert empty string to null for domain_id
        if (updateData.domain_id === '') {
          updateData.domain_id = null;
        }
        await adminService.updateUser(selectedUser.id, updateData);
      } else {
        const createData = { ...formData };
        // Convert empty string to null for domain_id
        if (createData.domain_id === '') {
          createData.domain_id = null;
        }
        await adminService.createUser(createData);
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
      setOrdering('-date_joined');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ is_staff: '', is_active: '' });
    setOrdering('-date_joined');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
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

      <TableControls
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="جستجو در نام کاربری، ایمیل، نام و نام خانوادگی..."
        filters={[
          {
            key: 'is_staff',
            label: 'نقش',
            value: filters.is_staff,
            options: [
              { value: 'true', label: 'مدیر' },
              { value: 'false', label: 'کاربر عادی' },
            ],
          },
          {
            key: 'is_active',
            label: 'وضعیت',
            value: filters.is_active,
            options: [
              { value: 'true', label: 'فعال' },
              { value: 'false', label: 'غیرفعال' },
            ],
          },
        ]}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterModalTitle="فیلتر کاربران"
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableHeader
                sortKey="username"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                نام کاربری
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="email"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                ایمیل
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="first_name"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                نام
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="last_name"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                نام خانوادگی
              </SortableTableHeader>
              <TableCell align="right">دامنه</TableCell>
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
                  {user.domain ? (
                    domains.find(d => d.id === user.domain)?.name || '-'
                  ) : '-'}
                </TableCell>
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
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setSelectedUserForSessions(user);
                      setSessionsDialogOpen(true);
                    }}
                    title="مشاهده جلسات"
                  >
                    <SecurityIcon fontSize="small" />
                  </IconButton>
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

      <Pagination
        count={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

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
            <PaginatedSelect
              fetchFunction={domainService.getAll}
              value={formData.domain_id}
              onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
              label="دامنه"
              emptyOptionLabel="بدون دامنه"
              emptyOptionValue=""
              getOptionValue={(opt) => opt.id}
              getOptionLabel={(opt) => opt.name}
              margin="normal"
              fullWidth
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

      {/* Sessions Dialog */}
      <Dialog 
        open={sessionsDialogOpen} 
        onClose={() => {
          setSessionsDialogOpen(false);
          setSelectedUserForSessions(null);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          جلسات کاربر: {selectedUserForSessions?.username}
        </DialogTitle>
        <DialogContent>
          {selectedUserForSessions && (
            <SessionList 
              userId={selectedUserForSessions.id} 
              adminMode={true}
              onSessionDeleted={() => {
                // Refresh sessions list
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSessionsDialogOpen(false);
            setSelectedUserForSessions(null);
          }}>
            بستن
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
