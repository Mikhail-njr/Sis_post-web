const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { QDRANT_URL, generateSimpleVector } = require('./indexing-utils.service');

/**
 * Servicio base para indexación de archivos en Qdrant
 */
class BaseIndexer {
    constructor(collectionName = 'code_patterns') {
        this.collectionName = collectionName;
        this.qdrantUrl = QDRANT_URL;
    }

    /**
     * Verifica la conexión con Qdrant
     */
    async checkQdrantHealth() {
        try {
            const response = await axios.get(this.qdrantUrl);
            console.log('✅ Qdrant está funcionando');
            return true;
        } catch (error) {
            console.error('❌ Error conectando con Qdrant:', error.message);
            return false;
        }
    }

    /**
     * Indexa un archivo individual
     */
    async indexFile(filePath, basePath = '../', options = {}) {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ Archivo no encontrado: ${filePath}`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            const extension = path.extname(filePath);
            const relativePath = path.relative(basePath, filePath);

            // Generar vector
            const vector = generateSimpleVector(content);

            // Preparar payload base
            const pointId = options.id || Math.floor(Date.now() + Math.random() * 1000);
            const payload = {
                id: pointId,
                vector: vector,
                payload: {
                    file_path: relativePath,
                    file_name: fileName,
                    extension: extension,
                    content_preview: content.substring(0, options.previewLength || 500),
                    size: content.length,
                    indexed_at: new Date().toISOString(),
                    lines: content.split('\n').length,
                    ...options.additionalPayload
                }
            };

            // Insertar en colección
            const response = await axios.put(`${this.qdrantUrl}/collections/${this.collectionName}/points`, {
                points: [payload]
            });

            console.log(`✅ Indexado: ${relativePath} (${content.length} chars)`);
            return true;

        } catch (error) {
            console.error(`❌ Error indexando ${filePath}:`, error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Obtiene el conteo de puntos en la colección
     */
    async getCollectionCount() {
        try {
            const response = await axios.post(`${this.qdrantUrl}/collections/${this.collectionName}/points/count`, {});
            return response.data.result?.count || 0;
        } catch (error) {
            console.log(`⚠️ No se pudo obtener el conteo de puntos: ${error.message}`);
            return 'desconocido';
        }
    }

    /**
     * Procesa archivos en lotes
     */
    async processBatch(files, batchSize = 10, processor) {
        let indexed = 0;
        let errors = 0;

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const promises = batch.map(file => processor(file));

            const results = await Promise.all(promises);
            indexed += results.filter(r => r).length;
            errors += results.filter(r => !r).length;

            console.log(`📈 Progreso: ${Math.min(i + batchSize, files.length)}/${files.length} archivos procesados`);
        }

        return { indexed, errors };
    }

    /**
     * Muestra resumen de indexación
     */
    async showSummary(indexed, errors, totalProcessed) {
        console.log(`\n🎉 Indexación completada:`);
        console.log(`   ✅ Archivos indexados: ${indexed}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log(`   📊 Total procesado: ${totalProcessed}`);

        const totalPoints = await this.getCollectionCount();
        console.log(`   📊 Total de puntos en colección: ${totalPoints}`);
    }
}

module.exports = { BaseIndexer };