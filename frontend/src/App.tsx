import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Components
import Layout from './components/layout/Layout';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Repository from './pages/Repository';
import RepositoryScan from './pages/RepositoryScan';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Auth
import { AuthService } from './utils/auth';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#ec4899',
    },
    background: {
      default: '#0f0f23',
      paper: '#1a1a2e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
  },
});

function App() {
  const [user, setUser] = useState(AuthService.getUser());
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    console.log('🔄 App mounting - checking authentication state...');
    checkAuthState();
  }, []);

  const checkAuthState = () => {
    setIsAuthChecking(true);
    
    // First, check if this is an OAuth callback
    const callbackUser = AuthService.handleOAuthCallback();
    
    if (callbackUser) {
      console.log('✅ OAuth callback successful, user:', callbackUser);
      setUser(callbackUser);
      setIsAuthChecking(false);
      return;
    }

    // If not a callback, check if user is already authenticated
    if (AuthService.isAuthenticated()) {
      const storedUser = AuthService.getUser();
      console.log('✅ User already authenticated:', storedUser);
      setUser(storedUser);
    } else {
      console.log('ℹ️ No authenticated user found');
      setUser(null);
    }
    
    setIsAuthChecking(false);
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    await AuthService.logout();
    setUser(null);
  };

  // Show loading state while checking authentication
  if (isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0f0f23',
          color: 'white'
        }}>
          <div>Checking authentication...</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout
          backgroundVariant="default"
          user={user}
          onLogout={handleLogout}
          showFooter={false}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/repository/:id" element={<Repository />} />
            <Route path="/scan/:owner/:repo" element={<RepositoryScan />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;