const express = require('express');
const DebtsRepository = require('./repositories/debts-repository');
const { authenticate } = require('./auth');
const { validateDebtData } = require('./validators/debt-validator');
const { ApiError } = require('./error-handler');

/**
 * Rutas para el manejo de deudas de clientes
 */
const router = express.Router();
const debtsRepo = new DebtsRepository();

/**
 * GET /api/clientes/deudas-resumen
 * Obtener resumen de deudas de todos los clientes
 */
router.get('/clientes/deudas-resumen', authenticate, async (req, res, next) => {
    try {
        const clientesConDeudas = await debtsRepo.getDebtsSummary();
        
        res.json({
            success: true,
            data: clientesConDeudas,
            total: clientesConDeudas.length
        });
    } catch (error) {
        console.error('Error obteniendo resumen de deudas:', error);
        next(new ApiError('Error al obtener deudas', 500));
    }
});

/**
 * GET /api/clientes/:clienteId/deudas-con-productos
 * Obtener deudas de un cliente específico con productos y precios actuales
 */
router.get('/clientes/:clienteId/deudas-con-productos', authenticate, async (req, res, next) => {
    try {
        const clienteId = parseInt(req.params.clienteId);
        
        if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return next(new ApiError('ID de cliente inválido', 400));
        }

        // Verificar que el cliente exista
        const cliente = await debtsRepo.getClientById(clienteId);
        if (!cliente) {
            return next(new ApiError('Cliente no encontrado', 404));
        }

        const deudas = await debtsRepo.getDebtsByClientWithProducts(clienteId);
        
        res.json({
            success: true,
            data: deudas,
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                dni: cliente.dni,
                direccion: cliente.direccion
            }
        });
    } catch (error) {
        console.error('Error obteniendo deudas del cliente:', error);
        next(new ApiError('Error al obtener deudas del cliente', 500));
    }
});

/**
 * PUT /api/clientes/:clienteId/actualizar-deudas
 * Actualizar deudas de un cliente con precios actuales de productos
 */
router.put('/clientes/:clienteId/actualizar-deudas', authenticate, async (req, res, next) => {
    try {
        const clienteId = parseInt(req.params.clienteId);
        
        if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return next(new ApiError('ID de cliente inválido', 400));
        }

        // Verificar que el cliente exista
        const cliente = await debtsRepo.getClientById(clienteId);
        if (!cliente) {
            return next(new ApiError('Cliente no encontrado', 404));
        }

        const result = await debtsRepo.updateDebtsWithCurrentPrices(clienteId);
        
        res.json({
            success: true,
            message: result.message,
            updated: result.updated,
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre
            }
        });
    } catch (error) {
        console.error('Error actualizando deudas:', error);
        next(new ApiError('Error al actualizar deudas', 500));
    }
});

/**
 * POST /api/ventas/cuenta-corriente
 * Crear una nueva deuda (venta a cuenta corriente)
 * Espera: { cliente_id, items: [{ producto_id, cantidad, precio_unitario }], fecha_vencimiento?, descripcion? }
 */
router.post('/ventas/cuenta-corriente', authenticate, async (req, res, next) => {
    try {
        const { cliente_id, items, fecha_vencimiento, descripcion } = req.body;

        // Validar datos de entrada
        const validation = validateDebtData({ cliente_id, items, fecha_vencimiento, descripcion });
        if (!validation.isValid) {
            return next(new ApiError(validation.errors.join(', '), 400));
        }

        // Verificar que el cliente exista
        const cliente = await debtsRepo.getClientById(cliente_id);
        if (!cliente) {
            return next(new ApiError('Cliente no encontrado', 404));
        }

        // Validar items y calcular montos
        let montoTotal = 0;
        const itemsValidados = [];

        for (const item of items) {
            const productoData = await debtsRepo.getProductById(item.producto_id);
            if (!productoData) {
                return next(new ApiError(`Producto con ID ${item.producto_id} no encontrado`, 404));
            }

            const cantidad = parseInt(item.cantidad);
            const precioUnitario = parseFloat(item.precio_unitario);

            if (cantidad <= 0 || precioUnitario <= 0) {
                return next(new ApiError('Cantidad y precio deben ser mayores a 0', 400));
            }

            const subtotal = cantidad * precioUnitario;
            montoTotal += subtotal;

            itemsValidados.push({
                producto_id: item.producto_id,
                cantidad: cantidad,
                precio_unitario: precioUnitario,
                subtotal: subtotal,
                precio_actual: productoData.precio
            });
        }

        // Crear deuda
        const nuevaDeuda = await debtsRepo.createDebt({
            cliente_id: cliente_id,
            monto_total: montoTotal,
            monto_pendiente: montoTotal,
            estado: 'pendiente',
            fecha_vencimiento: fecha_vencimiento,
            descripcion: descripcion || `Venta a cuenta corriente - ${new Date().toISOString()}`
        }, itemsValidados);

        res.status(201).json({
            success: true,
            message: 'Deuda creada exitosamente',
            data: nuevaDeuda
        });
    } catch (error) {
        console.error('Error creando deuda:', error);
        next(new ApiError('Error al crear la deuda', 500));
    }
});

/**
 * GET /api/clientes
 * Listar todos los clientes (endpoint solicitado)
 */
router.get('/clientes', authenticate, async (req, res, next) => {
    try {
        const db = require('./database-sqlite').getDB();
        
        db.all('SELECT * FROM clientes ORDER BY nombre', [], (err, rows) => {
            if (err) {
                return next(new ApiError('Error al obtener clientes', 500));
            }
            
            res.json({
                success: true,
                data: rows,
                total: rows.length
            });
        });
    } catch (error) {
        console.error('Error listando clientes:', error);
        next(new ApiError('Error al listar clientes', 500));
    }
});

/**
 * GET /api/clientes/:id
 * Obtener un cliente por ID (endpoint útil para validaciones)
 */
router.get('/clientes/:id', authenticate, async (req, res, next) => {
    try {
        const clienteId = parseInt(req.params.id);
        
        if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return next(new ApiError('ID de cliente inválido', 400));
        }

        const cliente = await debtsRepo.getClientById(clienteId);
        
        if (!cliente) {
            return next(new ApiError('Cliente no encontrado', 404));
        }

        res.json({
            success: true,
            data: cliente
        });
    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        next(new ApiError('Error al obtener cliente', 500));
    }
});

/**
 * DELETE /api/clientes/:clienteId/limpiar-deudas
 * Limpiar todas las deudas de un cliente (establecer como pagadas)
 */
router.delete('/clientes/:clienteId/limpiar-deudas', authenticate, async (req, res, next) => {
    try {
        const clienteId = parseInt(req.params.clienteId);
        
        if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return next(new ApiError('ID de cliente inválido', 400));
        }

        // Verificar que el cliente exista
        const cliente = await debtsRepo.getClientById(clienteId);
        if (!cliente) {
            return next(new ApiError('Cliente no encontrado', 404));
        }

        const result = await debtsRepo.clearAllDebts(clienteId);
        
        res.json({
            success: true,
            message: result.message,
            cleared: result.cleared,
            totalAmount: result.totalAmount,
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre
            }
        });
    } catch (error) {
        console.error('Error limpiando deudas:', error);
        next(new ApiError('Error al limpiar las deudas', 500));
    }
});

module.exports = router;