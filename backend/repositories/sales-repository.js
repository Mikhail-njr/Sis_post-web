const { BaseRepository } = require('./base-repository');

/**
 * Repositorio para operaciones de ventas
 * Extiende BaseRepository con métodos específicos para ventas
 */
class SalesRepository extends BaseRepository {
    constructor() {
        super('ventas');
    }

    /**
     * Crea una nueva venta con cliente_id opcional
     */
    async createSale(saleData) {
        const { numero_factura, total, metodo_pago, vuelto = 0, cliente_id = null, created_at } = saleData;

        const data = {
            numero_factura,
            total,
            metodo_pago,
            vuelto,
            cliente_id,
            created_at: created_at || new Date().toISOString()
        };

        return this.create(data);
    }

    /**
     * Actualiza una venta incluyendo cliente_id
     */
    async updateSale(id, saleData) {
        const allowedFields = ['numero_factura', 'total', 'metodo_pago', 'vuelto', 'cliente_id'];
        const updateData = {};

        allowedFields.forEach(field => {
            if (saleData[field] !== undefined) {
                updateData[field] = saleData[field];
            }
        });

        return this.update(id, updateData);
    }

    /**
     * Encuentra ventas por cliente
     */
    async findByClient(cliente_id) {
        return this.find('SELECT * FROM ventas WHERE cliente_id = ? ORDER BY created_at DESC', [cliente_id]);
    }

    /**
     * Encuentra ventas con información del cliente
     */
    async findWithClientInfo() {
        const sql = `
            SELECT v.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            ORDER BY v.created_at DESC
        `;
        return this.find(sql);
    }

    /**
     * Obtiene estadísticas de ventas por cliente
     */
    async getClientSalesStats(cliente_id) {
        const sql = `
            SELECT
                COUNT(*) as total_ventas,
                SUM(total) as total_monto,
                AVG(total) as promedio_venta,
                MAX(created_at) as ultima_venta
            FROM ventas
            WHERE cliente_id = ?
        `;
        return this.findOne(sql, [cliente_id]);
    }
}

module.exports = { SalesRepository };