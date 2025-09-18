// backend/src/routes/github-auth.ts
import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import session from 'express-session';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Configure session middleware for this router
router.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
router.use(passport.initialize());
router.use(passport.session());

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/github/callback',
}, async (
  accessToken: string,
  refreshToken: string,
  profile: Profile,
  done: (error: any, user?: any) => void
) => {
  try {
    console.log('✅ GitHub OAuth successful for user:', profile.username);
    
    // Create user object with GitHub data
    const user = {
      id: profile.id,
      username: profile.username,
      name: profile.displayName || profile.username,
      email: profile.emails?.[0]?.value,
      avatar: profile.photos?.[0]?.value,
      githubToken: accessToken, // Store for API calls
      profileUrl: profile.profileUrl,
    };

    // In a real app, you would save this to your database here
    console.log('💾 User data to save:', {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
    });

    return done(null, user);
  } catch (error) {
    console.error('❌ GitHub OAuth error:', error);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user);
});

passport.deserializeUser((user: any, done: (err: any, user?: any) => void) => {
  done(null, user);
});

// Routes
// Start GitHub OAuth flow
router.get('/github', (req: Request, res: Response, next) => {
  console.log('🚀 Starting GitHub OAuth flow...');
  passport.authenticate('github', { 
    scope: ['user:email', 'repo'] // Request repo access for scanning
  })(req, res, next);
});

// GitHub OAuth callback
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.CORS_ORIGIN}/login?error=oauth_failed` }),
  (req: Request, res: Response): void => {
    try {
      console.log('✅ GitHub OAuth callback received');
      
      if (!req.user) {
        console.error('❌ No user in request after OAuth');
        res.redirect(`${process.env.CORS_ORIGIN}/login?error=no_user`);
        return;
      }

      // Create JWT token for the frontend
      const token = jwt.sign(
        { user: req.user },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      console.log('🎫 JWT token created for user:', (req.user as any).username);

      // Redirect to frontend with token
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/dashboard?token=${token}`);
    } catch (error) {
      console.error('❌ Callback error:', error);
      res.redirect(`${process.env.CORS_ORIGIN}/login?error=callback_failed`);
    }
  }
);

// Check authentication status
router.get('/status', (req: Request, res: Response): void => {
  if (req.isAuthenticated()) {
    res.json({ 
      authenticated: true, 
      user: req.user 
    });
  } else {
    res.json({ 
      authenticated: false 
    });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response): void => {
  req.logout((err: any) => {
    if (err) {
      console.error('❌ Logout error:', err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    console.log('👋 User logged out');
    res.json({ message: 'Logged out successfully' });
  });
});

// Save GitHub token manually
router.post('/github-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const { githubToken } = req.body;
    if (!githubToken) {
      res.status(400).json({ error: 'GitHub token is required' });
      return;
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    if (!decoded.user) {
      res.status(401).json({ error: 'Invalid JWT token' });
      return;
    }

    // Test the GitHub token
    const testResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'Translation-Tool',
      },
    });

    if (!testResponse.ok) {
      res.status(400).json({ error: 'Invalid GitHub token' });
      return;
    }

    // Update user object with new GitHub token
    const updatedUser = {
      ...decoded.user,
      githubToken: githubToken
    };

    // Create new JWT token with updated user data
    const newJwtToken = jwt.sign(
      { user: updatedUser },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    console.log('✅ GitHub token updated for user:', updatedUser.username);

    res.json({
      success: true,
      message: 'GitHub token saved successfully',
      token: newJwtToken // Return new token with updated user data
    });

  } catch (error) {
    console.error('❌ GitHub token save error:', error);
    res.status(500).json({ error: 'Failed to save GitHub token' });
  }
});

// Test endpoint to verify GitHub token works
router.get('/test-github', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const githubToken = decoded.user?.githubToken;

    if (!githubToken) {
      res.status(400).json({ error: 'No GitHub token found' });
      return;
    }

    // Test GitHub API call
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'MobileByteLabs-Translation-System',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const githubUser = await response.json();
    
    // Type assertion for GitHub user response
    const typedGithubUser = githubUser as {
      login: string;
      name: string | null;
      public_repos: number;
      followers: number;
    };
    
    res.json({
      message: 'GitHub token is valid!',
      user: {
        login: typedGithubUser.login,
        name: typedGithubUser.name,
        public_repos: typedGithubUser.public_repos,
        followers: typedGithubUser.followers,
      },
    });
  } catch (error) {
    console.error('❌ GitHub test error:', error);
    res.status(500).json({ error: 'GitHub token test failed' });
  }
});

export default router;