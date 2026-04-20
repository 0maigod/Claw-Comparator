import React, { useState } from 'react';

const IconFolder = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const IconFile = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const IconPaste = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const IconUpload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const IconRename = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconNewFile = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="12" x2="12" y2="18"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>;

const TreeNode = ({ node, level, index, handlers, clipboard, pathPrefix, expandedPaths }) => {
    const nodeId = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
    const isExpanded = expandedPaths[nodeId] || false;
    const [isHovered, setIsHovered] = useState(false);
    
    // Calcular color de la cebra en función del índice (impar/par) o nivel si prefieres.
    // Usaremos un index pseudo-plano si es posible, o simplemente un mod de nivel + índice.
    // Para simplificar una cebra aceptable sin aplanar, combinaremos nivel y id.
    const zebraBg = (level + index) % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'transparent';
    const hoverBg = 'rgba(59,130,246,0.08)';

    const actionButtonStyle = {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        minWidth: '24px',
        minHeight: '24px'
    };

    if (node.type === 'file') {
        const isCopied = clipboard && clipboard.path === node.path && clipboard.realAgentName === node.realAgentName;
        return (
            <div 
                style={{ 
                    paddingLeft: `${level * 20}px`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '4px 8px 4px ' + `${Math.max(8, level * 20)}px`,
                    cursor: 'pointer',
                    backgroundColor: isHovered ? hoverBg : zebraBg,
                    transition: 'background-color 0.15s ease',
                    minHeight: '32px'
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onDoubleClick={(e) => { e.stopPropagation(); handlers.onFileEdit(node); }}
                title="Doble clic para Ver / Editar"
            >
                <div style={{ color: isCopied ? '#eab308' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <IconFile />
                </div>
                <span style={{ fontSize: '0.85rem', color: isCopied ? '#eab308' : 'var(--color-text-primary)' }}>
                    {node.name}
                </span>
                
                {/* Contenedor de iconos reservado para evitar Layout Shift */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
                    <button onClick={(e) => { e.stopPropagation(); handlers.onFileRename(node); }} style={actionButtonStyle} title="Renombrar Archivo"><IconRename /></button>
                    <button onClick={(e) => { e.stopPropagation(); handlers.onFileDownload(node); }} style={actionButtonStyle} title="Descargar Archivo"><IconDownload /></button>
                    <button onClick={(e) => { e.stopPropagation(); handlers.onFileCopy(node); }} style={actionButtonStyle} title="Copiar Archivo"><IconCopy /></button>
                    <button onClick={(e) => { e.stopPropagation(); handlers.onFileDelete(node); }} style={actionButtonStyle} title="Eliminar Archivo"><IconTrash /></button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div 
                onClick={() => handlers.onToggleFolder(nodeId)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ 
                    paddingLeft: `${level * 20}px`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '6px 8px 6px ' + `${Math.max(8, level * 20)}px`,
                    cursor: 'pointer',
                    backgroundColor: isHovered ? hoverBg : zebraBg,
                    userSelect: 'none',
                    minHeight: '36px',
                    transition: 'background-color 0.15s ease',
                }}
            >
                <span style={{ width: '12px', display: 'inline-block', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                    {node.children && node.children.length > 0 ? (isExpanded ? '▼' : '▶') : ''}
                </span>
                <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}><IconFolder /></div>
                <span style={{ fontSize: '0.9rem', fontWeight: node.type === 'agent' ? 600 : 500, color: 'var(--color-text-primary)' }}>
                    {node.name} {node.alias ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>({node.alias})</span> : ''}
                </span>
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
                    <button onClick={(e) => { e.stopPropagation(); handlers.onFileCreate(node); }} style={actionButtonStyle} title="Crear Nuevo Archivo">
                        <IconNewFile />
                    </button>
                    {clipboard && (
                       <button onClick={(e) => { e.stopPropagation(); handlers.onFilePaste(node); }} style={actionButtonStyle} title={`Pegar ${clipboard.name} aquí`}>
                           <IconPaste />
                       </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handlers.onFolderDownload(node); }} style={actionButtonStyle} title="Descargar Carpeta (.zip)">
                        <IconDownload />
                    </button>
                    <label onClick={(e) => e.stopPropagation()} style={{ ...actionButtonStyle, cursor: 'pointer' }} title="Subir archivo .md aquí">
                        <IconUpload />
                        <input type="file" accept=".md" style={{ display: 'none' }} onChange={(e) => {
                            if(e.target.files && e.target.files[0]) handlers.onFileUpload(node, e.target.files[0]);
                            e.target.value = null;
                        }} />
                    </label>
                </div>
            </div>
            {isExpanded && node.children && (
                <div>
                    {node.children.map((child, idx) => (
                        <TreeNode 
                            key={`${child.path || child.name}-${idx}`} 
                            node={child} 
                            level={level + 1} 
                            index={idx}
                            handlers={handlers}
                            clipboard={clipboard}
                            pathPrefix={nodeId}
                            expandedPaths={expandedPaths}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const FileExplorer = ({ nodes, handlers, clipboard, expandedPaths }) => {
    if (!nodes || nodes.length === 0) return <div style={{ padding: '20px', color: 'var(--color-text-secondary)' }}>No hay datos para mostrar</div>;
    
    const handleWheel = (e) => {
        const el = e.currentTarget;
        const atBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 2;
        const atTop = el.scrollTop <= 0;
        
        if ((atBottom && e.deltaY > 0) || (atTop && e.deltaY < 0)) {
            const parentMain = el.closest('main');
            if (parentMain) {
                parentMain.scrollTop += e.deltaY;
            }
        }
    };

    return (
        <div 
            onWheel={handleWheel}
            style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-canvas)',
            overflowY: 'auto',
            maxHeight: '600px',
            padding: '4px 0',
            overscrollBehavior: 'contain'
        }}>
            {nodes.map((node, i) => (
                 <TreeNode 
                 key={node.name + i} 
                 node={node} 
                 level={0} 
                 index={i}
                 handlers={handlers} 
                 clipboard={clipboard}
                 pathPrefix=""
                 expandedPaths={expandedPaths}
             />
            ))}
        </div>
    );
};

export default FileExplorer;
