const path = require('path');
const { QdrantService } = require('../services/qdrant.service');
const { EmbeddingService } = require('../services/embedding.service');
const { PatternDetector } = require('../services/pattern-detector.service');

async function detectDuplication() {
    try {
        console.log('🔍 Iniciando detección de código duplicado...');

        // Inicializar servicios
        const qdrantService = new QdrantService({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY
        });

        const embeddingService = new EmbeddingService();
        await embeddingService.initialize(); // Inicializar el servicio de embeddings
        const patternDetector = new PatternDetector(qdrantService, embeddingService);

        // Ruta del proyecto (directorio padre)
        const projectPath = path.resolve(__dirname, '../..');

        console.log(`📂 Analizando proyecto en: ${projectPath} (excluyendo tests)`);

        // Detectar duplicación (excluyendo directorio excluded/)
        const duplicates = await patternDetector.detectCodeDuplication(projectPath, {
            minLength: 6,
            similarityThreshold: 0.85,
            excludeDirs: ['excluded']
        });

        console.log(`\n📊 Resultados de la detección de duplicación:`);
        console.log(`Total de archivos comparados: ${duplicates.length} pares similares encontrados\n`);

        if (duplicates.length === 0) {
            console.log('✅ No se encontraron duplicaciones significativas de código.');
            return;
        }

        // Mostrar resultados
        duplicates.forEach((dup, index) => {
            console.log(`${index + 1}. Archivos similares:`);
            console.log(`   📄 ${path.relative(projectPath, dup.file1)}`);
            console.log(`   📄 ${path.relative(projectPath, dup.file2)}`);
            console.log(`   📊 Similitud: ${(dup.similarity * 100).toFixed(1)}%`);
            console.log(`   📏 Líneas: ${dup.lines1} / ${dup.lines2}`);
            console.log('');
        });

        // Análisis de reusabilidad
        console.log('🔄 Análisis de reusabilidad:');
        duplicates.forEach((dup, index) => {
            console.log(`\n${index + 1}. ${path.basename(dup.file1)} ↔ ${path.basename(dup.file2)}:`);

            // Analizar si el código puede ser reutilizado
            const canReuse = analyzeReusability(dup);
            console.log(`   🔧 Puede reutilizarse: ${canReuse.reusable ? 'Sí' : 'No'}`);
            console.log(`   💡 Recomendación: ${canReuse.recommendation}`);
            if (canReuse.suggestion) {
                console.log(`   📝 Sugerencia: ${canReuse.suggestion}`);
            }
        });

    } catch (error) {
        console.error('❌ Error detectando duplicación:', error);
        process.exit(1);
    }
}

function analyzeReusability(duplicate) {
    const result = {
        reusable: false,
        recommendation: '',
        suggestion: null
    };

    // Si la similitud es muy alta (>90%), probablemente es duplicación
    if (duplicate.similarity > 0.9) {
        result.reusable = true;
        result.recommendation = 'Extraer a función/módulo compartido';
        result.suggestion = 'Crear una función utilitaria o módulo común';
    }
    // Si es moderadamente similar (80-90%), podría ser refactorizable
    else if (duplicate.similarity > 0.8) {
        result.reusable = true;
        result.recommendation = 'Revisar para posibles abstracciones';
        result.suggestion = 'Analizar patrones comunes y crear abstracción';
    }
    // Si es baja similitud, probablemente no es duplicación real
    else {
        result.reusable = false;
        result.recommendation = 'No requiere acción inmediata';
        result.suggestion = 'El código es suficientemente diferente';
    }

    return result;
}

// Ejecutar si se llama directamente
if (require.main === module) {
    detectDuplication();
}

module.exports = { detectDuplication };