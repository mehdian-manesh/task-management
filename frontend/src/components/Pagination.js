import React from 'react';
import { Box, Pagination as MuiPagination, Typography } from '@mui/material';

const Pagination = ({ count, page, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) => {
  const totalPages = Math.ceil(count / pageSize);
  const startItem = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, count);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        نمایش {startItem} تا {endItem} از {count} مورد
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <MuiPagination
          count={totalPages}
          page={page}
          onChange={(event, value) => onPageChange(value)}
          color="primary"
          shape="rounded"
          dir="rtl"
        />
      </Box>
    </Box>
  );
};

export default Pagination;
