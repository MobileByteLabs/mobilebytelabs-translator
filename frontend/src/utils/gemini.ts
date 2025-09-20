// Utility functions for Gemini API key management
export const GEMINI_API_KEY = 'gemini_api_key';

/**
 * Get the stored Gemini API key from localStorage
 * @returns The API key string or empty string if not found
 */
export const getStoredGeminiApiKey = (): string => {
  try {
    return localStorage.getItem(GEMINI_API_KEY) || '';
  } catch (error) {
    console.error('Error accessing localStorage for Gemini API key:', error);
    return '';
  }
};

/**
 * Store the Gemini API key in localStorage
 * @param key The API key to store
 */
export const setStoredGeminiApiKey = (key: string): void => {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY, key);
    } else {
      localStorage.removeItem(GEMINI_API_KEY);
    }
  } catch (error) {
    console.error('Error storing Gemini API key in localStorage:', error);
  }
};

/**
 * Remove the stored Gemini API key from localStorage
 */
export const removeStoredGeminiApiKey = (): void => {
  try {
    localStorage.removeItem(GEMINI_API_KEY);
  } catch (error) {
    console.error('Error removing Gemini API key from localStorage:', error);
  }
};

/**
 * Check if a Gemini API key is stored
 * @returns True if an API key is stored, false otherwise
 */
export const hasStoredGeminiApiKey = (): boolean => {
  return getStoredGeminiApiKey().length > 0;
};