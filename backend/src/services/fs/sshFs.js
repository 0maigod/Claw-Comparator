import Client from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Proveedor de File System para almacenamiento remoto vía SSH/SFTP.
 * Implementa un Wrapper que cumple con Agnosticismo de Dependencias.
 */
export class SshFs {
    constructor(machineDef) {
        this.type = 'ssh';
        this.machineDef = machineDef;
        this.client = new Client();
        this.connected = false;
        this.connectionPromise = null;
    }

    async connect() {
        if (this.connected) return;
        if (this.connectionPromise) {
            await this.connectionPromise;
            return;
        }

        this.connectionPromise = (async () => {
            const config = {
                host: this.machineDef.host,
                port: this.machineDef.port || 22,
                username: this.machineDef.username,
            };

            if (this.machineDef.privateKeyPath) {
                try {
                    let keyPath = this.machineDef.privateKeyPath;
                    if (keyPath.startsWith('~')) {
                        keyPath = path.join(os.homedir(), keyPath.slice(1));
                    }
                    config.privateKey = fs.readFileSync(keyPath);
                } catch (err) {
                    console.error('[SSH FS] Error leyendo privateKeyPath:', err.message);
                }
            } else if (this.machineDef.password) {
                config.password = this.machineDef.password;
            }

            console.log(`[SSH FS] Conectando a ${config.host} ...`);
            await this.client.connect(config);
            this.connected = true;
            console.log(`[SSH FS] Conectado a ${config.host} exitosamente.`);
        })();

        await this.connectionPromise;
    }

    /**
     * Asegura que el path usa slashes posix y convierte `~/` a `./` 
     * ya que SFTP opera relativo al home dir del usuario logeado.
     */
    _normalize(p) {
        let np = p.replace(/\\/g, '/');
        if (np.startsWith('~/')) {
            np = './' + np.slice(2);
        } else if (np === '~') {
            np = './';
        }
        return np;
    }

    async readdir(dirPath, options = {}) {
        try {
            await this.connect();
        } catch (err) {
            console.error(`[SSH FS] Connection Error to ${this.machineDef.host}:`, err.message);
            throw new Error(`Connection Error: ${err.message}`);
        }

        const normPath = this._normalize(dirPath);
        
        try {
            const list = await this.client.list(normPath);
            // Convertir la salida de sftp-client al formato conFileTypes de fs
            return list.map(item => ({
                name: item.name,
                isDirectory: () => item.type === 'd',
                isFile: () => item.type === '-'
            }));
        } catch (err) {
            console.error(`[SSH FS] Error readdir '${normPath}':`, err.message);
            const error = new Error(`ENOENT: no such file or directory, scandir '${normPath}'`);
            error.code = 'ENOENT';
            throw error;
        }
    }

    async readFile(filePath, encoding = 'utf-8') {
        await this.connect();
        const normPath = this._normalize(filePath);
        try {
            const buffer = await this.client.get(normPath);
            return buffer.toString(encoding === 'utf-8' ? 'utf8' : encoding);
        } catch (err) {
            const error = new Error(`ENOENT: no such file or directory, open '${normPath}'`);
            error.code = 'ENOENT';
            throw error;
        }
    }

    async stat(filePath) {
        await this.connect();
        const normPath = this._normalize(filePath);
        try {
            const statObj = await this.client.stat(normPath);
            return {
                mtimeMs: statObj.modifyTime, 
                size: statObj.size
            };
        } catch (err) {
            const error = new Error(`ENOENT: no such file or directory, stat '${normPath}'`);
            error.code = 'ENOENT';
            throw error;
        }
    }

    async mkdir(dirPath, options = {}) {
        await this.connect();
        const normPath = this._normalize(dirPath);
        try {
            await this.client.mkdir(normPath, options.recursive || false);
        } catch (err) {
            // ignora si ya existe, tal como hace recursive: true
        }
    }

    async writeFile(filePath, data, encoding = 'utf-8') {
        await this.connect();
        const normPath = this._normalize(filePath);
        const buffer = Buffer.from(data, encoding === 'utf-8' ? 'utf8' : encoding);
        return await this.client.put(buffer, normPath);
    }

    // Path utilities (Using POSIX because SSH is mostly UNIX)
    joinPath(...parts) {
        return path.posix.join(...parts.map(p => this._normalize(p)));
    }

    relative(from, to) {
        return path.posix.relative(this._normalize(from), this._normalize(to));
    }

    basename(p) {
        return path.posix.basename(this._normalize(p));
    }

    dirname(p) {
        return path.posix.dirname(this._normalize(p));
    }
}
