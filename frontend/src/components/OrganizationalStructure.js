import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material';
import DomainTree from './DomainTree';

const OrganizationalStructure = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box>
      {/* Page Title - Windows 11 Style */}
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 3,
          fontWeight: 600,
          fontSize: '1.75rem',
          color: isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
          lineHeight: 1.3,
        }}
      >
        ساختار سازمانی
      </Typography>

      <DomainTree />
    </Box>
  );
};

export default OrganizationalStructure;

