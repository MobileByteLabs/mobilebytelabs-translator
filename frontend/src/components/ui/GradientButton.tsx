import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  gradient?: string;
  children: React.ReactNode;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  variant = 'primary',
  gradient,
  children,
  sx,
  ...props
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      borderRadius: 3,
      textTransform: 'none' as const,
      fontWeight: 500,
      px: 4,
      py: 1.5,
      fontSize: '1rem',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: gradient || 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          border: 'none',
          '&:hover': {
            background: gradient || 'linear-gradient(135deg, #5856eb 0%, #7c3aed 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
        };

      case 'secondary':
        return {
          ...baseStyles,
          background: gradient || 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
          color: 'white',
          border: 'none',
          '&:hover': {
            background: gradient || 'linear-gradient(135deg, #db2777 0%, #ea580c 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 30px rgba(236, 72, 153, 0.4)',
          },
        };

      case 'outline':
        return {
          ...baseStyles,
          background: 'transparent',
          color: 'white',
          border: '2px solid rgba(99, 102, 241, 0.6)',
          '&:hover': {
            background: 'rgba(99, 102, 241, 0.1)',
            borderColor: 'rgba(99, 102, 241, 1)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)',
          },
        };

      case 'danger':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: 'none',
          '&:hover': {
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
          },
        };

      default:
        return baseStyles;
    }
  };

  return (
    <Button
      sx={{
        ...getButtonStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default GradientButton;