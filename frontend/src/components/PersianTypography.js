import React from 'react';
import { Typography as MuiTypography } from '@mui/material';
import { toPersianNumbers } from '../utils/numberUtils';

/**
 * Custom Typography component that automatically converts numbers to Persian numerals
 * Wraps MUI Typography and converts all numeric content
 */
const PersianTypography = React.forwardRef(({ children, ...props }, ref) => {
  // Convert children to Persian numbers if they contain digits
  const convertChildren = (children) => {
    if (children === null || children === undefined) {
      return children;
    }

    // Handle arrays
    if (Array.isArray(children)) {
      return children.map(child => convertChildren(child));
    }

    // Handle React elements - recursively convert their children
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...children.props,
        children: convertChildren(children.props.children),
      });
    }

    // Handle strings and numbers - convert to Persian
    if (typeof children === 'string' || typeof children === 'number') {
      return toPersianNumbers(children);
    }

    return children;
  };

  const persianChildren = convertChildren(children);

  return (
    <MuiTypography ref={ref} {...props}>
      {persianChildren}
    </MuiTypography>
  );
});

PersianTypography.displayName = 'PersianTypography';

export default PersianTypography;
