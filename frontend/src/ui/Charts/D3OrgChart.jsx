import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * D3OrgChart: Árbol colapsable de dos sistemas, lado a lado.
 * Nodos: sistema (raíz) > agentes > subcarpetas/archivos .md
 * Color de fondo por presencia en cada sistema:
 *   - treeA only: rojo suave
 *   - treeB only: verde suave
 *   - compartido: neutro (gris)
 */
const D3OrgChart = ({ treeA, treeB, labelA = 'Sistema A', labelB = 'Sistema B', onFileClick }) => {
    const refA = useRef(null);
    const refB = useRef(null);

    useEffect(() => {
        if (treeA) renderTree(refA.current, treeA, labelA, '#3b82f6', '#1e40af', onFileClick);
    }, [treeA, labelA, onFileClick]);

    useEffect(() => {
        if (treeB) renderTree(refB.current, treeB, labelB, '#10b981', '#065f46', onFileClick);
    }, [treeB, labelB, onFileClick]);

    return (
        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#3b82f6', marginBottom: '8px', textAlign: 'center' }}>
                    ← {labelA}
                </div>
                <div ref={refA} style={{ overflowX: 'auto' }} />
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--color-bg-canvas)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981', marginBottom: '8px', textAlign: 'center' }}>
                    {labelB} →
                </div>
                <div ref={refB} style={{ overflowX: 'auto' }} />
            </div>
        </div>
    );
};

function renderTree(container, treeData, label, nodeColor, nodeColorDark, onFileClick) {
    if (!container || !treeData) return;
    container.innerHTML = '';

    const nodeHeight = 28;
    const levelIndent = 20;
    const iconMap = { system: '🖥', agent: '🤖', folder: '📁', file: '📄' };

    // Build flat list with depth, toggling collapsed state
    function buildList(node, depth = 0, result = []) {
        const item = { ...node, depth, collapsed: depth >= 2, _id: Math.random().toString(36).slice(2) };
        result.push(item);
        if (node.children && !item.collapsed) {
            node.children.forEach(c => buildList(c, depth + 1, result));
        }
        return result;
    }

    // Initial render
    let flatData = buildFlat(treeData);

    function buildFlat(root, collapseAtDepth = 2) {
        const list = [];
        function walk(node, depth) {
            const entry = { ...node, depth, id: node.name + depth + Math.random() };
            list.push(entry);
            if (node.children && node.children.length > 0 && depth < collapseAtDepth) {
                node.children.forEach(c => walk(c, depth + 1));
            }
        }
        walk(root, 0);
        return list;
    }

    // State for collapsed nodes (by name+depth key)
    const collapsed = new Set();

    function render() {
        container.innerHTML = '';
        const visible = [];

        function walk(node, depth, isVisible) {
            if (!isVisible) return;
            const key = `${node.name}__${depth}`;
            visible.push({ node, depth, key });
            if (node.children && !collapsed.has(key)) {
                node.children.forEach(c => walk(c, depth + 1, true));
            }
        }
        walk(treeData, 0, true);

        const div = document.createElement('div');
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '13px';

        visible.forEach(({ node, depth, key }) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '4px';
            row.style.padding = '3px 0';
            row.style.paddingLeft = `${depth * levelIndent}px`;
            row.style.cursor = node.children ? 'pointer' : 'default';
            row.style.borderRadius = '4px';
            row.style.transition = 'background 0.1s';
            row.onmouseenter = () => { if (node.children) row.style.background = 'rgba(99,102,241,0.06)'; };
            row.onmouseleave = () => { row.style.background = ''; };

            const isCollapsed = collapsed.has(key);
            const hasChildren = node.children && node.children.length > 0;

            // Toggle arrow
            if (hasChildren) {
                const arrow = document.createElement('span');
                arrow.textContent = isCollapsed ? '▶' : '▼';
                arrow.style.fontSize = '9px';
                arrow.style.color = nodeColor;
                arrow.style.width = '12px';
                arrow.style.flexShrink = '0';
                row.appendChild(arrow);
            } else {
                const spacer = document.createElement('span');
                spacer.style.width = '12px';
                spacer.style.flexShrink = '0';
                row.appendChild(spacer);
            }

            // Icon
            const icon = document.createElement('span');
            icon.textContent = iconMap[node.type] || '📄';
            icon.style.fontSize = '13px';
            row.appendChild(icon);

            // Label
            const name = document.createElement('span');
            if (node.type === 'agent' && node.alias) {
                name.textContent = `${node.alias} (${node.name})`;
            } else {
                name.textContent = node.name;
            }
            name.style.color = node.type === 'file' ? '#64748b' : node.type === 'agent' ? nodeColorDark : node.type === 'system' ? nodeColor : '#475569';
            name.style.fontWeight = node.type === 'system' || node.type === 'agent' ? '700' : '400';
            row.appendChild(name);

            if (node.type === 'file') {
                row.onclick = () => {
                    if (onFileClick) onFileClick(node, label);
                };
            }

            if (hasChildren) {
                const count = document.createElement('span');
                count.textContent = `(${node.children.length})`;
                count.style.fontSize = '10px';
                count.style.color = '#94a3b8';
                count.style.marginLeft = '4px';
                row.appendChild(count);

                row.onclick = () => {
                    if (collapsed.has(key)) collapsed.delete(key);
                    else collapsed.add(key);
                    render();
                };
            }

            div.appendChild(row);
        });

        container.appendChild(div);
    }

    render();
}

export default D3OrgChart;
