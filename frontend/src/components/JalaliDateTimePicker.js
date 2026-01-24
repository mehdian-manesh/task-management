import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFnsJalali } from '@mui/x-date-pickers/AdapterDateFnsJalali';
import { faIR } from 'date-fns-jalali/locale';
import { TextField } from '@mui/material';
import { toPersianNumbers } from '../utils/numberUtils';

// Convert Gregorian datetime string (YYYY-MM-DDTHH:mm) to Date object
const gregorianToDateTime = (dateTimeString) => {
  if (!dateTimeString) return null;
  try {
    // Parse datetime string (YYYY-MM-DDTHH:mm)
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.error('Error parsing datetime:', error);
    return null;
  }
};

// Convert Date object to Gregorian datetime string (YYYY-MM-DDTHH:mm)
const dateTimeToGregorian = (date) => {
  if (!date) return '';
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
};

const JalaliDateTimePicker = ({ value, onChange, label, required, margin = 'normal', fullWidth = true, ...props }) => {
  const [open, setOpen] = useState(false);

  // Convert incoming Gregorian datetime string to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return null;
    return gregorianToDateTime(value);
  }, [value]);

  const handleChange = (newValue) => {
    if (onChange) {
      // The adapter automatically converts Jalali selection to Gregorian Date object
      // Convert Date object back to Gregorian datetime string
      const gregorianString = dateTimeToGregorian(newValue);
      onChange({ target: { value: gregorianString } });
    }
    setOpen(false); // Close picker after selection
  };

  // Custom TextField that converts numerals to Persian
  const CustomTextField = React.useCallback((textFieldProps) => {
    try {
      const { value: pickerValue, onChange: pickerOnChange, onBlur, onFocus, inputProps, error, helperText, ...other } = textFieldProps;
      
      // Convert Western numerals to Persian for display
      // Keep the original value for DatePicker's internal state management
      const displayValue = pickerValue ? toPersianNumbers(String(pickerValue)) : '';
      
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
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFnsJalali} adapterLocale={faIR}>
      <DateTimePicker
        label={label}
        value={dateValue}
        onChange={handleChange}
        open={open}
        onClose={() => setOpen(false)}
        format="yyyy/MM/dd HH:mm"
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

export default JalaliDateTimePicker;
