import React, { useEffect, useRef } from 'react';

/**
 * D3OrgChart: Árbol interactivo Sincronizado de lado a lado.
 */
const D3OrgChart = ({ treeA, treeB, labelA = 'Sistema A', labelB = 'Sistema B', onFileClick, onFileDelete }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        renderUnifiedTree(containerRef.current, treeA, treeB, labelA, labelB, onFileClick, onFileDelete);
    }, [treeA, treeB, labelA, labelB, onFileClick, onFileDelete]);

    return (
        <div style={{ width: '100%', overflowX: 'auto', borderRadius: '4px' }}>
            <div ref={containerRef} style={{ padding: '8px 0', minWidth: '400px' }} />
        </div>
    );
};

function unifyTrees(nodeA, nodeB, name) {
    const baseNode = nodeA || nodeB;
    if (!baseNode) return null;

    const unified = {
        name: baseNode.name || name,
        type: baseNode.type,
        alias: baseNode.alias,
        path: baseNode.path,
        realAgentName: baseNode.realAgentName,
        nodeA: nodeA,
        nodeB: nodeB,
        children: []
    };

    const childrenMap = new Map();
    
    // Recolectar hijos de A
    if (nodeA && nodeA.children) {
        nodeA.children.forEach(c => {
            if (c.name !== '.agents') childrenMap.set(c.name, { nodeA: c, nodeB: null });
        });
    }

    // Recolectar hijos de B
    if (nodeB && nodeB.children) {
        nodeB.children.forEach(c => {
            if (c.name !== '.agents') {
                if (childrenMap.has(c.name)) {
                    childrenMap.get(c.name).nodeB = c;
                } else {
                    childrenMap.set(c.name, { nodeA: null, nodeB: c });
                }
            }
        });
    }

    // Recursion
    for (const [childName, pair] of childrenMap.entries()) {
        const childUnified = unifyTrees(pair.nodeA, pair.nodeB, childName);
        if (childUnified) {
            unified.children.push(childUnified);
        }
    }

    // Ordenar: Carpetas primero, luego archivos, ambos alfabéticamente
    unified.children.sort((a, b) => {
        const aIsFile = a.type === 'file';
        const bIsFile = b.type === 'file';
        if (aIsFile && !bIsFile) return 1;
        if (!aIsFile && bIsFile) return -1;
        return a.name.localeCompare(b.name);
    });

    return unified;
}

function renderUnifiedTree(container, treeA, treeB, labelA, labelB, onFileClick, onFileDelete) {
    if (!container) return;
    container.innerHTML = '';

    const rootA = treeA || { name: 'Root', type: 'system', children: [] };
    const rootB = treeB || { name: 'Root', type: 'system', children: [] };
    const unifiedRoot = unifyTrees(rootA, rootB, 'Root');

    if (!unifiedRoot) return;

    const iconMap = { system: '🖥', agent: '🤖', folder: '📁', file: '📄' };
    const levelIndent = 24;

    // Colapsados por defecto a depth >= 2 (los workspace-agent deben verse expandidos, pero NO sus subcarpetas)
    const collapsed = new Set();
    function preCollapse(node, depth) {
        if (depth >= 2 && node.children && node.children.length > 0) {
            collapsed.add(`${node.name}__${depth}`);
        }
        if (node.children) {
            node.children.forEach(c => preCollapse(c, depth + 1));
        }
    }
    preCollapse(unifiedRoot, 0);

    const div = document.createElement('div');
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '13px';

    function render() {
        div.innerHTML = '';
        const visible = [];

        // Walk 
        function walk(node, depth, isVisible) {
            if (!isVisible) return;
            const key = `${node.name}__${depth}`;
            visible.push({ node, depth, key });
            
            if (node.children && !collapsed.has(key)) {
                node.children.forEach(c => walk(c, depth + 1, true));
            }
        }
        // Saltamos de System a los agentes (depth = 1)
        unifiedRoot.children.forEach(agentNode => walk(agentNode, 1, true));

        // Renderizado Flex/Grid simulado
        visible.forEach(({ node, depth, key }) => {
            const hasChildren = node.children && node.children.length > 0;
            const isCollapsed = collapsed.has(key);

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.borderBottom = '1px solid rgba(0,0,0,0.02)';
            
            row.deleteButtons = [];

            row.onmouseenter = () => { 
                row.style.background = 'rgba(99,102,241,0.06)'; 
                if (row.deleteButtons) {
                    row.deleteButtons.forEach(btn => btn.style.display = 'inline-block');
                }
            };
            row.onmouseleave = () => { 
                row.style.background = 'transparent'; 
                if (row.deleteButtons) {
                    row.deleteButtons.forEach(btn => btn.style.display = 'none');
                }
            };

            const renderCell = (sourceNode, colorSystem, systemLabel) => {
                const cell = document.createElement('div');
                cell.style.flex = '1';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.padding = '6px 12px';
                cell.style.paddingLeft = `${(depth - 1) * levelIndent + 12}px`;
                cell.style.minWidth = '0';
                
                if (!sourceNode) {
                    cell.style.opacity = '0'; // Fantasma
                    return cell;
                }

                cell.style.cursor = hasChildren ? 'pointer' : (sourceNode.type === 'file' ? 'pointer' : 'default');

                if (hasChildren) {
                    const arrow = document.createElement('span');
                    arrow.textContent = isCollapsed ? '▶' : '▼';
                    arrow.style.fontSize = '10px';
                    arrow.style.color = '#94a3b8';
                    arrow.style.width = '14px';
                    arrow.style.flexShrink = '0';
                    arrow.style.userSelect = 'none';
                    cell.appendChild(arrow);
                } else {
                    const spacer = document.createElement('span');
                    spacer.style.width = '14px';
                    spacer.style.flexShrink = '0';
                    cell.appendChild(spacer);
                }

                const icon = document.createElement('span');
                icon.textContent = iconMap[sourceNode.type] || '📄';
                icon.style.marginRight = '6px';
                cell.appendChild(icon);

                const nameSpan = document.createElement('span');
                if (sourceNode.type === 'agent' && sourceNode.alias) {
                    nameSpan.textContent = `${sourceNode.alias} (${sourceNode.name})`;
                } else {
                    nameSpan.textContent = sourceNode.name;
                }
                
                nameSpan.style.color = sourceNode.type === 'file' ? '#475569' : colorSystem;
                nameSpan.style.fontWeight = sourceNode.type === 'agent' ? '700' : '500';
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                cell.appendChild(nameSpan);

                if (hasChildren) {
                    const count = document.createElement('span');
                    count.textContent = `(${node.children.length})`;
                    count.style.fontSize = '10px';
                    count.style.color = '#cbd5e1';
                    count.style.marginLeft = '4px';
                    cell.appendChild(count);
                }
                
                if (sourceNode.type === 'file' && onFileDelete) {
                    const delBtn = document.createElement('span');
                    delBtn.textContent = '🗑️';
                    delBtn.style.fontSize = '14px';
                    delBtn.style.marginLeft = 'auto'; // empuja a la derecha
                    delBtn.style.cursor = 'pointer';
                    delBtn.style.display = 'none';
                    delBtn.title = `Eliminar ${sourceNode.name} de ${systemLabel}`;
                    delBtn.onmouseenter = () => { delBtn.style.transform = 'scale(1.2)'; };
                    delBtn.onmouseleave = () => { delBtn.style.transform = 'scale(1)'; };
                    delBtn.style.transition = 'transform 0.1s ease';
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        onFileDelete(sourceNode, systemLabel);
                    };
                    cell.appendChild(delBtn);
                    row.deleteButtons.push(delBtn);
                }
                
                return cell;
            };

            const cellA = renderCell(node.nodeA, '#3b82f6', labelA); 
            const cellDivider = document.createElement('div');
            cellDivider.style.width = '1px';
            cellDivider.style.backgroundColor = 'rgba(0,0,0,0.05)';
            const cellB = renderCell(node.nodeB, '#10b981', labelB); 

            row.onclick = () => {
                if (hasChildren) {
                    if (collapsed.has(key)) collapsed.delete(key);
                    else collapsed.add(key);
                    render(); 
                } else if (node.type === 'file' && onFileClick) {
                    onFileClick(node, 'Ambos'); 
                }
            };

            row.appendChild(cellA);
            row.appendChild(cellDivider);
            row.appendChild(cellB);
            div.appendChild(row);
        });
    }

    render();
    container.appendChild(div);
}

export default D3OrgChart;
