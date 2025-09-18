// frontend/src/components/OAuthDebug.tsx
import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const OAuthDebug: React.FC = () => {
  React.useEffect(() => {
    console.log('🔍 OAuth Debug Component Mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 URL Search Params:', window.location.search);
    console.log('🔍 localStorage contents:', {
      authToken: localStorage.getItem('mobilebytes_auth_token'),
      allKeys: Object.keys(localStorage),
    });

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    console.log('🔍 URL params:', {
      token: urlParams.get('token')?.substring(0, 30) + '...',
      error: urlParams.get('error'),
      allParams: Array.from(urlParams.entries()),
    });
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            OAuth Debug Info
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
            <strong>Current URL:</strong> {window.location.href}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
            <strong>Has Token in URL:</strong> {token ? 'YES' : 'NO'}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
            <strong>Token Preview:</strong> {token ? token.substring(0, 50) + '...' : 'None'}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
            <strong>Error:</strong> {error || 'None'}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
            <strong>localStorage Token:</strong> {localStorage.getItem('mobilebytes_auth_token') ? 'EXISTS' : 'NONE'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OAuthDebug;