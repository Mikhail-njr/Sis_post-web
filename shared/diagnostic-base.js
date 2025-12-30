/**
 * Módulo base para scripts de diagnóstico del Sistema POS
 * Proporciona funcionalidades comunes para eliminar código duplicado
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

/**
 * Cliente HTTP para hacer peticiones al servidor local
 */
class ApiClient {
    constructor(port = 3000) {
        this.port = port;
        this.host = 'localhost';
    }

    async request(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.host,
                port: this.port,
                path: '/api' + path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(result);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${result.error || body}`));
                        }
                    } catch (e) {
                        reject(new Error(`Parse error: ${e.message}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async get(path) {
        return this.request('GET', path);
    }

    async post(path, data) {
        return this.request('POST', path, data);
    }

    async put(path, data) {
        return this.request('PUT', path, data);
    }

    async delete(path) {
        return this.request('DELETE', path);
    }
}

/**
 * Clase base para diagnósticos
 */
class BaseDiagnostic {
    constructor(name) {
        this.name = name;
        this.apiClient = new ApiClient();
        this.startTime = Date.now();
        this.steps = [];
    }

    /**
     * Registra un paso del diagnóstico
     */
    logStep(stepNumber, description, data = null) {
        const step = {
            number: stepNumber,
            description,
            timestamp: new Date().toISOString(),
            data
        };
        this.steps.push(step);

        console.log(`\n📋 Paso ${stepNumber}: ${description}`);
        if (data) {
            console.log('   Datos:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
        }
    }

    /**
     * Registra información adicional
     */
    logInfo(message, data = null) {
        console.log(`   ${message}`);
        if (data) {
            console.log('   Datos:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
        }
    }

    /**
     * Registra éxito
     */
    logSuccess(message, data = null) {
        console.log(`   ✅ ${message}`);
        if (data) {
            this.logInfo('Detalles:', data);
        }
    }

    /**
     * Registra error
     */
    logError(message, error = null) {
        console.log(`   ❌ ${message}`);
        if (error) {
            console.error('   Error:', error.message);
            if (process.env.NODE_ENV === 'development') {
                console.error('   Stack:', error.stack);
            }
        }
    }

    /**
     * Imprime separador visual
     */
    printSeparator(char = '─', length = 60) {
        console.log(char.repeat(length));
    }

    /**
     * Genera y guarda reporte del diagnóstico
     */
    generateReport(results = {}) {
        const duration = Math.round((Date.now() - this.startTime) / 1000);

        const report = {
            diagnostico: this.name,
            fecha: new Date().toISOString(),
            duracion_segundos: duration,
            pasos_ejecutados: this.steps.length,
            resultados: results,
            pasos: this.steps
        };

        const reportPath = `${this.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`\n📄 Reporte guardado en: ${reportPath}`);
        return reportPath;
    }

    /**
     * Imprime resumen final
     */
    printSummary(results = {}) {
        console.log(`\n🎉 DIAGNÓSTICO COMPLETADO: ${this.name}`);
        this.printSeparator();

        Object.entries(results).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });

        const duration = Math.round((Date.now() - this.startTime) / 1000);
        console.log(`Duración: ${duration}s`);
        console.log(`Pasos ejecutados: ${this.steps.length}`);
    }

    /**
     * Ejecuta el diagnóstico (debe ser implementado por subclases)
     */
    async run() {
        throw new Error('Método run() debe ser implementado por la subclase');
    }

    /**
     * Ejecuta diagnóstico con manejo de errores
     */
    async execute() {
        console.log(`🔍 INICIANDO DIAGNÓSTICO: ${this.name}\n`);

        try {
            const results = await this.run();
            this.printSummary(results);
            const reportPath = this.generateReport(results);
            return { success: true, results, reportPath };
        } catch (error) {
            console.error(`❌ Error durante el diagnóstico ${this.name}:`, error);
            console.error('Stack trace:', error.stack);
            return { success: false, error: error.message };
        }
    }
}

/**
 * Clase base para diagnósticos que requieren acceso directo a base de datos
 */
class DatabaseDiagnostic extends BaseDiagnostic {
    constructor(name, dbPath = './backend/pos_database.sqlite') {
        super(name);
        this.dbPath = path.resolve(dbPath);
        this.db = null;
    }

    /**
     * Inicializar conexión a base de datos
     */
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    this.logError('Error conectando a SQLite', err);
                    reject(err);
                    return;
                }
                this.logSuccess('Conectado a la base de datos SQLite');
                resolve();
            });
        });
    }

    /**
     * Ejecutar query SELECT que devuelve múltiples filas
     */
    async dbAll(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Ejecutar query SELECT que devuelve una fila
     */
    async dbGet(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Ejecutar query de modificación (INSERT, UPDATE, DELETE)
     */
    async dbRun(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    /**
     * Cerrar conexión a base de datos
     */
    closeDatabase() {
        if (this.db) {
            this.db.close();
            this.logInfo('Conexión a base de datos cerrada');
        }
    }

    /**
     * Ejecutar diagnóstico con inicialización y limpieza de DB
     */
    async execute() {
        try {
            await this.initializeDatabase();
            return await super.execute();
        } finally {
            this.closeDatabase();
        }
    }
}

module.exports = {
    ApiClient,
    BaseDiagnostic,
    DatabaseDiagnostic
};