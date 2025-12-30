const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { BaseIndexer } = require('./services/base-indexer.service');
const { analyzeComplexity } = require('./services/indexing-utils.service');

// Extensiones de archivos a indexar
const FILE_EXTENSIONS = ['.js', '.json', '.sql', '.html', '.css', '.md'];

// Contador para IDs únicos
let idCounter = 1;

// Función para indexar un archivo con análisis de complejidad
async function indexFile(filePath, basePath, indexer) {
    const additionalPayload = {
        content: fs.readFileSync(filePath, 'utf8').substring(0, 1000), // Primeros 1000 caracteres
        last_modified: fs.statSync(filePath).mtime.toISOString(),
        ...analyzeComplexity(fs.readFileSync(filePath, 'utf8'), filePath)
    };

    return await indexer.indexFile(filePath, basePath, {
        previewLength: 1000,
        additionalPayload,
        id: idCounter++
    });
}

// Función principal de indexación
async function indexCodebase(basePath = '../', excludePatterns = ['node_modules', '.git', 'logs', 'excluded']) {
    const indexer = new BaseIndexer();

    try {
        console.log('🚀 Iniciando indexación del codebase...');
        console.log(`📁 Directorio base: ${basePath}`);

        // Verificar Qdrant
        const isHealthy = await indexer.checkQdrantHealth();
        if (!isHealthy) return;

        // Construir patrón glob con exclusiones más específicas
        const patterns = FILE_EXTENSIONS.map(ext => `${basePath}/**/*${ext}`);

        let allFiles = [];
        for (const pattern of patterns) {
            const files = glob.sync(pattern, {
                ignore: excludePatterns.map(p => `${basePath}/${p}/**`),
                nodir: true // Solo archivos, no directorios
            });
            allFiles = allFiles.concat(files);
        }

        // Filtrar archivos adicionales para evitar node_modules y otros directorios
        const filteredFiles = allFiles.filter(file => {
            const relativePath = path.relative(basePath, file);
            return !excludePatterns.some(pattern =>
                relativePath.startsWith(pattern + path.sep) ||
                relativePath.includes(path.sep + pattern + path.sep)
            );
        });

        console.log(`📊 Encontrados ${filteredFiles.length} archivos para indexar (filtrados de ${allFiles.length} total)`);

        const files = filteredFiles.slice(0, 50); // Limitar a 50 archivos para prueba
        console.log(`🎯 Procesando los primeros ${files.length} archivos para prueba`);

        // Procesar archivos en lotes
        const { indexed, errors } = await indexer.processBatch(files, 10, (file) => indexFile(file, basePath, indexer));

        await indexer.showSummary(indexed, errors, files.length);

    } catch (error) {
        console.error('❌ Error en la indexación:', error.message);
    }
}

// Ejecutar indexación
const basePath = process.argv[2] || '../';
indexCodebase(basePath);