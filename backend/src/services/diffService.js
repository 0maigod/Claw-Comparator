import { diffLines } from 'diff';
import { getFsProvider, parseSystemPath } from './fs/fsProvider.js';

/**
 * Obtiene recursivamente todos los archivos .md asociados a un agente
 */
async function getMarkdownFiles(fsObj, dir, agentName, baseDir = dir) {
    let filesMap = {};
    try {
        const list = await fsObj.readdir(dir); // expected to optionally behave like withFileTypes
        for (const item of list) {
            const fullPath = fsObj.joinPath(dir, item.name);
            if (item.isDirectory()) {
                filesMap = { ...filesMap, ...(await getMarkdownFiles(fsObj, fullPath, agentName, baseDir)) };
            } else if (item.isFile() && item.name.endsWith('.md')) {
                // Normalizamos a '/' siempre internamente para las llaves del mapa
                let relativePath = fsObj.relative(baseDir, fullPath).replace(/\\/g, '/');
                filesMap[relativePath] = fullPath;
            }
        }
    } catch (e) {
        // Directorio puede estar vacío o no accesible temporalmente
    }
    return filesMap;
}

/**
 * Recorre recursivamente un directorio buscando subcarpetas de agentes
 * Retorna { [agentName]: { [fileName]: fullPath } }
 */
async function scanSystemAgents(systemPath) {
    const { machineId, realPath } = parseSystemPath(systemPath);
    const fsObj = getFsProvider(machineId);
    const agents = {};
    try {
        const filesAndDirs = await fsObj.readdir(realPath, { withFileTypes: true });
        for (const item of filesAndDirs) {
            if (item.isDirectory() && item.name.toLowerCase().startsWith('workspace')) {
                const agentName = item.name;
                agents[agentName] = await getMarkdownFiles(fsObj, fsObj.joinPath(realPath, agentName), agentName);
            }
        }
    } catch (e) {
        throw new Error(`Error escaneando el sistema: ${systemPath}. Verifique la ruta y la conexión.`);
    }
    return { agents, fsObj };
}

/**
 * Motor inmutable: Evalúa variaciones entre el Agente A y el Agente B.
 */
async function compareAgentData(agentName, mapA, mapB, fsA, fsB) {
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
            const textB = await fsB.readFile(pathB, 'utf-8');
            metrics.lines_added += textB.split(/\r?\n/).length;
            totalLinesAnalyzed += metrics.lines_added;
            continue;
        }

        if (!pathB) {
            metrics.files_removed += 1; // Solo existe en A (fue eliminado)
            const textA = await fsA.readFile(pathA, 'utf-8');
            metrics.lines_removed += textA.split(/\r?\n/).length;
            totalLinesAnalyzed += metrics.lines_removed;
            continue;
        }

        // Ambos existen. Comparar textualmente (Diffing)
        const textA = await fsA.readFile(pathA, 'utf-8');
        const textB = await fsB.readFile(pathB, 'utf-8');

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

    const totalAltered = metrics.lines_added + metrics.lines_removed;
    if (totalLinesAnalyzed > 0) {
        metrics.variation_percentage = (totalAltered / totalLinesAnalyzed) * 100;
    }

    return { metrics, totalLinesAnalyzed };
}

async function getSystemMetadata(systemPath) {
    const { machineId, realPath } = parseSystemPath(systemPath);
    const fsObj = getFsProvider(machineId);

    let maxMTime = 0;
    let mdCount = 0;

    async function walk(dir) {
        try {
            const list = await fsObj.readdir(dir, { withFileTypes: true });
            for (const item of list) {
                const fullPath = fsObj.joinPath(dir, item.name);
                if (item.isDirectory()) {
                    await walk(fullPath);
                } else if (item.isFile() && item.name.endsWith('.md')) {
                    mdCount++;
                    const stat = await fsObj.stat(fullPath);
                    if (stat.mtimeMs > maxMTime) maxMTime = stat.mtimeMs;
                }
            }
        } catch (e) { /* ignore */ }
    }
    
    await walk(realPath);
    return { 
        lastUpdatedDate: maxMTime > 0 ? new Date(maxMTime).toISOString() : null, 
        mdCount 
    };
}

export const analyzeSystems = async (sysA_Path, sysB_Path) => {
    const { agents: agentsA, fsObj: fsA } = await scanSystemAgents(sysA_Path);
    const { agents: agentsB, fsObj: fsB } = await scanSystemAgents(sysB_Path);

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
        
        const { metrics, totalLinesAnalyzed } = await compareAgentData(agentName, mapA, mapB, fsA, fsB);
        
        results.agentMetrics.push(metrics);
        results.total_files_analyzed += (Object.keys(mapA).length + metrics.files_added);
        results.total_lines_analyzed += totalLinesAnalyzed;
    }

    let totalVariation = results.agentMetrics.reduce((acc, curr) => acc + curr.variation_percentage, 0);
    if (results.agentMetrics.length > 0) {
        results.global_variation_score = totalVariation / results.agentMetrics.length;
    }

    return results;
};

export const getSpecificDiff = async (sysA_Path, sysB_Path, agentName, relativeFilePath) => {
    const parsedA = parseSystemPath(sysA_Path);
    const parsedB = parseSystemPath(sysB_Path);
    const fsA = getFsProvider(parsedA.machineId);
    const fsB = getFsProvider(parsedB.machineId);

    const pathA = fsA.joinPath(parsedA.realPath, agentName, relativeFilePath);
    const pathB = fsB.joinPath(parsedB.realPath, agentName, relativeFilePath);

    let textA = '', textB = '';

    try { textA = await fsA.readFile(pathA, 'utf-8'); } catch (e) { }
    try { textB = await fsB.readFile(pathB, 'utf-8'); } catch (e) { }

    return { textA, textB };
};

export const saveFileToDisk = async (sysPath, agentName, relativeFilePath, newContent) => {
    const { machineId, realPath } = parseSystemPath(sysPath);
    const fsObj = getFsProvider(machineId);
    
    const fullPath = fsObj.joinPath(realPath, agentName, relativeFilePath);
    await fsObj.mkdir(fsObj.dirname(fullPath), { recursive: true });
    await fsObj.writeFile(fullPath, newContent, 'utf-8');
};

export const deleteFileFromDisk = async (sysPath, agentName, relativeFilePath) => {
    const { machineId, realPath } = parseSystemPath(sysPath);
    const fsObj = getFsProvider(machineId);
    
    const fullPath = fsObj.joinPath(realPath, agentName, relativeFilePath);
    try {
        await fsObj.unlink(fullPath);
    } catch(err) {
        console.error(`[DiffService] Error deleting file ${fullPath}:`, err.message);
        throw err;
    }
};

export const getAllAgentDiffs = async (sysA_Path, sysB_Path, agentName) => {
    const { agents: agentsA, fsObj: fsA } = await scanSystemAgents(sysA_Path);
    const { agents: agentsB, fsObj: fsB } = await scanSystemAgents(sysB_Path);
    
    const mapA = agentsA[agentName] || {};
    const mapB = agentsB[agentName] || {};
    const allKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    
    let allDiffs = [];
    
    for (const relativePath of allKeys) {
        const pathA = mapA[relativePath];
        const pathB = mapB[relativePath];
        let textA = '', textB = '';
        if (pathA) try { textA = await fsA.readFile(pathA, 'utf-8'); } catch (e) {}
        if (pathB) try { textB = await fsB.readFile(pathB, 'utf-8'); } catch (e) {}
        
        if (textA === textB) continue; 
        
        const diffs = diffLines(textA, textB);
        allDiffs.push({ path: relativePath, diffs });
    }
    return allDiffs;
};

async function collectFiles(fsObj, dir, parentNode, agentRoot, realAgentName) {
    try {
        const items = await fsObj.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = fsObj.joinPath(dir, item.name);
            if (item.isDirectory()) {
                const subNode = { name: item.name, type: 'folder', children: [] };
                await collectFiles(fsObj, fullPath, subNode, agentRoot, realAgentName);
                if (subNode.children.length > 0) parentNode.children.push(subNode);
            } else if (item.isFile() && item.name.endsWith('.md')) {
                const relativePath = fsObj.relative(agentRoot, fullPath).replace(/\\/g, '/');
                parentNode.children.push({ name: item.name, type: 'file', path: relativePath, realAgentName });
            }
        }
    } catch (e) { /* silent */ }
}

/**
 * Genera un árbol de estructura { name, children } para el organigrama.
 * Raíz = nombre del sistema, hijos = agentes, nietos = archivos .md
 */
export const getSystemTree = async (systemPath) => {
    const { machineId, realPath } = parseSystemPath(systemPath);
    const fsObj = getFsProvider(machineId);

    const systemName = fsObj.basename(realPath);
    const rootNode = { name: systemName, type: 'system', children: [] };

    try {
        const agentDirs = await fsObj.readdir(realPath, { withFileTypes: true });
        for (const item of agentDirs) {
            if (!item.isDirectory() || !item.name.toLowerCase().startsWith('workspace')) continue;
            const agentPath = fsObj.joinPath(realPath, item.name);
            const agentNode = { name: item.name, type: 'agent', children: [] };

            // Extraer alias desde IDENTITY.md si existe
            try {
                const identityPath = fsObj.joinPath(agentPath, 'IDENTITY.md');
                const identityContent = await fsObj.readFile(identityPath, 'utf-8');
                const aliasMatch = identityContent.match(/^alias:\s*(.+)$/im) || identityContent.match(/^nombre corto:\s*(.+)$/im);
                if (aliasMatch && aliasMatch[1]) {
                    agentNode.alias = aliasMatch[1].trim();
                }
            } catch (e) { /* ignorar silenciosamente si no existe */ }

            // Recursively collect .md files
            await collectFiles(fsObj, agentPath, agentNode, agentPath, item.name);
            rootNode.children.push(agentNode);
        }
    } catch (e) {
        // System path may be inaccessible — return empty tree gracefully
    }

    return rootNode;
};

export const moveSystemFile = async (sysPath, agentName, relativeFilePath, newAgentName, newRelativeFilePath) => {
    const { machineId, realPath } = parseSystemPath(sysPath);
    const fsObj = getFsProvider(machineId);

    const oldPath = fsObj.joinPath(realPath, agentName, relativeFilePath);
    const newPath = fsObj.joinPath(realPath, newAgentName, newRelativeFilePath);
    
    await fsObj.mkdir(fsObj.dirname(newPath), { recursive: true });
    await fsObj.rename(oldPath, newPath);
};

export const copySystemFile = async (sysPath, agentName, relativeFilePath, newAgentName, newRelativeFilePath) => {
    const { machineId, realPath } = parseSystemPath(sysPath);
    const fsObj = getFsProvider(machineId);

    const oldPath = fsObj.joinPath(realPath, agentName, relativeFilePath);
    const newPath = fsObj.joinPath(realPath, newAgentName, newRelativeFilePath);
    
    await fsObj.mkdir(fsObj.dirname(newPath), { recursive: true });
    await fsObj.copy(oldPath, newPath);
};

export const getFolderFiles = async (sysPath, agentName, folderRelativePath) => {
    const { machineId, realPath } = parseSystemPath(sysPath);
    const fsObj = getFsProvider(machineId);

    const basePath = folderRelativePath && folderRelativePath !== '/' 
        ? fsObj.joinPath(realPath, agentName, folderRelativePath) 
        : fsObj.joinPath(realPath, agentName);

    let files = [];
    async function walk(dir, relOuterPath) {
        try {
            const list = await fsObj.readdir(dir, { withFileTypes: true });
            for (const item of list) {
                const fullPath = fsObj.joinPath(dir, item.name);
                const itemRelPath = relOuterPath ? `${relOuterPath}/${item.name}` : item.name;
                if (item.isDirectory()) {
                    await walk(fullPath, itemRelPath);
                } else if (item.isFile()) {
                    files.push({ name: itemRelPath, fullPath });
                }
            }
        } catch (e) {
            // ignore
        }
    }
    
    await walk(basePath, '');
    
    for (const f of files) {
         try {
             f.content = await fsObj.readFile(f.fullPath, 'utf8');
         } catch(e) { f.content = ''; }
    }
    
    return files;
};

export default {
    analyzeSystems,
    getSpecificDiff,
    getAllAgentDiffs,
    getSystemTree,
    saveFileToDisk,
    deleteFileFromDisk,
    moveSystemFile,
    copySystemFile,
    getFolderFiles
};
