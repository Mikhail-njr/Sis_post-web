const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const glob = require('glob');
const { analyzeComplexity } = require('./services/indexing-utils.service');

/**
 * Indexador local usando SQLite en lugar de Qdrant
 */
class LocalIndexer {
    constructor(dbPath = './code-index.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar la base de datos
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error abriendo base de datos:', err.message);
                    reject(err);
                    return;
                }

                console.log('✅ Base de datos conectada');

                // Crear tablas
                this.createTables()
                    .then(() => {
                        this.isInitialized = true;
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    /**
     * Crear tablas de la base de datos
     */
    async createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE,
                file_name TEXT,
                extension TEXT,
                content TEXT,
                size INTEGER,
                indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_modified DATETIME,
                lines INTEGER,
                functions INTEGER,
                classes INTEGER,
                complexity_score INTEGER,
                complexity_level TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT,
                file_id INTEGER,
                line_number INTEGER,
                context TEXT,
                FOREIGN KEY (file_id) REFERENCES files (id)
            )`,
            `CREATE TABLE IF NOT EXISTS search_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT UNIQUE,
                results TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)`,
            `CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path)`,
            `CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension)`
        ];

        for (const query of queries) {
            await this.runQuery(query);
        }
    }

    /**
     * Ejecutar una consulta SQL
     */
    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    /**
     * Ejecutar una consulta SELECT
     */
    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Ejecutar una consulta SELECT que devuelve múltiples filas
     */
    allQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Indexar un archivo individual
     */
    async indexFile(filePath, basePath = '../') {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ Archivo no encontrado: ${filePath}`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            const extension = path.extname(filePath);
            const relativePath = path.relative(basePath, filePath);
            const stats = fs.statSync(filePath);

            // Análisis de complejidad
            const complexity = analyzeComplexity(content, filePath);

            // Insertar/actualizar archivo
            const result = await this.runQuery(
                `INSERT OR REPLACE INTO files
                (file_path, file_name, extension, content, size, last_modified, lines, functions, classes, complexity_score, complexity_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    relativePath,
                    fileName,
                    extension,
                    content.substring(0, 10000), // Limitar contenido almacenado
                    content.length,
                    stats.mtime.toISOString(),
                    complexity.lines,
                    complexity.functions,
                    complexity.classes,
                    complexity.complexity_score,
                    complexity.level
                ]
            );

            const fileId = result.lastID;

            // Indexar palabras (solo palabras significativas)
            await this.indexWords(content, fileId);

            console.log(`✅ Indexado: ${relativePath} (${content.length} chars)`);
            return true;

        } catch (error) {
            console.error(`❌ Error indexando ${filePath}:`, error.message);
            return false;
        }
    }

    /**
     * Indexar palabras de un archivo
     */
    async indexWords(content, fileId) {
        // Primero eliminar palabras existentes para este archivo
        await this.runQuery('DELETE FROM words WHERE file_id = ?', [fileId]);

        const lines = content.split('\n');
        const words = [];

        lines.forEach((line, lineIndex) => {
            // Extraer palabras significativas (variables, funciones, etc.)
            const matches = line.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g);
            if (matches) {
                matches.forEach(word => {
                    if (word.length > 2) { // Solo palabras de más de 2 caracteres
                        words.push({
                            word: word.toLowerCase(),
                            lineNumber: lineIndex + 1,
                            context: line.trim().substring(0, 100)
                        });
                    }
                });
            }
        });

        // Insertar palabras en lotes
        for (let i = 0; i < words.length; i += 100) {
            const batch = words.slice(i, i + 100);
            const values = batch.map(w => `(${fileId}, '${w.word}', ${w.lineNumber}, '${w.context.replace(/'/g, "''")}')`).join(', ');
            if (values) {
                await this.runQuery(`INSERT INTO words (file_id, word, line_number, context) VALUES ${values}`);
            }
        }
    }

    /**
     * Buscar código similar
     */
    async searchSimilar(query, limit = 10) {
        try {
            // Verificar caché primero
            const cached = await this.getQuery('SELECT results FROM search_cache WHERE query = ? AND created_at > datetime("now", "-1 hour")', [query]);
            if (cached) {
                return JSON.parse(cached.results);
            }

            const words = query.toLowerCase().match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
            if (words.length === 0) {
                return [];
            }

            // Buscar archivos que contengan estas palabras
            const wordConditions = words.map(() => 'w.word = ?').join(' OR ');
            const params = words;

            const sql = `
                SELECT f.file_path, f.file_name, f.extension, f.lines, f.complexity_score,
                       COUNT(DISTINCT w.word) as matches,
                       GROUP_CONCAT(DISTINCT w.word) as matched_words,
                       f.content as preview
                FROM files f
                INNER JOIN words w ON f.id = w.file_id
                WHERE ${wordConditions}
                GROUP BY f.id
                ORDER BY matches DESC, f.complexity_score DESC
                LIMIT ?
            `;

            const results = await this.allQuery(sql, [...params, limit]);

            // Formatear resultados
            const formattedResults = results.map(row => ({
                file_path: row.file_path,
                file_name: row.file_name,
                extension: row.extension,
                score: row.matches / words.length, // Score basado en coincidencias
                matches: row.matches,
                matched_words: row.matched_words.split(','),
                preview: row.preview.substring(0, 200),
                lines: row.lines,
                complexity_score: row.complexity_score
            }));

            // Guardar en caché
            await this.runQuery('INSERT OR REPLACE INTO search_cache (query, results) VALUES (?, ?)', [query, JSON.stringify(formattedResults)]);

            return formattedResults;

        } catch (error) {
            console.error('Error en búsqueda:', error.message);
            return [];
        }
    }

    /**
     * Obtener estadísticas
     */
    async getStats() {
        try {
            const fileStats = await this.getQuery('SELECT COUNT(*) as total_files, SUM(size) as total_size FROM files');
            const wordStats = await this.getQuery('SELECT COUNT(*) as total_words, COUNT(DISTINCT word) as unique_words FROM words');

            return {
                total_files: fileStats.total_files || 0,
                total_size: fileStats.total_size || 0,
                total_words: wordStats.total_words || 0,
                unique_words: wordStats.unique_words || 0,
                database_size: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Limpiar índice
     */
    async clearIndex() {
        try {
            await this.runQuery('DELETE FROM words');
            await this.runQuery('DELETE FROM files');
            await this.runQuery('DELETE FROM search_cache');
            await this.runQuery('VACUUM'); // Optimizar base de datos
            console.log('🗑️ Índice limpiado');
        } catch (error) {
            console.error('Error limpiando índice:', error.message);
        }
    }

    /**
     * Cerrar conexión
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('🔌 Conexión a base de datos cerrada');
        }
    }
}

/**
 * Función para indexar codebase completo
 */
async function indexCodebase(basePath = '../', excludePatterns = ['node_modules', '.git', 'logs', 'excluded']) {
    const indexer = new LocalIndexer('./code-index.db');

    try {
        await indexer.initialize();

        console.log('🚀 Iniciando indexación del codebase...');
        console.log(`📁 Directorio base: ${basePath}`);

        // Construir patrón glob con exclusiones
        const extensions = ['js', 'json', 'sql', 'html', 'css', 'md', 'py', 'java', 'cpp', 'c', 'php'];
        const patterns = extensions.map(ext => `${basePath}/**/*.${ext}`);

        let allFiles = [];
        for (const pattern of patterns) {
            const files = glob.sync(pattern, { nodir: true });
            allFiles = allFiles.concat(files);
        }

        // Filtrar archivos
        const filteredFiles = allFiles.filter(file => {
            const relativePath = path.relative(basePath, file);
            return !excludePatterns.some(pattern =>
                relativePath.startsWith(pattern + path.sep) ||
                relativePath.includes(path.sep + pattern + path.sep)
            );
        });

        console.log(`📊 Encontrados ${filteredFiles.length} archivos para indexar`);

        // Procesar archivos
        let indexed = 0;
        let errors = 0;

        for (let i = 0; i < filteredFiles.length; i++) {
            const file = filteredFiles[i];
            const success = await indexer.indexFile(file, basePath);

            if (success) {
                indexed++;
            } else {
                errors++;
            }

            // Mostrar progreso cada 10 archivos
            if ((i + 1) % 10 === 0) {
                console.log(`📈 Progreso: ${i + 1}/${filteredFiles.length} archivos procesados`);
            }
        }

        console.log(`\n🎉 Indexación completada:`);
        console.log(`   ✅ Archivos indexados: ${indexed}`);
        console.log(`   ❌ Errores: ${errors}`);

        const stats = await indexer.getStats();
        console.log(`   📊 Total de palabras indexadas: ${stats.total_words}`);

    } catch (error) {
        console.error('❌ Error en la indexación:', error.message);
    } finally {
        indexer.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--index')) {
        indexCodebase();
    } else if (args.includes('--clear')) {
        const indexer = new LocalIndexer('./code-index.db');
        indexer.initialize().then(() => {
            return indexer.clearIndex();
        }).then(() => {
            indexer.close();
        });
    } else {
        console.log('Uso:');
        console.log('  node local-indexer.js --index    # Indexar codebase');
        console.log('  node local-indexer.js --clear    # Limpiar índice');
    }
}

module.exports = { LocalIndexer, indexCodebase };