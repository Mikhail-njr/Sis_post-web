#!/usr/bin/env node

const path = require('path');
const { CodeAnalysisService } = require('../services/code-analysis.service');

async function analyzeFile() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.log('❌ Uso: node analyze-file.js <ruta_del_archivo> [lenguaje]');
        console.log('   Ejemplo: node analyze-file.js ../backend/server.js javascript');
        process.exit(1);
    }

    const absolutePath = path.resolve(filePath);
    const specifiedLanguage = process.argv[3];

    console.log(`📄 Analizando archivo: ${absolutePath}\n`);

    const analysisService = new CodeAnalysisService();

    try {
        // Analizar archivo
        const result = await analysisService.analyzeFile(absolutePath, specifiedLanguage);

        console.log(`📊 Información del archivo:`);
        console.log(`   Tamaño: ${result.stats.size} bytes`);
        console.log(`   Líneas: ${result.content.split('\n').length}`);
        console.log(`   Última modificación: ${result.stats.mtime.toISOString()}\n`);
        console.log(`🔍 Lenguaje detectado: ${result.language}\n`);

        // Mostrar resultados
        console.log('🔬 Realizando análisis completo...\n');
        analysisService.displayAnalysisResults(result.analysis, result.content);

        // Mostrar patrones similares
        console.log('\n🔍 Buscando patrones similares en el codebase...');
        analysisService.displaySimilarPatterns(result.similarPatterns);

        // Mostrar sugerencias y problemas
        analysisService.displaySuggestions(result.analysis);
        analysisService.displayIssues(result.analysis);

        console.log('\n🎉 Análisis completado exitosamente!');

    } catch (error) {
        console.error('\n❌ Error durante el análisis:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔧 Solución sugerida:');
            console.log('   1. Verifica que Qdrant esté ejecutándose: docker ps');
            console.log('   2. Si no está ejecutándose: docker start qdrant-pos');
        }

        process.exit(1);
    } finally {
        // Limpiar recursos
        await analysisService.dispose();
    }
}


// Función para mostrar ayuda
function showHelp() {
    console.log('🔍 ANALIZADOR DE CÓDIGO - AYUDA');
    console.log('');
    console.log('Uso:');
    console.log('  node analyze-file.js <ruta_del_archivo> [lenguaje]');
    console.log('');
    console.log('Ejemplos:');
    console.log('  node analyze-file.js ../backend/server.js');
    console.log('  node analyze-file.js ./script.py python');
    console.log('  node analyze-file.js src/main.java java');
    console.log('');
    console.log('Lenguajes soportados:');
    console.log('  javascript, typescript, python, java, sql, php, ruby, go, rust, cpp, c, csharp');
    console.log('');
    console.log('Variables de entorno:');
    console.log('  QDRANT_URL - URL de Qdrant (default: http://localhost:6333)');
    console.log('  QDRANT_API_KEY - API Key de Qdrant (opcional)');
}

// Ejecutar análisis
if (require.main === module) {
    const command = process.argv[2];

    if (command === '--help' || command === '-h') {
        showHelp();
    } else {
        analyzeFile().catch(error => {
            console.error('❌ Error fatal:', error);
            process.exit(1);
        });
    }
}

module.exports = { analyzeFile };