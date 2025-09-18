// backend/src/routes/simple.ts
import express from 'express';

const router = express.Router();

// Test routes without authentication
// RENAMED: /repositories -> /test-repositories to avoid conflict
router.get('/test-repositories', (req, res) => {
  res.json({
    message: 'Test repositories endpoint working!',
    note: 'This is a test endpoint - use /api/repositories for real data',
    repositories: [
      {
        id: '1',
        name: 'test-repo',
        status: 'active',
      },
    ],
  });
});

// RENAMED: /translations -> /test-translations to avoid future conflicts
router.get('/test-translations', (req, res) => {
  res.json({
    message: 'Test translations endpoint working!',
    translations: [],
  });
});

router.post('/github/test', (req, res) => {
  res.json({
    message: 'GitHub test endpoint working!',
    body: req.body,
  });
});

export default router;