const { BaseIndexer } = require('./services/base-indexer.service');

// Archivos clave para indexar
const KEY_FILES = [
    '../package.json',
    '../backend/server.js',
    '../backend/package.json',
    '../frontend/index.html',
    '../frontend/script.js',
    '../frontend/style.css',
    '../docs/README.md'
];

// Función principal
async function quickIndex() {
    const indexer = new BaseIndexer();

    try {
        console.log('🚀 Iniciando indexación rápida de archivos clave...');

        // Verificar Qdrant
        const isHealthy = await indexer.checkQdrantHealth();
        if (!isHealthy) return;

        let indexed = 0;
        let errors = 0;

        for (const filePath of KEY_FILES) {
            const success = await indexer.indexFile(filePath, '../');
            if (success) {
                indexed++;
            } else {
                errors++;
            }
        }

        await indexer.showSummary(indexed, errors, KEY_FILES.length);

    } catch (error) {
        console.error('❌ Error en indexación:', error.message);
    }
}

quickIndex();