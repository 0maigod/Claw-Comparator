import fs from 'fs/promises';
import path from 'path';
import { diffLines } from 'diff'; // Cumpliendo regla Agnosticismo: usamos un servicio encapsulado

/**
 * Recorre recursivamente un directorio buscando subcarpetas de agentes
 * Retorna { [agentName]: { [fileName]: fullPath } }
 */
async function scanSystemAgents(systemPath) {
    const agents = {};
    try {
        const filesAndDirs = await fs.readdir(systemPath, { withFileTypes: true });
        for (const item of filesAndDirs) {
            if (item.isDirectory()) {
                const agentName = item.name;
                agents[agentName] = await getMarkdownFiles(path.join(systemPath, agentName), agentName);
            }
        }
    } catch (e) {
        throw new Error(`Error escaneando el sistema: ${systemPath}. Verifique la ruta.`);
    }
    return agents;
}

/**
 * Obtiene recursivamente todos los archivos .md asociados a un agente
 */
async function getMarkdownFiles(dir, agentName, baseDir = dir) {
    let filesMap = {};
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const item of list) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                filesMap = { ...filesMap, ...(await getMarkdownFiles(fullPath, agentName, baseDir)) };
            } else if (item.isFile() && item.name.endsWith('.md')) {
                // Normalizamos el path relativo (ej. logs/task1.md)
                const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                filesMap[relativePath] = fullPath;
            }
        }
    } catch (e) {
        // Directorio puede estar vacío o no accesible temporalmente
    }
    return filesMap;
}

/**
 * Motor inmutable: Evalúa variaciones entre el Agente A y el Agente B.
 */
async function compareAgentData(agentName, mapA, mapB) {
    const metrics = {
        agent_name: agentName,
        files_added: 0,
        files_removed: 0,
        files_modified: 0,
        lines_added: 0,
        lines_removed: 0,
        variation_percentage: 0,
        status: 'MODIFIED'
    };

    if (Object.keys(mapA).length === 0 && Object.keys(mapB).length > 0) {
        metrics.status = 'NEW';
    } else if (Object.keys(mapA).length > 0 && Object.keys(mapB).length === 0) {
        metrics.status = 'REMOVED';
    }

    const allKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    let totalLinesAnalyzed = 0;
    
    for (const key of allKeys) {
        const pathA = mapA[key];
        const pathB = mapB[key];

        // Regla: Early Returns pattern first
        if (!pathA) {
            metrics.files_added += 1; // Solo existe en B (nuevo archivo)
            // Calculamos lineas anadidas leyendo B completo
            const textB = await fs.readFile(pathB, 'utf-8');
            metrics.lines_added += textB.split(/\r?\n/).length;
            totalLinesAnalyzed += metrics.lines_added;
            continue;
        }

        if (!pathB) {
            metrics.files_removed += 1; // Solo existe en A (fue eliminado)
            const textA = await fs.readFile(pathA, 'utf-8');
            metrics.lines_removed += textA.split(/\r?\n/).length;
            totalLinesAnalyzed += metrics.lines_removed;
            continue;
        }

        // Ambos existen. Comparar textualmente (Diffing)
        const textA = await fs.readFile(pathA, 'utf-8');
        const textB = await fs.readFile(pathB, 'utf-8');

        if (textA === textB) {
            totalLinesAnalyzed += textA.split(/\r?\n/).length;
            continue; // Son idénticos en texto, inmutables.
        }

        metrics.files_modified += 1;
        const diffs = diffLines(textA, textB);
        let linesAnalyzedInFile = 0;

        for (const change of diffs) {
            if (change.added) {
                metrics.lines_added += change.count || 0;
            } else if (change.removed) {
                metrics.lines_removed += change.count || 0;
                linesAnalyzedInFile += change.count || 0;
            } else {
                linesAnalyzedInFile += change.count || 0;
            }
        }
        totalLinesAnalyzed += linesAnalyzedInFile;
    }

    // Calcular variacion porcentual básica: (lineas_alteradas / lineas_totales) * 100
    const totalAltered = metrics.lines_added + metrics.lines_removed;
    if (totalLinesAnalyzed > 0) {
        metrics.variation_percentage = (totalAltered / totalLinesAnalyzed) * 100;
    }

    return { metrics, totalLinesAnalyzed };
}

async function getSystemMetadata(sysPath) {
    let maxMTime = 0;
    let mdCount = 0;

    async function walk(dir) {
        try {
            const list = await fs.readdir(dir, { withFileTypes: true });
            for (const item of list) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    await walk(fullPath);
                } else if (item.isFile() && item.name.endsWith('.md')) {
                    mdCount++;
                    const stat = await fs.stat(fullPath);
                    if (stat.mtimeMs > maxMTime) maxMTime = stat.mtimeMs;
                }
            }
        } catch (e) { /* ignore */ }
    }
    
    await walk(sysPath);
    return { 
        lastUpdatedDate: maxMTime > 0 ? new Date(maxMTime).toISOString() : null, 
        mdCount 
    };
}

export const analyzeSystems = async (sysA_Path, sysB_Path) => {
    const agentsA = await scanSystemAgents(sysA_Path);
    const agentsB = await scanSystemAgents(sysB_Path);

    const metaA = await getSystemMetadata(sysA_Path);
    const metaB = await getSystemMetadata(sysB_Path);

    const allAgentNames = new Set([...Object.keys(agentsA), ...Object.keys(agentsB)]);
    
    const results = {
        agentMetrics: [],
        global_variation_score: 0,
        total_files_analyzed: 0,
        total_lines_analyzed: 0,
        last_updated_A: metaA.lastUpdatedDate,
        last_updated_B: metaB.lastUpdatedDate,
        files_count_A: metaA.mdCount,
        files_count_B: metaB.mdCount
    };

    for (const agentName of allAgentNames) {
        const mapA = agentsA[agentName] || {};
        const mapB = agentsB[agentName] || {};
        
        const { metrics, totalLinesAnalyzed } = await compareAgentData(agentName, mapA, mapB);
        
        results.agentMetrics.push(metrics);
        results.total_files_analyzed += (Object.keys(mapA).length + metrics.files_added);
        results.total_lines_analyzed += totalLinesAnalyzed;
    }

    // Calculamos el índice global basándonos en el promedio o total
    let totalVariation = results.agentMetrics.reduce((acc, curr) => acc + curr.variation_percentage, 0);
    if (results.agentMetrics.length > 0) {
        results.global_variation_score = totalVariation / results.agentMetrics.length;
    }

    return results;
};

export const getSpecificDiff = async (sysA_Path, sysB_Path, agentName, relativeFilePath) => {
    // Busca e un archivo específico para exponerlo al visualizador
    const pathA = path.join(sysA_Path, agentName, relativeFilePath);
    const pathB = path.join(sysB_Path, agentName, relativeFilePath);

    let textA = '', textB = '';

    try { textA = await fs.readFile(pathA, 'utf-8'); } catch (e) { /* vacio o eliminado */ }
    try { textB = await fs.readFile(pathB, 'utf-8'); } catch (e) { /* vacio o no creado */ }

    // Devolver texto crudo para que ReactDiffViewer haga su split-view
    return { textA, textB };
};

export const saveFileToDisk = async (sysPath, agentName, relativeFilePath, newContent) => {
    const fullPath = path.join(sysPath, agentName, relativeFilePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, newContent, 'utf-8');
};

export const getAllAgentDiffs = async (sysA_Path, sysB_Path, agentName) => {
    const agentsA = await scanSystemAgents(sysA_Path);
    const agentsB = await scanSystemAgents(sysB_Path);
    const mapA = agentsA[agentName] || {};
    const mapB = agentsB[agentName] || {};
    const allKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    
    let allDiffs = [];
    
    for (const relativePath of allKeys) {
        const pathA = mapA[relativePath];
        const pathB = mapB[relativePath];
        let textA = '', textB = '';
        if (pathA) try { textA = await fs.readFile(pathA, 'utf-8'); } catch (e) {}
        if (pathB) try { textB = await fs.readFile(pathB, 'utf-8'); } catch (e) {}
        
        if (textA === textB) continue; // No changes
        
        const diffs = diffLines(textA, textB);
        allDiffs.push({ path: relativePath, diffs });
    }
    return allDiffs;
};

/**
 * Genera un árbol de estructura { name, children } para el organigrama.
 * Raíz = nombre del sistema, hijos = agentes, nietos = archivos .md
 */
export const getSystemTree = async (systemPath) => {
    const systemName = path.basename(systemPath);
    const rootNode = { name: systemName, type: 'system', children: [] };

    try {
        const agentDirs = await fs.readdir(systemPath, { withFileTypes: true });
        for (const item of agentDirs) {
            if (!item.isDirectory()) continue;
            const agentPath = path.join(systemPath, item.name);
            const agentNode = { name: item.name, type: 'agent', children: [] };

            // Extraer alias desde IDENTITY.md si existe
            try {
                const identityPath = path.join(agentPath, 'IDENTITY.md');
                const identityContent = await fs.readFile(identityPath, 'utf-8');
                const aliasMatch = identityContent.match(/^alias:\s*(.+)$/im) || identityContent.match(/^nombre corto:\s*(.+)$/im);
                if (aliasMatch && aliasMatch[1]) {
                    agentNode.alias = aliasMatch[1].trim();
                }
            } catch (e) { /* ignorar silenciosamente si no existe */ }

            // Recursively collect .md files
            await collectFiles(agentPath, agentNode, agentPath, item.name);
            rootNode.children.push(agentNode);
        }
    } catch (e) {
        // System path may be inaccessible — return empty tree gracefully
    }

    return rootNode;
};

async function collectFiles(dir, parentNode, agentRoot, realAgentName) {
    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.name === 'proyectos') continue; // Omitir proyectos

            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                const subNode = { name: item.name, type: 'folder', children: [] };
                await collectFiles(fullPath, subNode, agentRoot, realAgentName);
                if (subNode.children.length > 0) parentNode.children.push(subNode);
            } else if (item.isFile() && item.name.endsWith('.md')) {
                const relativePath = path.relative(agentRoot, fullPath).replace(/\\/g, '/');
                parentNode.children.push({ name: item.name, type: 'file', path: relativePath, realAgentName });
            }
        }
    } catch (e) { /* silent */ }
}

export default {
    analyzeSystems,
    getSpecificDiff,
    getAllAgentDiffs,
    getSystemTree,
    saveFileToDisk
};
