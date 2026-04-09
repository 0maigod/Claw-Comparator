import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import analysisController from './src/controllers/analysisController.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Main Endpoints
// Retorna histórico de reportes para el home dashboard
app.get('/api/reports', analysisController.getHistoricalReports);
// Obtiene el detalle completo de un reporte histórico (con sus métricas)
app.get('/api/reports/:id', analysisController.getReportById);
// Obtiene el árbol de estructura de carpetas de ambos sistemas para el organigrama
app.get('/api/reports/:id/tree', analysisController.getReportTree);
// Analiza dos carpetas nuevas y retorna las métricas (guardando en SQLite)
app.post('/api/analyze', analysisController.runAnalysis);
// Obtiene el detalle (diff real text) si es necesario
app.post('/api/diff', analysisController.getAgentDiff);
// Obtiene el estructrado avanzado de conceptos vía IA
app.post('/api/agent-concepts', analysisController.getAgentConcepts);
// Guarda modificaciones del editor en disco
app.post('/api/save-file', analysisController.saveFile);

// Error Handling Global (Regla IV: Nunca silencies un error)
app.use((err, req, res, next) => {
    console.error('[Error Global]:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`Backend Ciego de OpenClaw Comparator escuchando en http://localhost:${PORT}`);
});
