import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

const FilterModal = ({
  open,
  onClose,
  filters = [],
  onFilterChange,
  onClearFilters,
  title = 'فیلترها',
}) => {
  const hasActiveFilters = filters.some(f => f.value);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {filters.map((filter, index) => (
            <FormControl fullWidth key={index} dir="rtl">
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filter.value || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                label={filter.label}
              >
                <MenuItem value="">همه</MenuItem>
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                فیلترهای فعال:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filters.map((filter, index) =>
                  filter.value ? (
                    <Chip
                      key={index}
                      label={`${filter.label}: ${filter.options.find(o => o.value === filter.value)?.label || filter.value}`}
                      onDelete={() => onFilterChange(filter.key, '')}
                      size="small"
                    />
                  ) : null
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>بستن</Button>
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            startIcon={<ClearIcon />}
            variant="outlined"
            color="error"
          >
            پاک کردن همه
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FilterModal;
