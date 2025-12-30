class PatternDetector {
    constructor(qdrantService, embeddingService) {
        this.qdrant = qdrantService;
        this.embedding = embeddingService;
    }

    async findSimilarPatterns(query, options = {}) {
        try {
            console.log('🔍 Buscando patrones similares...');

            const {
                language = 'javascript',
                limit = 10,
                threshold = 0.7,
                context = {}
            } = options;

            // Generar embedding de la consulta
            const queryEmbedding = await this.embedding.generateContextualEmbedding(query, {
                language,
                type: 'pattern_search',
                ...context
            });

            // Buscar en Qdrant
            const filter = {};
            if (language) {
                filter.language = { $eq: language };
            }

            const searchResults = await this.qdrant.search(
                this.qdrant.collections.CODE_PATTERNS,
                queryEmbedding,
                {
                    limit: limit * 2, // Buscar más para filtrar
                    with_payload: true,
                    score_threshold: threshold,
                    filter
                }
            );

            // Procesar y formatear resultados
            const results = searchResults.map(result => ({
                id: result.id,
                similarity: result.score,
                language: result.payload.language,
                content_hash: result.payload.content_hash,
                metrics: result.payload.metrics,
                complexity_score: result.payload.complexity_score,
                timestamp: result.payload.timestamp,
                analysis_type: result.payload.analysis_type
            }));

            // Ordenar por similitud y limitar
            results.sort((a, b) => b.similarity - a.similarity);

            return results.slice(0, limit);

        } catch (error) {
            console.error('❌ Error buscando patrones similares:', error);
            throw error;
        }
    }

    async semanticSearch(query, filters = {}, limit = 20) {
        try {
            console.log('🔍 Realizando búsqueda semántica...');

            // Generar embedding de la consulta
            const queryEmbedding = await this.embedding.generateEmbedding(query);

            // Construir filtro de Qdrant
            const qdrantFilter = this.buildQdrantFilter(filters);

            // Buscar en colección semántica
            const searchResults = await this.qdrant.search(
                this.qdrant.collections.SEMANTIC_SEARCH,
                queryEmbedding,
                {
                    limit,
                    with_payload: true,
                    filter: qdrantFilter
                }
            );

            // Procesar resultados
            const results = searchResults.map(result => ({
                id: result.id,
                score: result.score,
                content: result.payload.content,
                file_path: result.payload.file_path,
                language: result.payload.language,
                line_number: result.payload.line_number,
                context: result.payload.context,
                metadata: result.payload.metadata
            }));

            return results;

        } catch (error) {
            console.error('❌ Error en búsqueda semántica:', error);
            throw error;
        }
    }

    async detectCodeDuplication(codebasePath, options = {}) {
        try {
            console.log('🔍 Detectando duplicación de código...');

            const {
                minLength = 6, // Mínimo de líneas para considerar duplicación
                similarityThreshold = 0.85,
                excludeDirs = []
            } = options;

            const duplicates = [];

            // Obtener todos los archivos de código
            const files = await this.getCodeFiles(codebasePath, excludeDirs);

            // Procesar archivos en pares para encontrar duplicados
            for (let i = 0; i < files.length; i++) {
                for (let j = i + 1; j < files.length; j++) {
                    const file1 = files[i];
                    const file2 = files[j];

                    const similarity = await this.calculateFileSimilarity(file1, file2);

                    if (similarity >= similarityThreshold) {
                        duplicates.push({
                            file1: file1.path,
                            file2: file2.path,
                            similarity,
                            lines1: file1.lines,
                            lines2: file2.lines
                        });
                    }
                }
            }

            // Ordenar por similitud descendente
            duplicates.sort((a, b) => b.similarity - a.similarity);

            return duplicates;

        } catch (error) {
            console.error('❌ Error detectando duplicación:', error);
            throw error;
        }
    }

    async findBestPracticesViolations(content, language) {
        try {
            console.log('🔍 Buscando violaciones de mejores prácticas...');

            const violations = [];

            // Patrones de mejores prácticas por lenguaje
            const bestPractices = this.getBestPracticesPatterns(language);

            for (const practice of bestPractices) {
                const matches = content.match(practice.pattern);

                if (matches) {
                    // Verificar si es una violación (depende del tipo)
                    if (practice.shouldFlag && practice.shouldFlag(matches, content)) {
                        violations.push({
                            type: practice.type,
                            severity: practice.severity,
                            message: practice.message,
                            occurrences: matches.length,
                            suggestion: practice.suggestion,
                            category: practice.category
                        });
                    }
                }
            }

            return violations;

        } catch (error) {
            console.error('❌ Error analizando mejores prácticas:', error);
            throw error;
        }
    }

    async suggestRefactoring(content, language) {
        try {
            console.log('🔧 Generando sugerencias de refactorización...');

            const suggestions = [];

            // Análisis de complejidad
            const complexity = await this.analyzeComplexityForRefactoring(content, language);

            if (complexity.score > 20) {
                suggestions.push({
                    type: 'extract_method',
                    priority: 'high',
                    message: 'Función demasiado compleja. Considerar extraer métodos más pequeños.',
                    estimated_effort: 'medium',
                    impact: 'high'
                });
            }

            // Análisis de longitud
            const lines = content.split('\n').length;
            if (lines > 200) {
                suggestions.push({
                    type: 'split_file',
                    priority: 'medium',
                    message: 'Archivo muy largo. Considerar dividirlo en módulos más pequeños.',
                    estimated_effort: 'high',
                    impact: 'medium'
                });
            }

            // Análisis de responsabilidades
            const responsibilities = this.analyzeSingleResponsibility(content, language);
            if (responsibilities.length > 3) {
                suggestions.push({
                    type: 'single_responsibility',
                    priority: 'medium',
                    message: `Múltiples responsabilidades detectadas: ${responsibilities.join(', ')}`,
                    estimated_effort: 'high',
                    impact: 'high'
                });
            }

            return suggestions;

        } catch (error) {
            console.error('❌ Error generando sugerencias de refactorización:', error);
            throw error;
        }
    }

    async analyzeComplexityForRefactoring(content, language) {
        const complexity = {
            score: 0,
            factors: {
                nesting: 0,
                branches: 0,
                variables: 0,
                methods: 0
            }
        };

        try {
            // Contar anidamiento
            const nestingMatches = content.match(/(?:if|for|while|switch)\s*\(/g);
            complexity.factors.nesting = nestingMatches ? nestingMatches.length : 0;

            // Contar ramificaciones
            const branchMatches = content.match(/(?:if|else|case|catch)\s+/g);
            complexity.factors.branches = branchMatches ? branchMatches.length : 0;

            // Contar variables locales
            const varMatches = content.match(/(?:let|const|var)\s+\w+/g);
            complexity.factors.variables = varMatches ? varMatches.length : 0;

            // Contar métodos/funciones
            const methodPatterns = {
                javascript: /(?:function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{)/g,
                python: /def\s+\w+/g,
                java: /public\s+\w+\s*\(/g
            };

            const methodPattern = methodPatterns[language] || methodPatterns.javascript;
            const methods = content.match(methodPattern);
            complexity.factors.methods = methods ? methods.length : 0;

            // Calcular puntuación
            complexity.score =
                complexity.factors.nesting * 3 +
                complexity.factors.branches * 2 +
                complexity.factors.variables * 0.5 +
                complexity.factors.methods * 1;

        } catch (error) {
            console.warn('⚠️ Error analizando complejidad para refactorización:', error.message);
        }

        return complexity;
    }

    analyzeSingleResponsibility(content, language) {
        const responsibilities = [];

        try {
            // Patrones que indican diferentes responsabilidades
            const patterns = {
                database: /(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/gi,
                file_io: /(?:fs\.|readFile|writeFile|open|close)/gi,
                network: /(?:http|fetch|axios|request)/gi,
                ui: /(?:document\.|window\.|alert|console\.)/gi,
                business_logic: /(?:calculate|process|validate|convert)/gi
            };

            for (const [responsibility, pattern] of Object.entries(patterns)) {
                if (pattern.test(content)) {
                    responsibilities.push(responsibility);
                }
            }

        } catch (error) {
            console.warn('⚠️ Error analizando responsabilidad única:', error.message);
        }

        return responsibilities;
    }

    getBestPracticesPatterns(language) {
        const patterns = {
            javascript: [
                {
                    type: 'naming_convention',
                    pattern: /(?:var|let|const)\s+[A-Z][a-zA-Z0-9_]*/g,
                    shouldFlag: (matches) => matches.length > 0,
                    severity: 'low',
                    message: 'Variables con nombres que empiezan con mayúscula',
                    suggestion: 'Usar camelCase para variables',
                    category: 'naming'
                },
                {
                    type: 'error_handling',
                    pattern: /throw\s+new\s+Error\s*\(/g,
                    shouldFlag: (matches, content) => {
                        const catches = content.match(/catch\s*\(/g);
                        return matches && (!catches || catches.length === 0);
                    },
                    severity: 'medium',
                    message: 'Errores lanzados sin manejo adecuado',
                    suggestion: 'Implementar bloques try-catch apropiados',
                    category: 'error_handling'
                }
            ],
            python: [
                {
                    type: 'imports',
                    pattern: /import\s+\*/g,
                    shouldFlag: (matches) => matches.length > 0,
                    severity: 'medium',
                    message: 'Uso de import *',
                    suggestion: 'Importar explícitamente los módulos necesarios',
                    category: 'imports'
                }
            ]
        };

        return patterns[language] || [];
    }

    async calculateFileSimilarity(file1, file2) {
        try {
            // Generar embeddings de ambos archivos
            const embedding1 = await this.embedding.generateEmbedding(file1.content);
            const embedding2 = await this.embedding.generateEmbedding(file2.content);

            // Calcular similitud coseno
            return this.embedding.calculateSimilarity(embedding1, embedding2);

        } catch (error) {
            console.warn('⚠️ Error calculando similitud de archivos:', error.message);
            return 0;
        }
    }

    async getCodeFiles(basePath, excludeDirs = []) {
        const fs = require('fs');
        const path = require('path');

        const files = [];
        const extensions = ['.js', '.ts', '.py', '.java'];

        function scanDir(dirPath) {
            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && !excludeDirs.includes(item)) {
                    scanDir(fullPath);
                } else if (stat.isFile() && extensions.includes(path.extname(item))) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        files.push({
                            path: fullPath,
                            content,
                            lines: content.split('\n').length
                        });
                    } catch (error) {
                        console.warn(`⚠️ Error leyendo archivo ${fullPath}:`, error.message);
                    }
                }
            }
        }

        scanDir(basePath);
        return files;
    }

    buildQdrantFilter(filters) {
        const qdrantFilter = {};

        if (filters.language) {
            qdrantFilter.language = { $eq: filters.language };
        }

        if (filters.file_path) {
            qdrantFilter.file_path = { $eq: filters.file_path };
        }

        if (filters.min_score) {
            // Esto se maneja en el score_threshold del search
        }

        return Object.keys(qdrantFilter).length > 0 ? qdrantFilter : null;
    }

    async indexSemanticContent(content, metadata = {}) {
        try {
            // Dividir contenido en fragmentos más pequeños para mejor búsqueda
            const fragments = this.splitIntoFragments(content);

            const points = [];

            for (const fragment of fragments) {
                const embedding = await this.embedding.generateEmbedding(fragment.content);

                points.push({
                    id: this.qdrant.generateId(),
                    vector: embedding,
                    payload: {
                        content: fragment.content,
                        file_path: metadata.file_path,
                        language: metadata.language,
                        line_number: fragment.lineNumber,
                        context: fragment.context,
                        metadata: {
                            ...metadata,
                            fragment_type: fragment.type
                        }
                    }
                });
            }

            if (points.length > 0) {
                await this.qdrant.insertPoints(this.qdrant.collections.SEMANTIC_SEARCH, points);
            }

            return points.length;

        } catch (error) {
            console.error('❌ Error indexando contenido semántico:', error);
            throw error;
        }
    }

    splitIntoFragments(content) {
        const fragments = [];
        const lines = content.split('\n');

        let currentFragment = '';
        let startLine = 0;
        let fragmentType = 'code';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detectar cambios de contexto (funciones, clases, etc.)
            if (line.match(/(?:function|class|def|public\s+class|CREATE\s+TABLE)/i)) {
                // Guardar fragmento anterior si existe
                if (currentFragment.trim()) {
                    fragments.push({
                        content: currentFragment.trim(),
                        lineNumber: startLine,
                        type: fragmentType,
                        context: this.extractContext(lines, startLine, i)
                    });
                }

                // Iniciar nuevo fragmento
                currentFragment = line + '\n';
                startLine = i;
                fragmentType = this.detectFragmentType(line);
            } else {
                currentFragment += line + '\n';
            }

            // Limitar tamaño de fragmentos
            if (currentFragment.length > 1000) {
                fragments.push({
                    content: currentFragment.trim(),
                    lineNumber: startLine,
                    type: fragmentType,
                    context: this.extractContext(lines, startLine, i)
                });

                currentFragment = '';
                startLine = i + 1;
            }
        }

        // Agregar último fragmento
        if (currentFragment.trim()) {
            fragments.push({
                content: currentFragment.trim(),
                lineNumber: startLine,
                type: fragmentType,
                context: this.extractContext(lines, startLine, lines.length)
            });
        }

        return fragments;
    }

    detectFragmentType(line) {
        if (line.match(/function|def/i)) return 'function';
        if (line.match(/class/i)) return 'class';
        if (line.match(/CREATE\s+TABLE/i)) return 'table';
        if (line.match(/import|require/i)) return 'import';
        return 'code';
    }

    extractContext(lines, startLine, endLine) {
        const contextLines = 2;
        const context = [];

        // Líneas anteriores
        for (let i = Math.max(0, startLine - contextLines); i < startLine; i++) {
            context.push(lines[i]);
        }

        // Líneas posteriores
        for (let i = endLine; i < Math.min(lines.length, endLine + contextLines); i++) {
            context.push(lines[i]);
        }

        return context.join('\n');
    }
}

module.exports = { PatternDetector };