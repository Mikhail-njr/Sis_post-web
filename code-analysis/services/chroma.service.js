const { ChromaClient } = require('chromadb');

class ChromaService {
    constructor(options = {}) {
        this.host = options.host || 'localhost';
        this.port = options.port || 8000;
        this.client = null;
        this.collection = null;
    }

    async connect() {
        try {
            this.client = new ChromaClient({
                host: this.host,
                port: this.port
            });

            // Verificar conexión
            await this.client.heartbeat();

            console.log('✅ Conectado a ChromaDB en', `http://${this.host}:${this.port}`);
            return true;
        } catch (error) {
            console.error('❌ Error conectando a ChromaDB:', error.message);
            throw error;
        }
    }

    async createCollection(name, metadata = {}) {
        try {
            if (!this.client) await this.connect();

            // Verificar si la colección ya existe
            const existingCollections = await this.client.listCollections();
            const exists = existingCollections.some(col => col.name === name);

            if (exists) {
                console.log(`📁 Colección '${name}' ya existe, usando existente`);
                this.collection = await this.client.getCollection(name);
            } else {
                console.log(`📁 Creando colección '${name}'`);
                this.collection = await this.client.createCollection(name, metadata);
            }

            return this.collection;
        } catch (error) {
            console.error('❌ Error creando colección:', error.message);
            throw error;
        }
    }

    async addEmbeddings(ids, embeddings, metadatas = [], documents = []) {
        try {
            if (!this.collection) {
                throw new Error('Colección no inicializada. Llama createCollection primero.');
            }

            await this.collection.add({
                ids: ids,
                embeddings: embeddings,
                metadatas: metadatas.length > 0 ? metadatas : undefined,
                documents: documents.length > 0 ? documents : undefined
            });

            console.log(`✅ Agregados ${ids.length} embeddings a la colección`);
        } catch (error) {
            console.error('❌ Error agregando embeddings:', error.message);
            throw error;
        }
    }

    async searchSimilar(queryEmbedding, options = {}) {
        try {
            if (!this.collection) {
                throw new Error('Colección no inicializada. Llama createCollection primero.');
            }

            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: options.limit || 10,
                where: options.where || undefined,
                include: ['metadatas', 'documents', 'distances']
            });

            return results;
        } catch (error) {
            console.error('❌ Error buscando similares:', error.message);
            throw error;
        }
    }

    async deleteCollection(name) {
        try {
            if (!this.client) await this.connect();

            await this.client.deleteCollection(name);
            console.log(`🗑️ Colección '${name}' eliminada`);
        } catch (error) {
            console.error('❌ Error eliminando colección:', error.message);
            throw error;
        }
    }

    async getCollectionCount() {
        try {
            if (!this.collection) return 0;

            const count = await this.collection.count();
            return count;
        } catch (error) {
            console.error('❌ Error obteniendo conteo:', error.message);
            return 0;
        }
    }

    async listCollections() {
        try {
            if (!this.client) await this.connect();

            const collections = await this.client.listCollections();
            return collections;
        } catch (error) {
            console.error('❌ Error listando colecciones:', error.message);
            return [];
        }
    }
}

module.exports = { ChromaService };