import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { AccountTree, CallSplit } from '@mui/icons-material';

interface BranchSelectorProps {
  branches: string[];
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  loading?: boolean;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  selectedBranch,
  onBranchChange,
  loading = false,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h6"
        sx={{
          color: 'white',
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <AccountTree sx={{ fontSize: 20 }} />
        Select Branch to Scan
      </Typography>

      <FormControl fullWidth>
        <InputLabel
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&.Mui-focused': {
              color: '#6366f1',
            },
          }}
        >
          Repository Branch
        </InputLabel>
        <Select
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          disabled={loading}
          sx={{
            color: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366f1',
            },
            '& .MuiSelect-icon': {
              color: 'rgba(255,255,255,0.7)',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                '& .MuiMenuItem-root': {
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(99, 102, 241, 0.3)',
                    },
                  },
                },
              },
            },
          }}
        >
          {branches.map((branch) => (
            <MenuItem key={branch} value={branch}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <CallSplit sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }} />
                <Typography sx={{ flex: 1 }}>{branch}</Typography>
                {(branch === 'main' || branch === 'master') && (
                  <Chip
                    label="Default"
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      height: 18,
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  />
                )}
                {branch === selectedBranch && (
                  <Chip
                    label="Selected"
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      height: 18,
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      color: '#6366f1',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255,255,255,0.6)',
          mt: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography component="span" sx={{ fontWeight: 600 }}>
          {branches.length}
        </Typography>
        branch(es) available
      </Typography>
    </Box>
  );
};

export default BranchSelector;