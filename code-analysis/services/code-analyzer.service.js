const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

class CodeAnalyzer {
    constructor(qdrantService, embeddingService) {
        this.qdrant = qdrantService;
        this.embedding = embeddingService;
        this.supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'sql'];
    }

    async analyzeFile(content, language = 'javascript') {
        try {
            console.log(`📊 Analizando archivo (${language})...`);

            const analysis = {
                language,
                metrics: {},
                issues: [],
                suggestions: [],
                complexity: {},
                timestamp: new Date().toISOString()
            };

            // Extraer métricas básicas
            analysis.metrics = this.extractBasicMetrics(content, language);

            // Analizar complejidad
            analysis.complexity = await this.analyzeComplexity(content, language);

            // Detectar problemas potenciales
            analysis.issues = this.detectPotentialIssues(content, language);

            // Generar sugerencias de mejora
            analysis.suggestions = await this.generateImprovementSuggestions(content, language);

            // Generar embedding para almacenamiento
            const embedding = await this.embedding.generateContextualEmbedding(content, {
                language,
                type: 'file_analysis'
            });

            // Almacenar en Qdrant para futuras búsquedas
            await this.storeAnalysisResult(content, analysis, embedding);

            return analysis;

        } catch (error) {
            console.error('❌ Error analizando archivo:', error);
            throw error;
        }
    }

    extractBasicMetrics(content, language) {
        const metrics = {
            lines: 0,
            characters: content.length,
            functions: 0,
            classes: 0,
            imports: 0,
            comments: 0,
            blankLines: 0
        };

        try {
            const lines = content.split('\n');
            metrics.lines = lines.length;

            // Contar líneas en blanco
            metrics.blankLines = lines.filter(line => line.trim() === '').length;

            // Patrones específicos por lenguaje
            const patterns = this.getLanguagePatterns(language);

            // Contar funciones
            const functions = content.match(patterns.functions);
            metrics.functions = functions ? functions.length : 0;

            // Contar clases
            const classes = content.match(patterns.classes);
            metrics.classes = classes ? classes.length : 0;

            // Contar imports
            const imports = content.match(patterns.imports);
            metrics.imports = imports ? imports.length : 0;

            // Contar comentarios
            const comments = content.match(patterns.comments);
            metrics.comments = comments ? comments.length : 0;

        } catch (error) {
            console.warn('⚠️ Error extrayendo métricas básicas:', error.message);
        }

        return metrics;
    }

    getLanguagePatterns(language) {
        const patterns = {
            javascript: {
                functions: /(?:function\s+\w+|const\s+\w+\s*=\s*(?:\(|async\s+\())|(?:=>\s*{)/g,
                classes: /class\s+\w+/g,
                imports: /(?:import\s+|require\s*\()/g,
                comments: /(?:\/\/|\/\*|\*\/)/g
            },
            typescript: {
                functions: /(?:function\s+\w+|const\s+\w+\s*=\s*(?:\(|async\s+\())|(?:=>\s*{)|(?:public|private|protected)\s+\w+\s*\(/g,
                classes: /class\s+\w+/g,
                imports: /(?:import\s+|require\s*\()/g,
                comments: /(?:\/\/|\/\*|\*\/)/g
            },
            python: {
                functions: /def\s+\w+/g,
                classes: /class\s+\w+/g,
                imports: /(?:import\s+|from\s+\w+\s+import)/g,
                comments: /#/g
            },
            java: {
                functions: /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)+\w+\s*\(/g,
                classes: /class\s+\w+/g,
                imports: /import\s+/g,
                comments: /(?:\/\/|\/\*|\*\/)/g
            },
            sql: {
                functions: /(?:CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|CREATE\s+PROCEDURE)/gi,
                classes: /(?:CREATE\s+TABLE|CREATE\s+VIEW)/gi,
                imports: /(?:FROM\s+\w+|JOIN\s+\w+)/gi,
                comments: /--|\/\*|\*\//g
            }
        };

        return patterns[language] || patterns.javascript;
    }

    async analyzeComplexity(content, language) {
        const complexity = {
            score: 0,
            level: 'low',
            factors: {
                nesting: 0,
                branches: 0,
                functions: 0,
                lines: 0
            }
        };

        try {
            // Análisis de anidamiento
            const nestingPatterns = {
                javascript: /(?:if|for|while|switch)\s*\(/g,
                python: /(?:if|for|while|with)\s+/g,
                java: /(?:if|for|while|switch)\s*\(/g
            };

            const nestingPattern = nestingPatterns[language] || nestingPatterns.javascript;
            const nestingMatches = content.match(nestingPattern);
            complexity.factors.nesting = nestingMatches ? nestingMatches.length : 0;

            // Análisis de ramificaciones
            const branchPatterns = /(?:if|else|case|catch|try)\s+/g;
            const branches = content.match(branchPatterns);
            complexity.factors.branches = branches ? branches.length : 0;

            // Número de funciones/métodos
            const patterns = this.getLanguagePatterns(language);
            const functions = content.match(patterns.functions);
            complexity.factors.functions = functions ? functions.length : 0;

            // Longitud del archivo
            const lines = content.split('\n').length;
            complexity.factors.lines = lines;

            // Calcular puntuación de complejidad
            complexity.score =
                complexity.factors.nesting * 2 +
                complexity.factors.branches * 1.5 +
                complexity.factors.functions * 1 +
                Math.log(lines) * 0.5;

            // Determinar nivel
            if (complexity.score < 10) complexity.level = 'low';
            else if (complexity.score < 25) complexity.level = 'medium';
            else if (complexity.score < 50) complexity.level = 'high';
            else complexity.level = 'very_high';

        } catch (error) {
            console.warn('⚠️ Error analizando complejidad:', error.message);
        }

        return complexity;
    }

    detectPotentialIssues(content, language) {
        const issues = [];

        try {
            // Problemas comunes por lenguaje
            const issuePatterns = {
                javascript: [
                    {
                        pattern: /console\.log\(/g,
                        type: 'warning',
                        message: 'Console.log encontrado en código de producción',
                        severity: 'low'
                    },
                    {
                        pattern: /var\s+/g,
                        type: 'suggestion',
                        message: 'Uso de var en lugar de let/const',
                        severity: 'medium'
                    },
                    {
                        pattern: /==/g,
                        type: 'warning',
                        message: 'Uso de comparación laxa (==) en lugar de estricta (===)',
                        severity: 'medium'
                    },
                    {
                        pattern: /catch\s*\(\s*\w+\s*\)\s*{[^}]*$/g,
                        type: 'warning',
                        message: 'Manejo de errores sin usar el parámetro error',
                        severity: 'high'
                    }
                ],
                python: [
                    {
                        pattern: /print\(/g,
                        type: 'warning',
                        message: 'Print statement encontrado',
                        severity: 'low'
                    },
                    {
                        pattern: /except\s*:/g,
                        type: 'warning',
                        message: 'Captura de excepciones demasiado amplia',
                        severity: 'medium'
                    }
                ],
                sql: [
                    {
                        pattern: /SELECT\s+\*/gi,
                        type: 'warning',
                        message: 'Uso de SELECT * - especificar columnas',
                        severity: 'medium'
                    },
                    {
                        pattern: /WHERE\s+1\s*=\s*1/gi,
                        type: 'warning',
                        message: 'Condición WHERE siempre verdadera',
                        severity: 'high'
                    }
                ]
            };

            const patterns = issuePatterns[language] || [];

            for (const issuePattern of patterns) {
                const matches = content.match(issuePattern.pattern);
                if (matches) {
                    issues.push({
                        type: issuePattern.type,
                        message: issuePattern.message,
                        severity: issuePattern.severity,
                        occurrences: matches.length,
                        line: this.findLineNumber(content, matches[0])
                    });
                }
            }

            // Análisis de código duplicado básico
            const duplicateLines = this.detectDuplicateCode(content);
            if (duplicateLines.length > 0) {
                issues.push({
                    type: 'warning',
                    message: 'Código duplicado detectado',
                    severity: 'medium',
                    occurrences: duplicateLines.length,
                    details: duplicateLines.slice(0, 5) // Mostrar primeras 5 líneas duplicadas
                });
            }

        } catch (error) {
            console.warn('⚠️ Error detectando problemas:', error.message);
        }

        return issues;
    }

    async generateImprovementSuggestions(content, language) {
        const suggestions = [];

        try {
            // Sugerencias basadas en métricas
            const metrics = this.extractBasicMetrics(content, language);

            if (metrics.lines > 300) {
                suggestions.push({
                    type: 'refactor',
                    message: 'Archivo muy largo. Considerar dividir en módulos más pequeños',
                    priority: 'high',
                    category: 'structure'
                });
            }

            if (metrics.comments / metrics.lines < 0.1 && metrics.lines > 50) {
                suggestions.push({
                    type: 'documentation',
                    message: 'Agregar más comentarios al código',
                    priority: 'medium',
                    category: 'documentation'
                });
            }

            if (metrics.functions > 10) {
                suggestions.push({
                    type: 'refactor',
                    message: 'Muchas funciones en un archivo. Considerar separar responsabilidades',
                    priority: 'medium',
                    category: 'structure'
                });
            }

            // Análisis de complejidad
            const complexity = await this.analyzeComplexity(content, language);
            if (complexity.level === 'high' || complexity.level === 'very_high') {
                suggestions.push({
                    type: 'refactor',
                    message: `Función con alta complejidad (${complexity.level}). Considerar dividir en funciones más pequeñas`,
                    priority: 'high',
                    category: 'complexity'
                });
            }

            // Sugerencias específicas por lenguaje
            const languageSuggestions = this.getLanguageSpecificSuggestions(content, language);
            suggestions.push(...languageSuggestions);

        } catch (error) {
            console.warn('⚠️ Error generando sugerencias:', error.message);
        }

        return suggestions;
    }

    getLanguageSpecificSuggestions(content, language) {
        const suggestions = [];

        if (language === 'javascript' || language === 'typescript') {
            // Verificar uso de async/await
            const promises = content.match(/\.then\(/g);
            const asyncFunctions = content.match(/async\s+function|const\s+\w+\s*=\s*async/g);

            if (promises && promises.length > 5 && (!asyncFunctions || asyncFunctions.length === 0)) {
                suggestions.push({
                    type: 'modernize',
                    message: 'Considerar usar async/await en lugar de promesas encadenadas',
                    priority: 'medium',
                    category: 'syntax'
                });
            }

            // Verificar uso de arrow functions
            const functionDeclarations = content.match(/function\s+\w+\s*\(/g);
            if (functionDeclarations && functionDeclarations.length > 3) {
                suggestions.push({
                    type: 'modernize',
                    message: 'Considerar usar arrow functions donde sea apropiado',
                    priority: 'low',
                    category: 'syntax'
                });
            }
        }

        return suggestions;
    }

    detectDuplicateCode(content) {
        const lines = content.split('\n');
        const duplicates = [];
        const seen = new Set();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length > 10 && seen.has(line)) { // Solo líneas significativas
                duplicates.push(line);
            }
            seen.add(line);
        }

        return [...new Set(duplicates)]; // Remover duplicados de la lista de duplicados
    }

    findLineNumber(content, searchString) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchString)) {
                return i + 1;
            }
        }
        return 0;
    }

    async storeAnalysisResult(content, analysis, embedding) {
        try {
            const point = {
                id: this.qdrant.generateId(),
                vector: embedding,
                payload: {
                    content_hash: this.generateContentHash(content),
                    language: analysis.language,
                    metrics: analysis.metrics,
                    complexity_score: analysis.complexity.score,
                    issues_count: analysis.issues.length,
                    suggestions_count: analysis.suggestions.length,
                    timestamp: analysis.timestamp,
                    analysis_type: 'file_analysis'
                }
            };

            await this.qdrant.insertPoints(this.qdrant.collections.CODE_PATTERNS, [point]);

        } catch (error) {
            console.warn('⚠️ Error almacenando resultado de análisis:', error.message);
        }
    }

    generateContentHash(content) {
        // Hash simple para identificar contenido único
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32 bits
        }
        return Math.abs(hash).toString(36);
    }

    async indexCodebase(basePath = '../', excludePatterns = ['node_modules', '.git', 'logs']) {
        try {
            console.log('📊 Iniciando indexación del codebase...');

            const results = {
                totalFiles: 0,
                processedFiles: 0,
                errors: 0,
                indexedPatterns: 0
            };

            // Encontrar todos los archivos de código
            const files = await this.findCodeFiles(basePath, excludePatterns);
            results.totalFiles = files.length;

            console.log(`📁 Encontrados ${files.length} archivos de código`);

            // Procesar archivos en lotes
            const batchSize = 5;
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);

                const batchPromises = batch.map(async (filePath) => {
                    try {
                        const content = await fs.readFile(filePath, 'utf8');
                        const language = this.detectLanguage(filePath);

                        if (this.supportedLanguages.includes(language)) {
                            const analysis = await this.analyzeFile(content, language);
                            results.processedFiles++;
                            results.indexedPatterns += analysis.metrics.functions + analysis.metrics.classes;
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error procesando ${filePath}:`, error.message);
                        results.errors++;
                    }
                });

                await Promise.all(batchPromises);

                // Progreso
                const progress = Math.round(((i + batch.length) / files.length) * 100);
                console.log(`📊 Progreso: ${progress}% (${i + batch.length}/${files.length})`);
            }

            console.log('✅ Indexación completada:', results);
            return results;

        } catch (error) {
            console.error('❌ Error indexando codebase:', error);
            throw error;
        }
    }

    async findCodeFiles(basePath, excludePatterns) {
        const extensions = ['.js', '.ts', '.py', '.java', '.sql', '.jsx', '.tsx'];
        const files = [];

        try {
            const pattern = `${basePath}/**/*{${extensions.join(',')}}`;

            return new Promise((resolve, reject) => {
                glob(pattern, {
                    ignore: excludePatterns.map(pattern => `**/${pattern}/**`),
                    nodir: true
                }, (err, matches) => {
                    if (err) reject(err);
                    else resolve(matches);
                });
            });

        } catch (error) {
            console.error('❌ Error buscando archivos:', error);
            return [];
        }
    }

    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.sql': 'sql'
        };

        return languageMap[ext] || 'unknown';
    }
}

module.exports = { CodeAnalyzer };