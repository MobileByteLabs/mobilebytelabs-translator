// backend/src/app.ts
import express from 'express';
import cors from 'cors';

// Import route handlers
import authRoutes from './routes/auth';
import repositoriesRoutes from './routes/repositories';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: '🚀 MobileByteLabs Translation API is running!',
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/repositories', repositoriesRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: [
      'GET /health',
      'GET /api/test',
      'POST /api/auth/github',
      'GET /api/auth/github/callback',
      'GET /api/auth/test-github',
      'GET /api/repositories',
      'GET /api/repositories/debug',
      'GET /api/repositories/:id',
      'POST /api/repositories',
      'POST /api/repositories/:id/scan',
      'GET /api/repositories/:id/scan-status'
    ]
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

export default app;