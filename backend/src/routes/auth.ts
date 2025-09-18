// backend/src/routes/auth.ts
import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import jwt from 'jsonwebtoken';

const router = express.Router();

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
}, async (
  accessToken: string, 
  refreshToken: string, 
  profile: Profile, 
  done: (error: any, user?: any) => void
) => {
  try {
    // Here you would save user to database
    const user = {
      id: profile.id,
      username: profile.username,
      name: profile.displayName,
      email: profile.emails?.[0]?.value,
      avatar: profile.photos?.[0]?.value,
      githubToken: accessToken,
    };
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user);
});

passport.deserializeUser((user: any, done: (err: any, user?: any) => void) => {
  done(null, user);
});

// Routes
router.get('/github', passport.authenticate('github', { 
  scope: ['user:email', 'repo'] 
}));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { user: req.user },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    // Redirect to frontend with token
    res.redirect(`${process.env.CORS_ORIGIN}/dashboard?token=${token}`);
  }
);

router.post('/logout', (req, res) => {
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;