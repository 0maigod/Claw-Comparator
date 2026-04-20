import React from 'react';

const Card = ({ children, title, icon, value, hint, isCollapsed, onExpand, collapseText, style }) => {
  return (
    <div 
      onClick={isCollapsed ? onExpand : undefined}
      style={{
      backgroundColor: 'var(--color-bg-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: isCollapsed ? '12px 24px' : 'var(--spacing-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: isCollapsed ? '0' : 'var(--spacing-xs)',
      cursor: isCollapsed ? 'pointer' : 'default',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      maxHeight: isCollapsed ? '45px' : '2000px',
      overflow: 'hidden',
      ...style
    }}>
      <div style={{
          transition: 'all 0.3s ease',
          opacity: isCollapsed ? 0 : 1,
          height: isCollapsed ? '0px' : 'auto',
          visibility: isCollapsed ? 'hidden' : 'visible'
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

      {isCollapsed && (
         <div style={{ 
             textAlign: 'center', color: 'var(--color-text-secondary)', 
             fontWeight: 600, fontSize: '0.85rem', letterSpacing: '2px'
         }}>
             {collapseText || 'CONFIGURACION'}
         </div>
      )}
    </div>
  );
};

export default Card;
