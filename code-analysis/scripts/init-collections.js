#!/usr/bin/env node

const { QdrantService } = require('../services/qdrant.service');
const { EmbeddingService } = require('../services/embedding.service');

async function initializeCollections() {
    console.log('🚀 Inicializando colecciones de Qdrant para análisis de código...\n');

    let qdrantService = null;
    let embeddingService = null;

    try {
        // Configuración de Qdrant
        const qdrantConfig = {
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY
        };

        console.log(`📡 Conectando a Qdrant en: ${qdrantConfig.url}`);

        // Inicializar servicios
        qdrantService = new QdrantService(qdrantConfig);
        await qdrantService.connect();

        embeddingService = new EmbeddingService();
        await embeddingService.initialize();

        console.log('✅ Servicios inicializados correctamente\n');

        // Verificar estado de las colecciones
        console.log('📊 Verificando estado de colecciones...');
        const stats = await qdrantService.getCollectionStats();

        console.log('📈 Estadísticas actuales:');
        Object.entries(stats).forEach(([collection, info]) => {
            if (info.error) {
                console.log(`   ❌ ${collection}: Error - ${info.error}`);
            } else {
                console.log(`   ✅ ${collection}: ${info.vectors_count || 0} vectores`);
            }
        });

        console.log('\n🔄 Las colecciones se inicializan automáticamente al conectar.');
        console.log('ℹ️ Si necesitas recrear alguna colección, usa el script recreate-collection.js');

        // Verificar salud de los servicios
        console.log('\n🏥 Verificando salud de servicios...');

        const qdrantHealth = await qdrantService.healthCheck();
        console.log(`   Qdrant: ${qdrantHealth.status === 'healthy' ? '✅' : '❌'} ${qdrantHealth.status}`);

        const embeddingHealth = await embeddingService.healthCheck();
        console.log(`   Embeddings: ${embeddingHealth.status === 'healthy' ? '✅' : '❌'} ${embeddingHealth.status}`);

        if (embeddingHealth.embedding_dimension) {
            console.log(`   Dimensión de embeddings: ${embeddingHealth.embedding_dimension}`);
        }

        console.log('\n🎉 Inicialización completada exitosamente!');
        console.log('\n💡 Próximos pasos:');
        console.log('   1. Ejecutar: npm run index-codebase');
        console.log('   2. Iniciar servidor: npm start');
        console.log('   3. Abrir dashboard: http://localhost:6333/dashboard');

    } catch (error) {
        console.error('\n❌ Error durante la inicialización:', error.message);

        if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
            console.log('\n🔧 Solución sugerida:');
            console.log('   1. Asegúrate de que Qdrant esté ejecutándose: docker ps');
            console.log('   2. Si no está ejecutándose: docker start qdrant-pos');
            console.log('   3. Si no existe: ejecuta setup_qdrant.bat');
        }

        process.exit(1);
    } finally {
        // Limpiar recursos
        if (embeddingService && embeddingService.dispose) {
            await embeddingService.dispose();
        }
    }
}

// Función para poblar con datos de ejemplo
async function populateSampleData(qdrantService, embeddingService) {
    console.log('\n📝 Poblando con datos de ejemplo...');

    try {
        const samplePatterns = [
            {
                content: `
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity;
    }
    return total;
}
                `,
                language: 'javascript',
                type: 'function',
                tags: ['calculation', 'loop', 'array']
            },
            {
                content: `
async function fetchUserData(userId) {
    try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}
                `,
                language: 'javascript',
                type: 'async_function',
                tags: ['api', 'async', 'error_handling']
            },
            {
                content: `
def validate_email(email):
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
                `,
                language: 'python',
                type: 'validation',
                tags: ['regex', 'validation', 'email']
            }
        ];

        const points = [];

        for (const pattern of samplePatterns) {
            const embedding = await embeddingService.generateContextualEmbedding(
                pattern.content,
                {
                    language: pattern.language,
                    type: pattern.type
                }
            );

            points.push({
                id: qdrantService.generateId(),
                vector: embedding,
                payload: {
                    content: pattern.content.trim(),
                    language: pattern.language,
                    type: pattern.type,
                    tags: pattern.tags,
                    is_sample: true,
                    created_at: new Date().toISOString()
                }
            });
        }

        await qdrantService.insertPoints(qdrantService.collections.CODE_PATTERNS, points);
        console.log(`✅ Insertados ${points.length} patrones de ejemplo`);

    } catch (error) {
        console.warn('⚠️ Error poblando datos de ejemplo:', error.message);
    }
}

// Ejecutar inicialización
if (require.main === module) {
    initializeCollections().catch(error => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
}

module.exports = { initializeCollections, populateSampleData };