import React, { useState } from 'react';
import moment from 'moment-jalaali';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFnsJalali } from '@mui/x-date-pickers/AdapterDateFnsJalali';
import { faIR } from 'date-fns-jalali/locale';
import { TextField } from '@mui/material';
import { toPersianNumbers } from '../utils/numberUtils';

// Ensure Persian locale is loaded for moment-jalaali
moment.loadPersian({ dialect: 'persian-modern' });

// Convert Gregorian date string (YYYY-MM-DD) to Date object
// Uses local timezone to avoid day shifts
const gregorianToDate = (dateString) => {
  if (!dateString) return null;
  try {
    // Parse Gregorian date string (YYYY-MM-DD) and create date in local timezone
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    // Create date in local timezone (not UTC) to avoid day shifts
    // But ensure it's at midnight local time
    const date = new Date(year, month, day, 0, 0, 0, 0);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

// Convert Date object to Gregorian date string (YYYY-MM-DD)
const dateToGregorian = (date) => {
  if (!date) return '';
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const JalaliDatePicker = ({ value, onChange, label, required, margin = 'normal', fullWidth = true, error, helperText, ...props }) => {
  const [open, setOpen] = useState(false);

  // Convert incoming Gregorian date string to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return null;
    return gregorianToDate(value);
  }, [value]);

  const handleChange = (newValue) => {
    if (onChange) {
      // The adapter automatically converts Jalali selection to Gregorian Date object
      // Convert Date object back to Gregorian date string
      const gregorianString = dateToGregorian(newValue);
      onChange({ target: { value: gregorianString } });
    }
    setOpen(false); // Close picker after selection
  };

  // Custom TextField that converts numerals to Persian
  const CustomTextField = React.useCallback((textFieldProps) => {
    // Access dateValue from closure
    try {
      const { value: pickerValue, onChange: pickerOnChange, onBlur, onFocus, inputProps, error, helperText, ...other } = textFieldProps;
      
      // Always use dateValue (computed from the DatePicker's value prop) to format display
      // This ensures we're working with the actual Date object, not a formatted string
      // Fallback to pickerValue if it's a Date object (in case adapter passes it directly)
      let displayValue = '';
      const dateToFormat = dateValue || (pickerValue instanceof Date ? pickerValue : null);
      if (dateToFormat instanceof Date && !isNaN(dateToFormat.getTime())) {
        try {
          // Use local date components (not UTC) to avoid timezone issues
          // Get local year, month, day from the Date object
          const localYear = dateToFormat.getFullYear();
          const localMonth = dateToFormat.getMonth() + 1; // getMonth() returns 0-11
          const localDay = dateToFormat.getDate();
          
          // Create a moment from the Gregorian date using local components
          // Format as YYYY-MM-DD and parse it to ensure we use local time
          const gregorianString = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;
          const m = moment(gregorianString, 'YYYY-MM-DD');
          
          if (m.isValid()) {
            // Use the same method as ReportViewer: extract Jalali components and format
            const jalaliYear = m.jYear();
            const jalaliMonth = m.jMonth() + 1; // jMonth() returns 0-11
            const jalaliDay = m.jDate();
            const jalaliFormatted = `${jalaliYear}/${String(jalaliMonth).padStart(2, '0')}/${String(jalaliDay).padStart(2, '0')}`;
            displayValue = toPersianNumbers(jalaliFormatted);
          } else {
            displayValue = '';
          }
        } catch (e) {
          displayValue = '';
        }
      }
      
      // Handle onChange to ensure DatePicker receives the correct value
      const handleTextFieldChange = (event) => {
        // Convert Persian numerals back to Western for DatePicker
        if (event.target.value) {
          const westernValue = event.target.value
            .replace(/[۰-۹]/g, (char) => {
              const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
              return String(persianDigits.indexOf(char));
            });
          event.target.value = westernValue;
        }
        if (pickerOnChange) {
          pickerOnChange(event);
        }
      };
      
      return (
        <TextField
          {...other}
          value={displayValue}
          onChange={handleTextFieldChange}
          onBlur={onBlur}
          onFocus={onFocus}
          error={error}
          helperText={helperText}
          inputProps={{
            ...inputProps,
            dir: 'ltr',
            style: {
              direction: 'ltr',
              textAlign: 'left',
              ...inputProps?.style,
            },
          }}
          dir="ltr"
          InputLabelProps={{ shrink: true, ...other.InputLabelProps }}
          sx={{
            '& .MuiInputBase-input': {
              direction: 'ltr',
              textAlign: 'left',
            },
            ...other.sx,
          }}
        />
      );
    } catch (err) {
      console.error('Error in CustomTextField:', err);
      // Fallback to default TextField if custom one fails
      return <TextField {...textFieldProps} />;
    }
  }, [dateValue]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFnsJalali} adapterLocale={faIR}>
      <DatePicker
        label={label}
        value={dateValue}
        onChange={handleChange}
        open={open}
        onClose={() => setOpen(false)}
        format="yyyy/MM/dd"
        enableAccessibleFieldDOMStructure={false}
        slots={{
          textField: CustomTextField,
        }}
        slotProps={{
          textField: {
            fullWidth,
            required,
            margin,
            onClick: () => setOpen(true),
            error,
            helperText,
            ...props,
          },
          inputAdornment: {
            sx: {
              '& .MuiIconButton-root': {
                // Icon is naturally on the right side in LTR
              },
            },
          },
          popper: {
            sx: {
              '& .MuiPaper-root': {
                background: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(15, 23, 42, 1) !important'
                  : 'rgba(255, 255, 255, 1) !important',
                backgroundImage: 'none !important',
                '--Paper-overlay': 'none !important',
              },
            },
          },
          desktopPaper: {
            sx: {
              background: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(15, 23, 42, 1) !important'
                : 'rgba(255, 255, 255, 1) !important',
              backgroundImage: 'none !important',
              '--Paper-overlay': 'none !important',
            },
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default JalaliDatePicker;
