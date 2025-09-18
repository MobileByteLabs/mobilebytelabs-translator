import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Paper,
} from '@mui/material';
import {
  GitHub,
  AutoAwesome,
  Speed,
  Security,
  Code,
} from '@mui/icons-material';

// Components
import Layout from '../components/layout/Layout';
import GradientButton from '../components/ui/GradientButton';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <AutoAwesome sx={{ fontSize: 40 }} />,
      title: 'AI-Powered Context',
      description: 'Intelligent translation using Google Gemini that understands your app context and business domain.',
    },
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: 'Automated Workflow',
      description: 'Scans repositories, detects changes, and creates pull requests automatically.',
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure Integration',
      description: 'Enterprise-grade security with encrypted token storage and minimal permissions.',
    },
    {
      icon: <Code sx={{ fontSize: 40 }} />,
      title: 'Multi-Language Support',
      description: 'Supports React, Kotlin, Java, Python, and more programming languages.',
    },
  ];

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleViewDemo = () => {
    // For now, navigate to dashboard (later we can add a demo mode)
    navigate('/dashboard');
  };

  return (
    <Layout backgroundVariant="default" showFooter={true}>
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Chip
            label="🚀 AI-Powered Translation with Gemini"
            sx={{
              mb: 3,
              px: 2,
              py: 1,
              fontSize: '0.9rem',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#6366f1',
            }}
          />
          
          <Typography 
            variant="h1" 
            component="h1" 
            sx={{ 
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Intelligent Translation
            <br />
            for Global Communication
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              mb: 6,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Automatically translate your applications with AI that understands
            context, maintains consistency, and integrates seamlessly with your workflow.
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <GradientButton
              variant="primary"
              size="large"
              startIcon={<GitHub />}
              onClick={handleGetStarted}
            >
              Connect with GitHub
            </GradientButton>
            
            <GradientButton
              variant="outline"
              size="large"
              onClick={handleViewDemo}
            >
              View My Projects
            </GradientButton>
          </Box>
        </Box>

        {/* Features Grid */}
        <Box sx={{ py: 8 }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              textAlign: 'center',
              mb: 6,
              color: 'white',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 600,
            }}
          >
            Why Choose MobileByteLabs Translator?
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 4,
            }}
          >
            {features.map((feature, index) => (
              <Box key={index}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)',
                      background: 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ color: '#6366f1', mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600, color: 'white' }}>
                      {feature.title}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Stats Section */}
        <Paper
          sx={{
            p: 6,
            my: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
              gap: 4,
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography variant="h3" sx={{ color: '#6366f1', fontWeight: 700 }}>
                95%
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Translation Accuracy
              </Typography>
            </Box>
            <Box>
              <Typography variant="h3" sx={{ color: '#ec4899', fontWeight: 700 }}>
                10x
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Faster Than Manual
              </Typography>
            </Box>
            <Box>
              <Typography variant="h3" sx={{ color: '#6366f1', fontWeight: 700 }}>
                50+
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Languages Supported
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* CTA Section */}
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h3" sx={{ mb: 4, color: 'white', fontSize: { xs: '2rem', md: '2.5rem' } }}>
            Ready to Get Started?
          </Typography>
          <Typography
            variant="h6"
            sx={{ mb: 4, color: 'rgba(255,255,255,0.7)', maxWidth: 500, mx: 'auto' }}
          >
            Connect your GitHub repository and start translating your application
            with the power of Google Gemini AI in minutes.
          </Typography>
          
          <GradientButton
            variant="secondary"
            size="large"
            startIcon={<GitHub />}
            onClick={handleGetStarted}
            sx={{ px: 6, py: 2, fontSize: '1.2rem' }}
          >
            Start Translating Now
          </GradientButton>
        </Box>
      </Container>
    </Layout>
  );
};

export default Home;