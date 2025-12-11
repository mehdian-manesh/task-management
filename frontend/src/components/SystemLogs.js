import React, { useState, useEffect } from 'react';
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

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await adminService.getSystemLogs();
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogTypeLabel = (type) => {
    const labels = {
      task_created: 'ایجاد وظیفه',
      project_created: 'ایجاد پروژه',
      check_in: 'چک‌این',
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

  if (loading) {
    return <Typography>در حال بارگذاری...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        لاگ‌های سیستم
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">نوع</TableCell>
              <TableCell align="right">پیام</TableCell>
              <TableCell align="right">کاربر</TableCell>
              <TableCell align="right">زمان</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="textSecondary">لاگی یافت نشد</Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, index) => (
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
                    {moment(log.timestamp).format('jYYYY/jMM/jDD HH:mm')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SystemLogs;
