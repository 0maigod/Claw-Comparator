import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

const ConceptDiffViewer = ({ conceptData }) => {
    if (!conceptData || !conceptData.diff_fragments) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>{conceptData.concept}</h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    Impacto Estimado: {conceptData.size}
                </p>
            </div>

            {conceptData.diff_fragments.map((frag, idx) => (
                <div key={idx} style={{ 
                    border: '1px solid var(--color-bg-canvas)', 
                    borderRadius: 'var(--radius-md)', 
                    overflowX: 'auto' 
                }}>
                    <ReactDiffViewer 
                        oldValue={frag.old_code} 
                        newValue={frag.new_code} 
                        splitView={true} 
                        useDarkTheme={false} /* TODO: Adapt to user theme context later */
                        hideLineNumbers={false}
                        styles={{
                            variables: {
                                light: {
                                    diffViewerBackground: 'var(--color-bg-card)',
                                    addedBackground: 'rgba(34, 197, 94, 0.1)',
                                    addedColor: '#15803d',
                                    removedBackground: 'rgba(239, 68, 68, 0.1)',
                                    removedColor: '#b91c1c',
                                }
                            }
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default ConceptDiffViewer;
