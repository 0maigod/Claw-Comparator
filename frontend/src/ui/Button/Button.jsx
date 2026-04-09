import React from 'react';

const Button = ({ children, onClick, variant = 'primary', disabled = false, style={} }) => {
  const baseStyle = {
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s',
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--color-brand-accent)',
      color: '#fff',
    },
    secondary: {
      backgroundColor: 'var(--color-brand-primary)',
      color: '#fff',
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid var(--color-brand-primary)',
      color: 'var(--color-brand-primary)',
    }
  };

  return (
    <button 
      onClick={!disabled ? onClick : null} 
      style={{ ...baseStyle, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
};

export default Button;
