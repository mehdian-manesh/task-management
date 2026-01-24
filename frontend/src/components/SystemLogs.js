import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { adminService } from '../api/services';
import moment from 'moment-jalaali';
import TableControls from './TableControls';
import Pagination from './Pagination';
import SortableTableHeader from './SortableTableHeader';

const SystemLogs = () => {
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Filter and sort state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
  });
  const [ordering, setOrdering] = useState('-timestamp');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await adminService.getSystemLogs();
      setAllLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering, sorting, and pagination
  const filteredAndSortedLogs = useMemo(() => {
    let result = [...allLogs];
    
    // Filter by type
    if (filters.type) {
      result = result.filter(log => log.type === filters.type);
    }
    
    // Search in message and user
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(log => 
        (log.message && log.message.toLowerCase().includes(searchLower)) ||
        (log.user && log.user.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort
    if (ordering) {
      const field = ordering.startsWith('-') ? ordering.substring(1) : ordering;
      const direction = ordering.startsWith('-') ? -1 : 1;
      
      result.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        
        if (field === 'timestamp') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }
    
    return result;
  }, [allLogs, filters, search, ordering]);

  // Paginate
  const paginatedLogs = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedLogs.slice(startIndex, endIndex);
  }, [filteredAndSortedLogs, page, pageSize]);

  const totalCount = filteredAndSortedLogs.length;

  const getLogTypeLabel = (type) => {
    const labels = {
      task_created: 'ایجاد وظیفه',
      project_created: 'ایجاد پروژه',
      check_in: 'ورود',
    };
    return labels[type] || type;
  };

  const getLogTypeColor = (type) => {
    const colors = {
      task_created: 'primary',
      project_created: 'secondary',
      check_in: 'success',
    };
    return colors[type] || 'default';
  };

  const logTypes = [
    { value: 'task_created', label: 'ایجاد وظیفه' },
    { value: 'project_created', label: 'ایجاد پروژه' },
    { value: 'check_in', label: 'ورود' },
  ];

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
      setOrdering('-timestamp');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ type: '' });
    setOrdering('-timestamp');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (loading) {
    return <Typography>در حال بارگذاری...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        لاگ‌های سیستم
      </Typography>

      <TableControls
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="جستجو در پیام و کاربر..."
        filters={[
          {
            key: 'type',
            label: 'نوع',
            value: filters.type,
            options: logTypes,
          },
        ]}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterModalTitle="فیلتر لاگ‌ها"
      />

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 0.75,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableHeader
                sortKey="type"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                نوع
              </SortableTableHeader>
              <TableCell align="right">پیام</TableCell>
              <TableCell align="right">کاربر</TableCell>
              <SortableTableHeader
                sortKey="timestamp"
                currentSort={ordering}
                onSort={handleSortChange}
              >
                زمان
              </SortableTableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="textSecondary">لاگی یافت نشد</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell align="right">
                    <Chip
                      label={getLogTypeLabel(log.type)}
                      color={getLogTypeColor(log.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{log.message}</TableCell>
                  <TableCell align="right">{log.user}</TableCell>
                  <TableCell align="right">
                    <Box component="span" dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                      {moment(log.timestamp).format('jYYYY/jMM/jDD HH:mm')}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Pagination
        count={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </Box>
  );
};

export default SystemLogs;
