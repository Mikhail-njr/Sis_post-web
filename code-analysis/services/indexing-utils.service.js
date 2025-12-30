/**
 * Utilidades compartidas para indexación y búsqueda de código
 * Extraído de archivos duplicados para reducir código repetido
 */

const axios = require('axios');

// Configuración común
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const VECTOR_SIZE = 384;

/**
 * Genera un vector simple basado en hash del contenido
 * @param {string} content - Contenido a vectorizar
 * @param {number} size - Tamaño del vector (default: 384)
 * @returns {number[]} Vector normalizado entre -1 y 1
 */
function generateSimpleVector(content, size = VECTOR_SIZE) {
    const hash = simpleHash(content);
    const vector = [];
    for (let i = 0; i < size; i++) {
        vector.push((hash * (i + 1)) % 2 - 1); // Valores entre -1 y 1
    }
    return vector;
}

/**
 * Función de hash simple para generar valores consistentes
 * @param {string} str - String a hashear
 * @returns {number} Valor hash normalizado entre 0 y 1
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a 32 bits
    }
    return Math.abs(hash) / 0x7FFFFFFF; // Normalizar entre 0 y 1
}

/**
 * Analiza la complejidad básica del código
 * @param {string} content - Contenido del archivo
 * @param {string} filePath - Ruta del archivo (opcional)
 * @returns {object} Análisis de complejidad
 */
function analyzeComplexity(content, filePath = '') {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const ifStatements = (content.match(/\bif\s*\(/g) || []).length;
    const loops = (content.match(/\b(for|while)\s*\(/g) || []).length;

    let complexity = 1; // Base
    complexity += functions * 2;
    complexity += classes * 3;
    complexity += ifStatements * 1;
    complexity += loops * 2;

    return {
        lines,
        functions,
        classes,
        if_statements: ifStatements,
        loops,
        complexity_score: complexity,
        level: complexity < 10 ? 'low' : complexity < 25 ? 'medium' : 'high'
    };
}

/**
 * Busca código similar usando Qdrant
 * @param {string} query - Consulta de búsqueda
 * @param {number} limit - Número máximo de resultados
 * @returns {Promise<Array>} Resultados de búsqueda
 */
async function searchSimilar(query, limit = 5) {
    try {
        const vector = generateSimpleVector(query);

        const response = await axios.post(`${QDRANT_URL}/collections/code_patterns/points/search`, {
            vector: vector,
            limit: limit,
            with_payload: true,
            with_vector: false
        });

        return response.data.result;
    } catch (error) {
        console.error('Error en búsqueda:', error.response?.data || error.message);
        return [];
    }
}

/**
 * Obtiene estadísticas de la colección
 * @returns {Promise<number>} Número total de puntos
 */
async function getCollectionStats() {
    try {
        const response = await axios.post(`${QDRANT_URL}/collections/code_patterns/points/count`, {});
        return response.data.result?.count || 0;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error.message);
        return 0;
    }
}

/**
 * Verifica la conectividad con Qdrant
 * @returns {Promise<boolean>} True si está disponible
 */
async function checkQdrantHealth() {
    try {
        await axios.get(`${QDRANT_URL}`);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    QDRANT_URL,
    VECTOR_SIZE,
    generateSimpleVector,
    simpleHash,
    analyzeComplexity,
    searchSimilar,
    getCollectionStats,
    checkQdrantHealth
};