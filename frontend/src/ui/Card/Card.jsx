import React from 'react';

const Card = ({ children, title, icon, value, hint }) => {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--spacing-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-xs)'
    }}>
      {(title || icon) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500, flex: 1 }}>{title}</span>
          {icon && <span style={{ color: 'var(--color-brand-accent)' }}>{icon}</span>}
        </div>
      )}
      {value !== undefined && (
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {value}
        </div>
      )}
      {hint && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
