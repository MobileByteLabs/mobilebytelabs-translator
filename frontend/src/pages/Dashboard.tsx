import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  GitHub,
  Add,
  MoreVert,
  Translate,
  Schedule,
  CheckCircle,
  Warning,
  Refresh,
  Settings,
  Visibility,
} from '@mui/icons-material';

// Components
import Layout from '../components/layout/Layout';
import GradientButton from '../components/ui/GradientButton';
import { AuthService, User } from '../utils/auth';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  lastScan: string;
  translationProgress: number;
  status: 'active' | 'scanning' | 'pending' | 'error';
  languages: string[];
  stringsCount: number;
  isPrivate: boolean;
  htmlUrl: string;
  lastUpdated: string;
  defaultBranch: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [repoUrl, setRepoUrl] = React.useState('');

  // Handle OAuth callback and get user
  React.useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 Dashboard initializeAuth starting...');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 localStorage before callback:', localStorage.getItem('mobilebytes_auth_token')?.substring(0, 20));
      
      // Small delay to ensure localStorage is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check for OAuth callback first
      const callbackUser = AuthService.handleOAuthCallback();
      console.log('🔍 After handleOAuthCallback:', { user: callbackUser });
      
      if (callbackUser) {
        console.log('✅ OAuth callback successful:', callbackUser);
        console.log('🔍 localStorage after callback:', localStorage.getItem('mobilebytes_auth_token')?.substring(0, 20));
        setUser(callbackUser);
        setIsLoading(false);
        // Fetch repositories after successful authentication
        fetchRepositories();
        return;
      }

      console.log('🔍 No callback user, checking existing auth...');
      
      // Check if already authenticated
      const isAuth = AuthService.isAuthenticated();
      console.log('🔍 isAuthenticated result:', isAuth);
      
      if (isAuth) {
        const existingUser = AuthService.getUser();
        console.log('🔍 existingUser from getUser():', existingUser);
        
        if (existingUser) {
          console.log('✅ Found existing authenticated user:', existingUser);
          setUser(existingUser);
          setIsLoading(false);
          // Fetch repositories for existing user
          fetchRepositories();
          return;
        } else {
          console.log('❌ isAuthenticated=true but getUser()=null');
        }
      }

      // Only redirect to login if we have no user and no token
      console.log('❌ No authentication found, redirecting to login in 2 seconds...');
      
      // Add a delay to see what's happening
      setTimeout(() => {
        console.log('🔍 Final localStorage check before redirect:', localStorage.getItem('mobilebytes_auth_token')?.substring(0, 20));
        setIsLoading(false);
        navigate('/login');
      }, 2000);
    };

    initializeAuth();
  }, [navigate]);

  // Fetch repositories from backend
  const fetchRepositories = async () => {
    if (isLoadingRepos) return; // Prevent multiple concurrent requests
    
    setIsLoadingRepos(true);
    setError(null);
    
    try {
      console.log('📂 Fetching repositories from backend...');
      console.log('🔑 Using token:', AuthService.getToken()?.substring(0, 20) + '...');
      
      const response = await AuthService.apiRequest('/repositories');
      console.log('📡 API response status:', response.status);
      console.log('📡 API response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Repositories data received:', data);
      console.log('✅ Number of repositories:', data.repositories?.length || 0);
      
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error('❌ Error fetching repositories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Refresh repositories
  const handleRefreshRepositories = () => {
    fetchRepositories();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Layout backgroundVariant="dashboard">
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '50vh',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="h5" sx={{ color: 'white' }}>
              Loading...
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Authenticating with GitHub
            </Typography>
          </Box>
        </Container>
      </Layout>
    );
  }

  // If no user after loading, this shouldn't render (will redirect)
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, repoId: string) => {
    setAnchorEl(event.currentTarget);
    console.log('Selected repo:', repoId); // Use repoId to avoid unused variable
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRepositoryClick = (repoId: string) => {
    // Find the repository to get owner/name for scanning
    const repository = repositories.find(r => r.id === repoId);
    if (repository) {
      const [owner, name] = repository.fullName.split('/');
      navigate(`/scan/${owner}/${name}`);
    }
  };

  const handleAddRepository = () => {
    setShowAddDialog(true);
  };

  const handleAddRepositoryByUrl = async () => {
    if (!repoUrl.trim()) return;

    try {
      setIsLoadingRepos(true);
      console.log('➕ Adding repository:', repoUrl);

      // Extract owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub URL. Please use format: https://github.com/owner/repo');
      }

      const [, owner, repo] = match;
      const repositoryFullName = `${owner}/${repo}`;

      const response = await AuthService.apiRequest('/repositories', {
        method: 'POST',
        body: JSON.stringify({
          repositoryFullName,
          repositoryUrl: repoUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add repository: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Repository added:', data);

      // Refresh repositories list
      await fetchRepositories();
      
      // Close dialog and reset form
      setShowAddDialog(false);
      setRepoUrl('');
    } catch (error) {
      console.error('❌ Error adding repository:', error);
      setError(error instanceof Error ? error.message : 'Failed to add repository');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setRepoUrl('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle sx={{ color: '#22c55e', fontSize: 20 }} />;
      case 'scanning':
        return <Schedule sx={{ color: '#f59e0b', fontSize: 20 }} />;
      case 'pending':
        return <Warning sx={{ color: '#f97316', fontSize: 20 }} />;
      case 'error':
        return <Warning sx={{ color: '#ef4444', fontSize: 20 }} />;
      default:
        return <CheckCircle sx={{ color: '#6b7280', fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'scanning': return '#f59e0b';
      case 'pending': return '#f97316';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <Layout 
      backgroundVariant="dashboard" 
      user={user} 
      onLogout={async () => {
        await AuthService.logout();
        navigate('/');
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ py: 6 }}>
          {/* Header */}
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Translation Dashboard
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                mb: 4,
              }}
            >
              Manage your repositories and monitor translation progress
            </Typography>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 700 }}>
                    {repositories.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Connected Repos
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                    {repositories.reduce((acc, repo) => acc + repo.stringsCount, 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Total Strings
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h4" sx={{ color: '#ec4899', fontWeight: 700 }}>
                    {repositories.reduce((acc, repo) => acc + (repo.languages?.length || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Languages
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                    {repositories.length > 0 ? Math.round(repositories.reduce((acc, repo) => acc + repo.translationProgress, 0) / repositories.length) : 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Avg. Progress
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <GradientButton
                variant="primary"
                startIcon={<Add />}
                onClick={handleAddRepository}
                disabled={isLoadingRepos}
              >
                Add Repository
              </GradientButton>
              
              <GradientButton
                variant="outline"
                startIcon={<Refresh />}
                onClick={handleRefreshRepositories}
                disabled={isLoadingRepos}
              >
                {isLoadingRepos ? 'Loading...' : 'Refresh Repositories'}
              </GradientButton>

              {error && (
                <Alert severity="error" sx={{ ml: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </Box>

          {/* Repository List */}
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 600,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <GitHub sx={{ fontSize: 24 }} />
              Your Repositories
            </Typography>

            <Grid container spacing={3}>
              {isLoadingRepos ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Box sx={{ width: 20, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                          <Box sx={{ width: 120, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
                        </Box>
                        <Box sx={{ width: '100%', height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, mb: 2 }} />
                        <Box sx={{ width: '60%', height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : repositories.length === 0 ? (
                // Empty state
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <GitHub sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                      No Repositories Found
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                      {error ? 'There was an error loading your repositories.' : 'Click "Refresh Repositories" to load your GitHub repositories.'}
                    </Typography>
                    <GradientButton
                      variant="primary"
                      startIcon={<Refresh />}
                      onClick={handleRefreshRepositories}
                    >
                      Refresh Repositories
                    </GradientButton>
                  </Box>
                </Grid>
              ) : (
                // Repository cards
                repositories.map((repo) => (
                  <Grid item xs={12} md={6} lg={4} key={repo.id}>
                    <Card
                      sx={{
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 24px rgba(99, 102, 241, 0.25)',
                        },
                      }}
                      onClick={() => handleRepositoryClick(repo.id)}
                    >
                      <CardContent sx={{ p: 3 }}>
                        {/* Repository Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              {getStatusIcon(repo.status)}
                              <Typography
                                variant="h6"
                                sx={{
                                  color: 'white',
                                  fontWeight: 600,
                                }}
                              >
                                {repo.name}
                              </Typography>
                              {repo.isPrivate && (
                                <Chip 
                                  label="Private" 
                                  size="small" 
                                  sx={{ 
                                    fontSize: '0.6rem', 
                                    height: 18,
                                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(251, 191, 36, 0.3)'
                                  }} 
                                />
                              )}
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                              {repo.fullName}
                            </Typography>
                          </Box>
                          
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, repo.id);
                            }}
                            sx={{ color: 'rgba(255,255,255,0.6)' }}
                          >
                            <MoreVert />
                          </IconButton>
                        </Box>

                        {/* Repository Info */}
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            mb: 2,
                            minHeight: 40,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {repo.description}
                        </Typography>

                        {/* Language and Stats */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Chip
                            label={repo.language}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            ⭐ {repo.stars} • {repo.stringsCount} strings
                          </Typography>
                        </Box>

                        {/* Translation Progress */}
                        {repo.status !== 'scanning' ? (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Translation Progress
                              </Typography>
                              <Typography variant="caption" sx={{ color: getStatusColor(repo.status) }}>
                                {repo.translationProgress}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={repo.translationProgress}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getStatusColor(repo.status),
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: '#f59e0b', mb: 1, display: 'block' }}>
                              Scanning repository...
                            </Typography>
                            <LinearProgress
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: '#f59e0b',
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                        )}

                        {/* Languages */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                          {(repo.languages || []).slice(0, 3).map((lang) => (
                            <Chip
                              key={lang}
                              label={lang}
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                                color: '#ec4899',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                              }}
                            />
                          ))}
                          {(repo.languages?.length || 0) > 3 && (
                            <Chip
                              label={`+${(repo.languages?.length || 0) - 3}`}
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255,255,255,0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                              }}
                            />
                          )}
                        </Box>

                        {/* Last Scan */}
                        <Typography
                          variant="caption"
                          sx={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          Last scan: {repo.lastScan}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        </Box>
      </Container>

      {/* Repository Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
          },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Visibility sx={{ mr: 2, fontSize: 20 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Translate sx={{ mr: 2, fontSize: 20 }} />
          Start Translation
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Settings sx={{ mr: 2, fontSize: 20 }} />
          Configure
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Refresh sx={{ mr: 2, fontSize: 20 }} />
          Rescan Repository
        </MenuItem>
      </Menu>

      {/* Add Repository Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={handleCloseAddDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add sx={{ color: '#6366f1' }} />
            Add Repository
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
            Enter the GitHub repository URL you want to add for translation.
          </Typography>
          
          <TextField
            fullWidth
            label="GitHub Repository URL"
            placeholder="https://github.com/owner/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            variant="outlined"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#6366f1',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.7)',
              },
            }}
          />
          
          <Alert severity="info" sx={{ mt: 2 }}>
            The repository will be scanned for translatable strings and added to your dashboard.
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <GradientButton
            variant="outline"
            onClick={handleCloseAddDialog}
          >
            Cancel
          </GradientButton>
          <GradientButton
            variant="primary"
            onClick={handleAddRepositoryByUrl}
            disabled={!repoUrl.trim() || isLoadingRepos}
          >
            {isLoadingRepos ? 'Adding...' : 'Add Repository'}
          </GradientButton>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;