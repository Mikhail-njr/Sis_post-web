const { pipeline } = require('@xenova/transformers');

class EmbeddingService {
    constructor() {
        this.model = null;
        this.tokenizer = null;
        this.isReady = false;
        this.modelName = 'Xenova/all-MiniLM-L6-v2'; // Modelo ligero para embeddings
    }

    async initialize() {
        try {
            console.log('🤖 Inicializando modelo de embeddings...');

            // Cargar modelo de embeddings
            this.model = await pipeline('feature-extraction', this.modelName, {
                quantized: true, // Usar versión cuantizada para mejor rendimiento
                cache_dir: './models' // Directorio para cache de modelos
            });

            this.isReady = true;
            console.log('✅ Modelo de embeddings cargado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando modelo de embeddings:', error);
            throw error;
        }
    }

    async generateEmbedding(text) {
        try {
            if (!this.isReady) {
                throw new Error('Servicio de embeddings no inicializado');
            }

            if (!text || typeof text !== 'string') {
                throw new Error('Texto inválido para generar embedding');
            }

            // Preprocesar el texto
            const processedText = this.preprocessCode(text);

            // Generar embedding
            const output = await this.model(processedText, {
                pooling: 'mean',
                normalize: true
            });

            // Convertir a array de números
            const embedding = Array.from(output.data);

            return embedding;

        } catch (error) {
            console.error('❌ Error generando embedding:', error);
            throw error;
        }
    }

    async generateEmbeddingsBatch(texts) {
        try {
            if (!this.isReady) {
                throw new Error('Servicio de embeddings no inicializado');
            }

            if (!Array.isArray(texts)) {
                throw new Error('Se esperaba un array de textos');
            }

            const embeddings = [];

            // Procesar en lotes para mejor rendimiento
            const batchSize = 10;
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchPromises = batch.map(text => this.generateEmbedding(text));
                const batchResults = await Promise.all(batchPromises);
                embeddings.push(...batchResults);
            }

            return embeddings;

        } catch (error) {
            console.error('❌ Error generando embeddings en lote:', error);
            throw error;
        }
    }

    preprocessCode(code) {
        try {
            // Limpiar y normalizar el código
            let processed = code
                // Remover comentarios de una línea
                .replace(/\/\/.*$/gm, '')
                // Remover comentarios multilinea
                .replace(/\/\*[\s\S]*?\*\//g, '')
                // Remover strings
                .replace(/".*?"/g, 'STRING_LITERAL')
                .replace(/'.*?'/g, 'STRING_LITERAL')
                // Remover números
                .replace(/\d+/g, 'NUMBER_LITERAL')
                // Normalizar espacios
                .replace(/\s+/g, ' ')
                .trim();

            // Limitar longitud para mejor rendimiento
            if (processed.length > 512) {
                processed = processed.substring(0, 512);
            }

            return processed;

        } catch (error) {
            console.warn('⚠️ Error preprocesando código:', error.message);
            return code.substring(0, 512); // Fallback
        }
    }

    // Método para extraer características específicas del código
    extractCodeFeatures(code, language = 'javascript') {
        const features = {
            length: code.length,
            lines: code.split('\n').length,
            functions: 0,
            classes: 0,
            imports: 0,
            exports: 0,
            comments: 0,
            complexity: 0
        };

        try {
            // Contar funciones
            const functionPatterns = {
                javascript: /(?:function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{)/g,
                typescript: /(?:function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{|class\s+\w+)/g,
                python: /(?:def\s+\w+|class\s+\w+)/g,
                java: /(?:public\s+)?(?:static\s+)?(?:\w+\s+)?\w+\s*\(/g
            };

            const funcPattern = functionPatterns[language] || functionPatterns.javascript;
            const functions = code.match(funcPattern);
            features.functions = functions ? functions.length : 0;

            // Contar clases
            const classPatterns = {
                javascript: /class\s+\w+/g,
                typescript: /class\s+\w+/g,
                python: /class\s+\w+/g,
                java: /class\s+\w+/g
            };

            const classPattern = classPatterns[language] || classPatterns.javascript;
            const classes = code.match(classPattern);
            features.classes = classes ? classes.length : 0;

            // Contar imports
            const importPatterns = {
                javascript: /(?:import\s+|require\s*\()/g,
                typescript: /(?:import\s+|require\s*\()/g,
                python: /(?:import\s+|from\s+\w+\s+import)/g,
                java: /import\s+/g
            };

            const importPattern = importPatterns[language] || importPatterns.javascript;
            const imports = code.match(importPattern);
            features.imports = imports ? imports.length : 0;

            // Contar exports
            const exportPatterns = {
                javascript: /export\s+/g,
                typescript: /export\s+/g,
                python: /(?:__all__|from\s+\.\s+import)/g,
                java: /public\s+class/g
            };

            const exportPattern = exportPatterns[language] || exportPatterns.javascript;
            const exports = code.match(exportPattern);
            features.exports = exports ? exports.length : 0;

            // Contar comentarios
            const commentPatterns = {
                javascript: /(?:\/\/|\/\*|\*\/)/g,
                typescript: /(?:\/\/|\/\*|\*\/)/g,
                python: /#/g,
                java: /(?:\/\/|\/\*|\*\/)/g
            };

            const commentPattern = commentPatterns[language] || commentPatterns.javascript;
            const comments = code.match(commentPattern);
            features.comments = comments ? comments.length : 0;

            // Calcular complejidad básica (ciclos anidados, condicionales)
            const complexityPatterns = /(?:if|for|while|switch|try|catch)\s*\(/g;
            const complexity = code.match(complexityPatterns);
            features.complexity = complexity ? complexity.length : 0;

        } catch (error) {
            console.warn('⚠️ Error extrayendo características:', error.message);
        }

        return features;
    }

    // Método para generar embedding contextual
    async generateContextualEmbedding(code, context = {}) {
        try {
            const features = this.extractCodeFeatures(code, context.language);

            // Crear texto contextual que incluya características
            const contextualText = `
                Lenguaje: ${context.language || 'javascript'}
                Tipo: ${context.type || 'function'}
                Características: ${JSON.stringify(features)}
                Código: ${this.preprocessCode(code)}
            `.trim();

            return await this.generateEmbedding(contextualText);

        } catch (error) {
            console.error('❌ Error generando embedding contextual:', error);
            // Fallback a embedding simple
            return await this.generateEmbedding(code);
        }
    }

    // Método para calcular similitud entre dos embeddings
    calculateSimilarity(embedding1, embedding2) {
        try {
            if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
                throw new Error('Embeddings deben ser arrays');
            }

            if (embedding1.length !== embedding2.length) {
                throw new Error('Embeddings deben tener la misma dimensión');
            }

            // Calcular similitud coseno
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;

            for (let i = 0; i < embedding1.length; i++) {
                dotProduct += embedding1[i] * embedding2[i];
                norm1 += embedding1[i] * embedding1[i];
                norm2 += embedding2[i] * embedding2[i];
            }

            norm1 = Math.sqrt(norm1);
            norm2 = Math.sqrt(norm2);

            if (norm1 === 0 || norm2 === 0) {
                return 0;
            }

            return dotProduct / (norm1 * norm2);

        } catch (error) {
            console.error('❌ Error calculando similitud:', error);
            return 0;
        }
    }

    // Método para verificar si el servicio está listo
    async healthCheck() {
        try {
            if (!this.isReady) {
                return { status: 'not_ready' };
            }

            // Probar con un texto simple
            const testEmbedding = await this.generateEmbedding('test');
            return {
                status: 'healthy',
                embedding_dimension: testEmbedding.length
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Método para liberar recursos
    async dispose() {
        try {
            if (this.model) {
                // Liberar modelo de memoria si es necesario
                this.model = null;
                this.isReady = false;
                console.log('🗑️ Modelo de embeddings liberado');
            }
        } catch (error) {
            console.error('❌ Error liberando modelo:', error);
        }
    }
}

module.exports = { EmbeddingService };