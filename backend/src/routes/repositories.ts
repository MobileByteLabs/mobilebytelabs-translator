// backend/src/routes/repositories.ts
import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { GitHubService } from '../services/githubService';

const router = express.Router();

interface GitHubUserResponse {
    login: string;
    public_repos: number;
    [key: string]: any; // for other properties we don't use
}

// IMPORTANT: Debug route must come BEFORE the /:id route
// Debug endpoint to test GitHub token
router.get('/debug', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('🔍 Debug endpoint called');
      console.log('🔍 User:', req.user?.user?.username);
      console.log('🔍 Has GitHub token:', !!req.user?.user?.githubToken);
      
      const githubToken = req.user?.user?.githubToken;
      if (!githubToken) {
        res.status(400).json({ 
          error: 'GitHub token not found',
          user: req.user?.user?.username,
          hasToken: false
        });
        return;
      }
  
      // Test basic GitHub API call
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'MobileByteLabs-Translation-System',
        },
      });
  
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
  
      const userData = await response.json() as GitHubUserResponse;
      
      res.json({
        message: 'Debug successful',
        user: {
          username: req.user?.user?.username,
          githubUsername: userData.login,
          hasToken: true,
          publicRepos: userData.public_repos,
        },
        github: {
          apiStatus: 'working',
          rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
        }
      });
    } catch (error) {
      console.error('❌ Debug error:', error);
      res.status(500).json({ 
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        user: req.user?.user?.username,
      });
    }
});

// Get user repositories
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📂 Fetching repositories for user:', req.user?.user?.username);
    
    // Get GitHub token from authenticated user
    const githubToken = req.user?.user?.githubToken;
    if (!githubToken) {
      res.status(400).json({ error: 'GitHub token not found' });
      return;
    }

    // Create GitHub service instance
    const githubService = new GitHubService(githubToken);
    
    // Fetch repositories
    const repositories = await githubService.getUserRepositories(true);
    
    console.log(`✅ Retrieved ${repositories.length} translatable repositories`);
    
    res.json({ 
      repositories: repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        lastScan: 'Never', // We'll implement scanning next
        translationProgress: 0, // Will be calculated after scanning
        status: 'pending', // pending, scanning, active, error
        languages: repo.languages,
        stringsCount: repo.estimatedStrings,
        isPrivate: repo.isPrivate,
        htmlUrl: repo.htmlUrl,
        lastUpdated: repo.lastUpdated,
        defaultBranch: repo.defaultBranch,
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching repositories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scan status route - must come before /:id route
router.get('/:id/scan-status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, you'd check the actual scan status from your database
    // For now, return mock status
    res.json({
      repositoryId: id,
      status: 'completed', // pending, scanning, completed, error
      progress: 100,
      stringsFound: 247,
      filesScanned: 89,
      lastScan: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scan status' });
  }
});

// Get specific repository details - this route should come AFTER specific routes like /debug
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const githubToken = req.user?.user?.githubToken;
    
    if (!githubToken) {
      res.status(400).json({ error: 'GitHub token not found' });
      return;
    }

    // For now, we'll need to fetch all repositories to find the specific one
    // In a real app, you'd store repository details in your database
    const githubService = new GitHubService(githubToken);
    const repositories = await githubService.getUserRepositories(true);
    
    const repository = repositories.find(repo => repo.id === id);
    
    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    res.json({ repository });
  } catch (error) {
    console.error('❌ Error fetching repository:', error);
    res.status(500).json({ error: 'Failed to fetch repository details' });
  }
});

// Add repository to translation system
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { repositoryId, repositoryFullName } = req.body;
    
    if (!repositoryId && !repositoryFullName) {
      res.status(400).json({ error: 'Repository ID or full name is required' });
      return;
    }

    // In a real implementation, you would:
    // 1. Validate the repository exists and user has access
    // 2. Store repository in your database
    // 3. Start initial scanning process
    // 4. Set up webhooks for repository changes
    
    console.log(`📝 Adding repository to translation system:`, { repositoryId, repositoryFullName });
    
    res.json({ 
      message: 'Repository added successfully',
      repository: {
        id: repositoryId,
        fullName: repositoryFullName,
        status: 'scanning',
        message: 'Repository scan will begin shortly'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add repository' });
  }
});

// Scan repository for translatable strings
router.post('/:id/scan', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const githubToken = req.user?.user?.githubToken;
    
    if (!githubToken) {
      res.status(400).json({ error: 'GitHub token not found' });
      return;
    }

    // Get repository details
    const githubService = new GitHubService(githubToken);
    const repositories = await githubService.getUserRepositories(true);
    const repository = repositories.find(repo => repo.id === id);
    
    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    // Start scanning process (we'll implement the actual scanning logic next)
    console.log(`🔍 Starting scan for repository: ${repository.fullName}`);
    
    // For now, simulate scanning
    setTimeout(() => {
      console.log(`✅ Scan completed for ${repository.fullName}`);
    }, 3001);
    
    res.json({ 
      message: 'Repository scan started',
      repositoryId: id,
      repositoryName: repository.fullName,
      status: 'scanning',
      estimatedDuration: '2-5 minutes'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start repository scan' });
  }
});

export default router;