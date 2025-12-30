const express = require('express');
const db = require('./database-sqlite');

const router = express.Router();

// Endpoint para depurar clientes con cuenta corriente
router.get('/clientes/cuenta-corriente', (req, res) => {
    console.log('🔍 [DEBUG] Solicitud a /clientes/cuenta-corriente');
    
    const query = `
        SELECT 
            c.id,
            c.nombre,
            c.telefono,
            c.dni,
            c.direccion,
            COALESCE(SUM(d.monto_pendiente), 0) as saldo_pendiente,
            COUNT(d.id) as cantidad_deudas
        FROM clientes c
        LEFT JOIN deudas d ON c.id = d.cliente_id AND d.pagado = 0
        WHERE c.tiene_cuenta_corriente = 1
        GROUP BY c.id, c.nombre, c.telefono, c.dni, c.direccion
        ORDER BY saldo_pendiente DESC, c.nombre ASC
    `;

    console.log('🔍 [DEBUG] Consulta SQL ejecutada:', query);

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ [ERROR] Error en consulta de clientes:', err);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener clientes con cuenta corriente',
                details: err.message
            });
        }

        console.log('🔍 [DEBUG] Resultados de la consulta:', rows);
        console.log('🔍 [DEBUG] Total de clientes encontrados:', rows.length);

        // Mostrar detalles de cada cliente encontrado
        rows.forEach((cliente, index) => {
            console.log(`🔍 [DEBUG] Cliente ${index + 1}:`, {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                dni: cliente.dni,
                saldo_pendiente: cliente.saldo_pendiente,
                cantidad_deudas: cliente.cantidad_deudas
            });
        });

        res.json({
            success: true,
            clientes: rows,
            total: rows.length
        });
    });
});

// Endpoint para obtener TODOS los clientes (para comparación)
router.get('/clientes/todos', (req, res) => {
    console.log('🔍 [DEBUG] Solicitud a /clientes/todos');
    
    const query = `
        SELECT 
            c.id,
            c.nombre,
            c.telefono,
            c.dni,
            c.direccion,
            c.tiene_cuenta_corriente,
            COALESCE(SUM(d.monto_pendiente), 0) as saldo_pendiente,
            COUNT(d.id) as cantidad_deudas
        FROM clientes c
        LEFT JOIN deudas d ON c.id = d.cliente_id AND d.pagado = 0
        GROUP BY c.id, c.nombre, c.telefono, c.dni, c.direccion, c.tiene_cuenta_corriente
        ORDER BY c.nombre ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ [ERROR] Error en consulta de todos los clientes:', err);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener todos los clientes',
                details: err.message
            });
        }

        console.log('🔍 [DEBUG] Total de clientes en sistema:', rows.length);
        console.log('🔍 [DEBUG] Clientes con cuenta corriente:', rows.filter(c => c.tiene_cuenta_corriente).length);

        res.json({
            success: true,
            clientes: rows,
            total: rows.length,
            con_cuenta_corriente: rows.filter(c => c.tiene_cuenta_corriente).length
        });
    });
});

module.exports = router;