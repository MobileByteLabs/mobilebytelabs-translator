// frontend/src/components/layout/Layout.tsx
import React from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import AnimatedBackground from '../ui/AnimatedBackground';
import { User } from '../../utils/auth';

interface LayoutProps {
  children: React.ReactNode;
  backgroundVariant?: 'default' | 'dashboard' | 'minimal';
  user?: User | null;
  onLogout?: () => void;
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  backgroundVariant = 'default',
  user = null,
  onLogout,
  showFooter = true,
}) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        background: '#0f0f23',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background */}
      <AnimatedBackground variant={backgroundVariant} />

      {/* Header */}
      <Header user={user} onLogout={onLogout} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 10,
          paddingTop: '80px', // Space for fixed header
          minHeight: showFooter ? 'calc(100vh - 60px)' : '100vh',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      {showFooter && <Footer />}
    </Box>
  );
};

export default Layout;