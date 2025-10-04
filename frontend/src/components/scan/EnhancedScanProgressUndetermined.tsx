import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressProps {
  scannedItems?: number;
  totalItems?: number;
  percentage?: number;
}

const EnhancedScanProgressUndetermined: React.FC<ProgressProps> = ({
  scannedItems = 0,
  totalItems = 0,
  percentage = 0,
}) => {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>
        Scanning repositories...
      </Typography>

      {/* Undetermined progress bar */}
      <LinearProgress
        variant="indeterminate"
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.1)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            backgroundColor: '#22c55e',
          },
        }}
      />

      <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'white' }}>
        {scannedItems} items scanned
      </Typography>
    </Box>
  );
};

export default EnhancedScanProgressUndetermined;
