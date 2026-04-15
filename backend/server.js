import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import analysisController from './src/controllers/analysisController.js';

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

// Middlewares
app.use(cors());
app.use(express.json());

// Main Endpoints
// Retorna las maquinas configuradas
app.get('/api/machines', analysisController.getMachines);
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
// Borra un archivo en disco
app.delete('/api/file', analysisController.deleteFile);

// Endpoints Individuales (Customizar)
app.post('/api/system-tree-single', analysisController.getSingleSystemTree);
app.post('/api/file/move', analysisController.moveFile);
app.post('/api/file/upload', upload.single('file'), analysisController.uploadFile);
app.post('/api/file/copy', analysisController.copyFile);
app.get('/api/file/download', analysisController.downloadFile);
app.get('/api/folder/download', analysisController.downloadFolder);

// Error Handling Global (Regla IV: Nunca silencies un error)
app.use((err, req, res, next) => {
    console.error('[Error Global]:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`Backend OpenClaw Comparator escuchando en http://localhost:${PORT}`);
});
