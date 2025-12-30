const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { QDRANT_URL, generateSimpleVector, analyzeComplexity, searchSimilar, getCollectionStats } = require('./services/indexing-utils.service');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            qdrant: 'connected',
            server: 'running'
        }
    });
});

// API info
app.get('/api', (req, res) => {
    res.json({
        message: 'Code Analysis API Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /health': 'Health check',
            'POST /api/search/similar': 'Search similar code',
            'GET /api/stats': 'Get statistics',
            'POST /api/analyze/complexity': 'Analyze code complexity'
        },
        timestamp: new Date().toISOString()
    });
});

// Buscar código similar
app.post('/api/search/similar', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Se requiere un query de búsqueda' });
        }

        const results = await searchSimilar(query, parseInt(limit));

        res.json({
            success: true,
            results,
            query,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en búsqueda:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const totalPoints = await getCollectionStats();

        res.json({
            success: true,
            stats: {
                total_points: totalPoints,
                collections: ['code_patterns', 'error_patterns', 'function_signatures', 'code_complexity', 'semantic_search']
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Análisis simple de complejidad
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
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de análisis de código ejecutándose en puerto ${PORT}`);
    console.log(`📊 Qdrant disponible en: ${QDRANT_URL}`);
    console.log(`🔍 API disponible en: http://localhost:${PORT}/api`);
});

module.exports = app;