import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Chip,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import FilterModal from './FilterModal';

const TableControls = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'جستجو...',
  filters = [],
  onFilterChange,
  onClearFilters,
  filterModalTitle = 'فیلترها',
}) => {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const activeFiltersCount = filters.filter(f => f.value).length;

  return (
    <>
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            endAdornment: searchValue && (
              <IconButton
                size="small"
                onClick={() => onSearchChange('')}
                sx={{ mr: -1 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ),
          }}
          dir="rtl"
          sx={{ flexGrow: 1 }}
        />

        {/* Filter Button */}
        <IconButton
          onClick={() => setFilterModalOpen(true)}
          color={activeFiltersCount > 0 ? 'primary' : 'default'}
          sx={{ ml: 1 }}
        >
          <Badge badgeContent={activeFiltersCount} color="primary">
            <FilterListIcon />
          </Badge>
        </IconButton>
      </Paper>

      {/* Active Filters Display */}
      {(searchValue || activeFiltersCount > 0) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {searchValue && (
            <Chip
              label={`جستجو: ${searchValue}`}
              onDelete={() => onSearchChange('')}
              size="small"
            />
          )}
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
      )}

      {/* Filter Modal */}
      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        title={filterModalTitle}
      />
    </>
  );
};

export default TableControls;
