/**
 * Script de Prueba: Unificación de Endpoints Duplicados
 *
 * Este script prueba la funcionalidad de unificación de endpoints
 * para validar que las redirecciones y la lógica de endpoints
 * funcionen correctamente.
 */

const http = require('http');

// Configuración del servidor
const API_BASE = 'localhost';
const PORT = 3000;

/**
 * Función para realizar una solicitud HTTP
 */
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: response
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Pruebas de endpoints unificados
 */
async function runTests() {
    console.log('🧪 Iniciando pruebas de unificación de endpoints...\n');

    const tests = [
        // Pruebas de clientes
        {
            name: 'GET /api/clientes (redirección a /api/customers)',
            method: 'GET',
            path: '/api/clientes',
            expected: 301
        },
        {
            name: 'POST /api/clientes (transformación interna)',
            method: 'POST',
            path: '/api/clientes',
            data: { name: 'Test Client', email: 'test@example.com' },
            expected: 200
        },
        {
            name: 'GET /api/customers (endpoint oficial)',
            method: 'GET',
            path: '/api/customers',
            expected: 200
        },

        // Pruebas de productos
        {
            name: 'GET /api/productos (redirección a /api/products)',
            method: 'GET',
            path: '/api/productos',
            expected: 301
        },
        {
            name: 'POST /api/productos (transformación interna)',
            method: 'POST',
            path: '/api/productos',
            data: { name: 'Test Product', price: 100 },
            expected: 200
        },
        {
            name: 'GET /api/products (endpoint oficial)',
            method: 'GET',
            path: '/api/products',
            expected: 200
        },

        // Pruebas de ventas
        {
            name: 'GET /api/ventas (redirección a /api/sales)',
            method: 'GET',
            path: '/api/ventas',
            expected: 301
        },
        {
            name: 'POST /api/ventas (transformación interna)',
            method: 'POST',
            path: '/api/ventas',
            data: { total: 500, items: [] },
            expected: 200
        },
        {
            name: 'GET /api/sales (endpoint oficial)',
            method: 'GET',
            path: '/api/sales',
            expected: 200
        },

        // Pruebas de deudas
        {
            name: 'GET /api/deudas (redirección a /api/debts)',
            method: 'GET',
            path: '/api/deudas',
            expected: 301
        },
        {
            name: 'POST /api/deudas (transformación interna)',
            method: 'POST',
            path: '/api/deudas',
            data: { customerId: 1, amount: 1000 },
            expected: 200
        },
        {
            name: 'GET /api/debts (endpoint oficial)',
            method: 'GET',
            path: '/api/debts',
            expected: 200
        },

        // Pruebas de proveedores
        {
            name: 'GET /api/proveedores (redirección a /api/suppliers)',
            method: 'GET',
            path: '/api/proveedores',
            expected: 301
        },
        {
            name: 'POST /api/proveedores (transformación interna)',
            method: 'POST',
            path: '/api/proveedores',
            data: { name: 'Test Supplier', contact: 'contact@test.com' },
            expected: 200
        },
        {
            name: 'GET /api/suppliers (endpoint oficial)',
            method: 'GET',
            path: '/api/suppliers',
            expected: 200
        },

        // Prueba de endpoint de prueba
        {
            name: 'GET /api/test (endpoint de prueba)',
            method: 'GET',
            path: '/api/test',
            expected: 200
        }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
        try {
            console.log(`🔍 Probando: ${test.name}`);

            const result = await makeRequest(test.method, test.path, test.data);

            if (result.statusCode === test.expected) {
                console.log(`✅ PASSED - Código: ${result.statusCode}`);
                if (result.body && result.body.message) {
                    console.log(`   Mensaje: ${result.body.message}`);
                }
                passedTests++;
            } else {
                console.log(`❌ FAILED - Código esperado: ${test.expected}, obtenido: ${result.statusCode}`);
                if (result.body) {
                    console.log(`   Respuesta: ${JSON.stringify(result.body, null, 2)}`);
                }
                failedTests++;
            }
        } catch (error) {
            console.log(`❌ ERROR - ${error.message}`);
            failedTests++;
        }

        console.log('');
    }

    // Resumen de pruebas
    console.log('📊 Resumen de Pruebas:');
    console.log(`   ✅ Exitosas: ${passedTests}`);
    console.log(`   ❌ Fallidas: ${failedTests}`);
    console.log(`   📈 Total: ${tests.length}`);

    const successRate = (passedTests / tests.length) * 100;
    console.log(`   🎯 Tasa de éxito: ${successRate.toFixed(1)}%`);

    if (failedTests === 0) {
        console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
        console.log('🚀 La unificación de endpoints está funcionando correctamente.');
    } else {
        console.log('\n⚠️  Algunas pruebas fallaron. Revise la implementación.');
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('🚀 Sistema de Prueba de Unificación de Endpoints');
    console.log('==============================================\n');

    console.log('📌 Instrucciones:');
    console.log('   1. Asegúrese de que el servidor esté escuchando en http://localhost:3000');
    console.log('   2. Ejecute este script: node test_unificacion_endpoints.js');
    console.log('   3. Revise los resultados de las pruebas\n');

    try {
        await runTests();
    } catch (error) {
        console.error('❌ Error al ejecutar las pruebas:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { runTests };