const { ChromaService } = require('./chroma.service');
const { EmbeddingService } = require('./embedding.service');

class PatternDetector {
    constructor(chromaService, embeddingService) {
        this.chromaService = chromaService;
        this.embeddingService = embeddingService;
    }

    async detectCodeDuplication(projectPath, options = {}) {
        try {
            console.log('🔍 Iniciando detección de duplicación con ChromaDB...');

            // Conectar a ChromaDB
            await this.chromaService.connect();
            await this.chromaService.createCollection('code_duplicates');

            // Obtener archivos del proyecto
            const files = this.getCodeFiles(projectPath, options.excludeDirs || []);
            console.log(`📂 Analizando ${files.length} archivos`);

            // Procesar archivos y generar embeddings
            const results = [];
            const fileEmbeddings = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const embedding = await this.embeddingService.generateEmbedding(file.content);
                    fileEmbeddings.push({
                        id: `file_${i}`,
                        embedding: embedding,
                        metadata: {
                            path: file.path,
                            lines: file.lines,
                            size: file.content.length
                        }
                    });
                } catch (error) {
                    console.warn(`⚠️ Error procesando ${file.path}:`, error.message);
                }
            }

            // Agregar embeddings a ChromaDB
            if (fileEmbeddings.length > 0) {
                const ids = fileEmbeddings.map(f => f.id);
                const embeddings = fileEmbeddings.map(f => f.embedding);
                const metadatas = fileEmbeddings.map(f => f.metadata);

                await this.chromaService.addEmbeddings(ids, embeddings, metadatas);
            }

            // Buscar duplicados
            for (let i = 0; i < fileEmbeddings.length; i++) {
                const queryEmbedding = fileEmbeddings[i].embedding;
                const queryMetadata = fileEmbeddings[i].metadata;

                const results = await this.chromaService.searchSimilar(queryEmbedding, {
                    limit: 5,
                    where: { path: { $ne: queryMetadata.path } }
                });

                if (results && results.distances && results.distances[0]) {
                    results.distances[0].forEach((distance, j) => {
                        if (distance < (1 - options.similarityThreshold)) {
                            const similarFile = fileEmbeddings.find(f => f.id === results.ids[0][j]);
                            if (similarFile) {
                                results.push({
                                    file1: queryMetadata.path,
                                    file2: similarFile.metadata.path,
                                    similarity: 1 - distance,
                                    lines1: queryMetadata.lines,
                                    lines2: similarFile.metadata.lines
                                });
                            }
                        }
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('❌ Error detectando duplicación:', error);
            throw error;
        }
    }

    getCodeFiles(basePath, excludeDirs = []) {
        const fs = require('fs');
        const path = require('path');
        const files = [];
        const extensions = ['.js', '.ts', '.py', '.java'];

        function scanDir(dirPath) {
            try {
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
            } catch (error) {
                console.warn(`⚠️ Error escaneando directorio ${dirPath}:`, error.message);
            }
        }

        scanDir(basePath);
        return files;
    }
}

module.exports = { PatternDetector };