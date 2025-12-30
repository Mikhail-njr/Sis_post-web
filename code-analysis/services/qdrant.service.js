const { QdrantClient } = require('@qdrant/js-client-rest');

class QdrantService {
    constructor(config = {}) {
        this.config = {
            url: config.url || 'http://localhost:6333',
            apiKey: config.apiKey,
            timeout: config.timeout || 30000
        };

        this.client = null;
        this.isConnected = false;
        this.collections = {
            CODE_PATTERNS: 'code_patterns',
            ERROR_PATTERNS: 'error_patterns',
            FUNCTION_SIGNATURES: 'function_signatures',
            CODE_COMPLEXITY: 'code_complexity',
            SEMANTIC_SEARCH: 'semantic_search'
        };
    }

    async connect() {
        try {
            this.client = new QdrantClient({
                url: this.config.url,
                apiKey: this.config.apiKey,
                timeout: this.config.timeout
            });

            // Verificar conexión
            try {
                await this.client.getCollections();
                this.isConnected = true;
                console.log('✅ Conectado a Qdrant exitosamente');
            } catch (error) {
                console.error('❌ Error verificando conexión a Qdrant:', error.message);
                throw error;
            }

            // Inicializar colecciones
            await this.initializeCollections();

        } catch (error) {
            console.error('❌ Error conectando a Qdrant:', error.message);
            throw error;
        }
    }

    async initializeCollections() {
        try {
            console.log('📊 Inicializando colecciones...');

            // Definir esquemas de colecciones
            const collectionSchemas = {
                [this.collections.CODE_PATTERNS]: {
                    vectors: { size: 384, distance: 'Cosine' },
                    optimizers_config: { default_segment_number: 2, memmap_threshold: 20000 }
                },
                [this.collections.ERROR_PATTERNS]: {
                    vectors: { size: 384, distance: 'Cosine' },
                    optimizers_config: { default_segment_number: 2, memmap_threshold: 20000 }
                },
                [this.collections.FUNCTION_SIGNATURES]: {
                    vectors: { size: 384, distance: 'Cosine' },
                    optimizers_config: { default_segment_number: 2, memmap_threshold: 20000 }
                },
                [this.collections.CODE_COMPLEXITY]: {
                    vectors: { size: 384, distance: 'Cosine' },
                    optimizers_config: { default_segment_number: 2, memmap_threshold: 20000 }
                },
                [this.collections.SEMANTIC_SEARCH]: {
                    vectors: { size: 384, distance: 'Cosine' },
                    optimizers_config: { default_segment_number: 2, memmap_threshold: 20000 }
                }
            };

            // Crear colecciones si no existen
            for (const [collectionName, config] of Object.entries(collectionSchemas)) {
                const exists = await this.collectionExists(collectionName);

                if (!exists) {
                    await this.client.createCollection(collectionName, config);
                    console.log(`✅ Colección creada: ${collectionName}`);

                    // Crear índices de payload para búsquedas eficientes
                    await this.createPayloadIndexes(collectionName);
                } else {
                    console.log(`ℹ️ Colección ya existe: ${collectionName}`);
                }
            }

        } catch (error) {
            console.error('❌ Error inicializando colecciones:', error);
            throw error;
        }
    }

    async createPayloadIndexes(collectionName) {
        try {
            const indexes = [
                { field_name: 'language', field_schema: 'keyword' },
                { field_name: 'file_path', field_schema: 'text' },
                { field_name: 'function_name', field_schema: 'text' },
                { field_name: 'complexity_score', field_schema: 'integer' },
                { field_name: 'error_type', field_schema: 'keyword' },
                { field_name: 'timestamp', field_schema: 'datetime' }
            ];

            for (const index of indexes) {
                try {
                    await this.client.createPayloadIndex(collectionName, index);
                } catch (error) {
                    // Ignorar errores si el índice ya existe
                    if (!error.message.includes('already exists')) {
                        console.warn(`⚠️ Error creando índice ${index.field_name}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Error creando índices de payload:', error.message);
        }
    }

    async collectionExists(collectionName) {
        try {
            const collections = await this.client.getCollections();
            return collections.collections.some(col => col.name === collectionName);
        } catch (error) {
            return false;
        }
    }

    async insertPoints(collectionName, points) {
        try {
            if (!this.isConnected) {
                throw new Error('No conectado a Qdrant');
            }

            const response = await this.client.upsert(collectionName, {
                wait: true,
                points: points
            });

            return response;
        } catch (error) {
            console.error(`❌ Error insertando puntos en ${collectionName}:`, error);
            throw error;
        }
    }

    async search(collectionName, vector, options = {}) {
        try {
            if (!this.isConnected) {
                throw new Error('No conectado a Qdrant');
            }

            const searchRequest = {
                vector: vector,
                limit: options.limit || 10,
                with_payload: options.with_payload !== false,
                with_vector: options.with_vector || false,
                score_threshold: options.score_threshold || 0.0
            };

            if (options.filter) {
                searchRequest.filter = options.filter;
            }

            const response = await this.client.search(collectionName, searchRequest);
            return response;
        } catch (error) {
            console.error(`❌ Error buscando en ${collectionName}:`, error);
            throw error;
        }
    }

    async deletePoints(collectionName, points) {
        try {
            if (!this.isConnected) {
                throw new Error('No conectado a Qdrant');
            }

            const response = await this.client.delete(collectionName, {
                wait: true,
                points: points
            });

            return response;
        } catch (error) {
            console.error(`❌ Error eliminando puntos en ${collectionName}:`, error);
            throw error;
        }
    }

    async getCollectionStats() {
        try {
            if (!this.isConnected) {
                throw new Error('No conectado a Qdrant');
            }

            const stats = {};

            for (const collectionName of Object.values(this.collections)) {
                try {
                    const info = await this.client.getCollection(collectionName);
                    stats[collectionName] = {
                        vectors_count: info.vectors_count || 0,
                        segments_count: info.segments_count || 0,
                        status: info.status
                    };
                } catch (error) {
                    stats[collectionName] = { error: error.message };
                }
            }

            return stats;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    async clearCollection(collectionName) {
        try {
            if (!this.isConnected) {
                throw new Error('No conectado a Qdrant');
            }

            // Eliminar todos los puntos de la colección
            await this.client.delete(collectionName, {
                wait: true,
                filter: {} // Filtro vacío elimina todos los puntos
            });

            console.log(`🗑️ Colección ${collectionName} limpiada`);
        } catch (error) {
            console.error(`❌ Error limpiando colección ${collectionName}:`, error);
            throw error;
        }
    }

    async recreateCollection(collectionName) {
        try {
            if (!this.isConnected) {
                throw new Error('No conectado a Qdrant');
            }

            // Eliminar colección si existe
            const exists = await this.collectionExists(collectionName);
            if (exists) {
                await this.client.deleteCollection(collectionName);
                console.log(`🗑️ Colección ${collectionName} eliminada`);
            }

            // Recrear colección
            const config = {
                vectors: { size: 384, distance: 'Cosine' },
                optimizers_config: { default_segment_number: 2, memmap_threshold: 20000 }
            };

            await this.client.createCollection(collectionName, config);
            console.log(`✅ Colección ${collectionName} recreada`);

            // Recrear índices
            await this.createPayloadIndexes(collectionName);

        } catch (error) {
            console.error(`❌ Error recreando colección ${collectionName}:`, error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.client) {
                // Qdrant client no tiene método close explícito
                this.isConnected = false;
                console.log('🔌 Conexión a Qdrant cerrada');
            }
        } catch (error) {
            console.error('❌ Error cerrando conexión:', error);
        }
    }

    // Método utilitario para generar IDs únicos
    generateId() {
        // Generar ID numérico único usando timestamp y random
        return Date.now() * 1000 + Math.floor(Math.random() * 1000);
    }

    // Método para verificar salud del servicio
    async healthCheck() {
        try {
            await this.client.getCollections();
            return { status: 'healthy' };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

module.exports = { QdrantService };