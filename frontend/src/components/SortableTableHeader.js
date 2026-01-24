import React from 'react';
import { TableCell, IconButton, Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

const SortableTableHeader = ({ 
  children, 
  sortKey, 
  currentSort, 
  onSort, 
  align = 'right' 
}) => {
  const isActive = currentSort && (currentSort === sortKey || currentSort === `-${sortKey}`);
  const direction = currentSort && currentSort.startsWith('-') ? 'desc' : 'asc';

  const handleSort = () => {
    if (isActive) {
      // Toggle direction
      onSort(direction === 'asc' ? `-${sortKey}` : sortKey);
    } else {
      // Set new sort
      onSort(sortKey);
    }
  };

  return (
    <TableCell align={align}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
          flexDirection: align === 'right' ? 'row-reverse' : 'row',
        }}
        onClick={handleSort}
      >
        <span>{children}</span>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleSort();
          }}
          sx={{ 
            padding: 0.5,
            color: isActive ? 'primary.main' : 'text.secondary',
          }}
        >
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUpwardIcon fontSize="small" />
            ) : (
              <ArrowDownwardIcon fontSize="small" />
            )
          ) : (
            <UnfoldMoreIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
    </TableCell>
  );
};

export default SortableTableHeader;
