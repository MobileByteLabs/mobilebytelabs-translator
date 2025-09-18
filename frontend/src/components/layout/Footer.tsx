import React from 'react';
import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import { GitHub, Twitter, LinkedIn, Email } from '@mui/icons-material';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      icon: <GitHub />,
      href: 'https://github.com/Thejas775',
      label: 'GitHub',
    },
    {
      icon: <Twitter />,
      href: 'https://twitter.com/ThejasRaja',
      label: 'Twitter',
    },
    {
      icon: <LinkedIn />,
      href: 'https://www.linkedin.com/in/thejas-elandassery-2ab5931b2/',
      label: 'LinkedIn',
    },
    {
      icon: <Email />,
      href: 'mailto:thejaselandassery@gmail.com',
      label: 'Email',
    },
  ];

  const footerLinks = [
    { label: 'Documentation', href: '#' },
    { label: 'Community', href: '#' },
    { label: 'Support', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        zIndex: 10,
        background: 'rgba(15, 15, 35, 0.8)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 4,
          }}
        >
          {/* Brand and Description */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' }, maxWidth: 400 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MobileByteLabs Translator
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.6,
                mb: 2,
              }}
            >
              Empowering global communication through intelligent, AI-powered translation
              that breaks down language barriers in applications.
            </Typography>

            {/* Social Links */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
              {socialLinks.map((social) => (
                <IconButton
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    '&:hover': {
                      color: '#6366f1',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    },
                  }}
                  aria-label={social.label}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Quick Links */}
          <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: 'white',
                fontWeight: 600,
                mb: 2,
              }}
            >
              Quick Links
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                flexWrap: 'wrap',
                gap: { xs: 3, md: 1 },
                justifyContent: 'center',
              }}
            >
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#6366f1',
                    },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Copyright */}
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.875rem',
            }}
          >
            © {currentYear} Thejas Elandassery
            <br />
            Built with ❤️ for the global community.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;