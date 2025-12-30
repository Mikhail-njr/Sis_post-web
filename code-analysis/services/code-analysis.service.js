const { QdrantService } = require('./qdrant.service');
const { EmbeddingService } = require('./embedding.service');
const { CodeAnalyzer } = require('./code-analyzer.service');
const { PatternDetector } = require('./pattern-detector.service');

/**
 * Servicio común para análisis de código
 * Maneja la inicialización y configuración de servicios
 */
class CodeAnalysisService {
    constructor(config = {}) {
        this.config = {
            qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
            qdrantApiKey: process.env.QDRANT_API_KEY,
            ...config
        };

        this.services = {};
        this.initialized = false;
    }

    /**
     * Inicializa todos los servicios necesarios
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('🔧 Inicializando servicios de análisis de código...');

            // Configuración de Qdrant
            const qdrantConfig = {
                url: this.config.qdrantUrl,
                apiKey: this.config.qdrantApiKey
            };

            // Inicializar servicios
            this.services.qdrant = new QdrantService(qdrantConfig);
            await this.services.qdrant.connect();

            this.services.embedding = new EmbeddingService();
            await this.services.embedding.initialize();

            this.services.analyzer = new CodeAnalyzer(this.services.qdrant, this.services.embedding);
            this.services.detector = new PatternDetector(this.services.qdrant, this.services.embedding);

            this.initialized = true;
            console.log('✅ Servicios de análisis inicializados correctamente');

        } catch (error) {
            console.error('❌ Error inicializando servicios:', error.message);
            throw error;
        }
    }

    /**
     * Analiza un archivo individual
     */
    async analyzeFile(filePath, language = null) {
        if (!this.initialized) {
            await this.initialize();
        }

        const fs = require('fs-extra');
        const path = require('path');

        // Verificar archivo
        if (!await fs.pathExists(filePath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }

        // Leer contenido
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);

        // Detectar lenguaje si no se especificó
        const detectedLanguage = language || this.detectLanguage(filePath);

        console.log(`📄 Analizando: ${path.basename(filePath)} (${detectedLanguage})`);

        // Realizar análisis
        const analysis = await this.services.analyzer.analyzeFile(content, detectedLanguage);

        // Buscar patrones similares
        const similarPatterns = await this.services.detector.findSimilarPatterns(
            content.substring(0, 1000),
            { language: detectedLanguage, limit: 5 }
        );

        return {
            filePath,
            language: detectedLanguage,
            content,
            stats,
            analysis,
            similarPatterns
        };
    }

    /**
     * Detecta el lenguaje de un archivo basado en su extensión
     */
    detectLanguage(filePath) {
        const path = require('path');
        const ext = path.extname(filePath).toLowerCase();

        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.sql': 'sql',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp'
        };

        return languageMap[ext] || 'unknown';
    }

    /**
     * Busca archivos de código en un directorio
     */
    async findCodeFiles(basePath, excludePatterns = []) {
        const fs = require('fs-extra');
        const path = require('path');

        const files = [];
        const extensions = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.sql': 'sql',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp'
        };

        async function scanDirectory(dirPath) {
            try {
                const items = await fs.readdir(dirPath);

                for (const item of items) {
                    const fullPath = path.join(dirPath, item);

                    // Verificar si debe excluirse
                    const shouldExclude = excludePatterns.some(pattern => {
                        return fullPath.includes(pattern) ||
                               item === pattern ||
                               (item.startsWith('.') && pattern === '.git');
                    });

                    if (shouldExclude) continue;

                    const stat = await fs.stat(fullPath);

                    if (stat.isDirectory()) {
                        // Recursión controlada (máximo 10 niveles)
                        const relativeDepth = path.relative(basePath, fullPath).split(path.sep).length;
                        if (relativeDepth < 10) {
                            await scanDirectory(fullPath);
                        }
                    } else if (stat.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        const language = extensions[ext];

                        if (language && stat.size > 0 && stat.size < 1024 * 1024) { // Máximo 1MB
                            files.push({
                                path: fullPath,
                                language,
                                size: stat.size,
                                extension: ext
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error escaneando directorio ${dirPath}: ${error.message}`);
            }
        }

        await scanDirectory(basePath);
        return files;
    }

    /**
     * Procesa archivos en lotes
     */
    async processBatch(files, batchSize = 5, processor) {
        const results = {
            processedFiles: 0,
            errors: 0,
            indexedPatterns: 0,
            startTime: Date.now()
        };

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(processor);

            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach(result => {
                if (result.success) {
                    results.processedFiles++;
                    results.indexedPatterns += result.patterns || 0;
                } else {
                    results.errors++;
                }
            });

            // Mostrar progreso
            const processedCount = Math.min(i + batchSize, files.length);
            const progress = Math.round((processedCount / files.length) * 100);
            const elapsed = Math.round((Date.now() - results.startTime) / 1000);

            console.log(`📊 Progreso: ${progress}% (${processedCount}/${files.length}) - ${elapsed}s`);
        }

        return results;
    }

    /**
     * Muestra resultados de análisis de archivo
     */
    displayAnalysisResults(analysis, content) {
        console.log('📊 MÉTRICAS BÁSICAS:');
        console.log(`   Líneas totales: ${analysis.metrics.lines}`);
        console.log(`   Líneas en blanco: ${analysis.metrics.blankLines}`);
        console.log(`   Caracteres: ${analysis.metrics.characters}`);
        console.log(`   Funciones: ${analysis.metrics.functions}`);
        console.log(`   Clases: ${analysis.metrics.classes}`);
        console.log(`   Imports: ${analysis.metrics.imports}`);
        console.log(`   Comentarios: ${analysis.metrics.comments}`);

        console.log('\n🧠 ANÁLISIS DE COMPLEJIDAD:');
        console.log(`   Puntuación: ${analysis.complexity.score.toFixed(1)}`);
        console.log(`   Nivel: ${analysis.complexity.level.toUpperCase()}`);
        console.log(`   Factores:`);
        console.log(`     - Anidamiento: ${analysis.complexity.factors.nesting}`);
        console.log(`     - Ramificaciones: ${analysis.complexity.factors.branches}`);
        console.log(`     - Funciones: ${analysis.complexity.factors.functions}`);
        console.log(`     - Líneas: ${analysis.complexity.factors.lines}`);

        console.log('\n📈 RESUMEN:');
        console.log(`   Problemas encontrados: ${analysis.issues.length}`);
        console.log(`   Sugerencias: ${analysis.suggestions.length}`);
        console.log(`   Timestamp: ${new Date(analysis.timestamp).toLocaleString('es-ES')}`);
    }

    /**
     * Muestra patrones similares
     */
    displaySimilarPatterns(similarPatterns) {
        if (similarPatterns.length > 0) {
            console.log('\n📋 Patrones similares encontrados:');
            similarPatterns.forEach((pattern, index) => {
                console.log(`   ${index + 1}. Similitud: ${(pattern.similarity * 100).toFixed(1)}%`);
                console.log(`      Lenguaje: ${pattern.language}`);
                console.log(`      Complejidad: ${pattern.complexity_score}`);
                console.log(`      Funciones: ${pattern.metrics.functions}, Clases: ${pattern.metrics.classes}`);
                console.log('');
            });
        } else {
            console.log('   ℹ️ No se encontraron patrones similares');
        }
    }

    /**
     * Muestra sugerencias de mejora
     */
    displaySuggestions(analysis) {
        console.log('\n💡 Sugerencias de mejora:');
        if (analysis.suggestions.length > 0) {
            analysis.suggestions.forEach((suggestion, index) => {
                const icon = suggestion.priority === 'high' ? '🔴' :
                           suggestion.priority === 'medium' ? '🟡' : '🟢';
                console.log(`   ${icon} ${suggestion.message}`);
                if (suggestion.suggestion) {
                    console.log(`      💡 ${suggestion.suggestion}`);
                }
                console.log('');
            });
        } else {
            console.log('   ✅ No se encontraron problemas críticos');
        }
    }

    /**
     * Muestra problemas detectados
     */
    displayIssues(analysis) {
        console.log('\n⚠️ Problemas detectados:');
        if (analysis.issues.length > 0) {
            analysis.issues.forEach((issue, index) => {
                const severityIcon = issue.severity === 'high' ? '🔴' :
                                   issue.severity === 'medium' ? '🟡' : '🟢';
                console.log(`   ${severityIcon} ${issue.message}`);
                console.log(`      Severidad: ${issue.severity}`);
                if (issue.occurrences > 1) {
                    console.log(`      Ocurrencias: ${issue.occurrences}`);
                }
                console.log('');
            });
        } else {
            console.log('   ✅ No se detectaron problemas');
        }
    }

    /**
     * Libera recursos
     */
    async dispose() {
        if (this.services.embedding && this.services.embedding.dispose) {
            await this.services.embedding.dispose();
        }
        this.initialized = false;
    }

    /**
     * Obtiene estadísticas de las colecciones
     */
    async getCollectionStats() {
        if (!this.initialized) return {};
        return await this.services.qdrant.getCollectionStats();
    }
}

module.exports = { CodeAnalysisService };