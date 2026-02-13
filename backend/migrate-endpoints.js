const express = require('express');
const { authenticateToken, requireAdmin, requireCajeroOrAdmin, requireInvitadoOrCajeroOrAdmin, checkPermissions } = require('./auth-middleware');

/**
 * Script de migración de endpoints existentes para integrarlos con el nuevo sistema de autenticación
 * 
 * Este script muestra cómo migrar los endpoints existentes del POS para que utilicen
 * el nuevo sistema de autenticación basado en base de datos.
 */

// Importar los endpoints originales (ejemplo)
// const productosEndpoints = require('./productos-endpoints');
// const ventasEndpoints = require('./ventas-endpoints');
// const promocionesEndpoints = require('./promociones-endpoints');

const router = express.Router();

/**
 * MIGRACIÓN DE ENDPOINTS EXISTENTES
 * 
 * A continuación se muestra cómo migrar los endpoints existentes para que utilicen
 * el nuevo sistema de autenticación. Cada endpoint debe ser actualizado para incluir
 * el middleware de autenticación y autorización correspondiente.
 */

// === ENDPOINTS DE PRODUCTOS ===

// GET /api/products - Listar productos (todos los roles pueden leer)
router.get('/api/products', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_products']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            // const products = await db.all("SELECT * FROM products");
            // res.json(products);
            
            res.json({ 
                message: 'Endpoint de productos migrado exitosamente',
                user: req.user,
                permissions: 'read_products'
            });
        } catch (error) {
            console.error('Error en endpoint de productos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/products - Crear producto (solo admin y cajero)
router.post('/api/products', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['create_products']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            // const { nombre, precio, stock } = req.body;
            // const result = await db.run("INSERT INTO products (nombre, precio, stock) VALUES (?, ?, ?)", [nombre, precio, stock]);
            // res.json({ id: result.lastID });
            
            res.json({ 
                message: 'Endpoint de creación de productos migrado exitosamente',
                user: req.user,
                permissions: 'create_products'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de productos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/products/:id - Actualizar producto (solo admin y cajero)
router.put('/api/products/:id', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['update_products']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            // const { id } = req.params;
            // const { nombre, precio, stock } = req.body;
            // await db.run("UPDATE products SET nombre = ?, precio = ?, stock = ? WHERE id = ?", [nombre, precio, stock, id]);
            // res.json({ message: 'Producto actualizado' });
            
            res.json({ 
                message: 'Endpoint de actualización de productos migrado exitosamente',
                user: req.user,
                permissions: 'update_products'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de productos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// DELETE /api/products/:id - Eliminar producto (solo admin)
router.delete('/api/products/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['delete_products']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            // const { id } = req.params;
            // await db.run("DELETE FROM products WHERE id = ?", [id]);
            // res.json({ message: 'Producto eliminado' });
            
            res.json({ 
                message: 'Endpoint de eliminación de productos migrado exitosamente',
                user: req.user,
                permissions: 'delete_products'
            });
        } catch (error) {
            console.error('Error en endpoint de eliminación de productos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// === ENDPOINTS DE VENTAS ===

// GET /api/sales - Listar ventas (todos los roles pueden leer)
router.get('/api/sales', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_sales']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de ventas migrado exitosamente',
                user: req.user,
                permissions: 'read_sales'
            });
        } catch (error) {
            console.error('Error en endpoint de ventas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/sales - Crear venta (solo admin y cajero)
router.post('/api/sales', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['create_sales']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de creación de ventas migrado exitosamente',
                user: req.user,
                permissions: 'create_sales'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de ventas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/sales/:id - Actualizar venta (solo admin y cajero)
router.put('/api/sales/:id', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['update_sales']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de actualización de ventas migrado exitosamente',
                user: req.user,
                permissions: 'update_sales'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de ventas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// === ENDPOINTS DE PROMOCIONES ===

// GET /api/promotions - Listar promociones (todos los roles pueden leer)
router.get('/api/promotions', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_promotions']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de promociones migrado exitosamente',
                user: req.user,
                permissions: 'read_promotions'
            });
        } catch (error) {
            console.error('Error en endpoint de promociones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/promotions - Crear promoción (solo admin)
router.post('/api/promotions', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['create_promotions']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de creación de promociones migrado exitosamente',
                user: req.user,
                permissions: 'create_promotions'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de promociones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/promotions/:id - Actualizar promoción (solo admin)
router.put('/api/promotions/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['update_promotions']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de actualización de promociones migrado exitosamente',
                user: req.user,
                permissions: 'update_promotions'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de promociones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// DELETE /api/promotions/:id - Eliminar promoción (solo admin)
router.delete('/api/promotions/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['delete_promotions']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de eliminación de promociones migrado exitosamente',
                user: req.user,
                permissions: 'delete_promotions'
            });
        } catch (error) {
            console.error('Error en endpoint de eliminación de promociones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// === ENDPOINTS DE PROVEEDORES ===

// GET /api/suppliers - Listar proveedores (todos los roles pueden leer)
router.get('/api/suppliers', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_suppliers']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de proveedores migrado exitosamente',
                user: req.user,
                permissions: 'read_suppliers'
            });
        } catch (error) {
            console.error('Error en endpoint de proveedores:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/suppliers - Crear proveedor (solo admin)
router.post('/api/suppliers', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['create_suppliers']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de creación de proveedores migrado exitosamente',
                user: req.user,
                permissions: 'create_suppliers'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de proveedores:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/suppliers/:id - Actualizar proveedor (solo admin)
router.put('/api/suppliers/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['update_suppliers']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de actualización de proveedores migrado exitosamente',
                user: req.user,
                permissions: 'update_suppliers'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de proveedores:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// DELETE /api/suppliers/:id - Eliminar proveedor (solo admin)
router.delete('/api/suppliers/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['delete_suppliers']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de eliminación de proveedores migrado exitosamente',
                user: req.user,
                permissions: 'delete_suppliers'
            });
        } catch (error) {
            console.error('Error en endpoint de eliminación de proveedores:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// === ENDPOINTS DE LOTES ===

// GET /api/lotes - Listar lotes (todos los roles pueden leer)
router.get('/api/lotes', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_lotes']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de lotes migrado exitosamente',
                user: req.user,
                permissions: 'read_lotes'
            });
        } catch (error) {
            console.error('Error en endpoint de lotes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/lotes - Crear lote (solo admin y cajero)
router.post('/api/lotes', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['create_lotes']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de creación de lotes migrado exitosamente',
                user: req.user,
                permissions: 'create_lotes'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de lotes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/lotes/:id - Actualizar lote (solo admin y cajero)
router.put('/api/lotes/:id', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['update_lotes']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de actualización de lotes migrado exitosamente',
                user: req.user,
                permissions: 'update_lotes'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de lotes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// DELETE /api/lotes/:id - Eliminar lote (solo admin)
router.delete('/api/lotes/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['delete_lotes']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de eliminación de lotes migrado exitosamente',
                user: req.user,
                permissions: 'delete_lotes'
            });
        } catch (error) {
            console.error('Error en endpoint de eliminación de lotes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// === ENDPOINTS DE CIERRES ===

// GET /api/cierres - Listar cierres (todos los roles pueden leer)
router.get('/api/cierres', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_cierres']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de cierres migrado exitosamente',
                user: req.user,
                permissions: 'read_cierres'
            });
        } catch (error) {
            console.error('Error en endpoint de cierres:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/cierres - Crear cierre (solo admin y cajero)
router.post('/api/cierres', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['create_cierres']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de creación de cierres migrado exitosamente',
                user: req.user,
                permissions: 'create_cierres'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de cierres:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/cierres/:id - Actualizar cierre (solo admin)
router.put('/api/cierres/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['update_cierres']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de actualización de cierres migrado exitosamente',
                user: req.user,
                permissions: 'update_cierres'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de cierres:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// === ENDPOINTS DE OPERACIONES ===

// GET /api/operations - Listar operaciones (todos los roles pueden leer)
router.get('/api/operations', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_operations']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de operaciones migrado exitosamente',
                user: req.user,
                permissions: 'read_operations'
            });
        } catch (error) {
            console.error('Error en endpoint de operaciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// POST /api/operations - Crear operación (solo admin)
router.post('/api/operations', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['create_operations']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de creación de operaciones migrado exitosamente',
                user: req.user,
                permissions: 'create_operations'
            });
        } catch (error) {
            console.error('Error en endpoint de creación de operaciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// PUT /api/operations/:id - Actualizar operación (solo admin)
router.put('/api/operations/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['update_operations']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de actualización de operaciones migrado exitosamente',
                user: req.user,
                permissions: 'update_operations'
            });
        } catch (error) {
            console.error('Error en endpoint de actualización de operaciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

// DELETE /api/operations/:id - Eliminar operación (solo admin)
router.delete('/api/operations/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['delete_operations']),
    async (req, res) => {
        try {
            // Lógica original del endpoint
            res.json({ 
                message: 'Endpoint de eliminación de operaciones migrado exitosamente',
                user: req.user,
                permissions: 'delete_operations'
            });
        } catch (error) {
            console.error('Error en endpoint de eliminación de operaciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

module.exports = router;

/**
 * GUÍA DE MIGRACIÓN
 * 
 * Para migrar los endpoints existentes del POS al nuevo sistema de autenticación:
 * 
 * 1. Importar el middleware de autenticación:
 *    const { authenticateToken, requireAdmin, requireCajeroOrAdmin, requireInvitadoOrCajeroOrAdmin, checkPermissions } = require('./auth-middleware');
 * 
 * 2. Agregar el middleware de autenticación a cada endpoint:
 *    - authenticateToken: Verifica la autenticación del usuario
 *    - requireAdmin: Requiere rol de administrador
 *    - requireCajeroOrAdmin: Requiere rol de cajero o administrador
 *    - requireInvitadoOrCajeroOrAdmin: Requiere cualquier rol válido
 *    - checkPermissions: Verifica permisos específicos
 * 
 * 3. Actualizar la lógica de los endpoints para usar req.user:
 *    - req.user.id: ID del usuario autenticado
 *    - req.user.username: Nombre de usuario
 *    - req.user.rol: Rol del usuario
 * 
 * 4. Registrar las operaciones en el log de autenticación:
 *    await db.run("INSERT INTO auth_logs (username, tipo_evento, ip_address, user_agent) VALUES (?, ?, ?, ?)", 
 *                 [req.user.username, 'OPERACION_REALIZADA', req.ip, req.get('User-Agent')]);
 * 
 * 5. Probar los endpoints con diferentes roles para asegurar que la autorización funciona correctamente.
 */