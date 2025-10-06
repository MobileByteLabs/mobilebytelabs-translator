import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Translate,
  Language,
  Settings,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Api,
  Cancel,
  Refresh,
  Schedule,
  Pause,
  PlayArrow,
} from '@mui/icons-material';
import GradientButton from '../ui/GradientButton';
import { AuthService } from '../../utils/auth';
import { getStoredGeminiApiKey } from '../../utils/gemini';

interface StringResource {
  key: string;
  value: string;
  translatable?: boolean;
}

interface ScanResultData {
  defaultStrings: StringResource[];
  existingTranslations: { [language: string]: StringResource[] };
  missingTranslations: { [language: string]: string[] };
  availableLanguages: string[];
  totalStrings: number;
  branches: string[];
}

interface TranslationInterfaceProps {
  scanData: ScanResultData | null;
  selectedLanguages: string[];
  repository: string;
  branch: string;
}

interface TranslationProgress {
  language: string;
  status: 'pending' | 'initializing' | 'processing' | 'completed' | 'error' | 'cancelled';
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  startTime?: number;
  estimatedTimeRemaining?: number;
  processingRate?: number; // strings per second
  error?: string;
  statusMessage?: string;
}

const TranslationInterface: React.FC<TranslationInterfaceProps> = ({
  scanData,
  selectedLanguages,
  repository,
  branch,
}) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [appContext, setAppContext] = useState('');
  const [batchSize, setBatchSize] = useState(50);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [translationResults, setTranslationResults] = useState<any[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Auto-fill Gemini API key from localStorage on component mount
  useEffect(() => {
    const storedApiKey = getStoredGeminiApiKey();
    if (storedApiKey) {
      setGeminiApiKey(storedApiKey);
    }
  }, []);

  // Update overall progress whenever individual progress changes
  useEffect(() => {
    if (translationProgress.length > 0) {
      const totalStrings = translationProgress.reduce((sum, p) => sum + p.total, 0);
      const processedStrings = translationProgress.reduce((sum, p) => sum + p.processed, 0);
      const newOverallProgress = totalStrings > 0 ? (processedStrings / totalStrings) * 100 : 0;
      setOverallProgress(newOverallProgress);
    }
  }, [translationProgress]);

  const getLanguageDisplayName = (code: string): string => {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'tr': 'Turkish',
      'vi': 'Vietnamese',
    };
    return languageNames[code] || code.toUpperCase();
  };

  const getTotalStringsToTranslate = (): number => {
    if (!scanData) return 0;
    return selectedLanguages.reduce((total, lang) => {
      const missing = scanData.missingTranslations[lang]?.length || 0;
      return total + missing;
    }, 0);
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const updateProgressWithTimeEstimation = (
    language: string,
    processed: number,
    currentBatch: number,
    statusMessage?: string
  ) => {
    setTranslationProgress(prev => prev.map(p => {
      if (p.language === language) {
        const now = Date.now();
        const elapsed = p.startTime ? (now - p.startTime) / 1000 : 0;
        const processingRate = elapsed > 0 ? processed / elapsed : 0;
        const remaining = p.total - processed;
        const estimatedTimeRemaining = processingRate > 0 ? remaining / processingRate : 0;

        return {
          ...p,
          processed,
          currentBatch,
          processingRate,
          estimatedTimeRemaining,
          statusMessage: statusMessage || `Processing batch ${currentBatch}/${p.totalBatches}...`,
        };
      }
      return p;
    }));
  };

  const handleStartTranslation = async () => {
    if (!geminiApiKey.trim()) {
      alert('Please enter your Gemini API key');
      return;
    }

    if (!appContext.trim()) {
      alert('Please provide context about your application');
      return;
    }

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    setIsTranslating(true);
    setShowResults(true);
    setShowCompletion(false);

    // Initialize progress tracking with enhanced data
    const initialProgress: TranslationProgress[] = selectedLanguages.map(lang => {
      const total = scanData?.missingTranslations[lang]?.length || 0;
      return {
        language: lang,
        status: 'pending' as const,
        processed: 0,
        total,
        currentBatch: 0,
        totalBatches: Math.ceil(total / batchSize),
        startTime: Date.now(),
        statusMessage: 'Waiting to start...',
      };
    });
    setTranslationProgress(initialProgress);

    try {
      // Process languages in parallel for better performance
      const translationPromises = selectedLanguages.map(async (language, index) => {
        const missingKeys = scanData?.missingTranslations[language] || [];
        
        if (missingKeys.length === 0) {
          setTranslationProgress(prev => prev.map(p =>
            p.language === language ? { 
              ...p, 
              status: 'completed', 
              statusMessage: 'No translations needed',
              processed: p.total 
            } : p
          ));
          return;
        }

        // Add small delay to stagger start times
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * 500));
        }

        // Update to initializing
        setTranslationProgress(prev => prev.map(p =>
          p.language === language ? { 
            ...p, 
            status: 'initializing',
            statusMessage: 'Initializing translation...',
            startTime: Date.now()
          } : p
        ));

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization

        // Update to processing
        setTranslationProgress(prev => prev.map(p =>
          p.language === language ? { ...p, status: 'processing' } : p
        ));

        try {
          await translateLanguage(language, missingKeys, controller.signal);

          // Update status to completed
          setTranslationProgress(prev => prev.map(p =>
            p.language === language ? { 
              ...p, 
              status: 'completed',
              processed: p.total,
              statusMessage: 'Translation completed successfully!',
            } : p
          ));
        } catch (error: any) {
          if (error.name === 'AbortError') {
            setTranslationProgress(prev => prev.map(p =>
              p.language === language ? {
                ...p,
                status: 'cancelled',
                statusMessage: 'Translation cancelled by user',
              } : p
            ));
          } else {
            let errorMessage = 'Translation failed';
            if (error && typeof error === 'object' && 'message' in error) {
              errorMessage = String(error.message);
            } else if (typeof error === 'string') {
              errorMessage = error;
            }

            setTranslationProgress(prev => prev.map(p =>
              p.language === language ? {
                ...p,
                status: 'error',
                error: errorMessage,
                statusMessage: `Failed: ${errorMessage}`,
              } : p
            ));
          }
        }
      });

      await Promise.allSettled(translationPromises);
    } catch (error: unknown) {
      console.error('Translation process failed:', error);
    } finally {
      setIsTranslating(false);
      setAbortController(null);
      
      // Check if all translations completed successfully
      setTimeout(() => {
        setShowCompletion(true);
      }, 500);
    }
  };

  const translateLanguage = async (
    language: string, 
    missingKeys: string[], 
    abortSignal: AbortSignal
  ) => {
    const defaultStrings = scanData?.defaultStrings || [];

    // Process in batches
    const batches = [];
    for (let i = 0; i < missingKeys.length; i += batchSize) {
      batches.push(missingKeys.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // Check for cancellation
      if (abortSignal.aborted) {
        throw new Error('Translation cancelled');
      }

      const batch = batches[batchIndex];
      const stringsToTranslate = batch.map(key => {
        const defaultString = defaultStrings.find(s => s.key === key);
        return {
          key,
          value: defaultString?.value || '',
        };
      }).filter(s => s.value);

      if (stringsToTranslate.length === 0) continue;

      // Update progress before processing batch
      updateProgressWithTimeEstimation(
        language,
        batchIndex * batchSize,
        batchIndex + 1,
        `Translating batch ${batchIndex + 1}/${batches.length}...`
      );

      try {
        const response = await AuthService.apiRequest('/translate/batch', {
          method: 'POST',
          signal: abortSignal,
          body: JSON.stringify({
            strings: stringsToTranslate,
            targetLanguage: language,
            sourceLanguage: 'en',
            appContext,
            geminiApiKey,
            repository,
            branch,
          }),
        });

        if (!response.ok) {
          const errorMessage = `Translation failed: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed for ${language}`);

        // Store translation result for downloads/PR
        if (batchIndex === 0) {
          setTranslationResults(prev => [
            ...prev.filter(r => r.language !== language),
            {
              language,
              stringCount: 0,
              xmlContent: '',
              translations: []
            }
          ]);
        }

        // Accumulate translation data
        setTranslationResults(prev => prev.map(r => {
          if (r.language === language) {
            return {
              ...r,
              stringCount: r.stringCount + result.data.stringCount,
              xmlContent: result.data.xmlContent,
              translations: [...r.translations, ...result.data.translations]
            };
          }
          return r;
        }));

        // Update progress after successful batch
        const processedCount = Math.min(missingKeys.length, (batchIndex + 1) * batchSize);
        updateProgressWithTimeEstimation(
          language,
          processedCount,
          batchIndex + 1,
          `Completed batch ${batchIndex + 1}/${batches.length}`
        );

        // Small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error(`❌ Batch ${batchIndex + 1} failed for ${language}:`, error);
        throw error;
      }
    }
  };

  const handleCancelTranslation = () => {
    if (abortController) {
      abortController.abort();
      setIsTranslating(false);
    }
  };

  const handleRetryLanguage = async (language: string) => {
    const missingKeys = scanData?.missingTranslations[language] || [];
    if (missingKeys.length === 0) return;

    // Reset progress for this language
    setTranslationProgress(prev => prev.map(p =>
      p.language === language ? {
        ...p,
        status: 'pending',
        processed: 0,
        currentBatch: 0,
        startTime: Date.now(),
        error: undefined,
        statusMessage: 'Retrying...',
      } : p
    ));

    try {
      const controller = new AbortController();
      await translateLanguage(language, missingKeys, controller.signal);
      
      setTranslationProgress(prev => prev.map(p =>
        p.language === language ? { 
          ...p, 
          status: 'completed',
          processed: p.total,
          statusMessage: 'Translation completed successfully!',
        } : p
      ));
    } catch (error: any) {
      let errorMessage = 'Retry failed';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      setTranslationProgress(prev => prev.map(p =>
        p.language === language ? {
          ...p,
          status: 'error',
          error: errorMessage,
          statusMessage: `Retry failed: ${errorMessage}`,
        } : p
      ));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: '#22c55e' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444' }} />;
      case 'processing':
        return <CircularProgress size={20} sx={{ color: '#6366f1' }} />;
      case 'initializing':
        return <CircularProgress size={20} sx={{ color: '#f59e0b' }} />;
      case 'cancelled':
        return <Cancel sx={{ color: '#9ca3af' }} />;
      default:
        return <Pending sx={{ color: 'rgba(255,255,255,0.3)' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'processing':
        return '#6366f1';
      case 'initializing':
        return '#f59e0b';
      case 'cancelled':
        return '#9ca3af';
      default:
        return 'rgba(255,255,255,0.3)';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'initializing':
        return 'Initializing';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleDownloadFiles = async () => {
    try {
      console.log('📥 Starting download...', translationResults);

      const response = await AuthService.apiRequest('/translate/download', {
        method: 'POST',
        body: JSON.stringify({
          translationResults
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${repository.replace('/', '-')}-translations.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Download completed');
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download files. Please try again.');
    }
  };

  const handleCreatePullRequest = async () => {
    try {
      console.log('🔄 Creating pull request...', translationResults);

      const [owner, repo] = repository.split('/');

      const response = await AuthService.apiRequest('/translate/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          translationResults,
          repository,
          branch,
          owner,
          repo
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create pull request');
      }

      const result = await response.json();

      console.log('✅ Pull request created:', result.data.pullRequest.url);

      // Open PR in new tab
      window.open(result.data.pullRequest.url, '_blank');

      alert(`Pull request created successfully!\nPR #${result.data.pullRequest.number}: ${result.data.pullRequest.title}`);
    } catch (error) {
      console.error('❌ Pull request creation failed:', error);
      alert('Failed to create pull request. Please check your repository permissions and try again.');
    }
  };

  if (!scanData) {
    return (
      <Alert severity="error">
        No scan data available. Please scan the repository first.
      </Alert>
    );
  }

  if (selectedLanguages.length === 0) {
    return (
      <Alert severity="warning">
        No languages selected for translation. Please go back and select languages.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          color: 'white',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Translate sx={{ fontSize: 24 }} />
        Translation Setup
      </Typography>

      {/* Overall Progress Bar (shown during translation) */}
      {showResults && isTranslating && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Overall Progress
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {Math.round(overallProgress)}% Complete
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
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
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <GradientButton
                variant="outline"
                onClick={handleCancelTranslation}
                startIcon={<Cancel />}
                size="small"
              >
                Cancel Translation
              </GradientButton>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Configuration Section */}
      {!showResults && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings sx={{ fontSize: 20 }} />
              Configuration
            </Typography>

            {/* Gemini API Key */}
            <TextField
              fullWidth
              label="Gemini API Key"
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Enter your Google Gemini API key"
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <Api sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }} />,
              }}
              helperText="Get your API key from Google AI Studio (https://makersuite.google.com/app/apikey)"
            />

            {/* App Context */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Application Context"
              value={appContext}
              onChange={(e) => setAppContext(e.target.value)}
              placeholder="Describe your application (e.g., 'This is a productivity app for task management. Users can create tasks, set reminders, and organize projects.')"
              sx={{ mb: 3 }}
              helperText="Provide context about your app to help Gemini generate more accurate translations"
            />

            {/* Batch Size */}
            <FormControl sx={{ mb: 3, minWidth: 200 }}>
              <InputLabel>Batch Size</InputLabel>
              <Select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                label="Batch Size"
              >
                <MenuItem value={20}>20 strings per batch</MenuItem>
                <MenuItem value={50}>50 strings per batch</MenuItem>
                <MenuItem value={100}>100 strings per batch</MenuItem>
                <MenuItem value={150}>150 strings per batch</MenuItem>
                <MenuItem value={200}>200 strings per batch</MenuItem>
              </Select>
            </FormControl>

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Translation Summary:</strong><br />
                • Repository: {repository} ({branch})<br />
                • Languages: {selectedLanguages.map(lang => getLanguageDisplayName(lang)).join(', ')}<br />
                • Missing strings to translate: {getTotalStringsToTranslate()}<br />
                • Estimated batches: {Math.ceil(getTotalStringsToTranslate() / batchSize)}<br />
                • Batch size: {batchSize} strings per batch<br />
                <em>Note: Only missing translations will be processed (strings not yet translated to the target language)</em>
              </Typography>
            </Alert>

            <GradientButton
              variant="primary"
              onClick={handleStartTranslation}
              disabled={!geminiApiKey.trim() || !appContext.trim() || isTranslating}
              startIcon={<Translate />}
              size="large"
            >
              Start Translation
            </GradientButton>
          </CardContent>
        </Card>
      )}

      {/* Completion Section */}
      {(showCompletion || (!isTranslating && translationResults.length > 0)) && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ fontSize: 24, color: '#22c55e' }} />
              🎉 Translation Complete!
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Successfully translated {translationResults.reduce((sum, result) => sum + result.stringCount, 0)} strings
                across {translationResults.length} language(s): {translationResults.map(r => getLanguageDisplayName(r.language)).join(', ')}
              </Typography>
            </Alert>

            {/* Translation Summary */}
            <List sx={{ mb: 3 }}>
              {translationResults.map((result) => (
                <ListItem key={result.language}>
                  <ListItemIcon>
                    <Language sx={{ color: '#6366f1' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={getLanguageDisplayName(result.language)}
                    secondary={`${result.stringCount} strings translated`}
                    primaryTypographyProps={{ sx: { color: 'white' } }}
                    secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                  />
                </ListItem>
              ))}
            </List>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <GradientButton
                variant="outline"
                onClick={handleDownloadFiles}
                startIcon={<Box sx={{ fontSize: 20 }}>📥</Box>}
                size="large"
              >
                Download Files
              </GradientButton>

              <GradientButton
                variant="primary"
                onClick={handleCreatePullRequest}
                startIcon={<Box sx={{ fontSize: 20 }}>🔄</Box>}
                size="large"
              >
                Create Pull Request
              </GradientButton>
            </Box>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', display: 'block', mt: 2 }}>
              Download files for manual integration or create a pull request for automated integration
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Progress Section */}
      {showResults && !showCompletion && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Language sx={{ fontSize: 20 }} />
              Translation Progress
            </Typography>

            <List>
              {translationProgress.map((progress, index) => (
                <React.Fragment key={progress.language}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      py: 2,
                    }}
                  >
                    {/* Header Row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getStatusIcon(progress.status)}
                      </ListItemIcon>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                            {getLanguageDisplayName(progress.language)}
                          </Typography>
                          <Chip
                            label={getStatusDisplayText(progress.status)}
                            size="small"
                            sx={{
                              backgroundColor: `${getStatusColor(progress.status)}20`,
                              color: getStatusColor(progress.status),
                              border: `1px solid ${getStatusColor(progress.status)}50`,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </Box>
                      
                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {progress.status === 'error' && (
                          <Tooltip title="Retry translation">
                            <IconButton
                              size="small"
                              onClick={() => handleRetryLanguage(progress.language)}
                              sx={{ color: '#6366f1' }}
                            >
                              <Refresh />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(progress.status === 'processing' || progress.status === 'initializing') && (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', minWidth: 80 }}>
                            {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Schedule sx={{ fontSize: 16 }} />
                                {formatTimeRemaining(progress.estimatedTimeRemaining)}
                              </Box>
                            ) : (
                              'Calculating...'
                            )}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Progress Details */}
                    <Box sx={{ width: '100%', pl: 5 }}>
                      {/* Status Message */}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.8)', 
                          mb: 1,
                          fontStyle: progress.status === 'error' ? 'normal' : 'italic'
                        }}
                      >
                        {progress.statusMessage || 'Waiting...'}
                      </Typography>

                      {/* Error Message */}
                      {progress.error && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#ef4444', 
                            mb: 1,
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: 1,
                            borderRadius: 1,
                          }}
                        >
                          Error: {progress.error}
                        </Typography>
                      )}

                      {/* Progress Stats */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {progress.processed} / {progress.total} strings processed
                          {progress.totalBatches > 1 && (
                            <span> • Batch {progress.currentBatch}/{progress.totalBatches}</span>
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}%
                        </Typography>
                      </Box>

                      {/* Progress Bar */}
                      <LinearProgress
                        variant="determinate"
                        value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatusColor(progress.status),
                            borderRadius: 3,
                          },
                        }}
                      />

                      {/* Processing Rate */}
                      {progress.processingRate && progress.processingRate > 0 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255,255,255,0.5)', 
                            display: 'block', 
                            mt: 0.5,
                            fontSize: '0.7rem'
                          }}
                        >
                          Processing rate: {progress.processingRate.toFixed(1)} strings/sec
                        </Typography>
                      )}
                    </Box>
                  </ListItem>
                  {index < translationProgress.length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>

            {!isTranslating && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <GradientButton
                  variant="outline"
                  onClick={() => setShowResults(false)}
                >
                  Configure Again
                </GradientButton>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TranslationInterface;
