import React from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import AnimatedBackground from '../ui/AnimatedBackground';

interface LayoutProps {
  children: React.ReactNode;
  backgroundVariant?: 'default' | 'dashboard' | 'minimal';
  user?: {
    name: string;
    avatar: string;
    username: string;
  } | null;
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
          minHeight: showFooter ? 'calc(100vh - 140px)' : 'calc(100vh - 80px)',
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