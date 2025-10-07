import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from '@mui/material';
import {
  Translate,
  Language,
  Settings,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Api,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Timer,
} from '@mui/icons-material';
import GradientButton from '../ui/GradientButton';
import { AuthService } from '../../utils/auth';
import { getStoredGeminiApiKey } from '../../utils/gemini';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

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
  error?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
  currentBatch?: number;
  totalBatches?: number;
}

interface TranslationResult {
  language: string;
  stringCount: number;
  xmlContent: string;
  translations: Array<{
    key: string;
    value: string;
  }>;
}

// ============================================================================
// Main Component
// ============================================================================

const TranslationInterface: React.FC<TranslationInterfaceProps> = ({
  scanData,
  selectedLanguages,
  repository,
  branch,
}) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [appContext, setAppContext] = useState('');
  const [batchSize, setBatchSize] = useState(50);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to store abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    const storedApiKey = getStoredGeminiApiKey();
    if (storedApiKey) {
      setGeminiApiKey(storedApiKey);
    }
  }, []);

  const overallProgress = useMemo(() => {
    if (translationProgress.length === 0) return 0;
    const totalStrings = translationProgress.reduce((sum, p) => sum + p.total, 0);
    const processedStrings = translationProgress.reduce((sum, p) => sum + p.processed, 0);
    return totalStrings === 0 ? 0 : Math.round((processedStrings / totalStrings) * 100);
  }, [translationProgress]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const totalStringsToTranslate = useMemo(() => {
    if (!scanData) return 0;
    return selectedLanguages.reduce((total, lang) => {
      const missing = scanData.missingTranslations[lang]?.length || 0;
      return total + missing;
    }, 0);
  }, [scanData, selectedLanguages]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

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

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const calculateETA = (progress: TranslationProgress): number | null => {
    if (!progress.startTime || progress.processed === 0) {
      return null;
    }
    const elapsedTime = (Date.now() - progress.startTime) / 1000;
    const rate = progress.processed / elapsedTime;
    const remaining = progress.total - progress.processed;
    if (rate === 0) return null;
    return remaining / rate;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ color: '#22c55e' }} />;
      case 'error': return <ErrorIcon sx={{ color: '#ef4444' }} />;
      case 'cancelled': return <CancelIcon sx={{ color: '#f59e0b' }} />;
      case 'processing': return <Pending sx={{ color: '#6366f1' }} />;
      case 'initializing': return <Timer sx={{ color: '#8b5cf6' }} />;
      default: return <Pending sx={{ color: 'rgba(255,255,255,0.3)' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'error': return '#ef4444';
      case 'cancelled': return '#f59e0b';
      case 'processing': return '#6366f1';
      case 'initializing': return '#8b5cf6';
      default: return 'rgba(255,255,255,0.3)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'initializing': return 'Initializing...';
      case 'processing': return 'Translating';
      case 'completed': return 'Completed';
      case 'error': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCancelTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setTranslationProgress(prev => prev.map(p => 
        p.status === 'processing' || p.status === 'initializing' || p.status === 'pending'
          ? { ...p, status: 'cancelled' as const }
          : p
      ));
      setIsTranslating(false);
    }
  };

  const handleRetryLanguage = async (language: string) => {
    const missingKeys = scanData?.missingTranslations[language] || [];

    // Optionally prevent concurrent operations:
    if (abortControllerRef.current) {
      setError('A translation operation is already in progress. Please wait or cancel it first.');
      return;
    }

    setTranslationProgress(prev => prev.map(p =>
      p.language === language ? {
        ...p,
        status: 'initializing' as const,
        processed: 0,
        error: undefined,
        startTime: Date.now(),
        currentBatch: 0,
      } : p
    ));

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      await translateLanguage(language, missingKeys, controller.signal);

      setTranslationProgress(prev => prev.map(p =>
        p.language === language ? { ...p, status: 'completed' as const, processed: p.total } : p
      ));
    } catch (error: unknown) {
      let errorMessage = 'Translation failed';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as Error).message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setTranslationProgress(prev => prev.map(p =>
        p.language === language ? {
          ...p,
          status: 'error' as const,
          error: errorMessage
        } : p
      ));
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStartTranslation = async () => {
    try {
      if (!geminiApiKey.trim()) {
        setError('Please enter your Gemini API key');
        return;
      }
      if (!appContext.trim()) {
        setError('Please provide context about your application');
        return;
      }

      setError(null);
      setIsTranslating(true);
      setShowResults(true);
      setShowCompletion(false);
      
      abortControllerRef.current = new AbortController();

      const initialProgress: TranslationProgress[] = selectedLanguages.map(lang => {
        const total = scanData?.missingTranslations[lang]?.length || 0;
        return {
          language: lang,
          status: 'pending' as const,
          processed: 0,
          total,
          totalBatches: Math.ceil(total / batchSize),
          currentBatch: 0,
        };
      });
      setTranslationProgress(initialProgress);

      for (let i = 0; i < selectedLanguages.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        const language = selectedLanguages[i];
        const missingKeys = scanData?.missingTranslations[language] || [];
        if (missingKeys.length === 0) continue;

        setTranslationProgress(prev => prev.map(p =>
          p.language === language ? {
            ...p,
            status: 'initializing',
            startTime: Date.now()
          } : p
        ));

        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        setTranslationProgress(prev => prev.map(p =>
          p.language === language ? { ...p, status: 'processing' } : p
        ));

        try {
          await translateLanguage(language, missingKeys, abortControllerRef.current?.signal);

          setTranslationProgress(prev => prev.map(p =>
            p.language === language ? { ...p, status: 'completed', processed: p.total } : p
          ));
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'AbortError') {
            setTranslationProgress(prev => prev.map(p =>
              p.language === language ? { ...p, status: 'cancelled' } : p
            ));
            break;
          }
          let errorMessage = 'Translation failed';
          if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String((error as Error).message);
          } else if (typeof error === 'string') {
            errorMessage = error;
          }

          setTranslationProgress(prev => prev.map(p =>
            p.language === language ? {
              ...p,
              status: 'error',
              error: errorMessage,
            } : p
          ));
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Translation process failed';
      setError(errMsg);
      console.error('Translation process failed:', error);
    } finally {
      setIsTranslating(false);
      if (!abortControllerRef.current?.signal.aborted) {
        setTimeout(() => setShowCompletion(true), 500);
      }
      abortControllerRef.current = null;
    }
  };

  const translateLanguage = async (
    language: string,
    missingKeys: string[],
    signal?: AbortSignal
  ) => {
    const defaultStrings = scanData?.defaultStrings || [];
    const batches = [];
    for (let i = 0; i < missingKeys.length; i += batchSize) {
      batches.push(missingKeys.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (signal?.aborted) {
        throw new DOMException('Translation cancelled', 'AbortError');
      }

      const batch = batches[batchIndex];
      const stringsToTranslate = batch.map(key => {
        const defaultString = defaultStrings.find(s => s.key === key);
        return { key, value: defaultString?.value || '' };
      }).filter(s => s.value);

      if (stringsToTranslate.length === 0) continue;

      try {
        const response = await AuthService.apiRequest('/translate/batch', {
          method: 'POST',
          body: JSON.stringify({
            strings: stringsToTranslate,
            targetLanguage: language,
            sourceLanguage: 'en',
            appContext,
            geminiApiKey,
            repository,
            branch,
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.statusText}`);
        }

        const result = await response.json();

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

        setTranslationProgress(prev => prev.map(p => {
          if (p.language === language) {
            const newProcessed = Math.min(p.total, (batchIndex + 1) * batchSize);
            const eta = p.startTime ? calculateETA({ ...p, processed: newProcessed }) : null;

            return {
              ...p,
              processed: newProcessed,
              currentBatch: batchIndex + 1,
              estimatedTimeRemaining: eta || undefined,
            };
          }
          return p;
        }));

        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: unknown) {
        console.error(`Batch ${batchIndex + 1} failed for ${language}:`, error);
        throw error;
      }
    }
  };

  const handleDownloadFiles = async () => {
    try {
      const response = await AuthService.apiRequest('/translate/download', {
        method: 'POST',
        body: JSON.stringify({ translationResults }),
      });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${repository.replace('/', '-')}-translations.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download files. Please try again.');
    }
  };

  const handleCreatePullRequest = async () => {
    try {
      const [owner, repo] = repository.split('/');
      const response = await AuthService.apiRequest('/translate/create-pr', {
        method: 'POST',
        body: JSON.stringify({ translationResults, repository, branch, owner, repo }),
      });
      if (!response.ok) throw new Error('Failed to create pull request');

      const result = await response.json();
      window.open(result.data.pullRequest.url, '_blank');
      alert(`Pull request created successfully!\nPR #${result.data.pullRequest.number}: ${result.data.pullRequest.title}`);
    } catch (error) {
      console.error('Pull request creation failed:', error);
      setError('Failed to create pull request. Please check your repository permissions and try again.');
    }
  };

  // ============================================================================
  // Render Guards
  // ============================================================================

  if (!scanData) {
    return <Alert severity="error">No scan data available. Please scan the repository first.</Alert>;
  }

  if (selectedLanguages.length === 0) {
    return <Alert severity="warning">No languages selected for translation. Please go back and select languages.</Alert>;
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Box>
      <Typography variant="h5" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Translate sx={{ fontSize: 24 }} />
        Translation Setup
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!showResults && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings sx={{ fontSize: 20 }} />
              Configuration
            </Typography>
            <TextField
              fullWidth
              label="Gemini API Key"
              type="password"
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              placeholder="Enter your Google Gemini API key"
              sx={{ mb: 3 }}
              InputProps={{ startAdornment: <Api sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }} /> }}
              helperText="Get your API key from Google AI Studio (https://makersuite.google.com/app/apikey)"
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Application Context"
              value={appContext}
              onChange={e => setAppContext(e.target.value)}
              placeholder="Describe your application (e.g., 'This is a productivity app for task management. Users can create tasks, set reminders, and organize projects.')"
              sx={{ mb: 3 }}
              helperText="Provide context about your app to help Gemini generate more accurate translations"
            />
            <FormControl sx={{ mb: 3, minWidth: 200 }}>
              <InputLabel>Batch Size</InputLabel>
              <Select
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
                label="Batch Size"
              >
                {[20, 50, 100, 150, 200].map(num => (
                  <MenuItem key={num} value={num}>{num} strings per batch</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Translation Summary:</strong><br />
                • Repository: {repository} ({branch})<br />
                • Languages: {selectedLanguages.map(lang => getLanguageDisplayName(lang)).join(', ')}<br />
                • Missing strings to translate: {totalStringsToTranslate}<br />
                • Estimated batches: {Math.ceil(totalStringsToTranslate / batchSize)}<br />
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
            <List sx={{ mb: 3 }}>
              {translationResults.map(result => (
                <ListItem key={result.language}>
                  <ListItemIcon><Language sx={{ color: '#6366f1' }} /></ListItemIcon>
                  <ListItemText
                    primary={getLanguageDisplayName(result.language)}
                    secondary={`${result.stringCount} strings translated`}
                    primaryTypographyProps={{ sx: { color: 'white' } }}
                    secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <GradientButton variant="outline" onClick={handleDownloadFiles} startIcon={<Box sx={{ fontSize: 20 }}>📥</Box>} size="large">
                Download Files
              </GradientButton>
              <GradientButton variant="primary" onClick={handleCreatePullRequest} startIcon={<Box sx={{ fontSize: 20 }}>🔄</Box>} size="large">
                Create Pull Request
              </GradientButton>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', display: 'block', mt: 2 }}>
              Download files for manual integration or create a pull request for automated integration
            </Typography>
          </CardContent>
        </Card>
      )}

      {showResults && !showCompletion && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Language sx={{ fontSize: 20 }} />
                Translation Progress
              </Typography>
              {isTranslating && (
                <Tooltip title="Cancel translation">
                  <IconButton onClick={handleCancelTranslation} aria-label="Cancel translation" sx={{ color: '#ef4444' }}>
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Box sx={{ mb: 3 }} role="status" aria-live="polite">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>Overall Progress</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>{overallProgress}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={overallProgress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#6366f1', borderRadius: 4 },
                }}
              />
            </Box>
            <List>
              {translationProgress.map((progress, index) => (
                <React.Fragment key={progress.language}>
                  <ListItem>
                    <ListItemIcon>{getStatusIcon(progress.status)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: 'white' }}>{getLanguageDisplayName(progress.language)}</Typography>
                          <Chip label={getStatusLabel(progress.status)} size="small" sx={{
                            backgroundColor: `${getStatusColor(progress.status)}20`,
                            color: getStatusColor(progress.status),
                            border: `1px solid ${getStatusColor(progress.status)}50`,
                          }} />
                          {progress.status === 'processing' && progress.currentBatch && progress.totalBatches && (
                            <Chip label={`Batch ${progress.currentBatch}/${progress.totalBatches}`} size="small" sx={{
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontSize: '0.7rem',
                            }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {progress.processed} / {progress.total} strings processed
                            </span>
                            {progress.estimatedTimeRemaining && progress.status === 'processing' && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Timer sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                                  ETA: {formatTimeRemaining(progress.estimatedTimeRemaining)}
                                </span>
                              </Box>
                            )}
                          </Box>
                          {progress.error && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                              <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>Error: {progress.error}</span>
                              <Tooltip title="Retry translation">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRetryLanguage(progress.language)}
                                  aria-label={`Retry translation for ${getLanguageDisplayName(progress.language)}`}
                                  sx={{ color: '#6366f1', ml: 1 }}
                                >
                                  <RefreshIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                          <LinearProgress
                            variant="determinate"
                            value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}
                            sx={{
                              mt: 1,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getStatusColor(progress.status),
                              },
                            }}
                          />
                        </>
                      }
                    />
                  </ListItem>
                  {index < translationProgress.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            {!isTranslating && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <GradientButton variant="outline" onClick={() => {
                  setShowResults(false);
                  setTranslationProgress([]);
                  setTranslationResults([]);
                }}>
                  Configure Again
                </GradientButton>
                {translationProgress.some(p => p.status === 'error' || p.status === 'cancelled') && (
                  <GradientButton
                    variant="primary"
                    onClick={async () => {
                      const failedLanguages = translationProgress
                        .filter(p => p.status === 'error' || p.status === 'cancelled')
                        .map(p => p.language);
                      // Sequential retry to respect API rate limits and concurrency safety
                      for (const lang of failedLanguages) {
                        await handleRetryLanguage(lang);
                      }
                    }}
                    startIcon={<RefreshIcon />}
                  >
                    Retry Failed Translations
                  </GradientButton>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TranslationInterface;