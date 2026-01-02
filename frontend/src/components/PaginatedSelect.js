import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  CircularProgress,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

/**
 * PaginatedSelect - A select component that loads options from a paginated backend endpoint
 * with search and infinite scroll support.
 *
 * @param {Function} fetchFunction - Function that accepts (params) and returns a promise with {data: {results, count, next}}}
 * @param {string} value - Selected value
 * @param {Function} onChange - Callback when value changes (receives the selected value)
 * @param {string} label - Label for the select
 * @param {string} placeholder - Placeholder text for search
 * @param {string} emptyOptionLabel - Label for empty option (e.g., "بدون پروژه")
 * @param {string} emptyOptionValue - Value for empty option (default: "")
 * @param {string} initialLabel - Initial label to display before options are loaded
 * @param {Function} getOptionValue - Function to get value from option object (default: (opt) => opt.id)
 * @param {Function} getOptionLabel - Function to get label from option object (default: (opt) => opt.name || opt.username || String(opt))
 * @param {number} pageSize - Page size for pagination (default: 20)
 * @param {Object} otherProps - Other props to pass to TextField
 */
const PaginatedSelect = ({
  fetchFunction,
  value,
  onChange,
  label,
  placeholder = 'جستجو...',
  emptyOptionLabel = '',
  emptyOptionValue = '',
  initialLabel = '',
  getOptionValue = (opt) => opt.id,
  getOptionLabel = (opt) => opt.name || opt.username || String(opt),
  pageSize = 20,
  ...otherProps
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const listRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Load selected option label on mount and when value changes
  useEffect(() => {
    if (value && value !== emptyOptionValue) {
      // Try to find in current options first
      const currentOption = options.find(opt => getOptionValue(opt) === value);
      if (currentOption) {
        setSelectedLabel(getOptionLabel(currentOption));
      } else {
        // Value exists but not in options - use initialLabel if provided, otherwise keep current label or set empty
        // The label will be updated when options are loaded
        if (!selectedLabel && options.length > 0) {
          setSelectedLabel(initialLabel || '');
        } else if (initialLabel && !selectedLabel) {
          setSelectedLabel(initialLabel);
        }
      }
    } else {
      setSelectedLabel(emptyOptionLabel || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, emptyOptionValue, emptyOptionLabel, options, initialLabel]);

  // Load options from backend
  const loadOptions = useCallback(async (pageNum = 1, search = '', append = false, findSelected = false) => {
    if (!fetchFunction) return;
    
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        page_size: pageSize,
      };
      
      if (search) {
        params.search = search;
      }
      
      const response = await fetchFunction(params);
      const data = response.data;
      const newOptions = data.results || data;
      const next = data.next;
      
      if (append) {
        setOptions(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(opt => getOptionValue(opt)));
          const uniqueNew = newOptions.filter(opt => !existingIds.has(getOptionValue(opt)));
          return [...prev, ...uniqueNew];
        });
      } else {
        setOptions(newOptions);
      }
      
      // Update selected label if we found the selected option
      if (value && value !== emptyOptionValue) {
        setOptions(prevOptions => {
          const allOptions = append ? [...prevOptions, ...newOptions] : newOptions;
          const foundOption = allOptions.find(opt => getOptionValue(opt) === value);
          if (foundOption) {
            setSelectedLabel(getOptionLabel(foundOption));
          }
          return prevOptions; // Return unchanged since we already updated above
        });
      }
      
      setHasMore(!!next);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pageSize, value, emptyOptionValue, getOptionValue, getOptionLabel]);

  // Initial load when dialog opens
  useEffect(() => {
    if (open) {
      loadOptions(1, '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only reload when dialog opens

  // Handle search with debounce
  useEffect(() => {
    if (open) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Set new timeout for debounced search
      searchTimeoutRef.current = setTimeout(() => {
        loadOptions(1, searchQuery, false);
      }, 300);
      
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, open]);

  // Handle scroll to load more
  const handleScroll = useCallback((event) => {
    const target = event.target;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Load more when near bottom (within 100px)
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loading) {
      loadOptions(page + 1, searchQuery, true);
    }
  }, [hasMore, loading, page, searchQuery, loadOptions]);

  const handleOpen = () => {
    setOpen(true);
    setPage(1);
    setSearchQuery('');
    // If we have a selected value but it's not in options, try to find it
    if (value && value !== emptyOptionValue && options.length > 0) {
      const foundOption = options.find(opt => getOptionValue(opt) === value);
      if (!foundOption) {
        // Selected value not in current options, might need to search for it
        // This will be handled by the search functionality
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleSelect = (optionValue, optionLabel) => {
    setSelectedLabel(optionLabel);
    onChange({ target: { value: optionValue } });
    handleClose();
  };

  return (
    <>
      <TextField
        {...otherProps}
        label={label}
        value={selectedLabel}
        onClick={handleOpen}
        InputProps={{
          readOnly: true,
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : otherProps.InputProps?.endAdornment,
        }}
        dir="rtl"
        error={otherProps.error}
        helperText={otherProps.helperText}
      />
      
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={placeholder}
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              dir="rtl"
            />
          </Box>
          
          <List
            ref={listRef}
            onScroll={handleScroll}
            sx={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {/* Empty option */}
            {emptyOptionLabel && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={value === emptyOptionValue || (!value && emptyOptionValue === '')}
                  onClick={() => handleSelect(emptyOptionValue, emptyOptionLabel)}
                >
                  <ListItemText primary={emptyOptionLabel} />
                </ListItemButton>
              </ListItem>
            )}
            
            {/* Options */}
            {options.map((option) => {
              const optionValue = getOptionValue(option);
              const optionLabel = getOptionLabel(option);
              return (
                <ListItem key={optionValue} disablePadding>
                  <ListItemButton
                    selected={value === optionValue}
                    onClick={() => handleSelect(optionValue, optionLabel)}
                  >
                    <ListItemText primary={optionLabel} />
                  </ListItemButton>
                </ListItem>
              );
            })}
            
            {/* Loading indicator */}
            {loading && (
              <ListItem>
                <Box sx={{ width: '100%', textAlign: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              </ListItem>
            )}
            
            {/* No more results indicator */}
            {!hasMore && options.length > 0 && (
              <ListItem>
                <Box sx={{ width: '100%', textAlign: 'center', py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {options.length} مورد نمایش داده شد
                  </Typography>
                </Box>
              </ListItem>
            )}
            
            {/* No results message */}
            {!loading && options.length === 0 && searchQuery && (
              <ListItem>
                <Box sx={{ width: '100%', textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    نتیجه‌ای یافت نشد
                  </Typography>
                </Box>
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>انصراف</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaginatedSelect;
