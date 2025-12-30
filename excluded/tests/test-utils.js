/**
 * Utilidades comunes para tests
 */

// Importar utilidades compartidas
const { isValidEAN13 } = require('../shared/barcode-utils');

// Configuración de API
const API_BASE = 'http://localhost:3000/api';

/**
 * Función auxiliar para hacer requests a la API
 * @param {string} endpoint - Endpoint de la API
 * @param {object} options - Opciones del request
 * @returns {Promise<object>} Respuesta JSON de la API
 */
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (!options.headers || !options.headers.Authorization) {
        headers['Authorization'] = 'Basic ' + Buffer.from('admin:pos123').toString('base64');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers,
        ...options
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

module.exports = {
    apiRequest,
    isValidEAN13,
    API_BASE
};