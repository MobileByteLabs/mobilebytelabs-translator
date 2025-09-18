// backend/src/server.ts
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import simpleRoutes from './routes/simple';
import authRoutes from './routes/auth-safe';
import githubAuthRoutes from './routes/github-auth';
import repositoriesRoutes from './routes/repositories';
import scanRoutes from './routes/scan';
import translateRoutes from './routes/translate';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Server is running with environment variables!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API test endpoint working!',
    env: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasGithubClientId: !!process.env.GITHUB_CLIENT_ID,
      hasJwtSecret: !!process.env.JWT_SECRET,
    },
  });
});

// Add routes
console.log('🔄 Registering routes...');
app.use('/api', simpleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', githubAuthRoutes);
app.use('/api/repositories', repositoriesRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/translate', translateRoutes);

console.log('✅ All routes registered successfully');

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📂 Repositories API: http://localhost:${PORT}/api/repositories`);
  console.log(`🔍 Scan API: http://localhost:${PORT}/api/scan`);
  console.log(`🌐 Translate API: http://localhost:${PORT}/api/translate`);
  
  // Check environment variables
  const requiredEnvVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.log('⚠️  Missing environment variables:', missingEnvVars.join(', '));
  } else {
    console.log('✅ All required environment variables are set');
  }
});

process.on('SIGINT', () => {
  console.log('⏰ Server shutting down...');
  process.exit(0);
});