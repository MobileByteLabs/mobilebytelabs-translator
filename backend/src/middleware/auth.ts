// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth middleware:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
    path: req.path
  });

  if (!token) {
    console.log('❌ No token provided');
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Temporary: Log the JWT secret being used
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  console.log('🔑 Using JWT secret:', jwtSecret.substring(0, 10) + '...');

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      console.log('❌ JWT verification failed:', {
        error: err.message,
        name: err.name,
        tokenPreview: token.substring(0, 50) + '...'
      });
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    console.log('✅ JWT verification successful:', {
      hasUser: !!(decoded as any)?.user,
      userKeys: (decoded as any)?.user ? Object.keys((decoded as any).user) : [],
      hasGithubToken: !!(decoded as any)?.user?.githubToken,
      decodedKeys: decoded ? Object.keys(decoded) : []
    });

    req.user = decoded;
    next();
  });
};