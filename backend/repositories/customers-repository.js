const { BaseRepository } = require('./base-repository');

/**
 * Repositorio para operaciones de clientes
 * Extiende BaseRepository con métodos específicos para clientes
 */
class CustomersRepository extends BaseRepository {
    constructor() {
        super('clientes');
    }

    /**
     * Crea un nuevo cliente
     */
    async createCustomer(customerData) {
        const {
            nombre,
            telefono,
            direccion,
            dni,
            nota,
            created_at
        } = customerData;

        const data = {
            nombre,
            telefono,
            direccion,
            dni,
            nota,
            created_at: created_at || new Date().toISOString()
        };

        return this.create(data);
    }

    /**
     * Actualiza un cliente
     */
    async updateCustomer(id, customerData) {
        const allowedFields = [
            'nombre', 'telefono', 'direccion', 'dni', 'nota'
        ];
        const updateData = {};

        allowedFields.forEach(field => {
            if (customerData[field] !== undefined) {
                updateData[field] = customerData[field];
            }
        });

        return this.update(id, updateData);
    }

    /**
     * Busca clientes por nombre
     */
    async findByName(nombre) {
        return this.find('SELECT * FROM clientes WHERE nombre LIKE ? ORDER BY nombre', [`%${nombre}%`]);
    }

    /**
     * Busca cliente por DNI
     */
    async findByDni(dni) {
        return this.findOne('SELECT * FROM clientes WHERE dni = ?', [dni]);
    }

    /**
     * Busca cliente por teléfono
     */
    async findByPhone(telefono) {
        return this.findOne('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
    }

    /**
     * Obtiene clientes con estadísticas de deudas
     */
    async findWithDebtStats() {
        const sql = `
            SELECT
                c.*,
                COALESCE(d.total_deudas, 0) as total_deudas,
                COALESCE(d.total_pendiente, 0) as total_pendiente,
                COALESCE(d.deudas_pendientes, 0) as deudas_pendientes,
                COALESCE(d.deudas_vencidas, 0) as deudas_vencidas
            FROM clientes c
            LEFT JOIN (
                SELECT
                    cliente_id,
                    COUNT(*) as total_deudas,
                    SUM(monto_pendiente) as total_pendiente,
                    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as deudas_pendientes,
                    COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as deudas_vencidas
                FROM deudas
                GROUP BY cliente_id
            ) d ON c.id = d.cliente_id
            ORDER BY c.nombre
        `;
        return this.find(sql);
    }
}

module.exports = { CustomersRepository };