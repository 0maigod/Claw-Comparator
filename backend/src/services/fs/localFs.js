import fs from 'fs/promises';
import path from 'path';

/**
 * Proveedor de File System para almacenamiento Local.
 * Mantiene la misma interfaz funcional esperada por diffService.
 */
export class LocalFs {
    constructor() {
        this.type = 'local';
    }

    async readdir(dirPath, options = {}) {
        return await fs.readdir(dirPath, options);
    }

    async readFile(filePath, encoding = 'utf-8') {
        return await fs.readFile(filePath, encoding);
    }

    async stat(filePath) {
        return await fs.stat(filePath);
    }

    async mkdir(dirPath, options = {}) {
        return await fs.mkdir(dirPath, options);
    }

    async writeFile(filePath, data, encoding = 'utf-8') {
        return await fs.writeFile(filePath, data, encoding);
    }

    // Path utilities
    joinPath(...parts) {
        return path.join(...parts);
    }

    relative(from, to) {
        return path.relative(from, to);
    }

    basename(p) {
        return path.basename(p);
    }

    dirname(p) {
        return path.dirname(p);
    }
}
