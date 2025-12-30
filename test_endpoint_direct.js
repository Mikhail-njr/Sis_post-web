/**
 * Prueba directa del endpoint de confirmación de entrega
 * Este script permite probar el endpoint con datos específicos para diagnosticar el error 400
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

// Función para obtener datos de prueba
async function getTestData() {
    console.log('🔍 Obteniendo datos de prueba de la base de datos...');
    
    try {
        // Obtener un pedido con items
        const orderQuery = `
            SELECT p.id, p.estado, pr.razon_social as proveedor
            FROM pedidos p
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            WHERE p.id IN (
                SELECT DISTINCT pedido_id FROM pedido_items
            )
            ORDER BY p.id DESC
            LIMIT 1
        `;
        
        const orders = await executeQuery(orderQuery);
        
        if (orders.length === 0) {
            console.log('❌ No se encontraron pedidos con items');
            return null;
        }
        
        const order = orders[0];
        console.log(`✅ Pedido encontrado: ${order.id} (${order.proveedor})`);
        
        // Obtener items del pedido
        const itemsQuery = `
            SELECT pi.producto_id, pi.cantidad, prod.nombre as producto_nombre, prod.codigo_interno
            FROM pedido_items pi
            LEFT JOIN productos prod ON pi.producto_id = prod.id
            WHERE pi.pedido_id = ?
            ORDER BY pi.id
        `;
        
        const items = await executeQuery(itemsQuery, [order.id]);
        
        console.log(`📦 Items encontrados: ${items.length}`);
        items.forEach(item => {
            console.log(`  - ID: ${item.producto_id}, Nombre: ${item.producto_nombre}, Código: ${item.codigo_interno}, Cantidad: ${item.cantidad}`);
        });
        
        return {
            pedido_id: order.id,
            items: items.map(item => ({
                producto_id: item.producto_id,
                cantidad_recibida: Math.min(1, item.cantidad),
                fecha_vencimiento: '2026-12-31'
            }))
        };
    } catch (error) {
        console.error('❌ Error al obtener datos de prueba:', error.message);
        return null;
    }
}

// Función para probar con datos específicos
async function testWithSpecificData(testData) {
    console.log('\n🧪 Probando con datos específicos...');
    console.log('Datos que se enviarán:');
    console.log(JSON.stringify(testData, null, 2));
    
    const result = await makeRequest('/pedidos/confirmar-entrega', 'POST', testData);
    
    console.log('\n📊 Resultado:');
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

// Función para probar diferentes formatos de datos
async function testDifferentFormats(testData) {
    console.log('\n🧪 Probando diferentes formatos de datos...');
    
    // Caso 1: Número como string
    console.log('\n--- Caso 1: producto_id como string ---');
    const stringIdData = {
        ...testData,
        items: testData.items.map(item => ({
            ...item,
            producto_id: item.producto_id.toString()
        }))
    };
    
    const stringResult = await testWithSpecificData(stringIdData);
    
    // Caso 2: pedido_id como string
    console.log('\n--- Caso 2: pedido_id como string ---');
    const stringOrderIdData = {
        ...testData,
        pedido_id: testData.pedido_id.toString()
    };
    
    const stringOrderResult = await testWithSpecificData(stringOrderIdData);
    
    // Caso 3: producto_id inexistente
    console.log('\n--- Caso 3: producto_id inexistente ---');
    const fakeIdData = {
        ...testData,
        items: testData.items.map(item => ({
            ...item,
            producto_id: 999999
        }))
    };
    
    const fakeResult = await testWithSpecificData(fakeIdData);
    
    // Caso 4: pedido_id inexistente
    console.log('\n--- Caso 4: pedido_id inexistente ---');
    const fakeOrderData = {
        ...testData,
        pedido_id: 999999
    };
    
    const fakeOrderResult = await testWithSpecificData(fakeOrderData);
    
    return {
        original: testData,
        stringId: stringIdData,
        stringOrderId: stringOrderIdData,
        fakeId: fakeIdData,
        fakeOrderId: fakeOrderData
    };
}

// Función para probar validación de tipos específicos
async function testTypeValidation() {
    console.log('\n🔍 Probando validación de tipos específicos...');
    
    // Obtener un pedido y un item específicos
    const testData = await getTestData();
    if (!testData) {
        console.log('❌ No se pudieron obtener datos de prueba');
        return;
    }
    
    const item = testData.items[0];
    
    // Probar con diferentes tipos de producto_id
    const testCases = [
        { name: 'Número entero', value: item.producto_id },
        { name: 'Número decimal', value: item.producto_id + 0.0 },
        { name: 'String numérico', value: item.producto_id.toString() },
        { name: 'String con espacios', value: ` ${item.producto_id} ` },
        { name: 'Número negativo', value: -item.producto_id },
        { name: 'Null', value: null },
        { name: 'Undefined', value: undefined },
        { name: 'Booleano', value: true },
        { name: 'Objeto', value: { id: item.producto_id } },
        { name: 'Array', value: [item.producto_id] }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n--- Probando con ${testCase.name}: ${JSON.stringify(testCase.value)} ---`);
        
        const testDataWithType = {
            pedido_id: testData.pedido_id,
            items: [{
                producto_id: testCase.value,
                cantidad_recibida: 1,
                fecha_vencimiento: '2026-12-31'
            }]
        };
        
        const result = await testWithSpecificData(testDataWithType);
        
        if (result.status === 400) {
            console.log(`❌ Error 400 con ${testCase.name}`);
        } else {
            console.log(`✅ Éxito con ${testCase.name}`);
        }
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando pruebas directas del endpoint de confirmación de entrega\n');
    
    // Verificar conexión al servidor
    console.log('📡 Verificando conexión al servidor...');
    const pingResult = await makeRequest('/ping');
    if (pingResult.error) {
        console.log('❌ No se puede conectar al servidor. Asegúrate de que esté corriendo en http://localhost:3000');
        return;
    } else {
        console.log('✅ Servidor accesible');
    }
    
    // Obtener datos de prueba
    const testData = await getTestData();
    if (!testData) {
        console.log('❌ No se pudieron obtener datos de prueba');
        return;
    }
    
    // Probar con datos originales
    console.log('\n--- Prueba con datos originales ---');
    const originalResult = await testWithSpecificData(testData);
    
    // Probar diferentes formatos
    await testDifferentFormats(testData);
    
    // Probar validación de tipos
    await testTypeValidation();
    
    console.log('\n🎯 Pruebas completadas. Revisa los resultados para identificar el problema específico.');
    console.log('\n💡 Conclusión probable:');
    if (originalResult.status === 400) {
        console.log('El problema está en los datos enviados o en la validación del backend');
    } else {
        console.log('Los datos enviados son correctos, el problema podría estar en otro lugar');
    }
}

// Ejecutar
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    getTestData,
    testWithSpecificData,
    testDifferentFormats,
    testTypeValidation
};