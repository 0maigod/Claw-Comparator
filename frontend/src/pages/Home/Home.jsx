import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../ui/Card/Card';
import Button from '../../ui/Button/Button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Home = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/reports`)
      .then(r => r.json())
      .then(res => {
        if(res.status === 'success') {
          setReports(res.data);
        }
      })
      .catch(e => console.error('Error fetching history:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Cargando métricas...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {/* Top Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)' }}>
        <Card title="Comparativas Totales" value={reports.length.toString()} hint="Almacenadas en SQLite" />
        <Card title="Último Nivel de Variación" value={reports.length ? reports[0].global_variation_score.toFixed(2) + '%' : '0%'} hint="Divergencia Promedio" />
        <Card title="Total Archivos último reporte" value={reports.length ? reports[0].total_files_analyzed.toString() : '0'} hint="Archivos .md leídos" />
      </div>

      {/* History Table */}
      <Card title="Historial Analítico">
        {reports.length === 0 ? (
           <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>No hay comparativas recientes. Ve a "Analizar" e inicia una.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 'var(--spacing-md)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-bg-canvas)' }}>
                 <th style={{ paddingBottom: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>FECHA</th>
                 <th style={{ paddingBottom: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>INSTANCIA A</th>
                 <th style={{ paddingBottom: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>INSTANCIA B</th>
                 <th style={{ paddingBottom: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>DIVERGENCIA (%)</th>
                 <th style={{ paddingBottom: '12px', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
               {reports.map((r, i) => (
                 <tr key={r.id} style={{ borderBottom: i < reports.length -1 ? '1px solid var(--color-bg-canvas)' : 'none' }}>
                   <td style={{ padding: '16px 0', fontSize: '0.9rem' }}>{new Date(r.timestamp).toLocaleString()}</td>
                   <td style={{ padding: '16px 0', fontSize: '0.9rem', color: 'var(--color-brand-primary)' }}>{r.system_a_path.split(/[\/\\]/).pop()}</td>
                   <td style={{ padding: '16px 0', fontSize: '0.9rem', color: 'var(--color-brand-accent)' }}>{r.system_b_path.split(/[\/\\]/).pop()}</td>
                   <td style={{ padding: '16px 0', fontSize: '0.9rem', fontWeight: 600 }}>{r.global_variation_score.toFixed(2)}%</td>
                   <td style={{ padding: '16px 0', textAlign: 'right' }}>
                     <Button onClick={() => navigate(`/analyzer?reportId=${r.id}`)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                       Abrir Reporte
                     </Button>
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

export default Home;
