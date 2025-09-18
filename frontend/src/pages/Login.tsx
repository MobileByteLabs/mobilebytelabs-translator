import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  GitHub,
  Security,
  Visibility,
  Code,
  CheckCircle,
  ArrowBack,
} from '@mui/icons-material';

// Components
import Layout from '../components/layout/Layout';
import GradientButton from '../components/ui/GradientButton';
import { AuthService } from '../utils/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    
    try {
      // Redirect to backend GitHub OAuth
      AuthService.loginWithGitHub();
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const permissions = [
    {
      icon: <Visibility sx={{ color: '#6366f1' }} />,
      title: 'Repository Access',
      description: 'Read access to scan your repositories for translatable strings',
    },
    {
      icon: <Code sx={{ color: '#6366f1' }} />,
      title: 'File Reading',
      description: 'Access to read source code files to identify translation strings',
    },
    {
      icon: <GitHub sx={{ color: '#6366f1' }} />,
      title: 'Pull Request Creation',
      description: 'Permission to create pull requests with translation files',
    },
  ];

  return (
    <Layout backgroundVariant="minimal" showFooter={false}>
      <Container maxWidth="md">
        <Box sx={{ py: 8 }}>
          {/* Back to Home */}
          <Box sx={{ mb: 4 }}>
            <GradientButton
              variant="outline"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ mb: 4 }}
            >
              Back to Home
            </GradientButton>
          </Box>

          {/* Main Login Card */}
          <Card
            sx={{
              maxWidth: 600,
              mx: 'auto',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent sx={{ p: 6 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <GitHub sx={{ fontSize: 60, color: '#6366f1', mb: 2 }} />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Connect with GitHub
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.6,
                  }}
                >
                  Connect your GitHub account to start automatically translating your repositories with AI-powered context understanding.
                </Typography>
              </Box>

              {/* Security Notice */}
              <Alert
                severity="info"
                icon={<Security sx={{ color: '#6366f1' }} />}
                sx={{
                  mb: 4,
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: 'white',
                  '& .MuiAlert-icon': {
                    color: '#6366f1',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  We use industry-standard OAuth 2.0 for secure authentication. Your credentials are never stored on our servers.
                </Typography>
              </Alert>

              {/* Permissions Section */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontWeight: 600,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CheckCircle sx={{ color: '#22c55e', fontSize: 20 }} />
                  Required Permissions
                </Typography>
                
                <List sx={{ py: 0 }}>
                  {permissions.map((permission, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {permission.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 500 }}>
                            {permission.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            {permission.description}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Login Button */}
              <Box sx={{ textAlign: 'center' }}>
                <GradientButton
                  variant="primary"
                  size="large"
                  startIcon={<GitHub />}
                  onClick={handleGitHubLogin}
                  disabled={isLoading}
                  sx={{
                    width: '100%',
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {isLoading ? 'Connecting...' : 'Continue with GitHub'}
                </GradientButton>
                
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 2,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.6)',
                maxWidth: 400,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              🔒 Your repositories remain private and secure. We only access what's necessary to provide translation services.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default Login;