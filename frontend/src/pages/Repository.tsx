import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  GitHub,
  Translate,
  CheckCircle,
  Schedule,
  Edit,
  Visibility,
  Download,
  Upload,
  Refresh,
  Settings,
  BugReport,
} from '@mui/icons-material';

// Components
import Layout from '../components/layout/Layout';
import GradientButton from '../components/ui/GradientButton';

interface TranslationString {
  id: string;
  key: string;
  originalText: string;
  filePath: string;
  lineNumber: number;
  context: string;
  status: 'pending' | 'translated' | 'reviewed' | 'approved';
  translations: {
    [language: string]: {
      text: string;
      confidence: number;
      reviewer?: string;
      lastUpdated: string;
    };
  };
}

const Repository: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState(0);

  // Mock user data
  const user = {
    name: 'John Doe',
    avatar: 'https://github.com/johndoe.png',
    username: 'johndoe',
  };

  // Mock repository data
  const repository = {
    id: id || '1',
    name: 'mobilebytes-translator',
    fullName: 'johndoe/mobilebytes-translator',
    description: 'MobileByteLabs translation application for global communication',
    language: 'Kotlin',
    stars: 145,
    lastScan: '2 hours ago',
    translationProgress: 75,
    status: 'active',
    languages: ['English', 'Spanish', 'French', 'Portuguese'],
    stringsCount: 342,
    translatedCount: 257,
    pendingCount: 85,
    branch: 'main',
    lastCommit: 'feat: add payment processing - 2 days ago',
  };

  // Mock translation strings
  const translationStrings: TranslationString[] = [
    {
      id: '1',
      key: 'welcome_message',
      originalText: 'Welcome to MobileByteLabs Translator',
      filePath: 'app/src/main/res/values/strings.xml',
      lineNumber: 15,
      context: 'Main screen welcome text',
      status: 'approved',
      translations: {
        Spanish: { text: 'Bienvenido a MobileByteLabs Translator', confidence: 95, reviewer: 'maria.garcia', lastUpdated: '2 hours ago' },
        French: { text: 'Bienvenue dans MobileByteLabs Translator', confidence: 92, reviewer: 'pierre.dubois', lastUpdated: '1 day ago' },
        Portuguese: { text: 'Bem-vindo ao MobileByteLabs Translator', confidence: 94, lastUpdated: '3 hours ago' },
      },
    },
    {
      id: '2',
      key: 'login_button',
      originalText: 'Sign In',
      filePath: 'app/src/main/res/values/strings.xml',
      lineNumber: 23,
      context: 'Login screen button text',
      status: 'translated',
      translations: {
        Spanish: { text: 'Iniciar Sesión', confidence: 98, lastUpdated: '1 hour ago' },
        French: { text: 'Se Connecter', confidence: 96, lastUpdated: '2 hours ago' },
        Portuguese: { text: 'Entrar', confidence: 97, lastUpdated: '1 hour ago' },
      },
    },
    {
      id: '3',
      key: 'account_balance',
      originalText: 'Account Balance',
      filePath: 'app/src/main/java/AccountFragment.kt',
      lineNumber: 45,
      context: 'Account screen balance label',
      status: 'pending',
      translations: {},
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#22c55e';
      case 'translated': return '#3b82f6';
      case 'reviewed': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle sx={{ fontSize: 16, color: '#22c55e' }} />;
      case 'translated': return <Translate sx={{ fontSize: 16, color: '#3b82f6' }} />;
      case 'reviewed': return <Visibility sx={{ fontSize: 16, color: '#f59e0b' }} />;
      case 'pending': return <Schedule sx={{ fontSize: 16, color: '#6b7280' }} />;
      default: return <Schedule sx={{ fontSize: 16, color: '#6b7280' }} />;
    }
  };

  return (
    <Layout 
      backgroundVariant="dashboard" 
      user={user} 
      onLogout={() => navigate('/')}
    >
      <Container maxWidth="lg">
        <Box sx={{ py: 6 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <GradientButton
              variant="outline"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{ mb: 3 }}
            >
              Back to Dashboard
            </GradientButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <GitHub sx={{ fontSize: 32, color: '#6366f1' }} />
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {repository.name}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  {repository.fullName}
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                mb: 3,
              }}
            >
              {repository.description}
            </Typography>

            {/* Repository Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" sx={{ color: '#6366f1', fontWeight: 700 }}>
                    {repository.stringsCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Total Strings
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>
                    {repository.translatedCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Translated
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                    {repository.pendingCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Pending
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" sx={{ color: '#ec4899', fontWeight: 700 }}>
                    {repository.languages.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Languages
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
              <GradientButton
                variant="primary"
                startIcon={<Translate />}
              >
                Start Translation
              </GradientButton>
              
              <GradientButton
                variant="outline"
                startIcon={<Refresh />}
              >
                Rescan Repository
              </GradientButton>
              
              <GradientButton
                variant="outline"
                startIcon={<Download />}
              >
                Export Translations
              </GradientButton>
              
              <GradientButton
                variant="outline"
                startIcon={<Settings />}
              >
                Configure
              </GradientButton>
            </Box>
          </Box>

          {/* Language Progress */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                Translation Progress by Language
              </Typography>
              
              <Grid container spacing={3}>
                {repository.languages.map((language) => {
                  const progress = Math.floor(Math.random() * 40) + 60; // Mock progress
                  return (
                    <Grid item xs={12} sm={6} md={3} key={language}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {language}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6366f1' }}>
                            {progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#6366f1',
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                sx={{
                  '& .MuiTab-root': {
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                  },
                  '& .Mui-selected': {
                    color: '#6366f1 !important',
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#6366f1',
                  },
                }}
              >
                <Tab label="Translation Strings" />
                <Tab label="Recent Activity" />
                <Tab label="Pull Requests" />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 0 }}>
              {/* Translation Strings Tab */}
              {activeTab === 0 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Key</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Original Text</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>File</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Progress</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {translationStrings.map((string) => (
                        <TableRow 
                          key={string.id}
                          sx={{ 
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <TableCell sx={{ color: 'white', fontFamily: 'monospace' }}>
                            {string.key}
                          </TableCell>
                          <TableCell sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 200 }}>
                            <Typography variant="body2" noWrap>
                              {string.originalText}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                            {string.filePath.split('/').pop()}:{string.lineNumber}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(string.status)}
                              label={string.status}
                              size="small"
                              sx={{
                                backgroundColor: `${getStatusColor(string.status)}20`,
                                color: getStatusColor(string.status),
                                border: `1px solid ${getStatusColor(string.status)}50`,
                                textTransform: 'capitalize',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: '#6366f1' }}>
                              {Object.keys(string.translations).length}/{repository.languages.length} languages
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              <Visibility sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Recent Activity Tab */}
              {activeTab === 1 && (
                <Box sx={{ p: 4 }}>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Recent translation activity and scan results will appear here.
                  </Alert>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    No recent activity to display.
                  </Typography>
                </Box>
              )}

              {/* Pull Requests Tab */}
              {activeTab === 2 && (
                <Box sx={{ p: 4 }}>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Automatically created pull requests with translation updates will appear here.
                  </Alert>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    No pull requests created yet.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Layout>
  );
};

export default Repository;