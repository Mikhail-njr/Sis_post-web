/**
 * Diagnóstico de errores 400 en confirmación de entregas
 * Este script verifica las posibles causas del error "Producto no encontrado en el pedido original"
 */

const fs = require('fs');
const path = require('path');

// Configuración
const DB_PATH = path.join(__dirname, 'backend', 'database.db');
const API_BASE = 'http://localhost:3000/api';

// Función para ejecutar consultas SQL
function executeQuery(query, params = []) {
    const sqlite3 = require('sqlite3').verbose();
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH);
        db.all(query, params, (err, rows) => {
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// 1. Verificar pedidos y sus items
async function checkOrderItems(orderId) {
    console.log(`\n🔍 Verificando pedido ${orderId} y sus items...`);
    
    try {
        // Obtener el pedido
        const orderQuery = `
            SELECT p.*, pr.razon_social as proveedor_nombre
            FROM pedidos p
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            WHERE p.id = ?
        `;
        const order = await executeQuery(orderQuery, [orderId]);
        
        if (!order || order.length === 0) {
            console.log(`❌ Pedido ${orderId} no encontrado en la base de datos`);
            return null;
        }
        
        console.log(`✅ Pedido encontrado:`, {
            id: order[0].id,
            proveedor: order[0].proveedor_nombre,
            estado: order[0].estado,
            fecha_creacion: order[0].fecha_creacion
        });
        
        // Obtener items del pedido
        const itemsQuery = `
            SELECT pi.*, prod.nombre as producto_nombre, prod.codigo_interno
            FROM pedido_items pi
            LEFT JOIN productos prod ON pi.producto_id = prod.id
            WHERE pi.pedido_id = ?
            ORDER BY pi.id
        `;
        const items = await executeQuery(itemsQuery, [orderId]);
        
        console.log(`📦 Items encontrados en el pedido: ${items.length}`);
        items.forEach(item => {
            console.log(`  - ID: ${item.producto_id}, Nombre: ${item.producto_nombre}, Código: ${item.codigo_interno}, Cantidad: ${item.cantidad}`);
        });
        
        return { order: order[0], items };
    } catch (error) {
        console.error(`❌ Error al verificar pedido:`, error.message);
        return null;
    }
}

// 2. Verificar tipos de datos en la base de datos
async function checkDataTypes() {
    console.log('\n🔍 Verificando tipos de datos en la base de datos...');
    
    try {
        // Verificar tipo de producto_id en pedido_items
        const typeQuery = `
            PRAGMA table_info(pedido_items)
        `;
        const columns = await executeQuery(typeQuery);
        
        const productoIdColumn = columns.find(col => col.name === 'producto_id');
        console.log(`📋 Columna producto_id en pedido_items:`, {
            nombre: productoIdColumn.name,
            tipo: productoIdColumn.type,
            notnull: productoIdColumn.notnull,
            pk: productoIdColumn.pk
        });
        
        // Verificar tipo de id en productos
        const prodTypeQuery = `
            PRAGMA table_info(productos)
        `;
        const prodColumns = await executeQuery(prodTypeQuery);
        
        const prodIdColumn = prodColumns.find(col => col.name === 'id');
        console.log(`📋 Columna id en productos:`, {
            nombre: prodIdColumn.name,
            tipo: prodIdColumn.type,
            notnull: prodIdColumn.notnull,
            pk: prodIdColumn.pk
        });
        
        return { pedido_items_type: productoIdColumn.type, productos_type: prodIdColumn.type };
    } catch (error) {
        console.error(`❌ Error al verificar tipos de datos:`, error.message);
        return null;
    }
}

// 3. Simular la validación del backend
async function simulateBackendValidation(orderId, itemsToConfirm) {
    console.log('\n🔍 Simulando validación del backend...');
    
    try {
        // Obtener items del pedido original
        const itemsQuery = `
            SELECT pi.producto_id, pi.cantidad, prod.nombre as producto_nombre
            FROM pedido_items pi
            LEFT JOIN productos prod ON pi.producto_id = prod.id
            WHERE pi.pedido_id = ?
        `;
        const orderItems = await executeQuery(itemsQuery, [orderId]);
        
        console.log(`📋 Items originales del pedido:`, orderItems.length);
        
        // Simular la validación que hace el backend
        let validationErrors = [];
        
        for (const item of itemsToConfirm) {
            console.log(`\n--- Validando item: ${item.producto_id} ---`);
            
            // Buscar el item en el pedido original
            const originalItem = orderItems.find(oi => oi.producto_id == item.producto_id);
            
            if (!originalItem) {
                const error = `Producto ${item.producto_id} no encontrado en el pedido original`;
                console.log(`❌ ${error}`);
                validationErrors.push(error);
            } else {
                console.log(`✅ Producto encontrado: ${originalItem.producto_nombre} (ID: ${originalItem.producto_id})`);
                
                // Verificar tipo de dato
                console.log(`🔍 Tipos de datos:`, {
                    enviado: typeof item.producto_id,
                    valor_enviado: item.producto_id,
                    en_bd: typeof originalItem.producto_id,
                    valor_bd: originalItem.producto_id,
                    coinciden: item.producto_id == originalItem.producto_id,
                    estrictamente_iguales: item.producto_id === originalItem.producto_id
                });
            }
        }
        
        if (validationErrors.length > 0) {
            console.log(`\n❌ Errores de validación encontrados: ${validationErrors.length}`);
            validationErrors.forEach(error => console.log(`  - ${error}`));
        } else {
            console.log(`\n✅ Todas las validaciones pasaron`);
        }
        
        return validationErrors;
    } catch (error) {
        console.error(`❌ Error en simulación de validación:`, error.message);
        return [`Error en simulación: ${error.message}`];
    }
}

// 4. Probar con datos reales de pedidos
async function testWithRealOrders() {
    console.log('\n🔍 Probando con pedidos reales...');
    
    try {
        // Obtener pedidos recientes
        const recentOrdersQuery = `
            SELECT p.id, p.estado, pr.razon_social as proveedor
            FROM pedidos p
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            ORDER BY p.id DESC
            LIMIT 5
        `;
        const recentOrders = await executeQuery(recentOrdersQuery);
        
        console.log(`📋 Pedidos recientes encontrados: ${recentOrders.length}`);
        
        for (const order of recentOrders) {
            console.log(`\n--- Pedido ${order.id} (${order.proveedor}) ---`);
            
            // Obtener items de este pedido
            const itemsQuery = `
                SELECT pi.producto_id, prod.nombre as producto_nombre, pi.cantidad
                FROM pedido_items pi
                LEFT JOIN productos prod ON pi.producto_id = prod.id
                WHERE pi.pedido_id = ?
            `;
            const items = await executeQuery(itemsQuery, [order.id]);
            
            console.log(`📦 Items: ${items.length}`);
            items.forEach(item => {
                console.log(`  - ${item.producto_id}: ${item.producto_nombre} (x${item.cantidad})`);
            });
            
            // Si tiene items, probar la validación
            if (items.length > 0) {
                const testItems = items.map(item => ({
                    producto_id: item.producto_id,
                    cantidad_recibida: 1,
                    fecha_vencimiento: '2026-12-31'
                }));
                
                console.log(`\n🧪 Probando validación con items del pedido...`);
                await simulateBackendValidation(order.id, testItems);
            }
        }
    } catch (error) {
        console.error(`❌ Error al probar con pedidos reales:`, error.message);
    }
}

// 5. Probar escenarios específicos
async function testSpecificScenarios() {
    console.log('\n🔍 Probando escenarios específicos...');
    
    // Escenario 1: Pedido sin items
    console.log('\n--- Escenario 1: Pedido sin items ---');
    try {
        const emptyOrderQuery = `
            SELECT p.id, COUNT(pi.id) as item_count
            FROM pedidos p
            LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
            GROUP BY p.id
            HAVING item_count = 0
            LIMIT 1
        `;
        const emptyOrders = await executeQuery(emptyOrderQuery);
        
        if (emptyOrders.length > 0) {
            console.log(`❌ Encontrado pedido sin items: ${emptyOrders[0].id}`);
        } else {
            console.log(`✅ No se encontraron pedidos sin items`);
        }
    } catch (error) {
        console.error(`❌ Error en escenario 1:`, error.message);
    }
    
    // Escenario 2: Producto ID que no existe
    console.log('\n--- Escenario 2: Producto ID que no existe ---');
    try {
        const nonExistentQuery = `
            SELECT MAX(id) as max_id FROM productos
        `;
        const maxIdResult = await executeQuery(nonExistentQuery);
        const nonExistentId = (maxIdResult[0]?.max_id || 0) + 1000;
        
        console.log(`🔍 ID que no existe: ${nonExistentId}`);
        
        // Verificar que realmente no existe
        const checkQuery = `SELECT id FROM productos WHERE id = ?`;
        const checkResult = await executeQuery(checkQuery, [nonExistentId]);
        
        if (checkResult.length === 0) {
            console.log(`✅ Confirmado: el ID ${nonExistentId} no existe en productos`);
        } else {
            console.log(`❌ El ID ${nonExistentId} sí existe en productos`);
        }
    } catch (error) {
        console.error(`❌ Error en escenario 2:`, error.message);
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando diagnóstico de errores 400 en confirmación de entregas\n');
    
    // Verificar tipos de datos
    await checkDataTypes();
    
    // Probar con pedidos reales
    await testWithRealOrders();
    
    // Probar escenarios específicos
    await testSpecificScenarios();
    
    console.log('\n🎯 Diagnóstico completado. Revisa los resultados anteriores para identificar la causa del error.');
    console.log('\n💡 Recomendaciones:');
    console.log('1. Verifica que los producto_id enviados coincidan exactamente con los de la base de datos');
    console.log('2. Asegúrate de que el pedido tenga items en la tabla pedido_items');
    console.log('3. Comprueba que no haya discrepancias de tipos de datos (string vs number)');
    console.log('4. Verifica que el frontend esté mostrando datos actualizados');
}

// Ejecutar
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkOrderItems,
    checkDataTypes,
    simulateBackendValidation,
    testWithRealOrders,
    testSpecificScenarios
};