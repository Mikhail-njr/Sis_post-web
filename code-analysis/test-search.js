const { generateSimpleVector, searchSimilar, getCollectionStats } = require('./services/indexing-utils.service');

// Función para obtener estadísticas (wrapper para mantener compatibilidad)
async function getStats() {
    return await getCollectionStats();
}

// Función principal de prueba
async function testSearch() {
    try {
        console.log('🧪 Probando sistema de búsqueda...\n');

        // Obtener estadísticas
        const totalPoints = await getStats();
        console.log(`📊 Total de archivos indexados: ${totalPoints}\n`);

        // Pruebas de búsqueda
        const testQueries = [
            'function express',
            'html document',
            'database sqlite',
            'script frontend',
            'server backend'
        ];

        for (const query of testQueries) {
            console.log(`🔍 Buscando: "${query}"`);
            const results = await searchSimilar(query, 3);

            if (results.length > 0) {
                results.forEach((result, index) => {
                    const payload = result.payload;
                    console.log(`   ${index + 1}. ${payload.file_path} (score: ${result.score?.toFixed(3) || 'N/A'})`);
                    console.log(`      ${payload.content_preview?.substring(0, 100)}...`);
                });
            } else {
                console.log('   No se encontraron resultados');
            }
            console.log('');
        }

        console.log('✅ Pruebas de búsqueda completadas');

    } catch (error) {
        console.error('❌ Error en pruebas:', error.message);
    }
}

testSearch();