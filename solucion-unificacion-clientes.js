/**
 * SOLUCIÓN DEFINITIVA: Unificación de Endpoints de Clientes
 * 
 * Este script implementa la solución para el problema de clientes duplicados
 * entre el dashboard y el POS, creando un endpoint único y validaciones preventivas.
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Importar desde el server.js existente
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 IMPLEMENTANDO SOLUCIÓN DE CLIENTES DUPLICADOS');
console.log('================================================\n');

// 1. NUEVOS ENDPOINTS UNIFICADOS

/**
 * GET /api/clientes
 * Endpoint unificado para listar clientes (reemplaza /api/customers)
 */
function getClientesUnificado(req, res) {
    console.log('🔍 [UNIFICADO] GET /api/clientes');
    
    const { q, limit = 50, offset = 0, with_debts = false } = req.query;
    
    let whereClause = '';
    let params = [];
    let conditions = [];
    
    if (q && q.trim() !== '') {
        conditions.push('(nombre LIKE ? OR telefono LIKE ? OR dni LIKE ?)');
        const searchTerm = `%${q.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (with_debts === 'true') {
        conditions.push('id IN (SELECT DISTINCT cliente_id FROM deudas WHERE estado = "pendiente" AND monto_pendiente > 0)');
    }
    
    if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const sql = `
        SELECT 
            c.*,
            COALESCE(SUM(d.monto_pendiente), 0) as total_deuda,
            COUNT(d.id) as cantidad_deudas
        FROM clientes c
        LEFT JOIN deudas d ON c.id = d.cliente_id AND d.estado = 'pendiente' AND d.monto_pendiente > 0
        ${whereClause}
        GROUP BY c.id, c.nombre, c.telefono, c.dni, c.direccion, c.nota, c.created_at
        ORDER BY total_deuda DESC, c.nombre ASC
        LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo clientes:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Contar total
        const countSql = `
            SELECT COUNT(*) as total FROM clientes c
            ${whereClause.replace('GROUP BY c.id', '').replace('ORDER BY', 'ORDER BY')}
        `;
        const countParams = with_debts === 'true' ? [] : params.slice(0, -2);
        
        db.get(countSql, countParams, (err, count) => {
            if (err) {
                console.error('❌ Error contando clientes:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                clientes: rows,
                pagination: {
                    total: count.total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + parseInt(limit)) < count.total
                }
            });
        });
    });
}

/**
 * POST /api/clientes
 * Endpoint unificado para crear clientes con validación de duplicados
 */
async function createClienteUnificado(req, res) {
    console.log('➕ [UNIFICADO] POST /api/clientes');
    
    const { nombre, telefono, direccion, dni, nota } = req.body;
    
    // Validaciones requeridas
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El campo nombre es obligatorio'
        });
    }
    
    try {
        // Validar duplicados antes de crear
        const duplicados = await validarClienteDuplicado(nombre.trim(), dni, telefono);
        
        if (duplicados.existe) {
            return res.status(409).json({
                error: 'Cliente duplicado detectado',
                duplicado: duplicados.cliente,
                sugerencia: 'Utilice el cliente existente o proporcione información diferente'
            });
        }
        
        // Crear nuevo cliente
        const result = await dbRun(
            `INSERT INTO clientes (nombre, telefono, direccion, dni, nota, created_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [nombre.trim(), telefono || null, direccion || null, dni || null, nota || null]
        );
        
        const newCustomer = await dbAll("SELECT * FROM clientes WHERE id = ?", [result.id]);
        
        console.log('✅ Cliente creado exitosamente:', newCustomer[0].nombre);
        
        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            cliente: newCustomer[0]
        });
        
    } catch (error) {
        console.error('❌ Error creando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
}

/**
 * PUT /api/clientes/:id
 * Endpoint unificado para actualizar clientes
 */
async function updateClienteUnificado(req, res) {
    console.log('✏️ [UNIFICADO] PUT /api/clientes/:id');
    
    const clienteId = req.params.id;
    const { nombre, telefono, direccion, dni, nota } = req.body;
    
    // Validaciones requeridas
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El campo nombre es obligatorio'
        });
    }
    
    try {
        // Verificar que el cliente existe
        const clienteActual = await dbAll("SELECT * FROM clientes WHERE id = ?", [clienteId]);
        if (clienteActual.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        // Validar duplicados (excluyendo al cliente actual)
        const duplicados = await validarClienteDuplicado(nombre.trim(), dni, telefono, clienteId);
        
        if (duplicados.existe) {
            return res.status(409).json({
                error: 'Cliente duplicado detectado',
                duplicado: duplicados.cliente,
                sugerencia: 'Utilice un nombre o DNI diferente'
            });
        }
        
        // Actualizar cliente
        await dbRun(
            `UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, dni = ?, nota = ? WHERE id = ?`,
            [nombre.trim(), telefono || null, direccion || null, dni || null, nota || null, clienteId]
        );
        
        console.log('✅ Cliente actualizado exitosamente:', nombre);
        
        res.json({
            success: true,
            message: 'Cliente actualizado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error actualizando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
}

/**
 * DELETE /api/clientes/:id
 * Endpoint unificado para eliminar clientes con manejo de relaciones
 */
async function deleteClienteUnificado(req, res) {
    console.log('🗑️ [UNIFICADO] DELETE /api/clientes/:id');
    
    const clienteId = req.params.id;
    
    try {
        // Verificar que el cliente existe
        const cliente = await dbAll("SELECT id, nombre FROM clientes WHERE id = ?", [clienteId]);
        if (cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        // Verificar si tiene deudas pendientes
        const deudasPendientes = await dbAll(
            "SELECT COUNT(*) as total FROM deudas WHERE cliente_id = ? AND estado = 'pendiente'",
            [clienteId]
        );
        
        if (deudasPendientes[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el cliente porque tiene deudas pendientes',
                deudas_pendientes: deudasPendientes[0].total
            });
        }
        
        // Eliminar en cascada
        await dbRun("BEGIN TRANSACTION");
        
        try {
            // Eliminar productos de deudas
            await dbRun(`DELETE FROM deuda_productos WHERE deuda_id IN (SELECT id FROM deudas WHERE cliente_id = ?)`, [clienteId]);
            
            // Eliminar deudas
            await dbRun("DELETE FROM deudas WHERE cliente_id = ?", [clienteId]);
            
            // Eliminar cliente
            await dbRun("DELETE FROM clientes WHERE id = ?", [clienteId]);
            
            await dbRun("COMMIT");
            
            console.log('✅ Cliente eliminado exitosamente:', cliente[0].nombre);
            
            res.json({
                success: true,
                message: 'Cliente y datos relacionados eliminados exitosamente'
            });
            
        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error eliminando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
}

// 2. FUNCIONES DE VALIDACIÓN

/**
 * Validar si un cliente ya existe (por nombre, DNI o teléfono)
 */
async function validarClienteDuplicado(nombre, dni, telefono, excludeId = null) {
    const conditions = [];
    const params = [];
    
    if (nombre && nombre.trim() !== '') {
        conditions.push('nombre = ?');
        params.push(nombre.trim());
    }
    
    if (dni && dni.trim() !== '') {
        conditions.push('dni = ?');
        params.push(dni.trim());
    }
    
    if (telefono && telefono.trim() !== '') {
        conditions.push('telefono = ?');
        params.push(telefono.trim());
    }
    
    if (conditions.length === 0) {
        return { existe: false };
    }
    
    let whereClause = 'WHERE (' + conditions.join(' OR ') + ')';
    
    if (excludeId) {
        whereClause += ' AND id != ?';
        params.push(excludeId);
    }
    
    const sql = `SELECT id, nombre, dni, telefono FROM clientes ${whereClause} LIMIT 1`;
    
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    existe: !!row,
                    cliente: row
                });
            }
        });
    });
}

/**
 * Buscar clientes similares (para prevención inteligente)
 */
async function buscarClientesSimilares(nombre, dni, telefono) {
    const conditions = [];
    const params = [];
    
    if (nombre && nombre.trim() !== '') {
        conditions.push('nombre LIKE ?');
        params.push(`%${nombre.trim()}%`);
    }
    
    if (dni && dni.trim() !== '') {
        conditions.push('dni LIKE ?');
        params.push(`%${dni.trim()}%`);
    }
    
    if (telefono && telefono.trim() !== '') {
        conditions.push('telefono LIKE ?');
        params.push(`%${telefono.trim()}%`);
    }
    
    if (conditions.length === 0) {
        return [];
    }
    
    const sql = `SELECT id, nombre, dni, telefono FROM clientes WHERE ${conditions.join(' OR ')} LIMIT 5`;
    
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// 3. REDIRECCIONES DE COMPATIBILIDAD

/**
 * Middleware para redirigir /api/customers a /api/clientes (backward compatibility)
 */
function redirectCustomersToClientes(req, res, next) {
    if (req.path.startsWith('/api/customers')) {
        const newPath = req.path.replace('/api/customers', '/api/clientes');
        req.url = newPath + req.url.substring(req.path.length);
        console.log(`🔄 Redirigiendo: ${req.originalUrl} -> ${req.url}`);
    }
    next();
}

// 4. IMPLEMENTACIÓN EN EL SERVIDOR

/**
 * Aplicar la solución al servidor existente
 */
function aplicarSolucionAlServidor(app) {
    console.log('🔧 Aplicando solución al servidor...');
    
    // 1. Agregar middleware de redirección
    app.use(redirectCustomersToClientes);
    
    // 2. Reemplazar endpoints existentes con versiones unificadas
    app.get('/api/clientes', getClientesUnificado);
    app.post('/api/clientes', createClienteUnificado);
    app.put('/api/clientes/:id', updateClienteUnificado);
    app.delete('/api/clientes/:id', deleteClienteUnificado);
    
    // 3. Mantener endpoint de cuenta corriente (ya existente)
    // app.get('/api/clientes/cuenta-corriente', ...) // Ya existe
    
    console.log('✅ Solución aplicada exitosamente');
    console.log('\n📡 Endpoints disponibles:');
    console.log('   GET    /api/clientes (unificado)');
    console.log('   POST   /api/clientes (con validación)');
    console.log('   PUT    /api/clientes/:id (con validación)');
    console.log('   DELETE /api/clientes/:id (con manejo de relaciones)');
    console.log('   GET    /api/clientes/cuenta-corriente (existente)');
    console.log('   🔀     /api/customers -> /api/clientes (redirección)');
}

// 5. FUNCIONES AUXILIARES

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

// 6. EXPORTAR PARA USO EN EL SERVIDOR

module.exports = {
    aplicarSolucionAlServidor,
    getClientesUnificado,
    createClienteUnificado,
    updateClienteUnificado,
    deleteClienteUnificado,
    validarClienteDuplicado,
    buscarClientesSimilares,
    redirectCustomersToClientes
};

console.log('\n📋 RESUMEN DE LA SOLUCIÓN:');
console.log('============================');
console.log('✅ Endpoints unificados en /api/clientes');
console.log('✅ Validación de duplicados en creación/actualización');
console.log('✅ Manejo seguro de eliminación con relaciones');
console.log('✅ Redirección backward compatibility');
console.log('✅ Búsqueda inteligente de clientes similares');
console.log('✅ Filtros avanzados (con deudas, búsqueda, paginación)');
console.log('\n🎯 RESULTADO ESPERADO:');
console.log('- Eliminación de clientes duplicados');
console.log('- Unificación de sistemas dashboard y POS');
console.log('- Prevención de futuros duplicados');
console.log('- Mejor experiencia de usuario');