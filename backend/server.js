import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import analysisController from './src/controllers/analysisController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// ---------------------------------------------------------
//  SERVIR FRONTEND ESTÁTICO (React Build)
// ---------------------------------------------------------
app.use('/openclaw-comparator', express.static(join(__dirname, '../frontend/dist')));

// Redirigir cualquier otra de React al index.html de openclaw-comparator
app.get('/openclaw-comparator/*', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/dist/index.html'));
});

// Redirigir la raiz del puerto 3001 directo al dashboard
app.get('/', (req, res) => {
    res.redirect('/openclaw-comparator/');
});

// Error Handling Global (Regla IV: Nunca silencies un error)
app.use((err, req, res, next) => {
    console.error('[Error Global]:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`Backend OpenClaw Comparator escuchando en http://localhost:${PORT}`);
});
