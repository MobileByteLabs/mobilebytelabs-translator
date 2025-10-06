import React, { useState, useMemo } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Translate, Language, FilterList } from '@mui/icons-material';

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

type FilterType = 'all' | 'existing' | 'new';

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  supportedLanguages,
  selectedLanguages,
  existingLanguages,
  onLanguageToggle,
  loading = false,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const isLanguageSelected = (code: string) => selectedLanguages.includes(code);
  const isLanguageExisting = (code: string) => existingLanguages.includes(code);

  // Filter languages based on selected filter
  const filteredLanguages = useMemo(() => {
    switch (filter) {
      case 'existing':
        return supportedLanguages.filter(lang => isLanguageExisting(lang.code));
      case 'new':
        return supportedLanguages.filter(lang => !isLanguageExisting(lang.code));
      case 'all':
      default:
        return supportedLanguages;
    }
  }, [filter, supportedLanguages, existingLanguages]);

  // Count languages for each filter
  const existingCount = supportedLanguages.filter(lang => 
    isLanguageExisting(lang.code)
  ).length;
  const newCount = supportedLanguages.length - existingCount;

  const handleFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: FilterType | null,
  ) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };

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

      {/* Filter Toggle */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList sx={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }} />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Filter:
          </Typography>
        </Box>
        
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilterChange}
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255,255,255,0.6)',
              borderColor: 'rgba(255,255,255,0.2)',
              padding: '6px 16px',
              fontSize: '0.875rem',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(99, 102, 241, 0.3)',
                },
              },
            },
          }}
        >
          <ToggleButton value="all">
            Show All ({supportedLanguages.length})
          </ToggleButton>
          <ToggleButton value="existing">
            Show Existing ({existingCount})
          </ToggleButton>
          <ToggleButton value="new">
            Show New ({newCount})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Language Grid */}
      {filteredLanguages.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            px: 3,
            backgroundColor: 'rgba(26, 26, 46, 0.8)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            No languages found for the selected filter.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredLanguages.map((language) => {
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
      )}

      {/* Selection Summary */}
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