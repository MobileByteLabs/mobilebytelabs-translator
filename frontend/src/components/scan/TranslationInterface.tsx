import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Translate,
  Language,
  Settings,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Api,
} from '@mui/icons-material';
import GradientButton from '../ui/GradientButton';
import { AuthService } from '../../utils/auth';

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
  status: 'pending' | 'processing' | 'completed' | 'error';
  processed: number;
  total: number;
  error?: string;
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

  const handleStartTranslation = async () => {
    if (!geminiApiKey.trim()) {
      alert('Please enter your Gemini API key');
      return;
    }

    if (!appContext.trim()) {
      alert('Please provide context about your application');
      return;
    }

    setIsTranslating(true);
    setShowResults(true);

    // Initialize progress tracking
    const initialProgress: TranslationProgress[] = selectedLanguages.map(lang => ({
      language: lang,
      status: 'pending' as const,
      processed: 0,
      total: scanData?.missingTranslations[lang]?.length || 0,
    }));
    setTranslationProgress(initialProgress);

    try {
      // Process each language
      for (let i = 0; i < selectedLanguages.length; i++) {
        const language = selectedLanguages[i];
        const missingKeys = scanData?.missingTranslations[language] || [];

        if (missingKeys.length === 0) continue;

        // Update status to processing
        setTranslationProgress(prev => prev.map(p =>
          p.language === language ? { ...p, status: 'processing' as const } : p
        ));

        try {
          await translateLanguage(language, missingKeys);

          // Update status to completed
          setTranslationProgress(prev => prev.map(p =>
            p.language === language ? { ...p, status: 'completed' as const, processed: p.total } : p
          ));
        } catch (error: unknown) {
          // Update status to error
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
        }
      }
    } catch (error: unknown) {
      console.error('Translation process failed:', error);
    } finally {
      setIsTranslating(false);
      // Set completion after all languages are processed
      setTimeout(() => {
        setShowCompletion(true);
      }, 500);
    }
  };

  const translateLanguage = async (language: string, missingKeys: string[]) => {
    const defaultStrings = scanData?.defaultStrings || [];

    // Process in batches
    const batches = [];
    for (let i = 0; i < missingKeys.length; i += batchSize) {
      batches.push(missingKeys.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const stringsToTranslate = batch.map(key => {
        const defaultString = defaultStrings.find(s => s.key === key);
        return {
          key,
          value: defaultString?.value || '',
        };
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
        });

        if (!response.ok) {
          const errorMessage = `Translation failed: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed for ${language}`);

        // Store translation result for downloads/PR
        if (batchIndex === 0) {
          // Initialize result for this language
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

        // Update progress
        setTranslationProgress(prev => prev.map(p =>
          p.language === language ? {
            ...p,
            processed: Math.min(p.total, (batchIndex + 1) * batchSize)
          } : p
        ));

        // Small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: unknown) {
        console.error(`❌ Batch ${batchIndex + 1} failed for ${language}:`, error);
        throw error;
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: '#22c55e' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444' }} />;
      case 'processing':
        return <Pending sx={{ color: '#6366f1' }} />;
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
      default:
        return 'rgba(255,255,255,0.3)';
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

      {/* Progress Section */}
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
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(progress.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: 'white' }}>
                            {getLanguageDisplayName(progress.language)}
                          </Typography>
                          <Chip
                            label={progress.status}
                            size="small"
                            sx={{
                              backgroundColor: `${getStatusColor(progress.status)}20`,
                              color: getStatusColor(progress.status),
                              border: `1px solid ${getStatusColor(progress.status)}50`,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <span style={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                            {progress.processed} / {progress.total} strings processed
                          </span>
                          {progress.error && (
                            <span style={{ color: '#ef4444', display: 'block', fontSize: '0.75rem' }}>
                              Error: {progress.error}
                            </span>
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
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < translationProgress.length - 1 && <Divider />}
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