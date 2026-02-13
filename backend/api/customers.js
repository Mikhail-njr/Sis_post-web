const express = require('express');
const db = require('../database-sqlite');

const router = express.Router();

/**
 * GET /api/customers
 * Obtiene todos los clientes
 */
router.get('/', (req, res) => {
    const query = `
        SELECT 
            id,
            nombre,
            telefono,
            dni,
            direccion,
            email,
            fecha_registro,
            activo
        FROM clientes 
        WHERE activo = 1
        ORDER BY nombre
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener clientes:', err);
            return res.status(500).json({ 
                error: 'Error al obtener clientes',
                details: err.message 
            });
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    });
});

/**
 * GET /api/customers/:id
 * Obtiene un cliente por su ID
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            id,
            nombre,
            telefono,
            dni,
            direccion,
            email,
            fecha_registro,
            activo
        FROM clientes 
        WHERE id = ? AND activo = 1
    `;

    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener cliente:', err);
            return res.status(500).json({ 
                error: 'Error al obtener cliente',
                details: err.message 
            });
        }

        if (!row) {
            return res.status(404).json({ 
                error: 'Cliente no encontrado' 
            });
        }

        res.json({
            success: true,
            data: row
        });
    });
});

/**
 * POST /api/customers
 * Crea un nuevo cliente
 */
router.post('/', (req, res) => {
    const { nombre, telefono, dni, direccion, email } = req.body;

    // Validación básica
    if (!nombre || !telefono) {
        return res.status(400).json({
            error: 'Nombre y teléfono son requeridos'
        });
    }

    // Verificar si ya existe un cliente con el mismo DNI o teléfono
    const checkQuery = `
        SELECT id, nombre
        FROM clientes
        WHERE (dni = ? OR telefono = ?) AND activo = 1
    `;

    db.get(checkQuery, [dni, telefono], (err, existingClient) => {
        if (err) {
            console.error('Error al verificar cliente existente:', err);
            return res.status(500).json({
                error: 'Error al verificar cliente existente',
                details: err.message
            });
        }

        // Si ya existe un cliente con el mismo DNI o teléfono
        if (existingClient) {
            // Determinar qué campo está duplicado
            let campoDuplicado = '';
            if (existingClient.dni === dni) {
                campoDuplicado = 'DNI';
            } else if (existingClient.telefono === telefono) {
                campoDuplicado = 'teléfono';
            }

            return res.status(409).json({
                error: 'Cliente duplicado detectado',
                message: `Ya existe un cliente con el mismo ${campoDuplicado}: ${existingClient.nombre}`,
                campo_duplicado: campoDuplicado,
                valor_duplicado: campoDuplicado === 'DNI' ? dni : telefono,
                existingClient: {
                    id: existingClient.id,
                    nombre: existingClient.nombre,
                    telefono: existingClient.telefono,
                    dni: existingClient.dni
                }
            });
        }

        // Si no existe, proceder con la creación
        const insertQuery = `
            INSERT INTO clientes (nombre, telefono, dni, direccion, email, fecha_registro, activo)
            VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
        `;

        db.run(insertQuery, [nombre, telefono, dni, direccion, email], function(err) {
            if (err) {
                console.error('Error al crear cliente:', err);
                return res.status(500).json({
                    error: 'Error al crear cliente',
                    details: err.message
                });
            }

            res.status(201).json({
                success: true,
                message: 'Cliente creado exitosamente',
                data: {
                    id: this.lastID,
                    nombre,
                    telefono,
                    dni,
                    direccion,
                    email
                }
            });
        });
    });
});

/**
 * PUT /api/customers/:id
 * Actualiza un cliente existente
 */
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, dni, direccion, email } = req.body;

    // Validación básica
    if (!nombre || !telefono) {
        return res.status(400).json({ 
            error: 'Nombre y teléfono son requeridos' 
        });
    }

    const query = `
        UPDATE clientes 
        SET nombre = ?, telefono = ?, dni = ?, direccion = ?, email = ?
        WHERE id = ? AND activo = 1
    `;

    db.run(query, [nombre, telefono, dni, direccion, email, id], function(err) {
        if (err) {
            console.error('Error al actualizar cliente:', err);
            return res.status(500).json({ 
                error: 'Error al actualizar cliente',
                details: err.message 
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({ 
                error: 'Cliente no encontrado' 
            });
        }

        res.json({
            success: true,
            message: 'Cliente actualizado exitosamente'
        });
    });
});

/**
 * DELETE /api/customers/:id
 * Elimina un cliente (baja lógica)
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        UPDATE clientes 
        SET activo = 0 
        WHERE id = ?
    `;

    db.run(query, [id], function(err) {
        if (err) {
            console.error('Error al eliminar cliente:', err);
            return res.status(500).json({ 
                error: 'Error al eliminar cliente',
                details: err.message 
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({ 
                error: 'Cliente no encontrado' 
            });
        }

        res.json({
            success: true,
            message: 'Cliente eliminado exitosamente'
        });
    });
});

/**
 * GET /api/customers/:id/debts
 * Obtiene las deudas de un cliente
 */
router.get('/:id/debts', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            d.id,
            d.cliente_id,
            d.producto_id,
            d.cantidad,
            d.precio_unitario,
            d.fecha,
            d.descripcion,
            p.nombre as producto_nombre,
            (d.cantidad * d.precio_unitario) as monto_total
        FROM deudas d
        LEFT JOIN productos p ON d.producto_id = p.id
        WHERE d.cliente_id = ? AND d.cantidad > 0
        ORDER BY d.fecha DESC
    `;

    db.all(query, [id], (err, rows) => {
        if (err) {
            console.error('Error al obtener deudas del cliente:', err);
            return res.status(500).json({ 
                error: 'Error al obtener deudas del cliente',
                details: err.message 
            });
        }

        // Calcular el total de deudas
        const totalDeuda = rows.reduce((sum, deuda) => sum + (deuda.cantidad * deuda.precio_unitario), 0);

        res.json({
            success: true,
            data: {
                deudas: rows,
                total: totalDeuda,
                count: rows.length
            }
        });
    });
});

module.exports = router;