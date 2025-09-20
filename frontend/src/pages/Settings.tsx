import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Key,
  Visibility,
  VisibilityOff,
  ArrowBack,
} from '@mui/icons-material';

// Components
import Layout from '../components/layout/Layout';
import GradientButton from '../components/ui/GradientButton';
import { AuthService } from '../utils/auth';
import { getStoredGeminiApiKey, setStoredGeminiApiKey, hasStoredGeminiApiKey } from '../utils/gemini';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get user data from auth
  const user = AuthService.getUser();

  useEffect(() => {
    // Load existing API key from localStorage
    const storedKey = getStoredGeminiApiKey();
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleOpenGeminiSite = () => {
    // Open Gemini API key site in new tab
    window.open('https://aistudio.google.com/apikey', '_blank');
    // Show dialog in current tab
    setShowDialog(true);
  };

  const handleSaveApiKey = () => {
    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      setStoredGeminiApiKey(apiKey);
      setIsLoading(false);
      setShowDialog(false);
    }, 500);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    // Reset to stored value if user cancels
    setApiKey(getStoredGeminiApiKey());
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const hasApiKey = hasStoredGeminiApiKey();

  return (
    <Layout
      backgroundVariant="dashboard"
      user={user}
      onLogout={() => navigate('/')}
    >
      <Container maxWidth="lg">
        <Box sx={{ py: 6 }}>
          {/* Header */}
          <Box sx={{ mb: 6 }}>
            <GradientButton
              variant="outline"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{ mb: 3 }}
            >
              Back to Dashboard
            </GradientButton>

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
              Settings
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                mb: 4,
              }}
            >
              Configure your Gemini API integration
            </Typography>
          </Box>

          {/* Gemini API Token Section */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card sx={{ maxWidth: 500, width: '100%' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
                  <Key sx={{ fontSize: 32, color: '#6366f1' }} />
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                    Gemini API Token
                  </Typography>
                </Box>

                {hasApiKey ? (
                  <>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      API key is configured and ready to use
                    </Alert>

                    <Box sx={{ mb: 3 }}>
                      <TextField
                        fullWidth
                        label="Current API Key"
                        type={showApiKey ? 'text' : 'password'}
                        value={getStoredGeminiApiKey()}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={toggleApiKeyVisibility}
                                edge="end"
                                sx={{ color: 'rgba(255,255,255,0.7)' }}
                              >
                                {showApiKey ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            '& fieldset': {
                              borderColor: 'rgba(255,255,255,0.2)',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                          '& .MuiOutlinedInput-input': {
                            color: 'white',
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <GradientButton
                        variant="primary"
                        onClick={handleOpenGeminiSite}
                      >
                        Update API Key
                      </GradientButton>

                      <GradientButton
                        variant="outline"
                        onClick={() => {
                          setStoredGeminiApiKey('');
                          setApiKey('');
                        }}
                      >
                        Remove Key
                      </GradientButton>
                    </Box>
                  </>
                ) : (
                  <>
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      No Gemini API key configured. Add one to enable translations.
                    </Alert>

                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
                      You'll need a Gemini API key to use the translation features.
                      Click the button below to get your free API key.
                    </Typography>

                    <GradientButton
                      variant="primary"
                      size="large"
                      startIcon={<Key />}
                      onClick={handleOpenGeminiSite}
                    >
                      Get Gemini API Key
                    </GradientButton>
                  </>
                )}

                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mt: 3, display: 'block' }}>
                  Your API key is stored securely in your browser and never sent to our servers
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>

      {/* API Key Input Dialog */}
      <Dialog
        open={showDialog}
        onClose={handleCloseDialog}
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
        <DialogTitle sx={{ color: 'white', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Key sx={{ color: '#6366f1' }} />
            Enter Gemini API Key
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            We don't save your API key on our servers. It's stored only in your browser's local storage for security.
          </Alert>

          <TextField
            fullWidth
            label="Gemini API Key"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type={showApiKey ? 'text' : 'password'}
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleApiKeyVisibility}
                    edge="end"
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Get your free API key from Google AI Studio. No credit card required.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <GradientButton
            variant="outline"
            onClick={handleCloseDialog}
          >
            Cancel
          </GradientButton>
          <GradientButton
            variant="primary"
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim() || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </GradientButton>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Settings;