import React from 'react';
import { Box } from '@mui/material';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'dashboard' | 'minimal';
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ variant = 'default' }) => {
  const getOrbConfig = () => {
    switch (variant) {
      case 'dashboard':
        return {
          orb1: { size: '300px', top: '-150px', left: '-150px', delay: '0s' },
          orb2: { size: '200px', top: '60%', right: '-100px', delay: '2s' },
          orb3: { size: '350px', bottom: '-175px', left: '60%', delay: '4s' },
        };
      case 'minimal':
        return {
          orb1: { size: '200px', top: '-100px', left: '-100px', delay: '0s' },
          orb2: { size: '150px', top: '70%', right: '-75px', delay: '3s' },
          orb3: { size: '250px', bottom: '-125px', left: '70%', delay: '6s' },
        };
      default:
        return {
          orb1: { size: '400px', top: '-200px', left: '-200px', delay: '0s' },
          orb2: { size: '300px', top: '50%', right: '-150px', delay: '2s' },
          orb3: { size: '500px', bottom: '-250px', left: '50%', delay: '4s' },
        };
    }
  };

  const orbConfig = getOrbConfig();

  return (
    <>
      {/* Main background with pattern */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#0f0f23',
          backgroundImage: 
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
          backgroundSize: '50px 50px',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: 0.3,
        }}
      />
      
      {/* Animated gradient orbs */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Orb 1 - Purple */}
        <Box
          sx={{
            position: 'absolute',
            width: orbConfig.orb1.size,
            height: orbConfig.orb1.size,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            opacity: 0.8,
            top: orbConfig.orb1.top,
            left: orbConfig.orb1.left,
            animation: `float 6s ease-in-out infinite ${orbConfig.orb1.delay}`,
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateY(0px) rotate(0deg)',
              },
              '33%': {
                transform: 'translateY(-30px) rotate(120deg)',
              },
              '66%': {
                transform: 'translateY(15px) rotate(240deg)',
              },
            },
          }}
        />

        {/* Orb 2 - Pink/Orange */}
        <Box
          sx={{
            position: 'absolute',
            width: orbConfig.orb2.size,
            height: orbConfig.orb2.size,
            background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            opacity: 0.8,
            top: orbConfig.orb2.top,
            right: orbConfig.orb2.right,
            animation: `float 6s ease-in-out infinite ${orbConfig.orb2.delay}`,
          }}
        />

        {/* Orb 3 - Blue/Cyan */}
        <Box
          sx={{
            position: 'absolute',
            width: orbConfig.orb3.size,
            height: orbConfig.orb3.size,
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            opacity: 0.8,
            bottom: orbConfig.orb3.bottom,
            left: orbConfig.orb3.left,
            transform: 'translateX(-50%)',
            animation: `float 6s ease-in-out infinite ${orbConfig.orb3.delay}`,
          }}
        />
      </Box>
    </>
  );
};

export default AnimatedBackground;