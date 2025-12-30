const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');

// Importar servicios
const { QdrantService } = require('./services/qdrant.service');
const { EmbeddingService } = require('./services/embedding.service');
const { CodeAnalyzer } = require('./services/code-analyzer.service');
const { PatternDetector } = require('./services/pattern-detector.service');

// Configuración del logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'code-analysis' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Crear directorio de logs
fs.ensureDirSync('logs');

// Inicializar servicios
let qdrantService;
let embeddingService;
let codeAnalyzer;
let patternDetector;

async function initializeServices() {
    try {
        logger.info('🚀 Inicializando servicios de análisis de código...');

        // Inicializar Qdrant
        qdrantService = new QdrantService({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY
        });

        // Inicializar servicio de embeddings
        embeddingService = new EmbeddingService();

        // Inicializar analizador de código
        codeAnalyzer = new CodeAnalyzer(qdrantService, embeddingService);

        // Inicializar detector de patrones
        patternDetector = new PatternDetector(qdrantService, embeddingService);

        logger.info('✅ Servicios inicializados correctamente');
    } catch (error) {
        logger.error('❌ Error inicializando servicios:', error);
        throw error;
    }
}

// Middleware de logging de requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            qdrant: qdrantService ? 'connected' : 'disconnected',
            embeddings: embeddingService ? 'ready' : 'not ready',
            analyzer: codeAnalyzer ? 'ready' : 'not ready'
        }
    });
});

// API Routes

// 1. Análisis de archivos individuales
app.post('/api/analyze/file', async (req, res) => {
    try {
        const { filePath, content, language } = req.body;

        if (!content && !filePath) {
            return res.status(400).json({ error: 'Se requiere contenido o ruta de archivo' });
        }

        const fileContent = content || await fs.readFile(filePath, 'utf8');
        const analysis = await codeAnalyzer.analyzeFile(fileContent, language || 'javascript');

        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error analizando archivo:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 2. Búsqueda de patrones similares
app.post('/api/search/similar', async (req, res) => {
    try {
        const { query, language, limit = 10, threshold = 0.7 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Se requiere una consulta de búsqueda' });
        }

        const results = await patternDetector.findSimilarPatterns(query, {
            language,
            limit: parseInt(limit),
            threshold: parseFloat(threshold)
        });

        res.json({
            success: true,
            results,
            query,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error buscando patrones similares:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 3. Detección de errores potenciales
app.post('/api/analyze/errors', async (req, res) => {
    try {
        const { content, language } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Se requiere contenido para analizar' });
        }

        const errors = await codeAnalyzer.detectPotentialErrors(content, language);

        res.json({
            success: true,
            errors,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error detectando errores:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 4. Sugerencias de mejora
app.post('/api/suggestions/improvements', async (req, res) => {
    try {
        const { content, language, context } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Se requiere contenido para analizar' });
        }

        const suggestions = await codeAnalyzer.suggestImprovements(content, language, context);

        res.json({
            success: true,
            suggestions,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error generando sugerencias:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 5. Indexar codebase completo
app.post('/api/index/codebase', async (req, res) => {
    try {
        const { basePath = '../', excludePatterns = ['node_modules', '.git', 'logs'] } = req.body;

        logger.info('📊 Iniciando indexación del codebase...');

        const result = await codeAnalyzer.indexCodebase(basePath, excludePatterns);

        res.json({
            success: true,
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error indexando codebase:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 6. Estadísticas del análisis
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await qdrantService.getCollectionStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 7. Análisis de complejidad
app.post('/api/analyze/complexity', async (req, res) => {
    try {
        const { content, language } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Se requiere contenido para analizar' });
        }

        const complexity = await codeAnalyzer.analyzeComplexity(content, language);

        res.json({
            success: true,
            complexity,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error analizando complejidad:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// 8. Búsqueda semántica en el código
app.post('/api/search/semantic', async (req, res) => {
    try {
        const { query, filters = {}, limit = 20 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Se requiere una consulta de búsqueda' });
        }

        const results = await patternDetector.semanticSearch(query, filters, limit);

        res.json({
            success: true,
            results,
            query,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error en búsqueda semántica:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Error no manejado:', error);
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
    logger.info('🛑 Recibida señal SIGTERM, cerrando servicios...');

    if (qdrantService) {
        await qdrantService.close();
    }

    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('🛑 Recibida señal SIGINT, cerrando servicios...');

    if (qdrantService) {
        await qdrantService.close();
    }

    process.exit(0);
});

// Iniciar servidor
async function startServer() {
    try {
        await initializeServices();

        app.listen(PORT, () => {
            logger.info(`🚀 Servidor de análisis de código ejecutándose en puerto ${PORT}`);
            logger.info(`📊 Qdrant disponible en: ${process.env.QDRANT_URL || 'http://localhost:6333'}`);
            logger.info(`🔍 API disponible en: http://localhost:${PORT}/api`);
        });

    } catch (error) {
        logger.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

startServer();