/**
 * Prueba específica para confirmación de entrega con datos reales
 * Este script intenta confirmar una entrega usando datos reales de la base de datos
 * Modificado para usar http://localhost:3001 como base del backend.
 */

const fs = require('fs');
const path = require('path');

// Configuración
const API_BASE = 'http://localhost:3000/api';
const DB_PATH = path.join(__dirname, 'backend', 'database.db');

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

// Función para hacer peticiones HTTP
async function makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        return {
            status: response.status,
            statusText: response.statusText,
            data,
            headers: Object.fromEntries(response.headers.entries())
        };
    } catch (error) {
        return {
            error: true,
            message: error.message
        };
    }
}

// 1. Obtener un pedido con items para probar
async function getTestOrder() {
    console.log('🔍 Buscando pedido para pruebas...');
    
    try {
        // Obtener pedidos con items
        const query = `
            SELECT p.id, p.estado, pr.razon_social as proveedor
            FROM pedidos p
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            WHERE p.id IN (
                SELECT DISTINCT pedido_id FROM pedido_items
            )
            ORDER BY p.id DESC
            LIMIT 1
        `;
        
        const orders = await executeQuery(query);
        
        if (orders.length === 0) {
            console.log('❌ No se encontraron pedidos con items');
            return null;
        }
        
        console.log(`✅ Pedido encontrado: ${orders[0].id} (${orders[0].proveedor})`);
        return orders[0];
    } catch (error) {
        console.error('❌ Error al buscar pedido:', error.message);
        return null;
    }
}

// 2. Obtener items del pedido
async function getOrderItems(orderId) {
    console.log(`📦 Obteniendo items del pedido ${orderId}...`);
    
    try {
        const query = `
            SELECT pi.producto_id, pi.cantidad, prod.nombre as producto_nombre, prod.codigo_interno
            FROM pedido_items pi
            LEFT JOIN productos prod ON pi.producto_id = prod.id
            WHERE pi.pedido_id = ?
            ORDER BY pi.id
        `;
        
        const items = await executeQuery(query, [orderId]);
        
        console.log(`✅ Items encontrados: ${items.length}`);
        items.forEach(item => {
            console.log(`  - ID: ${item.producto_id}, Nombre: ${item.producto_nombre}, Código: ${item.codigo_interno}, Cantidad: ${item.cantidad}`);
        });
        
        return items;
    } catch (error) {
        console.error('❌ Error al obtener items:', error.message);
        return [];
    }
}

// 3. Probar confirmación de entrega
async function testConfirmDelivery(orderId, items) {
    console.log(`\n🧪 Probando confirmación de entrega para el pedido ${orderId}...`);
    
    // Preparar datos para la confirmación
    const entregaData = {
        pedido_id: orderId,
        items: items.map(item => ({
            producto_id: item.producto_id,
            cantidad_recibida: Math.min(1, item.cantidad), // Recibir 1 o la cantidad solicitada si es menor
            fecha_vencimiento: '2026-12-31'
        }))
    };
    
    console.log('📤 Datos que se enviarán:');
    console.log(JSON.stringify(entregaData, null, 2));
    
    // Hacer la petición
    const result = await makeRequest('/pedidos/confirmar-entrega', 'POST', entregaData);
    
    console.log('\n📊 Resultado de la petición:');
    console.log(`Status: ${result.status} ${result.statusText}`);
    
    if (result.error) {
        console.log(`❌ Error de conexión: ${result.message}`);
    } else {
        console.log('Respuesta del servidor:');
        console.log(JSON.stringify(result.data, null, 2));
        
        if (result.status === 400) {
            console.log('\n⚠️  Se produjo un error 400 (Bad Request)');
            if (result.data && result.data.error) {
                console.log(`Mensaje de error: ${result.data.error}`);
            }
        } else if (result.status === 200) {
            console.log('\n✅ La confirmación de entrega fue exitosa');
        }
    }
    
    return result;
}

// 4. Probar con diferentes escenarios
async function testDifferentScenarios() {
    console.log('\n🧪 Probando diferentes escenarios...');
    
    // Escenario 1: Pedido inexistente
    console.log('\n--- Escenario 1: Pedido inexistente ---');
    const fakeOrderResult = await makeRequest('/pedidos/confirmar-entrega', 'POST', {
        pedido_id: 999999,
        items: [{
            producto_id: 1,
            cantidad_recibida: 1,
            fecha_vencimiento: '2026-12-31'
        }]
    });
    
    console.log(`Status: ${fakeOrderResult.status}`);
    if (fakeOrderResult.data) {
        console.log('Respuesta:', fakeOrderResult.data);
    }
    
    // Escenario 2: Producto inexistente
    console.log('\n--- Escenario 2: Producto inexistente ---');
    const testOrder = await getTestOrder();
    if (testOrder) {
        const fakeProductResult = await makeRequest('/pedidos/confirmar-entrega', 'POST', {
            pedido_id: testOrder.id,
            items: [{
                producto_id: 999999,
                cantidad_recibida: 1,
                fecha_vencimiento: '2026-12-31'
            }]
        });
        
        console.log(`Status: ${fakeProductResult.status}`);
        if (fakeProductResult.data) {
            console.log('Respuesta:', fakeProductResult.data);
        }
    }
    
    // Escenario 3: Tipo de dato incorrecto
    console.log('\n--- Escenario 3: Tipo de dato incorrecto (string en lugar de number) ---');
    if (testOrder) {
        const items = await getOrderItems(testOrder.id);
        if (items.length > 0) {
            const wrongTypeResult = await makeRequest('/pedidos/confirmar-entrega', 'POST', {
                pedido_id: testOrder.id,
                items: [{
                    producto_id: items[0].producto_id.toString(), // Convertir a string
                    cantidad_recibida: 1,
                    fecha_vencimiento: '2026-12-31'
                }]
            });
            
            console.log(`Status: ${wrongTypeResult.status}`);
            if (wrongTypeResult.data) {
                console.log('Respuesta:', wrongTypeResult.data);
            }
        }
    }
}

// 5. Probar validación específica del backend
async function testBackendValidation() {
    console.log('\n🔍 Probando validación específica del backend...');
    
    const testOrder = await getTestOrder();
    if (!testOrder) {
        console.log('❌ No se pudo obtener un pedido para pruebas');
        return;
    }
    
    const items = await getOrderItems(testOrder.id);
    if (items.length === 0) {
        console.log('❌ El pedido no tiene items');
        return;
    }
    
    // Probar con cada item individualmente
    for (const item of items) {
        console.log(`\n--- Probando item ${item.producto_id}: ${item.producto_nombre} ---`);
        
        const result = await makeRequest('/pedidos/confirmar-entrega', 'POST', {
            pedido_id: testOrder.id,
            items: [{
                producto_id: item.producto_id,
                cantidad_recibida: 1,
                fecha_vencimiento: '2026-12-31'
            }]
        });
        
        console.log(`Status: ${result.status}`);
        if (result.data) {
            console.log('Respuesta:', result.data);
        }
        
        // Si es 400, analizar el error
        if (result.status === 400) {
            console.log(`❌ Error con el item ${item.producto_id}`);
        } else {
            console.log(`✅ Éxito con el item ${item.producto_id}`);
        }
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando pruebas de confirmación de entrega\n');
    
    // Verificar que el servidor esté corriendo
    console.log('📡 Verificando conexión al servidor...');
    const pingResult = await makeRequest('/ping');
    if (pingResult.error) {
        console.log('❌ No se puede conectar al servidor. Asegúrate de que esté corriendo en http://localhost:3000');
        return;
    } else {
        console.log('✅ Servidor accesible');
    }
    
    // Probar con datos reales
    const testOrder = await getTestOrder();
    if (testOrder) {
        const items = await getOrderItems(testOrder.id);
        if (items.length > 0) {
            await testConfirmDelivery(testOrder.id, items);
        }
    }
    
    // Probar diferentes escenarios
    await testDifferentScenarios();
    
    // Probar validación específica
    await testBackendValidation();
    
    console.log('\n🎯 Pruebas completadas. Revisa los resultados para identificar el problema.');
}

// Ejecutar
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    getTestOrder,
    getOrderItems,
    testConfirmDelivery,
    testDifferentScenarios,
    testBackendValidation
};