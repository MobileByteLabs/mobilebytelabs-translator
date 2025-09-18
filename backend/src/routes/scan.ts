// backend/src/routes/scan.ts
import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ScannerService } from '../services/scannerService';

const router = express.Router();

// Get repository branches
router.get('/branches/:owner/:repo', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { owner, repo } = req.params;

    console.log('🔍 Scan branches request:', {
      owner,
      repo,
      hasUser: !!req.user,
      userKeys: req.user ? Object.keys(req.user) : [],
      hasGithubToken: !!req.user?.user?.githubToken,
      githubTokenPreview: req.user?.user?.githubToken ? req.user.user.githubToken.substring(0, 10) + '...' : 'none'
    });

    if (!req.user?.user?.githubToken) {
      console.log('❌ GitHub token not found in user object:', req.user);
      res.status(401).json({ error: 'GitHub token not found' });
      return;
    }

    const scannerService = new ScannerService(req.user.user.githubToken);
    const branches = await scannerService.getRepositoryBranches(owner, repo);

    res.json({
      branches,
      default: branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0]
    });
  } catch (error) {
    console.error('❌ Error fetching branches:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch branches'
    });
  }
});

// Scan repository for strings
router.post('/repository', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { owner, repo, branch = 'main' } = req.body;

    if (!owner || !repo) {
      res.status(400).json({ error: 'Owner and repo are required' });
      return;
    }

    if (!req.user?.user?.githubToken) {
      res.status(401).json({ error: 'GitHub token not found' });
      return;
    }

    console.log(`🔍 Starting scan for ${owner}/${repo} on branch ${branch}`);

    const scannerService = new ScannerService(req.user.user.githubToken);
    const scanResult = await scannerService.scanRepository(owner, repo, branch);

    res.json({
      success: true,
      data: {
        repository: `${owner}/${repo}`,
        branch,
        scan: scanResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error scanning repository:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to scan repository'
    });
  }
});

// Debug endpoint to test authentication
router.get('/debug/auth', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
      hasGithubToken: !!req.user?.githubToken,
      githubTokenLength: req.user?.githubToken?.length || 0,
      userKeys: req.user ? Object.keys(req.user) : []
    });
  } catch (error) {
    console.error('❌ Debug auth error:', error);
    res.status(500).json({ error: 'Debug auth failed' });
  }
});

// Get supported languages
router.get('/languages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Common language codes for mobile/web applications
    const supportedLanguages = [
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'zh', name: 'Chinese (Simplified)', native: '简体中文' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
      { code: 'nl', name: 'Dutch', native: 'Nederlands' },
      { code: 'en', name: 'English', native: 'English' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'de', name: 'German', native: 'Deutsch' },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'it', name: 'Italian', native: 'Italiano' },
      { code: 'ja', name: 'Japanese', native: '日本語' },
      { code: 'ko', name: 'Korean', native: '한국어' },
      { code: 'pt', name: 'Portuguese', native: 'Português' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)', native: 'Português (Brasil)' },
      { code: 'ru', name: 'Russian', native: 'Русский' },
      { code: 'es', name: 'Spanish', native: 'Español' },
      { code: 'tr', name: 'Turkish', native: 'Türkçe' },
      { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' }
    ];

    res.json({ languages: supportedLanguages });
  } catch (error) {
    console.error('❌ Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch supported languages' });
  }
});

export default router;