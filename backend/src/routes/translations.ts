// backend/src/routes/translations.ts
import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get translations for a repository
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { repositoryId, language } = req.query;
    
    // Mock translation data
    const translations = [
      {
        id: '1',
        key: 'welcome_message',
        originalText: 'Welcome to MobileByteLabs Translator',
        filePath: 'app/src/main/res/values/strings.xml',
        lineNumber: 15,
        context: 'Main screen welcome text',
        status: 'approved',
        translations: {
          Spanish: { text: 'Bienvenido a MobileByteLabs Translator', confidence: 95 },
          French: { text: 'Bienvenue dans MobileByteLabs Translator', confidence: 92 },
        },
      },
    ];
    
    res.json({ translations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

// Create new translations
router.post('/create', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { repositoryId, stringIds, targetLanguages } = req.body;
    
    if (!repositoryId || !stringIds || !targetLanguages) {
      res.status(400).json({ 
        error: 'Repository ID, string IDs, and target languages are required' 
      });
      return;
    }

    // Here you would:
    // 1. Fetch the strings from database
    // 2. Call Gemini API for translation
    // 3. Save translations to database
    
    res.json({ 
      message: 'Translation job started',
      jobId: 'translation-job-id',
      status: 'processing',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create translations' });
  }
});

// Review/approve translation
router.put('/:id/review', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    
    // Here you would update translation status in database
    
    res.json({ 
      message: 'Translation review updated',
      translationId: id,
      status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update translation review' });
  }
});

export default router;