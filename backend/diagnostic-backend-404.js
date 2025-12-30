/**
 * Script de Diagnóstico para Errores 404 en el Backend
 * Este script identifica y soluciona problemas de endpoints
 * que responden con estado 404 en el backend.
 */

const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./database-sqlite');

// Variables de estado
let diagnosticResults = [];

/**
 * Inicia el diagnóstico de errores 404
 */
async function runDiagnostic() {
    console.log('🔍 Iniciando diagnóstico de errores 404 en el backend...\n');

    diagnosticResults = [];

    try {
        // Paso 1: Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Paso 2: Verificar existencia de archivos del backend
        await checkBackendFiles();

        // Paso 3: Verificar rutas del servidor
        await checkServerRoutes();

        // Paso 4: Verificar endpoints específicos
        await checkSpecificEndpoints();

        // Paso 5: Verificar middlewares
        await checkMiddlewares();

        // Generar reporte
        generateReport();

    } catch (error) {
        console.error(`❌ Error en el diagnóstico: ${error.message}`);
        diagnosticResults.push({
            test: 'Diagnóstico General',
            status: 'error',
            message: `Error durante el diagnóstico: ${error.message}`
        });
        generateReport();
    }
}

/**
 * Paso 1: Verificar conexión con la base de datos
 */
async function checkDatabaseConnection() {
    console.log('📡 Verificando conexión con la base de datos...');

    try {
        const result = await db.query('SELECT 1 as test');
        console.log('✅ Conexión con base de datos exitosa');

        diagnosticResults.push({
            test: 'Conexión Base de Datos',
            status: 'success',
            message: 'La conexión con la base de datos es exitosa'
        });
    } catch (error) {
        console.error(`❌ Error de conexión con base de datos: ${error.message}`);
        diagnosticResults.push({
            test: 'Conexión Base de Datos',
            status: 'error',
            message: `No se puede conectar a la base de datos: ${error.message}`
        });
    }
}

/**
 * Paso 2: Verificar existencia de archivos del backend
 */
function checkBackendFiles() {
    console.log('📁 Verificando archivos del backend...');

    const backendFiles = [
        'server.js',
        'database-sqlite.js',
        'response-middleware.js',
        'error-handler.js',
        'repositories/customers-repository.js',
        'repositories/debts-repository.js',
        'repositories/sales-repository.js'
    ];

    for (const file of backendFiles) {
        const fullPath = path.join(__dirname__, file);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ Archivo ${file} existe`);
            diagnosticResults.push({
                test: `Archivo ${file}`,
                status: 'success',
                message: 'El archivo existe'
            });
        } else {
            console.error(`❌ Archivo ${file} no existe`);
            diagnosticResults.push({
                test: `Archivo ${file}`,
                status: 'error',
                message: 'El archivo no existe'
            });
        }
    }
}

/**
 * Paso 3: Verificar rutas del servidor
 */
function checkServerRoutes() {
    console.log('🛣️ Verificando rutas del servidor...');

    try {
        // Leer el archivo server.js para verificar las rutas
        const serverFile = path.join(__dirname__, 'server.js');
        if (fs.existsSync(serverFile)) {
            const serverContent = fs.readFileSync(serverFile, 'utf8');

            // Verificar rutas importantes
            const routesToCheck = [
                '/api/clientes',
                '/api/deudas',
                '/api/ventas',
                '/api/health'
            ];

            for (const route of routesToCheck) {
                if (serverContent.includes(route)) {
                    console.log(`✅ Ruta ${route} encontrada en server.js`);
                    diagnosticResults.push({
                        test: `Ruta ${route}`,
                        status: 'success',
                        message: 'La ruta está definida en el servidor'
                    });
                } else {
                    console.warn(`⚠️ Ruta ${route} no encontrada en server.js`);
                    diagnosticResults.push({
                        test: `Ruta ${route}`,
                        status: 'warning',
                        message: 'La ruta no está definida en el servidor'
                    });
                }
            }
        } else {
            console.error('❌ No se encontró el archivo server.js');
            diagnosticResults.push({
                test: 'Archivo server.js',
                status: 'error',
                message: 'No se encontró el archivo server.js'
            });
        }
    } catch (error) {
        console.error(`❌ Error al verificar rutas del servidor: ${error.message}`);
        diagnosticResults.push({
            test: 'Rutas del Servidor',
            status: 'error',
            message: `Error al verificar rutas del servidor: ${error.message}`
        });
    }
}

/**
 * Paso 4: Verificar endpoints específicos
 */
async function checkSpecificEndpoints() {
    console.log('🔌 Verificando endpoints específicos...');

    try {
        // Intentar cargar los repositorios para verificar si están definidos
        const customersRepo = require('./repositories/customers-repository');
        const debtsRepo = require('./repositories/debts-repository');
        const salesRepo = require('./repositories/sales-repository');

        // Verificar funciones importantes
        const customerFunctions = ['getClientes', 'getClienteById', 'createCliente', 'updateCliente'];
        const debtFunctions = ['getDeudas', 'getDeudaById', 'createDeuda', 'updateDeuda'];
        const saleFunctions = ['getVentas', 'getVentaById', 'createVenta', 'updateVenta'];

        console.log('✅ Repositorios cargados exitosamente');

        // Verificar funciones de clientes
        for (const func of customerFunctions) {
            if (typeof customersRepo[func] === 'function') {
                console.log(`✅ Función ${func} definida en customers-repository`);
                diagnosticResults.push({
                    test: `Función ${func}`,
                    status: 'success',
                    message: 'La función está definida'
                });
            } else {
                console.warn(`⚠️ Función ${func} no definida en customers-repository`);
                diagnosticResults.push({
                    test: `Función ${func}`,
                    status: 'warning',
                    message: 'La función no está definida'
                });
            }
        }

        // Verificar funciones de deudas
        for (const func of debtFunctions) {
            if (typeof debtsRepo[func] === 'function') {
                console.log(`✅ Función ${func} definida en debts-repository`);
                diagnosticResults.push({
                    test: `Función ${func}`,
                    status: 'success',
                    message: 'La función está definida'
                });
            } else {
                console.warn(`⚠️ Función ${func} no definida en debts-repository`);
                diagnosticResults.push({
                    test: `Función ${func}`,
                    status: 'warning',
                    message: 'La función no está definida'
                });
            }
        }

        // Verificar funciones de ventas
        for (const func of saleFunctions) {
            if (typeof salesRepo[func] === 'function') {
                console.log(`✅ Función ${func} definida en sales-repository`);
                diagnosticResults.push({
                    test: `Función ${func}`,
                    status: 'success',
                    message: 'La función está definida'
                });
            } else {
                console.warn(`⚠️ Función ${func} no definida en sales-repository`);
                diagnosticResults.push({
                    test: `Función ${func}`,
                    status: 'warning',
                    message: 'La función no está definida'
                });
            }
        }

    } catch (error) {
        console.error(`❌ Error al verificar endpoints específicos: ${error.message}`);
        diagnosticResults.push({
            test: 'Endpoints Específicos',
            status: 'error',
            message: `Error al verificar endpoints específicos: ${error.message}`
        });
    }
}

/**
 * Paso 5: Verificar middlewares
 */
function checkMiddlewares() {
    console.log('🔧 Verificando middlewares...');

    try {
        // Verificar si existe el middleware de respuesta
        const responseMiddlewareFile = path.join(__dirname__, 'response-middleware.js');
        if (fs.existsSync(responseMiddlewareFile)) {
            console.log('✅ Middleware de respuesta existe');
            diagnosticResults.push({
                test: 'Middleware de Respuesta',
                status: 'success',
                message: 'El middleware de respuesta existe'
            });
        } else {
            console.warn('⚠️ Middleware de respuesta no encontrado');
            diagnosticResults.push({
                test: 'Middleware de Respuesta',
                status: 'warning',
                message: 'El middleware de respuesta no se encontró'
            });
        }

        // Verificar si existe el middleware de errores
        const errorHandlerFile = path.join(__dirname__, 'error-handler.js');
        if (fs.existsSync(errorHandlerFile)) {
            console.log('✅ Middleware de errores existe');
            diagnosticResults.push({
                test: 'Middleware de Errores',
                status: 'success',
                message: 'El middleware de errores existe'
            });
        } else {
            console.warn('⚠️ Middleware de errores no encontrado');
            diagnosticResults.push({
                test: 'Middleware de Errores',
                status: 'warning',
                message: 'El middleware de errores no se encontró'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar middlewares: ${error.message}`);
        diagnosticResults.push({
            test: 'Middlewares',
            status: 'error',
            message: `Error al verificar middlewares: ${error.message}`
        });
    }
}

/**
 * Genera el reporte final del diagnóstico
 */
function generateReport() {
    console.log('\n📊 Generando reporte del diagnóstico...\n');

    // Mostrar resultados
    diagnosticResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${result.test}: ${result.message}`);
    });

    // Resumen
    const successCount = diagnosticResults.filter(r => r.status === 'success').length;
    const warningCount = diagnosticResults.filter(r => r.status === 'warning').length;
    const errorCount = diagnosticResults.filter(r => r.status === 'error').length;

    console.log('\n📈 Resumen del Diagnóstico:');
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Recomendaciones específicas para errores 404
    if (errorCount > 0 || warningCount > 0) {
        console.log('\n💡 Recomendaciones para Errores 404:');
        console.log('• Verifica que el servidor esté escuchando en el puerto correcto');
        console.log('• Confirma que las rutas estén definidas en server.js');
        console.log('• Revisa que los middlewares estén correctamente configurados');
        console.log('• Verifica que los repositorios estén exportando las funciones necesarias');
        console.log('• Asegúrate de que el servidor esté iniciado correctamente');
    }

    console.log('\n✅ Diagnóstico de errores 404 completado');
}

// Ejecutar el diagnóstico si este script se ejecuta directamente
if (require.main === module) {
    runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };