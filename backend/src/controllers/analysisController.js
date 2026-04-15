import { analyzeSystems, getSpecificDiff, getAllAgentDiffs, getSystemTree, saveFileToDisk, deleteFileFromDisk, moveSystemFile, copySystemFile, getFolderFiles } from '../services/diffService.js';
import { extractConceptsFromDiff } from '../services/aiService.js';
import { dbQuery, dbRun } from '../database/db.js';
import fs from 'fs';
import path from 'path';

export const getMachines = async (req, res, next) => {
    try {
        const machinesPath = path.resolve(process.cwd(), 'machines.json');
        let machines = [{ id: 'local', name: 'Este Equipo (Local)', type: 'local' }];
        if (fs.existsSync(machinesPath)) {
            machines = JSON.parse(fs.readFileSync(machinesPath, 'utf-8'));
            // Removemos passwords o keys por seguridad al exponer al frontend
            machines = machines.map(m => {
                const { password, privateKeyPath, ...safeMachine } = m;
                return safeMachine;
            });
        }
        res.json({ status: 'success', data: machines });
    } catch (err) {
        next(err);
    }
};

export const getHistoricalReports = async (req, res, next) => {
    try {
        const sql = `SELECT * FROM reports ORDER BY timestamp DESC LIMIT 50`;
        const reports = await dbQuery(sql);
        res.json({ status: 'success', data: reports });
    } catch (err) {
        next(err);
    }
};

export const getReportById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reportRows = await dbQuery(`SELECT * FROM reports WHERE id = ?`, [id]);
        if (reportRows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
        }
        
        const report = reportRows[0];
        const metrics = await dbQuery(`SELECT * FROM agent_metrics WHERE report_id = ?`, [id]);
        
        const finalReport = {
            id: report.id,
            system_a_path: report.system_a_path,
            system_b_path: report.system_b_path,
            global_variation_score: report.global_variation_score,
            total_files_analyzed: report.total_files_analyzed,
            metrics: metrics
        };
        
        res.json({ status: 'success', data: finalReport });
    } catch (err) {
        next(err);
    }
};

export const runAnalysis = async (req, res, next) => {
    try {
        const { system_a_path, system_b_path } = req.body;
        
        if (!system_a_path || !system_b_path) {
            return res.status(400).json({ status: 'error', message: 'Faltan rutas de sistemas' });
        }

        console.log(`[Analysis API] Iniciando comparativa:\n A: ${system_a_path}\n B: ${system_b_path}`);
        
        // Ejecución ciega del análisis (Pure Logic)
        const analysisData = await analyzeSystems(system_a_path, system_b_path);
        
        // Guardando en SQLite (Single Responsibility - Persistence)
        const reportId = await dbRun(
            `INSERT INTO reports (system_a_path, system_b_path, global_variation_score, total_files_analyzed) VALUES (?, ?, ?, ?)`,
            [system_a_path, system_b_path, analysisData.global_variation_score, analysisData.total_files_analyzed]
        );

        for (const metric of analysisData.agentMetrics) {
            await dbRun(
                `INSERT INTO agent_metrics (report_id, agent_name, files_added, files_removed, files_modified, lines_added, lines_removed, variation_percentage) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    reportId, metric.agent_name, metric.files_added, metric.files_removed, metric.files_modified,
                    metric.lines_added, metric.lines_removed, metric.variation_percentage
                ]
            );
        }

        // Recuperar el reporte guardado completo para devolver al UI
        const finalReport = {
            id: reportId,
            system_a_path: system_a_path,
            system_b_path: system_b_path,
            global_variation_score: analysisData.global_variation_score,
            total_files_analyzed: analysisData.total_files_analyzed,
            metrics: analysisData.agentMetrics
        };

        res.json({ status: 'success', data: finalReport });
    } catch (err) {
        next(err);
    }
};

export const getAgentDiff = async (req, res, next) => {
    try {
        const { system_a_path, system_b_path, agent_name, relative_file_path } = req.body;
        
        // Return guard clause (Rule: Early return first)
        if (!system_a_path || !system_b_path || !agent_name || !relative_file_path) {
            return res.status(400).json({ status: 'error', message: 'Missgin payload args for Diff' });
        }

        const diffs = await getSpecificDiff(system_a_path, system_b_path, agent_name, relative_file_path);
        res.json({ status: 'success', data: diffs });
    } catch (err) {
        next(err);
    }
};

export const getAgentConcepts = async (req, res, next) => {
    try {
        const { system_a_path, system_b_path, agent_name, report_id } = req.body;
        if (!system_a_path || !system_b_path || !agent_name) {
            return res.status(400).json({ status: 'error', message: 'Missing payload args: system paths and agent_name required' });
        }
        
        // Cache Check solo si existe report_id (Prime Directive: Persistent Memory)
        if (report_id) {
            const cached = await dbQuery('SELECT concepts_json FROM ai_concepts WHERE report_id = ? AND agent_name = ?', [report_id, agent_name]);
            if (cached.length > 0) {
                console.log(`[AI API] Cache HIT for agent: ${agent_name} (report ${report_id})`);
                const decoded = Buffer.from(cached[0].concepts_json, 'base64').toString('utf-8');
                return res.json({ status: 'success', data: JSON.parse(decoded) });
            }
        }

        console.log(`[AI API] Extrayendo conceptos semánticos del agente: ${agent_name}`);
        const allDiffData = await getAllAgentDiffs(system_a_path, system_b_path, agent_name);
        const aiConcepts = await extractConceptsFromDiff(agent_name, allDiffData);

        // Guardar en caché solo si hay report_id válido
        if (report_id) {
            const encodedConcepts = Buffer.from(JSON.stringify(aiConcepts)).toString('base64');
            await dbRun('INSERT INTO ai_concepts (report_id, agent_name, concepts_json) VALUES (?, ?, ?)', [report_id, agent_name, encodedConcepts]);
        }

        res.json({ status: 'success', data: aiConcepts });
    } catch (err) {
        next(err);
    }
};

export const getReportTree = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reportRows = await dbQuery('SELECT system_a_path, system_b_path FROM reports WHERE id = ?', [id]);
        if (reportRows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
        }
        const { system_a_path, system_b_path } = reportRows[0];
        const [treeA, treeB] = await Promise.all([
            getSystemTree(system_a_path),
            getSystemTree(system_b_path)
        ]);
        res.json({ status: 'success', data: { treeA, treeB } });
    } catch (err) {
        next(err);
    }
};

export const saveFile = async (req, res, next) => {
    try {
        const { system_path, agent_name, relative_file_path, new_content } = req.body;
        if (!system_path || !agent_name || !relative_file_path || new_content === undefined) {
            return res.status(400).json({ status: 'error', message: 'Missing args for save' });
        }
        await saveFileToDisk(system_path, agent_name, relative_file_path, new_content);
        res.json({ status: 'success' });
    } catch (err) {
        next(err);
    }
};

export const deleteFile = async (req, res, next) => {
    try {
        const { system_path, agent_name, relative_file_path } = req.body;
        if (!system_path || !agent_name || !relative_file_path) {
            return res.status(400).json({ status: 'error', message: 'Missing args for delete' });
        }
        await deleteFileFromDisk(system_path, agent_name, relative_file_path);
        res.json({ status: 'success' });
    } catch (err) {
        next(err);
    }
};

export const getSingleSystemTree = async (req, res, next) => {
    try {
        const { system_path } = req.body;
        if (!system_path) {
            return res.status(400).json({ status: 'error', message: 'Missing system_path' });
        }
        const tree = await getSystemTree(system_path);
        res.json({ status: 'success', data: tree });
    } catch (err) {
        next(err);
    }
};

export const moveFile = async (req, res, next) => {
    try {
        const { system_path, agent_name, relative_file_path, new_agent_name, new_relative_file_path } = req.body;
        if (!system_path || !agent_name || !relative_file_path || !new_agent_name || !new_relative_file_path) {
            return res.status(400).json({ status: 'error', message: 'Missing args for move' });
        }
        await moveSystemFile(system_path, agent_name, relative_file_path, new_agent_name, new_relative_file_path);
        res.json({ status: 'success' });
    } catch (err) {
        next(err);
    }
};

export const uploadFile = async (req, res, next) => {
    try {
        const { system_path, agent_name, relative_file_path } = req.body;
        if (!system_path || !agent_name || !relative_file_path || !req.file) {
            return res.status(400).json({ status: 'error', message: 'Missing args or file for upload' });
        }
        
        if (!req.file.originalname.endsWith('.md')) {
             return res.status(400).json({ status: 'error', message: 'Solo se permiten archivos .md' });
        }

        const newContent = req.file.buffer.toString('utf-8');
        await saveFileToDisk(system_path, agent_name, relative_file_path, newContent);
        res.json({ status: 'success' });
    } catch (err) {
        next(err);
    }
};

export const copyFile = async (req, res, next) => {
    try {
        const { system_path, agent_name, relative_file_path, new_agent_name, new_relative_file_path } = req.body;
        if (!system_path || !agent_name || !relative_file_path || !new_agent_name || !new_relative_file_path) {
            return res.status(400).json({ status: 'error', message: 'Missing args for copy' });
        }
        await copySystemFile(system_path, agent_name, relative_file_path, new_agent_name, new_relative_file_path);
        res.json({ status: 'success' });
    } catch (err) {
        next(err);
    }
};

export const downloadFile = async (req, res, next) => {
    try {
        const { system_path, agent_name, relative_file_path } = req.query;
        if (!system_path || !agent_name || !relative_file_path) {
            return res.status(400).json({ status: 'error', message: 'Missing args for download' });
        }
        const diffs = await getSpecificDiff(system_path, system_path, agent_name, relative_file_path);
        const fileName = relative_file_path.split('/').pop();
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'text/markdown');
        res.send(diffs.textA); // textA corresponds to system_path
    } catch (err) {
        next(err);
    }
};

import archiver from 'archiver';

export const downloadFolder = async (req, res, next) => {
    try {
        const { system_path, agent_name, folder_path } = req.query; // folder_path can be empty for agent root
        if (!system_path || !agent_name) {
            return res.status(400).json({ status: 'error', message: 'Missing args for folder download' });
        }

        const files = await getFolderFiles(system_path, agent_name, folder_path);
        
        const folderName = folder_path ? folder_path.split('/').filter(Boolean).pop() : agent_name;
        res.setHeader('Content-disposition', `attachment; filename=${folderName}.zip`);
        res.setHeader('Content-type', 'application/zip');
        
        const zip = archiver('zip', { zlib: { level: 9 } });
        zip.pipe(res);
        
        for (const file of files) {
            zip.append(file.content, { name: file.name });
        }
        
        zip.finalize();
    } catch (err) {
        next(err);
    }
};

export default {
    getMachines,
    getHistoricalReports,
    getReportById,
    runAnalysis,
    getAgentDiff,
    getAgentConcepts,
    getReportTree,
    saveFile,
    deleteFile,
    getSingleSystemTree,
    moveFile,
    uploadFile,
    copyFile,
    downloadFile,
    downloadFolder
};
