const Database = require('./database-sqlite');

/**
 * Script para contar clientes con cuentas corrientes activas
 * Un cliente tiene cuenta corriente activa si tiene deudas pendientes
 */

const countClientesConCuentaCorriente = () => {
    return new Promise((resolve, reject) => {
        const db = Database.getDB();
        const query = `
            SELECT
                COUNT(DISTINCT c.id) as clientes_con_cuenta_corriente
            FROM clientes c
            JOIN deudas d ON c.id = d.cliente_id
            WHERE d.monto_pendiente > 0 AND d.estado = 'pendiente'
        `;

        db.get(query, [], (err, row) => {
            if (err) {
                console.error('Error al contar clientes con cuenta corriente:', err);
                return reject(err);
            }

            resolve(row.clientes_con_cuenta_corriente || 0);
        });
    });
};

// Ejecutar la consulta
countClientesConCuentaCorriente()
    .then(count => {
        console.log(`📊 Clientes con cuenta corriente activa: ${count}`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });