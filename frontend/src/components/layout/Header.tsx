import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Translate,
  GitHub,
  Dashboard,
  Settings,
  AccountCircle,
  Logout,
  Home,
} from '@mui/icons-material';

interface HeaderProps {
  user?: {
    name: string;
    avatar: string;
    username: string;
  } | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    onLogout?.();
  };

  const navItems = [
    { label: 'Home', path: '/', icon: <Home sx={{ fontSize: 20 }} /> },
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard sx={{ fontSize: 20 }} /> },
    { label: 'Settings', path: '/settings', icon: <Settings sx={{ fontSize: 20 }} /> },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        py: 2,
        position: 'relative',
        zIndex: 10,
        background: 'rgba(15, 15, 35, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo and Brand */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            <Translate sx={{ fontSize: 32, color: '#6366f1' }} />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                color: 'white',
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MobileByteLabs Translator
            </Typography>
          </Box>

          {/* Navigation (when user is logged in) */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActivePath(item.path) ? '#6366f1' : 'rgba(255,255,255,0.8)',
                    backgroundColor: isActivePath(item.path) 
                      ? 'rgba(99, 102, 241, 0.1)' 
                      : 'transparent',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: isActivePath(item.path) ? 600 : 400,
                    border: isActivePath(item.path) 
                      ? '1px solid rgba(99, 102, 241, 0.3)' 
                      : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* User Menu or Login Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user ? (
              <>
                {/* User Status Chip */}
                <Chip
                  label="Connected"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    fontWeight: 500,
                  }}
                />

                {/* User Avatar and Menu */}
                <IconButton onClick={handleUserMenuOpen} sx={{ p: 0 }}>
                  <Avatar
                    src={user.avatar}
                    alt={user.name}
                    sx={{
                      width: 40,
                      height: 40,
                      border: '2px solid rgba(99, 102, 241, 0.3)',
                    }}
                  />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleUserMenuClose}
                  PaperProps={{
                    sx: {
                      background: 'rgba(26, 26, 46, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                      mt: 1,
                      minWidth: 200,
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      @{user.username}
                    </Typography>
                  </Box>

                  <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
                    <Settings sx={{ mr: 2, fontSize: 20 }} />
                    Settings
                  </MenuItem>

                  <MenuItem 
                    onClick={() => window.open(`https://github.com/${user.username}`, '_blank')}
                  >
                    <GitHub sx={{ mr: 2, fontSize: 20 }} />
                    GitHub Profile
                  </MenuItem>

                  <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
                    <Logout sx={{ mr: 2, fontSize: 20 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="outlined"
                startIcon={<GitHub />}
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: 3,
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  },
                }}
              >
                Connect GitHub
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Header;