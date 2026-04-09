import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../../ui/Card/Card';
import Button from '../../ui/Button/Button';
import D3RingChart from '../../ui/Charts/D3RingChart';
import D3BarChart from '../../ui/Charts/D3BarChart';
import D3AgentPresence from '../../ui/Charts/D3AgentPresence';
import D3OrgChart from '../../ui/Charts/D3OrgChart';
import Modal from '../../ui/Modal/Modal';
import D3CirclePacking from '../../ui/Charts/D3CirclePacking';
import ConceptDiffViewer from '../../ui/DiffViewer/ConceptDiffViewer';
import ReactDiffViewer from 'react-diff-viewer-continued';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Analysis = () => {
    const [searchParams] = useSearchParams();
    const urlReportId = searchParams.get('reportId');

    const [pathA, setPathA] = useState(() => localStorage.getItem('pathA') || '');
    const [pathB, setPathB] = useState(() => localStorage.getItem('pathB') || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(() => {
        if (urlReportId) return null;
        const cached = localStorage.getItem('analysisResult');
        return cached ? JSON.parse(cached) : null;
    });
    const [error, setError] = useState('');

    // Organigram Modal State
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
    const [orgTree, setOrgTree] = useState(null);
    const [orgLoading, setOrgLoading] = useState(false);

    // AI Modal State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiConcepts, setAiConcepts] = useState(null);
    const [activeAgentName, setActiveAgentName] = useState(null);

    // Diff Modal State
    const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
    const [selectedConcept, setSelectedConcept] = useState(null);

    // File Diff Modal State
    const [isFileDiffModalOpen, setIsFileDiffModalOpen] = useState(false);
    const [fileDiffLoading, setFileDiffLoading] = useState(false);
    const [selectedFileData, setSelectedFileData] = useState(null);
    const [editingMode, setEditingMode] = useState(null); // 'A' or 'B'
    const [editContent, setEditContent] = useState('');
    const [savingFile, setSavingFile] = useState(false);

    // Derive human-readable system labels from paths
    const labelA = useMemo(() => pathA ? pathA.split(/[/\\]/).filter(Boolean).pop() || 'Sistema A' : 'Sistema A', [pathA]);
    const labelB = useMemo(() => pathB ? pathB.split(/[/\\]/).filter(Boolean).pop() || 'Sistema B' : 'Sistema B', [pathB]);

    // Persist paths
    useEffect(() => {
        if (!urlReportId) {
            localStorage.setItem('pathA', pathA);
            localStorage.setItem('pathB', pathB);
        }
    }, [pathA, pathB, urlReportId]);

    // Persist latest analysis result
    useEffect(() => {
        if (result && !urlReportId) {
            localStorage.setItem('analysisResult', JSON.stringify(result));
        } else if (!result && !urlReportId) {
            localStorage.removeItem('analysisResult');
        }
    }, [result, urlReportId]);

    // Load historic report from URL param
    useEffect(() => {
        if (urlReportId) {
            setLoading(true);
            fetch(`${API_URL}/api/reports/${urlReportId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        setResult(data.data);
                        if (data.data.system_a_path) setPathA(data.data.system_a_path);
                        if (data.data.system_b_path) setPathB(data.data.system_b_path);
                    } else {
                        setError('Reporte histórico no encontrado');
                    }
                })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [urlReportId]);

    const runAnalysis = async () => {
        if (!pathA || !pathB) { setError('Las rutas son obligatorias.'); return; }
        setError(''); setLoading(true); setResult(null);
        try {
            const resp = await fetch(`${API_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_a_path: pathA, system_b_path: pathB })
            });
            const data = await resp.json();
            if (data.status === 'success') setResult(data.data);
            else setError(data.message || 'Error en el servidor');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgentConcepts = async (agentName) => {
        // Resolver paths: preferir los del resultado, si no, los del input
        const resolvedPathA = result?.system_a_path || pathA;
        const resolvedPathB = result?.system_b_path || pathB;

        if (!resolvedPathA || !resolvedPathB) {
            setError('No se encontraron las rutas del sistema. Por favor ingresá los paths manualmente y volvé a analizar.');
            setIsAIModalOpen(true);
            return;
        }

        setIsAIModalOpen(true);
        setAiConcepts(null);
        setAiLoading(true);
        setActiveAgentName(agentName);
        setError('');
        try {
            const payload = {
                system_a_path: resolvedPathA,
                system_b_path: resolvedPathB,
                agent_name: agentName,
                report_id: result?.id  // Opcional: si está lo usamos para cachear
            };
            const resp = await fetch(`${API_URL}/api/agent-concepts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.status === 'success') setAiConcepts(data.data);
            else setError(data.message || 'Error AI Server');
        } catch (err) {
            setError(err.message);
        } finally {
            setAiLoading(false);
        }
    };

    const openOrgChart = async () => {
        setIsOrgModalOpen(true);
        if (orgTree) return; // Already fetched
        setOrgLoading(true);
        try {
            const reportId = result?.id || urlReportId;
            const resp = await fetch(`${API_URL}/api/reports/${reportId}/tree`);
            const data = await resp.json();
            if (data.status === 'success') setOrgTree(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setOrgLoading(false);
        }
    };

    const handleConceptClick = (conceptData) => {
        setSelectedConcept(conceptData);
        setIsDiffModalOpen(true);
    };

    const handleFileClick = async (node, systemLabel) => {
        const resolvedPathA = result?.system_a_path || pathA;
        const resolvedPathB = result?.system_b_path || pathB;

        setEditingMode(null);
        setSelectedFileData({ node, systemLabel, textA: '', textB: '' });
        setIsFileDiffModalOpen(true);
        setFileDiffLoading(true);

        try {
            const payload = {
                system_a_path: resolvedPathA,
                system_b_path: resolvedPathB,
                agent_name: node.realAgentName,
                relative_file_path: node.path
            };
            const resp = await fetch(`${API_URL}/api/diff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.status === 'success') {
                setSelectedFileData(prev => ({ ...prev, textA: data.data.textA || '', textB: data.data.textB || '' }));
            } else {
                setError(data.message || 'Error obteniendo diff de archivo');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setFileDiffLoading(false);
        }
    };

    const handleSaveFile = async () => {
        setSavingFile(true);
        try {
            const systemPath = editingMode === 'A' ? (result?.system_a_path || pathA) : (result?.system_b_path || pathB);
            const payload = {
                system_path: systemPath,
                agent_name: selectedFileData.node.realAgentName,
                relative_file_path: selectedFileData.node.path,
                new_content: editContent
            };
            const resp = await fetch(`${API_URL}/api/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.status === 'success') {
                setEditingMode(null);
                handleFileClick(selectedFileData.node, selectedFileData.systemLabel);
            } else {
                setError(data.message || 'Error guardando archivo');
            }
        } catch(err) {
            setError(err.message);
        } finally {
            setSavingFile(false);
        }
    };

    const getRingData = () => {
        if (!result) return [];
        const data = result.metrics
            .filter(m => m.variation_percentage > 0)
            .map(m => ({ label: m.agent_name, value: m.lines_added + m.lines_removed }));
        return data.length === 0 ? [{ label: 'Idénticos', value: 100 }] : data;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {/* Configuración de Paths con indicadores de color A / B */}
            <Card title="Configurar Local Paths">
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginTop: 'var(--spacing-sm)' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>{labelA}</span>
                        </div>
                        <input
                            placeholder="Ruta Absoluta: Sistema A (ej. C:\agentes_v1)"
                            value={pathA} onChange={e => setPathA(e.target.value)}
                            style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid rgba(59,130,246,0.3)', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '1.1rem' }}>VS</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>{labelB}</span>
                        </div>
                        <input
                            placeholder="Ruta Absoluta: Sistema B (ej. C:\agentes_v2)"
                            value={pathB} onChange={e => setPathB(e.target.value)}
                            style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid rgba(16,185,129,0.3)', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <Button onClick={runAnalysis} disabled={loading}>
                        {loading ? 'Procesando...' : 'Iniciar Análisis'}
                    </Button>
                </div>
                {error && <div style={{ color: 'var(--color-diff-removed-text)', marginTop: '8px', fontSize: '0.85rem' }}>{error}</div>}
            </Card>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                    <h2>Ciego calculando diferencias sintácticas...</h2>
                </div>
            )}

            {result && (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                        {/* Columna Izquierda (Mitad del espacio) */}
                        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            <Card title="Divergencia Global" value={`${result.global_variation_score?.toFixed(2) || 0}%`} hint="Mutación Textual" />
                            <Card title="Metadatos Físicos de Sistemas">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', gap: '16px' }}>
                                    <div style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.05)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.1)' }}>
                                        <h4 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '0.85rem' }}>{labelA}</h4>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                            <strong>Última mod:</strong> {result.last_updated_A ? new Date(result.last_updated_A).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                            <strong>Archivos (.md):</strong> {result.files_count_A || 0}
                                        </p>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.05)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.1)' }}>
                                        <h4 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: '0.85rem' }}>{labelB}</h4>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                            <strong>Última mod:</strong> {result.last_updated_B ? new Date(result.last_updated_B).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                            <strong>Archivos (.md):</strong> {result.files_count_B || 0}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                        {/* Columna Derecha (Mitad del espacio) */}
                        <div style={{ flex: '1 1 300px', display: 'flex' }}>
                            <Card title="Peso de Mutación / Agente" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
                                    <D3RingChart data={getRingData()} width={240} height={240} />
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Presencia de Agentes */}
                    <Card title="Distribución de Agentes">
                        <D3AgentPresence
                            metrics={result.metrics}
                            labelA={labelA}
                            labelB={labelB}
                            onAgentClick={fetchAgentConcepts}
                        />
                    </Card>

                    {/* Bar Chart + Organigrama button */}
                    <Card title="Comparativa Volumétrica por Agente">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                            <Button onClick={openOrgChart} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                                🗂 Ver Organigrama
                            </Button>
                        </div>
                        <D3BarChart data={result.metrics} width={800} height={250} />
                    </Card>

                    {/* Detalle por Agente */}
                    <Card title="Detalle por Agente">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 'var(--spacing-md)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-bg-canvas)' }}>
                                    <th style={{ paddingBottom: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Agente</th>
                                    <th style={{ paddingBottom: '12px', color: '#3b82f6', fontWeight: 500, fontSize: '0.85rem' }}>Líneas Nuevas</th>
                                    <th style={{ paddingBottom: '12px', color: '#ef4444', fontWeight: 500, fontSize: '0.85rem' }}>Líneas Borradas</th>
                                    <th style={{ paddingBottom: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Varianza</th>
                                    <th style={{ paddingBottom: '12px', textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.metrics.map((m, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-bg-canvas)' }}>
                                        <td style={{ padding: '16px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-brand-primary)' }}>
                                            {m.agent_name}
                                            {m.status === 'NEW' && <span style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '0.65rem', backgroundColor: 'rgba(16,185,129,0.1)', color: '#065f46', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>Nuevo en {labelB}</span>}
                                            {m.status === 'REMOVED' && <span style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '0.65rem', backgroundColor: 'rgba(239,68,68,0.1)', color: '#b91c1c', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', textTransform: 'uppercase', fontWeight: 700 }}>Solo en {labelA}</span>}
                                        </td>
                                        <td style={{ padding: '16px 0', fontSize: '0.9rem', color: '#3b82f6' }}>+ {m.lines_added}</td>
                                        <td style={{ padding: '16px 0', fontSize: '0.9rem', color: '#ef4444' }}>- {m.lines_removed}</td>
                                        <td style={{ padding: '16px 0', fontSize: '0.9rem' }}>{m.variation_percentage.toFixed(2)}%</td>
                                        <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                            <Button onClick={() => fetchAgentConcepts(m.agent_name)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                                🔮 Ver Conceptos
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </>
            )}

            {/* Modal: Organigrama */}
            <Modal isOpen={isOrgModalOpen} onClose={() => setIsOrgModalOpen(false)} title={`Organigrama: ${labelA} vs ${labelB}`} disableEsc={isFileDiffModalOpen} maxWidth="1100px">
                {orgLoading && (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                        <h3>Escaneando estructura de carpetas...</h3>
                    </div>
                )}
                {orgTree && !orgLoading && (
                    <D3OrgChart
                        treeA={orgTree.treeA}
                        treeB={orgTree.treeB}
                        labelA={labelA}
                        labelB={labelB}
                        onFileClick={handleFileClick}
                    />
                )}
            </Modal>

            {/* Modal Nivel 1: D3 Circle Packing */}
            <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title={`Análisis Dimensional AI: ${activeAgentName}`}>
                {aiLoading && (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                        <h3 style={{ animation: 'pulse 1.5s infinite' }}>Gemini destilando semántica de mutaciones...</h3>
                        <p style={{ fontSize: '0.85rem' }}>Esto puede tardar varios segundos según el volumen de código transformado.</p>
                    </div>
                )}
                {error && !aiLoading && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-diff-removed-text)' }}>
                        <h3>Gemini / Servidor no respondió</h3>
                        <p>{error}</p>
                    </div>
                )}
                {aiConcepts && !aiLoading && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                            Haz clic en un concepto para abrir el Diff semántico.
                        </p>
                        <D3CirclePacking
                            added_concepts={aiConcepts.added_concepts}
                            removed_concepts={aiConcepts.removed_concepts}
                            mutated_concepts={aiConcepts.mutated_concepts || []}
                            labelA={labelA}
                            labelB={labelB}
                            width={720} height={460}
                            onConceptClick={handleConceptClick}
                        />
                    </div>
                )}
            </Modal>

            {/* Modal Nivel 2: Diff Side-by-side */}
            <Modal isOpen={isDiffModalOpen} onClose={() => setIsDiffModalOpen(false)} title="Anatomía del Concepto">
                <ConceptDiffViewer conceptData={selectedConcept} />
            </Modal>

            {/* Modal Nivel 3: File Diff Side-by-side */}
            <Modal isOpen={isFileDiffModalOpen} onClose={() => { setIsFileDiffModalOpen(false); setEditingMode(null); }} title={`Diferencias: ${selectedFileData?.node?.path || 'Archivo'}`} maxWidth="1400px">
                {fileDiffLoading || savingFile ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                        <h3 style={{ animation: 'pulse 1.5s infinite' }}>{savingFile ? 'Guardando archivo y recalculando diferencias...' : 'Cargando versiones del archivo...'}</h3>
                    </div>
                ) : selectedFileData ? (
                    editingMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, color: editingMode === 'A' ? '#3b82f6' : '#10b981' }}>Editando variante {editingMode === 'A' ? labelA : labelB}</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button onClick={() => setEditingMode(null)} style={{ background: 'transparent', border: '1px solid var(--color-text-secondary)', color: 'var(--color-text-secondary)' }}>Cancelar</Button>
                                    <Button onClick={handleSaveFile} style={{ backgroundColor: '#10b981' }}>✅ Guardar Cambios</Button>
                                </div>
                            </div>
                            <textarea 
                                value={editContent} 
                                onChange={(e) => setEditContent(e.target.value)} 
                                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-bg-canvas)', backgroundColor: '#fff', resize: 'none', outline: 'none' }}
                                spellCheck={false}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
                                <Button onClick={() => { setEditContent(selectedFileData.textA); setEditingMode('A'); }} style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#3b82f6' }}>✏️ Editar {labelA}</Button>
                                <Button onClick={() => { setEditContent(selectedFileData.textB); setEditingMode('B'); }} style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#10b981' }}>✏️ Editar {labelB}</Button>
                            </div>
                            <div style={{ border: '1px solid var(--color-bg-canvas)', borderRadius: 'var(--radius-md)', overflowX: 'auto', minHeight: '400px' }}>
                                <ReactDiffViewer 
                                    oldValue={selectedFileData.textA} 
                                    newValue={selectedFileData.textB} 
                                    splitView={true} 
                                    showDiffOnly={false}
                                    useDarkTheme={false}
                                    leftTitle={`${labelA}`}
                                    rightTitle={`${labelB}`}
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
                        </div>
                    )
                ) : null}
            </Modal>
        </div>
    );
};

export default Analysis;
