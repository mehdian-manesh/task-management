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
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { savedReportService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toPersianNumbers } from '../utils/numberUtils';
import { formatToJalaliWithTime, formatToJalali } from '../utils/dateUtils';
import { formatJalaliPeriod } from '../utils/jalaliReportUtils';
import TableControls from './TableControls';
import Pagination from './Pagination';

const REPORT_TYPES = [
  { value: 'individual', label: 'فردی' },
  { value: 'team', label: 'تیمی' },
];

const PERIOD_TYPES = [
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' },
];

const SavedReportsList = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    report_type: '',
    period_type: '',
  });
  
  useEffect(() => {
    loadReports();
  }, [page, filters]);
  
  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      
      if (filters.report_type) {
        params.report_type = filters.report_type;
      }
      
      if (filters.period_type) {
        params.period_type = filters.period_type;
      }
      
      const response = await savedReportService.getAll(params);
      const data = response.data.results || response.data;
      setReports(data);
      setTotalCount(response.data.count || data.length);
    } catch (error) {
      console.error('Error loading saved reports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPDF = async (report) => {
    try {
      const response = await savedReportService.downloadPDF(report.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const periodStr = formatJalaliPeriod(
        report.period_type,
        report.jalali_year,
        report.jalali_month,
        report.jalali_week,
        null
      );
      link.download = `saved_report_${report.report_type}_${periodStr.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('خطا در دانلود PDF');
    }
  };
  
  const getPeriodLabel = (report) => {
    return formatJalaliPeriod(
      report.period_type,
      report.jalali_year,
      report.jalali_month,
      report.jalali_week,
      null
    );
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        گزارش‌های ذخیره شده
      </Typography>
      
      {/* Filters */}
      <TableControls
        search={search}
        onSearchChange={setSearch}
        onSearch={() => loadReports()}
        filters={
          <Box display="flex" gap={2}>
            {user.is_staff && (
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>نوع گزارش</InputLabel>
                <Select
                  value={filters.report_type || ''}
                  label="نوع گزارش"
                  onChange={(e) => setFilters({ ...filters, report_type: e.target.value })}
                >
                  <MenuItem value="">همه</MenuItem>
                  {REPORT_TYPES.map((rt) => (
                    <MenuItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>نوع دوره</InputLabel>
              <Select
                value={filters.period_type || ''}
                label="نوع دوره"
                onChange={(e) => setFilters({ ...filters, period_type: e.target.value })}
              >
                <MenuItem value="">همه</MenuItem>
                {PERIOD_TYPES.map((pt) => (
                  <MenuItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        }
      />
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {user.is_staff && <TableCell>نوع گزارش</TableCell>}
                <TableCell>نوع دوره</TableCell>
                <TableCell>دوره</TableCell>
                {user.is_staff && <TableCell>کاربر / حوزه</TableCell>}
                <TableCell>تاریخ ایجاد</TableCell>
                <TableCell>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  {user.is_staff && (
                    <TableCell>
                      <Chip
                        label={report.report_type === 'individual' ? 'فردی' : 'تیمی'}
                        color={report.report_type === 'individual' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {PERIOD_TYPES.find(pt => pt.value === report.period_type)?.label || report.period_type}
                  </TableCell>
                  <TableCell>{getPeriodLabel(report)}</TableCell>
                  {user.is_staff && (
                    <TableCell>
                      {report.report_type === 'individual'
                        ? (report.user_username || '-')
                        : (report.domain_name || '-')}
                    </TableCell>
                  )}
                  <TableCell>{formatToJalaliWithTime(report.created_at)}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleDownloadPDF(report)}
                      color="primary"
                      title="دانلود PDF"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {reports.length === 0 && !loading && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">گزارشی یافت نشد</Typography>
            </Box>
          )}
        </TableContainer>
      )}
      
      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </Box>
  );
};

export default SavedReportsList;
