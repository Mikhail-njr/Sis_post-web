#!/usr/bin/env node

const path = require('path');
const { CodeAnalysisService } = require('../services/code-analysis.service');

async function indexCodebase() {
    console.log('📊 Iniciando indexación del codebase...\n');

    const basePath = process.argv[2] || path.join(__dirname, '../../');
    const excludePatterns = ['node_modules', '.git', 'logs', 'dist', 'build', 'coverage'];

    const analysisService = new CodeAnalysisService();

    try {
        console.log(`📁 Analizando directorio: ${basePath}\n`);

        // Encontrar archivos de código
        console.log('🔍 Buscando archivos de código...');
        const codeFiles = await analysisService.findCodeFiles(basePath, excludePatterns);

        console.log(`📁 Encontrados ${codeFiles.length} archivos de código\n`);

        if (codeFiles.length === 0) {
            console.log('⚠️ No se encontraron archivos de código. Verifica la ruta.');
            return;
        }

        // Mostrar distribución por lenguaje
        const languageStats = {};
        codeFiles.forEach(file => {
            languageStats[file.language] = (languageStats[file.language] || 0) + 1;
        });

        console.log('📊 Distribución por lenguaje:');
        Object.entries(languageStats).forEach(([lang, count]) => {
            console.log(`   ${lang}: ${count} archivos`);
        });

        console.log('\n🔄 Iniciando análisis e indexación...\n');

        // Procesar archivos en lotes
        const results = await analysisService.processBatch(codeFiles, 5, async (fileInfo) => {
            try {
                console.log(`📄 Analizando: ${path.relative(basePath, fileInfo.path)}`);

                const result = await analysisService.analyzeFile(fileInfo.path, fileInfo.language);

                // Mostrar resumen del análisis
                const issues = result.analysis.issues.filter(i => i.severity === 'high' || i.severity === 'medium');
                if (issues.length > 0) {
                    console.log(`   ⚠️ ${issues.length} problema(s) detectado(s)`);
                }

                return {
                    success: true,
                    file: fileInfo.path,
                    patterns: (result.analysis.metrics.functions || 0) + (result.analysis.metrics.classes || 0)
                };

            } catch (error) {
                console.error(`   ❌ Error procesando ${path.relative(basePath, fileInfo.path)}: ${error.message}`);
                return { success: false, file: fileInfo.path, error: error.message };
            }
        });

        // Resultados finales
        const totalTime = Math.round((Date.now() - results.startTime) / 1000);

        console.log('🎉 Indexación completada!\n');
        console.log('📊 Resultados:');
        console.log(`   ✅ Archivos procesados: ${results.processedFiles}`);
        console.log(`   ❌ Errores: ${results.errors}`);
        console.log(`   🔍 Patrones indexados: ${results.indexedPatterns}`);
        console.log(`   ⏱️ Tiempo total: ${totalTime}s`);
        console.log(`   📈 Rendimiento: ${Math.round(results.processedFiles / totalTime * 60)} archivos/minuto\n`);

        // Verificar estadísticas finales
        console.log('📈 Estadísticas de Qdrant:');
        const stats = await analysisService.getCollectionStats();
        Object.entries(stats).forEach(([collection, info]) => {
            if (!info.error) {
                console.log(`   ${collection}: ${info.vectors_count || 0} vectores`);
            }
        });

        console.log('\n💡 El sistema está listo para análisis de código!');
        console.log('   🚀 Inicia el servidor con: npm start');

    } catch (error) {
        console.error('\n❌ Error durante la indexación:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔧 Solución: Asegúrate de que Qdrant esté ejecutándose');
            console.log('   docker ps');
            console.log('   docker start qdrant-pos');
        }

        process.exit(1);
    } finally {
        // Limpiar recursos
        await analysisService.dispose();
    }
}

// Función para limpiar indexación anterior
async function clearIndex(analysisService) {
    console.log('🗑️ Limpiando indexación anterior...');

    try {
        // Usar el servicio de Qdrant del analysisService
        const qdrantService = analysisService.services.qdrant;
        await qdrantService.clearCollection(qdrantService.collections.CODE_PATTERNS);
        await qdrantService.clearCollection(qdrantService.collections.SEMANTIC_SEARCH);
        console.log('✅ Indexación anterior limpiada');
    } catch (error) {
        console.warn('⚠️ Error limpiando indexación:', error.message);
    }
}

// Ejecutar indexación
if (require.main === module) {
    const command = process.argv[2];

    if (command === '--clear') {
        // Modo de limpieza
        console.log('🧹 Modo limpieza activado\n');

        const analysisService = new CodeAnalysisService();

        analysisService.initialize()
            .then(() => clearIndex(analysisService))
            .then(() => {
                console.log('✅ Limpieza completada');
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Error en limpieza:', error);
                process.exit(1);
            });

    } else {
        // Modo normal de indexación
        indexCodebase().catch(error => {
            console.error('❌ Error fatal:', error);
            process.exit(1);
        });
    }
}

module.exports = { indexCodebase };