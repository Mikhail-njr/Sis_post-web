const axios = require('axios');

const QDRANT_URL = 'http://localhost:6333';

async function createCollection(collectionName, vectorSize = 384) {
    try {
        console.log(`📊 Creando colección: ${collectionName}`);

        const response = await axios.put(`${QDRANT_URL}/collections/${collectionName}`, {
            vectors: {
                size: vectorSize,
                distance: "Cosine"
            }
        });

        console.log(`✅ Colección ${collectionName} creada exitosamente`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 409) {
            console.log(`ℹ️ Colección ${collectionName} ya existe`);
        } else {
            console.error(`❌ Error creando colección ${collectionName}:`, error.message);
        }
    }
}

async function initCollections() {
    try {
        console.log('🚀 Inicializando colecciones en Qdrant...');

        // Verificar que Qdrant esté disponible
        const healthCheck = await axios.get(`${QDRANT_URL}`);
        console.log('✅ Qdrant está funcionando correctamente');

        // Crear colecciones necesarias
        const collections = [
            { name: 'code_patterns', size: 384 },
            { name: 'error_patterns', size: 384 },
            { name: 'function_signatures', size: 384 },
            { name: 'code_complexity', size: 128 },
            { name: 'semantic_search', size: 384 }
        ];

        for (const collection of collections) {
            await createCollection(collection.name, collection.size);
        }

        console.log('🎉 Todas las colecciones han sido inicializadas correctamente');

    } catch (error) {
        console.error('❌ Error inicializando colecciones:', error.message);
        process.exit(1);
    }
}

// Ejecutar inicialización
initCollections();