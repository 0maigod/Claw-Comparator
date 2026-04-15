import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Customizar', path: '/' },
  { label: 'Analizar', path: '/analyzer' },
  { label: 'Histórico', path: '/historical' }
];

const DashboardLayout = ({ children }) => {
  return (
    <div style={{ 
      display: 'flex', 
      height: '90vh', 
      width: '90vw', 
      maxWidth: '1440px',
      borderRadius: '24px',
      overflow: 'hidden', 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(0,0,0,0.1)'
    }}>
      
      {/* Sidebar - Dark Navy */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--color-brand-primary)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-xl) 0'
      }}>
        {/* Brand/User Area */}
        <div style={{ textAlign: 'center', padding: '0 var(--spacing-lg) var(--spacing-xl)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto var(--spacing-md)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' 
          }}>
             <span style={{color: 'var(--color-brand-primary)', fontWeight: 'bold'}}>Claw</span>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Analyzer</h2>
          <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: '4px' }}>OpenClaw Toolkit</p>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xl)' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                padding: 'var(--spacing-md) var(--spacing-xl)',
                textDecoration: 'none',
                color: isActive ? '#fff' : '#a0aec0',
                backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '4px solid var(--color-brand-accent)' : '4px solid transparent',
                display: 'block',
                transition: 'all 0.2s'
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        backgroundColor: 'var(--color-bg-canvas)',
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header */}
        <header style={{ 
          height: '70px', padding: '0 var(--spacing-xl)', display: 'flex', alignItems: 'center',
          backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-bg-canvas)', boxShadow: 'var(--shadow-sm)'
        }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Dashboard Analyst</h1>
        </header>

        {/* Page Canvas */}
        <div style={{ padding: 'var(--spacing-xl)', flex: 1, display: 'flex', flexDirection: 'column' }}>
           {children}
        </div>
      </main>
      
    </div>
  );
};

export default DashboardLayout;
