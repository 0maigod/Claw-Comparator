import React from 'react';
import Button from '../Button/Button';

/**
 * D3AgentPresence: Vista horizontal de agentes dividida en 3 zonas.
 * - Solo en A (REMOVED): existían en A, no en B
 * - Compartidos (MODIFIED): existen en ambos
 * - Solo en B (NEW): aparecieron en B, no en A
 */
const D3AgentPresence = ({ metrics = [], labelA = 'Sistema A', labelB = 'Sistema B', onAgentClick }) => {
    const removed = metrics.filter(m => m.status === 'REMOVED');
    const modified = metrics.filter(m => m.status === 'MODIFIED');
    const added = metrics.filter(m => m.status === 'NEW');

    const AgentPill = ({ agent, colorStyle }) => (
        <div
            onClick={() => onAgentClick && onAgentClick(agent.agent_name)}
            style={{
                padding: '8px 14px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${colorStyle.border}`,
                backgroundColor: colorStyle.bg,
                color: colorStyle.text,
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            title={`Clic para ver conceptos AI de: ${agent.agent_name}`}
        >
            {agent.agent_name}
        </div>
    );

    const Column = ({ title, subtitle, agents, colorStyle, emptyMsg }) => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '0 12px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: colorStyle.text }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>
            </div>
            {agents.length === 0
                ? <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic' }}>{emptyMsg}</div>
                : agents.map(a => <AgentPill key={a.agent_name} agent={a} colorStyle={colorStyle} />)
            }
        </div>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', padding: '8px 0' }}>
            <Column
                title={`Solo en ${labelA}`}
                subtitle="Agentes purgados en B"
                agents={removed}
                colorStyle={{ bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#b91c1c' }}
                emptyMsg="Ninguno eliminado"
            />
            {/* Divider */}
            <div style={{ width: '1px', backgroundColor: 'var(--color-bg-canvas)', alignSelf: 'stretch', margin: '0 4px' }} />
            <Column
                title="Compartidos"
                subtitle="Modificados entre sistemas"
                agents={modified}
                colorStyle={{ bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', text: '#4f46e5' }}
                emptyMsg="Ninguno compartido"
            />
            <div style={{ width: '1px', backgroundColor: 'var(--color-bg-canvas)', alignSelf: 'stretch', margin: '0 4px' }} />
            <Column
                title={`Solo en ${labelB}`}
                subtitle="Agentes nuevos en B"
                agents={added}
                colorStyle={{ bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', text: '#15803d' }}
                emptyMsg="Ninguno nuevo"
            />
        </div>
    );
};

export default D3AgentPresence;
