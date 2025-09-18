// backend/src/routes/auth-safe.ts
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Test auth endpoint without passport
router.get('/test', (req: Request, res: Response): void => {
  res.json({
    message: 'Auth routes working!',
    timestamp: new Date().toISOString(),
  });
});

// Mock login endpoint for testing
router.post('/login', (req: Request, res: Response): void => {
  const { username } = req.body;
  
  if (!username) {
    res.status(400).json({ error: 'Username required' });
    return;
  }

  // Create a test JWT token
  const token = jwt.sign(
    { 
      user: {
        id: '123',
        username,
        name: 'Test User',
        avatar: 'https://github.com/test.png',
      }
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Mock login successful',
    token,
    user: {
      id: '123',
      username,
      name: 'Test User',
    },
  });
});

// Test protected route
router.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    res.json({ user: decoded });
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;