import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolving directory in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB wrapper enforcing Agnosticism Rule (if we change SQLite for Postgres, only this file changes)
const dbPath = path.resolve(__dirname, '../../comparator.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        _initTables();
    }
});

function _initTables() {
    // Tabla Principal de Reportes
    const createReportsTable = `
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            system_a_path TEXT NOT NULL,
            system_b_path TEXT NOT NULL,
            global_variation_score REAL DEFAULT 0,
            total_files_analyzed INTEGER DEFAULT 0
        );
    `;

    // Tabla de Métricas por Agente para visualización D3
    const createAgentMetricsTable = `
        CREATE TABLE IF NOT EXISTS agent_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            agent_name TEXT NOT NULL,
            files_added INTEGER DEFAULT 0,
            files_removed INTEGER DEFAULT 0,
            files_modified INTEGER DEFAULT 0,
            lines_added INTEGER DEFAULT 0,
            lines_removed INTEGER DEFAULT 0,
            variation_percentage REAL DEFAULT 0,
            FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
        );
    `;

    // Tabla de Caché para AI Concepts
    const createAiConceptsTable = `
        CREATE TABLE IF NOT EXISTS ai_concepts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            agent_name TEXT NOT NULL,
            concepts_json TEXT NOT NULL,
            FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
        );
    `;

    db.run(createReportsTable, (err) => {
        if (err) console.error('Error creating reports table', err);
    });

    db.run(createAgentMetricsTable, (err) => {
        if (err) console.error('Error creating agent_metrics table', err);
    });

    db.run(createAiConceptsTable, (err) => {
        if (err) console.error('Error creating ai_concepts table', err);
    });
}

// Promisified Queries to ensure Early Returns natively
export const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            // 'this.lastID' gives the inserted ID
            else resolve(this.lastID); 
        });
    });
};

export default db;
