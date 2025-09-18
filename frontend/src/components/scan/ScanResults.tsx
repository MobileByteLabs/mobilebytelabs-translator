import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  ExpandMore,
  Translate,
  Language,
  Code,
  Assessment,
} from '@mui/icons-material';

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

interface ScanResultsProps {
  scanData: ScanResultData;
  repository: string;
  branch: string;
}

const ScanResults: React.FC<ScanResultsProps> = ({
  scanData,
  repository,
  branch,
}) => {
  const [expandedLanguage, setExpandedLanguage] = React.useState<string | null>(null);
  // Utility function to safely render any value as a string
  const safeRender = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(v => safeRender(v)).join(', ');
    if (typeof value === 'object') {
      // Handle xml2js $ objects specifically
      if (value.$ && typeof value.$ === 'object') {
        if (value.$.name) return String(value.$.name);
        if (value._) return String(value._);
        return '[XML Object]';
      }
      // Handle other objects
      if (Object.keys(value).length === 0) return '[Empty Object]';
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  };

  // Add safety checks and defaults
  const {
    defaultStrings = [],
    existingTranslations = {},
    missingTranslations = {},
    availableLanguages = [],
    totalStrings = 0,
  } = scanData || {};

  // Ensure availableLanguages is always an array of strings with English first
  const safeLanguages = Array.isArray(availableLanguages)
    ? availableLanguages.filter(lang => lang != null).map(lang => safeRender(lang))
        .sort((a, b) => {
          // Put English (en) first, then alphabetical
          if (a === 'en') return -1;
          if (b === 'en') return 1;
          return a.localeCompare(b);
        })
    : [];

  const getTranslationProgress = (language: string): number => {
    const existing = existingTranslations[language]?.length || 0;
    return totalStrings > 0 ? Math.round((existing / totalStrings) * 100) : 0;
  };

  const getTotalMissingStrings = (): number => {
    return Object.values(missingTranslations).reduce((sum, missing) => sum + missing.length, 0);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        sx={{
          color: 'white',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Assessment sx={{ fontSize: 20 }} />
        Scan Results for {repository} ({branch})
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 700 }}>
              {totalStrings}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Total Strings
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
              {safeLanguages.length}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Existing Languages
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>
              {getTotalMissingStrings()}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Missing Translations
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#ec4899', fontWeight: 700 }}>
              {safeLanguages.length > 0
                ? Math.round(
                    safeLanguages.reduce((sum, lang) => sum + getTranslationProgress(lang), 0) /
                      safeLanguages.length
                  )
                : 0}%
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Avg. Completion
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Existing Languages */}
      {safeLanguages.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Language sx={{ fontSize: 20 }} />
              Existing Languages
            </Typography>

            <Grid container spacing={2}>
              {safeLanguages.map((language) => {
                const progress = getTranslationProgress(language);
                const missing = missingTranslations[language]?.length || 0;
                const existing = existingTranslations[language]?.length || 0;

                return (
                  <Grid item xs={12} sm={6} md={4} key={language}>
                    <Card
                      sx={{
                        backgroundColor: 'rgba(26, 26, 46, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(26, 26, 46, 0.7)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => setExpandedLanguage(expandedLanguage === language ? null : language)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: 'white' }}>
                            {safeRender(language)}
                          </Typography>
                          <Chip
                            label={`${progress}%`}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              backgroundColor: progress === 100 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                              color: progress === 100 ? '#22c55e' : '#fbbf24',
                              border: progress === 100 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                            }}
                          />
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            mb: 1,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: progress === 100 ? '#22c55e' : '#fbbf24',
                              borderRadius: 3,
                            },
                          }}
                        />

                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {existing} translated • {missing} missing
                        </Typography>

                        {/* Expanded strings preview */}
                        {expandedLanguage === language && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 2,
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              borderRadius: 1,
                              maxHeight: 200,
                              overflowY: 'auto',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, display: 'block' }}>
                              Sample strings:
                            </Typography>
                            {existingTranslations[language]?.slice(0, 10).map((stringResource, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#6366f1', display: 'block' }}>
                                  {safeRender(stringResource.key)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', pl: 1 }}>
                                  {safeRender(stringResource.value)?.substring(0, 100)}{safeRender(stringResource.value)?.length > 100 ? '...' : ''}
                                </Typography>
                              </Box>
                            )) || (
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                No strings available
                              </Typography>
                            )}
                            {existingTranslations[language]?.length > 10 && (
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', mt: 1, display: 'block' }}>
                                ... and {existingTranslations[language].length - 10} more strings
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Missing Translations Details */}
      {Object.keys(missingTranslations).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Warning sx={{ fontSize: 20 }} />
              Missing Translations
            </Typography>

            {Object.entries(missingTranslations || {}).map(([language, missingKeys]) => (
              <Accordion
                key={language}
                sx={{
                  backgroundColor: 'rgba(26, 26, 46, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  mb: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ color: 'white' }}>
                      {typeof language === 'string' ? language : String(language)}
                    </Typography>
                    <Chip
                      label={`${Array.isArray(missingKeys) ? missingKeys.length : 0} missing`}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 20,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {(Array.isArray(missingKeys) ? missingKeys : []).slice(0, 10).map((key) => (
                      <ListItem key={typeof key === 'string' ? key : String(key)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Code sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={typeof key === 'string' ? key : String(key)}
                          secondary={defaultStrings.find(s => s.key === key)?.value || ''}
                          primaryTypographyProps={{
                            sx: { color: 'white', fontSize: '0.875rem' },
                          }}
                          secondaryTypographyProps={{
                            sx: { color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' },
                          }}
                        />
                      </ListItem>
                    ))}
                    {missingKeys.length > 10 && (
                      <ListItem>
                        <ListItemText
                          primary={`... and ${missingKeys.length - 10} more`}
                          primaryTypographyProps={{
                            sx: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
                          }}
                        />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {availableLanguages.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            No existing translations found. You can add new languages using the language selector above.
          </Typography>
        </Alert>
      )}

      {getTotalMissingStrings() === 0 && availableLanguages.length > 0 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <CheckCircle sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
            All existing languages are fully translated! You can add new languages if needed.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ScanResults;