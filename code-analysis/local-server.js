const express = require('express');
const cors = require('cors');
const { LocalIndexer } = require('./local-indexer');
const { analyzeComplexity } = require('./services/indexing-utils.service');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Instancia del indexador
let indexer = null;

// Inicializar indexador
async function initializeIndexer() {
    try {
        indexer = new LocalIndexer('./code-index.db');
        await indexer.initialize();
        console.log('✅ Indexador local inicializado');
    } catch (error) {
        console.error('❌ Error inicializando indexador:', error.message);
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            indexer: indexer ? 'ready' : 'not ready',
            database: indexer?.isInitialized ? 'connected' : 'disconnected'
        }
    });
});

// API info
app.get('/api', (req, res) => {
    res.json({
        message: 'Local Code Analysis API Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /health': 'Health check',
            'POST /api/search/similar': 'Search similar code',
            'GET /api/stats': 'Get statistics',
            'POST /api/analyze/complexity': 'Analyze code complexity',
            'POST /api/index/codebase': 'Index entire codebase',
            'POST /api/index/file': 'Index single file'
        },
        timestamp: new Date().toISOString()
    });
});

// Buscar código similar
app.post('/api/search/similar', async (req, res) => {
    try {
        if (!indexer) {
            return res.status(503).json({ error: 'Indexador no inicializado' });
        }

        const { query, limit = 10 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Se requiere un query de búsqueda' });
        }

        const results = await indexer.searchSimilar(query, parseInt(limit));

        res.json({
            success: true,
            results,
            query,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en búsqueda:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        if (!indexer) {
            return res.status(503).json({ error: 'Indexador no inicializado' });
        }

        const stats = await indexer.getStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Análisis de complejidad
app.post('/api/analyze/complexity', (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Se requiere contenido para analizar' });
        }

        const analysis = analyzeComplexity(content);

        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en análisis:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Indexar archivo individual
app.post('/api/index/file', async (req, res) => {
    try {
        if (!indexer) {
            return res.status(503).json({ error: 'Indexador no inicializado' });
        }

        const { filePath, basePath = '../' } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'Se requiere ruta de archivo' });
        }

        const success = await indexer.indexFile(filePath, basePath);

        res.json({
            success,
            filePath,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error indexando archivo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Indexar codebase completo
app.post('/api/index/codebase', async (req, res) => {
    try {
        if (!indexer) {
            return res.status(503).json({ error: 'Indexador no inicializado' });
        }

        const { basePath = '../', excludePatterns = ['node_modules', '.git', 'logs', 'excluded'] } = req.body;

        console.log('📊 Iniciando indexación del codebase...');

        // Limpiar índice anterior
        await indexer.clearIndex();

        // Importar y ejecutar indexación
        const { indexCodebase } = require('./local-indexer');
        await indexCodebase(basePath, excludePatterns);

        // Obtener estadísticas finales
        const stats = await indexer.getStats();

        res.json({
            success: true,
            result: {
                totalFiles: stats.total_files,
                processedFiles: stats.total_files,
                errors: 0,
                indexedPatterns: stats.total_words
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error indexando codebase:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Ejecutar comandos de indexación
app.post('/api/command', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Se requiere un comando' });
        }

        const { exec } = require('child_process');
        const path = require('path');

        // Comandos permitidos
        const allowedCommands = {
            'index': 'node local-indexer.js --index',
            'clear': 'node local-indexer.js --clear',
            'clear-and-index': 'node local-indexer.js --clear && node local-indexer.js --index',
            'stats': 'node -e "const { LocalIndexer } = require(\'./local-indexer\'); const idx = new LocalIndexer(); idx.initialize().then(async () => { const stats = await idx.getStats(); console.log(JSON.stringify(stats, null, 2)); idx.close(); })"',
            'health': 'node -e "console.log(\'Servidor verificado\')"'
        };

        const cmd = allowedCommands[command];
        if (!cmd) {
            return res.status(400).json({
                error: 'Comando no permitido',
                available: Object.keys(allowedCommands)
            });
        }

        console.log(`🚀 Ejecutando comando: ${command}`);
        console.log(`📋 Comando: ${cmd}`);

        exec(cmd, {
            cwd: path.join(__dirname),
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        }, (error, stdout, stderr) => {
            const result = {
                success: !error,
                command: command,
                timestamp: new Date().toISOString(),
                output: stdout || stderr || '',
                error: error ? error.message : null
            };

            if (error) {
                console.error(`❌ Error: ${error.message}`);
            } else {
                console.log(`✅ Comando completado exitosamente`);
            }

            res.json(result);
        });

    } catch (error) {
        console.error('Error ejecutando comando:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Análisis de archivo individual (para compatibilidad con VS Code extension)
app.post('/api/analyze/file', async (req, res) => {
    try {
        const { filePath, content, language } = req.body;

        if (!content && !filePath) {
            return res.status(400).json({ error: 'Se requiere contenido o ruta de archivo' });
        }

        const fileContent = content || require('fs').readFileSync(filePath, 'utf8');
        const analysis = analyzeComplexity(fileContent, filePath);

        // Análisis adicional simple
        const lines = fileContent.split('\n').length;
        const functions = (fileContent.match(/function\s+\w+/g) || []).length;
        const classes = (fileContent.match(/class\s+\w+/g) || []).length;
        const imports = (fileContent.match(/import\s+|require\s*\(/g) || []).length;
        const comments = (fileContent.match(/\/\/.*$|\/\*[\s\S]*?\*\//gm) || []).length;

        // Detección simple de problemas
        const issues = [];
        const suggestions = [];

        // Problemas básicos
        if (lines > 500) {
            issues.push({
                message: 'Archivo muy largo',
                severity: 'medium',
                type: 'complexity'
            });
        }

        if (functions > 20) {
            issues.push({
                message: 'Muchas funciones en un archivo',
                severity: 'low',
                type: 'structure'
            });
        }

        // Sugerencias
        if (comments / lines < 0.1) {
            suggestions.push({
                message: 'Considera agregar más comentarios',
                priority: 'low',
                category: 'documentation'
            });
        }

        const result = {
            metrics: {
                lines,
                functions,
                classes,
                imports,
                comments
            },
            complexity: {
                score: analysis.complexity_score,
                level: analysis.level
            },
            issues,
            suggestions
        };

        res.json({
            success: true,
            analysis: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analizando archivo:', error.message);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando servicios...');
    if (indexer) {
        indexer.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Recibida señal SIGINT, cerrando servicios...');
    if (indexer) {
        indexer.close();
    }
    process.exit(0);
});

// Iniciar servidor
async function startServer() {
    try {
        await initializeIndexer();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor de análisis de código local ejecutándose en puerto ${PORT}`);
            console.log(`🔍 API disponible en: http://localhost:${PORT}/api`);
            console.log(`📊 Base de datos: ./code-index.db`);
        });

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

startServer();