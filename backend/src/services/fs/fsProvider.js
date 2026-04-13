import { LocalFs } from './localFs.js';
import { SshFs } from './sshFs.js';
import path from 'path';
import fs from 'fs';

// Carga la configuración de máquinas
const machinesPath = path.resolve(process.cwd(), 'machines.json');
let machinesConfig = [];
try {
    if (fs.existsSync(machinesPath)) {
        machinesConfig = JSON.parse(fs.readFileSync(machinesPath, 'utf-8'));
    }
} catch (err) {
    console.error('[FS Provider] Error cargando machines.json:', err);
}

// Singleton instances for machines to reuse connections
const providerInstances = new Map();

/**
 * Normaliza un path que puede venir con el formto "machineId::path"
 * Si no tiene "::", se asume "local".
 */
export const parseSystemPath = (rawPath) => {
    if (!rawPath) return { machineId: 'local', realPath: '' };
    
    // Si somos retrocompatibles o el user mando un path local puro "C:\..."
    // (en windows C:\ no matcheara a menos que explicitly enviemos local::C:\)
    const splitter = rawPath.indexOf('::');
    if (splitter === -1) {
        return { machineId: 'local', realPath: rawPath };
    }
    
    const machineId = rawPath.substring(0, splitter);
    const realPath = rawPath.substring(splitter + 2);
    
    return { machineId, realPath };
};

/**
 * Obtiene o crea el proveedor de File System para la máquina especificada.
 */
export const getFsProvider = (machineId) => {
    if (providerInstances.has(machineId)) {
        return providerInstances.get(machineId);
    }

    const machineDef = machinesConfig.find(m => m.id === machineId) || { id: machineId, type: 'local' };
    
    let instance;
    if (machineDef.type === 'ssh') {
        instance = new SshFs(machineDef);
    } else {
        // default a local
        instance = new LocalFs();
    }
    
    providerInstances.set(machineId, instance);
    return instance;
};
