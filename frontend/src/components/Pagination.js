import React from 'react';
import { Box, Pagination as MuiPagination, Typography } from '@mui/material';

const Pagination = ({ count = 0, page = 1, pageSize = 20, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) => {
  const safeCount = Number(count) || 0;
  const safePage = Number(page) || 1;
  const safePageSize = Number(pageSize) || 20;
  const totalPages = Math.ceil(safeCount / safePageSize) || 1;
  const startItem = safeCount === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endItem = Math.min(safePage * safePageSize, safeCount);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        نمایش {startItem} تا {endItem} از {safeCount} مورد
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <MuiPagination
          count={totalPages}
          page={safePage}
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
