import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  GitHub,
  Search,
  Translate,
  OpenInNew,
} from '@mui/icons-material';

import GradientButton from '../components/ui/GradientButton';
import BranchSelector from '../components/scan/BranchSelector';
import LanguageSelector from '../components/scan/LanguageSelector';
import ScanResults from '../components/scan/ScanResults';
import TranslationInterface from '../components/scan/TranslationInterface';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EnhancedScanProgress from '../components/scan/EnhancedScanProgress';
import { AuthService } from '../utils/auth';

interface SupportedLanguage {
  code: string;
  name: string;
  native: string;
}

interface ScanResultData {
  defaultStrings: any[];
  existingTranslations: { [language: string]: any[] };
  missingTranslations: { [language: string]: string[] };
  availableLanguages: string[];
  totalStrings: number;
  branches: string[];
}

const RepositoryScan: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Branch selection
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Language selection
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Scan results
  const [scanData, setScanData] = useState<ScanResultData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [useEnhancedScan, setUseEnhancedScan] = useState(true);
  const [repositorySize, setRepositorySize] = useState<number | null>(null);

  const steps = ['Select Branch', 'Review Scan Results', 'Choose Languages', 'Translate'];

  // Load branches and supported languages on mount
  useEffect(() => {
    if (owner && repo && AuthService.isAuthenticated()) {
      loadBranches();
      loadSupportedLanguages();
    }
  }, [owner, repo]);

  // Retry loading data if authentication state changes and we don't have data yet
  useEffect(() => {
    const timer = setTimeout(() => {
      if (owner && repo && AuthService.isAuthenticated() && branches.length === 0 && supportedLanguages.length === 0) {
        loadBranches();
        loadSupportedLanguages();
      }
    }, 2000); // Wait 2 seconds after mount

    return () => clearTimeout(timer);
  }, [owner, repo]);

  const loadBranches = async () => {
    if (!owner || !repo || !AuthService.isAuthenticated()) return;

    setBranchesLoading(true);
    setError(null);

    try {
      const response = await AuthService.apiRequest(`/scan/branches/${owner}/${repo}`);

      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }

      const data = await response.json();
      setBranches(data.branches || []);
      setSelectedBranch(data.default || data.branches[0] || '');
    } catch (error) {
      console.error('Error loading branches:', error);
      setError(error instanceof Error ? error.message : 'Failed to load branches');
    } finally {
      setBranchesLoading(false);
    }
  };

  const loadSupportedLanguages = async () => {
    if (!AuthService.isAuthenticated()) return;

    try {
      const response = await AuthService.apiRequest('/scan/languages');

      if (!response.ok) {
        throw new Error('Failed to fetch supported languages');
      }

      const data = await response.json();
      console.log('🌍 Loaded supported languages:', data.languages?.length, data.languages);
      setSupportedLanguages(data.languages || []);
    } catch (error) {
      console.error('Error loading supported languages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load supported languages');
    }
  };

  const handleScanRepository = async () => {
    if (!owner || !repo || !selectedBranch) return;

    setScanning(true);
    setError(null);

    try {
      const response = await AuthService.apiRequest('/scan/repository', {
        method: 'POST',
        body: JSON.stringify({
          owner,
          repo,
          branch: selectedBranch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan repository');
      }

      const result = await response.json();
      console.log('🔍 Scan result received:', result);
      console.log('🔍 Scan data structure:', result.data?.scan);
      console.log('🔍 Available languages:', result.data?.scan?.availableLanguages);
      console.log('🔍 Available languages type:', typeof result.data?.scan?.availableLanguages);
      console.log('🔍 Each language:', result.data?.scan?.availableLanguages?.map((lang: any, i: number) => ({ index: i, lang, type: typeof lang })));
      setScanData(result.data.scan);
      // Stay on step 1 to show results + language selection
      // User will manually proceed to step 2
    } catch (error) {
      console.error('Error scanning repository:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan repository');
    } finally {
      setScanning(false);
    }
  };

  const handleLanguageToggle = (languageCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(languageCode)
        ? prev.filter(code => code !== languageCode)
        : [...prev, languageCode]
    );
  };

  const handleEnhancedScanComplete = (result: any) => {
    console.log('🔍 Enhanced scan completed:', result);
    setScanData(result);
    setScanning(false);
  };

  // Update repository size based on progress updates
  const handleEnhancedScanProgress = (update: any) => {
    if (update.progress && update.progress.totalItems && !repositorySize) {
      setRepositorySize(update.progress.totalItems);
    }
  };

  const handleEnhancedScanError = (errorMessage: string) => {
    console.error('❌ Enhanced scan error:', errorMessage);
    setError(errorMessage);
    setScanning(false);
  };

  const getRepositorySizeWarning = () => {
    if (!repositorySize) return null;

    if (repositorySize > 20000) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Very Large Repository Detected ({repositorySize.toLocaleString()} files)
          </Typography>
          <Typography variant="body2">
            This repository is very large and may take several minutes to scan. The process may use significant memory and could be slower than usual.
          </Typography>
        </Alert>
      );
    } else if (repositorySize > 10000) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Large Repository Detected ({repositorySize.toLocaleString()} files)
          </Typography>
          <Typography variant="body2">
            This repository is large and may take some time to scan. Please be patient during the scanning process.
          </Typography>
        </Alert>
      );
    } else if (repositorySize > 5000) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Medium-sized repository ({repositorySize.toLocaleString()} files) - scanning may take a moment.
          </Typography>
        </Alert>
      );
    }

    return null;
  };

  const handleNext = () => {
    if (activeStep === 0 && selectedBranch) {
      // Step 0 → 1: Start scanning when moving from branch selection
      // Reset repository size for new scan
      setRepositorySize(null);
      if (useEnhancedScan) {
        setScanning(true);
        setActiveStep(1);
      } else {
        handleScanRepository();
        setActiveStep(1);
      }
    } else if (activeStep === 1 && scanData) {
      // Step 1 → 2: Move from scan results to language selection
      setActiveStep(2);
    } else if (activeStep === 2) {
      // Step 2 → 3: Move from language selection to translation
      setActiveStep(3);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return selectedBranch && !branchesLoading;
      case 1:
        return !scanning && scanData; // Can proceed once scan completes
      case 2:
        return selectedLanguages.length > 0; // Can proceed once languages selected
      case 3:
        return false; // Final step - no next
      default:
        return false;
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <BranchSelector
            branches={branches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            loading={branchesLoading}
          />
        );
      case 1:
        // Step 2: Review Scan Results
        return (
          <Box>
            {getRepositorySizeWarning()}
            {scanning && useEnhancedScan ? (
              <EnhancedScanProgress
                owner={owner!}
                repo={repo!}
                branch={selectedBranch}
                onComplete={handleEnhancedScanComplete}
                onError={handleEnhancedScanError}
                onProgress={handleEnhancedScanProgress}
              />
            ) : scanning ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LoadingSpinner />
                <Typography variant="h6" sx={{ color: 'white', mt: 2 }}>
                  Scanning Repository...
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                  Analyzing {owner}/{repo} on branch {selectedBranch}
                </Typography>
                <LinearProgress
                  sx={{
                    mt: 3,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#6366f1',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            ) : scanData ? (
              <ScanResults
                scanData={scanData}
                repository={`${owner}/${repo}`}
                branch={selectedBranch}
              />
            ) : null}
          </Box>
        );
      case 2:
        // Step 3: Choose Languages
        return (
          <LanguageSelector
            supportedLanguages={supportedLanguages}
            selectedLanguages={selectedLanguages}
            existingLanguages={scanData?.availableLanguages || []}
            onLanguageToggle={handleLanguageToggle}
            loading={loading}
          />
        );
      case 3:
        // Step 4: Translate
        return (
          <TranslationInterface
            scanData={scanData}
            selectedLanguages={selectedLanguages}
            repository={`${owner}/${repo}`}
            branch={selectedBranch}
          />
        );
      default:
        return null;
    }
  };

  if (!owner || !repo) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">
          Invalid repository parameters
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
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

            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <GitHub sx={{ fontSize: 40, color: '#6366f1' }} />
              {owner}/{repo}
              <Tooltip title="Open on GitHub" arrow>
                <IconButton
                  size="medium"
                  onClick={() => window.open(`https://github.com/${owner}/${repo}`, '_blank', 'noopener,noreferrer')}
                  sx={{
                    ml: 1,
                    color: 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#6366f1',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <OpenInNew sx={{ fontSize: 24 }} />
                </IconButton>
              </Tooltip>
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                mb: 3,
              }}
            >
              Scan and translate your repository strings
            </Typography>

            {/* Progress Stepper */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {steps.map((label, index) => (
                    <Step key={label}>
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': {
                            color: 'rgba(255,255,255,0.7)',
                            '&.Mui-active': {
                              color: '#6366f1',
                            },
                            '&.Mui-completed': {
                              color: '#22c55e',
                            },
                          },
                          '& .MuiStepIcon-root': {
                            color: 'rgba(255,255,255,0.3)',
                            '&.Mui-active': {
                              color: '#6366f1',
                            },
                            '&.Mui-completed': {
                              color: '#22c55e',
                            },
                          },
                        }}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step Content */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              {getStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <GradientButton
              variant="outline"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </GradientButton>

            <GradientButton
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed() || loading}
              startIcon={activeStep === 3 ? <Translate /> : <Search />}
            >
              {activeStep === 0
                ? 'Scan Repository'
                : activeStep === 1
                ? 'Review Results'
                : activeStep === 2
                ? 'Choose Languages'
                : 'Start Translation'}
            </GradientButton>
          </Box>
        </Box>
      </Container>
  );
};

export default RepositoryScan;