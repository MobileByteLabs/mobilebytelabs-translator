import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Translate, Language } from '@mui/icons-material';

interface SupportedLanguage {
  code: string;
  name: string;
  native: string;
}

interface LanguageSelectorProps {
  supportedLanguages: SupportedLanguage[];
  selectedLanguages: string[];
  existingLanguages: string[];
  onLanguageToggle: (languageCode: string) => void;
  loading?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  supportedLanguages,
  selectedLanguages,
  existingLanguages,
  onLanguageToggle,
  loading = false,
}) => {
  const isLanguageSelected = (code: string) => selectedLanguages.includes(code);
  const isLanguageExisting = (code: string) => existingLanguages.includes(code);

  return (
    <Box sx={{ mb: 4 }}>
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
        Select Languages to Add
      </Typography>

      {existingLanguages.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Existing languages: {existingLanguages.join(', ')}.
            You can add missing strings to existing languages or add new ones.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={2}>
        {supportedLanguages.map((language) => {
          const isSelected = isLanguageSelected(language.code);
          const isExisting = isLanguageExisting(language.code);

          return (
            <Grid item xs={12} sm={6} md={4} key={language.code}>
              <Card
                sx={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  backgroundColor: isSelected
                    ? 'rgba(99, 102, 241, 0.1)'
                    : isExisting
                    ? 'rgba(34, 197, 94, 0.05)'
                    : 'rgba(26, 26, 46, 0.8)',
                  border: isSelected
                    ? '2px solid rgba(99, 102, 241, 0.5)'
                    : isExisting
                    ? '2px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: isSelected
                      ? 'rgba(99, 102, 241, 0.15)'
                      : isExisting
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected
                      ? '2px solid rgba(99, 102, 241, 0.7)'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                  },
                }}
                onClick={() => !loading && onLanguageToggle(language.code)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          disabled={loading}
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            '&.Mui-checked': {
                              color: '#6366f1',
                            },
                            p: 0,
                          }}
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: 'white',
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                      >
                        {language.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {language.native}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={language.code}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 20,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255,255,255,0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    />

                    {isExisting && (
                      <Chip
                        label="Existing"
                        size="small"
                        sx={{
                          fontSize: '0.6rem',
                          height: 18,
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      />
                    )}

                    {isSelected && !isExisting && (
                      <Chip
                        label="Selected"
                        size="small"
                        sx={{
                          fontSize: '0.6rem',
                          height: 18,
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          <Translate sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
          {selectedLanguages.length} language(s) selected for translation
        </Typography>

        {selectedLanguages.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedLanguages.slice(0, 3).map((code) => {
              const lang = supportedLanguages.find(l => l.code === code);
              return (
                <Chip
                  key={code}
                  label={lang?.name || code}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    height: 20,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                />
              );
            })}
            {selectedLanguages.length > 3 && (
              <Chip
                label={`+${selectedLanguages.length - 3}`}
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
        )}
      </Box>
    </Box>
  );
};

export default LanguageSelector;