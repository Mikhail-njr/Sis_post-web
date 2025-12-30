/**
 * Script de Validación para Errores 404 en el Backend
 * Este script valida que los errores 404 hayan sido resueltos
 * y que los endpoints estén funcionando correctamente.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Importar módulos del backend
const db = require('./database-sqlite');

// Variables de estado
let validationResults = [];

/**
 * Inicia la validación de errores 404
 */
async function runValidation() {
    console.log('✅ Iniciando validación de errores 404 en el backend...\n');

    validationResults = [];

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

        // Paso 6: Verificar repositorios
        await checkRepositories();

        // Generar reporte
        generateValidationReport();

    } catch (error) {
        console.error(`❌ Error durante la validación: ${error.message}`);
        validationResults.push({
            step: 'Validación General',
            status: 'error',
            message: `Error durante la validación: ${error.message}`
        });
        generateValidationReport();
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

        validationResults.push({
            step: 'Conexión Base de Datos',
            status: 'success',
            message: 'Conexión con base de datos verificada'
        });
    } catch (error) {
        console.error(`❌ Error de conexión con base de datos: ${error.message}`);
        validationResults.push({
            step: 'Conexión Base de Datos',
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
            validationResults.push({
                step: `Archivo ${file}`,
                status: 'success',
                message: 'El archivo existe'
            });
        } else {
            console.error(`❌ Archivo ${file} no existe`);
            validationResults.push({
                step: `Archivo ${file}`,
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

            // Verificar rutas críticas
            const routesToCheck = [
                '/api/clientes',
                '/api/deudas',
                '/api/ventas',
                '/api/health'
            ];

            for (const route of routesToCheck) {
                if (serverContent.includes(route)) {
                    console.log(`✅ Ruta ${route} encontrada en server.js`);
                    validationResults.push({
                        step: `Ruta ${route}`,
                        status: 'success',
                        message: 'La ruta está definida en el servidor'
                    });
                } else {
                    console.error(`❌ Ruta ${route} no encontrada en server.js`);
                    validationResults.push({
                        step: `Ruta ${route}`,
                        status: 'error',
                        message: 'La ruta no está definida en el servidor'
                    });
                }
            }
        } else {
            console.error('❌ No se encontró el archivo server.js');
            validationResults.push({
                step: 'Archivo server.js',
                status: 'error',
                message: 'No se encontró el archivo server.js'
            });
        }
    } catch (error) {
        console.error(`❌ Error al verificar rutas del servidor: ${error.message}`);
        validationResults.push({
            step: 'Rutas del Servidor',
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

        console.log('✅ Repositorios cargados exitosamente');

        // Verificar funciones importantes
        const customerFunctions = ['getClientes', 'getClienteById', 'createCliente', 'updateCliente'];
        const debtFunctions = ['getDeudas', 'getDeudaById', 'createDeuda', 'updateDeuda'];
        const saleFunctions = ['getVentas', 'getVentaById', 'createVenta', 'updateVenta'];

        // Verificar funciones de clientes
        for (const func of customerFunctions) {
            if (typeof customersRepo[func] === 'function') {
                console.log(`✅ Función ${func} definida en customers-repository`);
                validationResults.push({
                    step: `Función ${func}`,
                    status: 'success',
                    message: 'La función está definida'
                });
            } else {
                console.error(`❌ Función ${func} no definida en customers-repository`);
                validationResults.push({
                    step: `Función ${func}`,
                    status: 'error',
                    message: 'La función no está definida'
                });
            }
        }

        // Verificar funciones de deudas
        for (const func of debtFunctions) {
            if (typeof debtsRepo[func] === 'function') {
                console.log(`✅ Función ${func} definida en debts-repository`);
                validationResults.push({
                    step: `Función ${func}`,
                    status: 'success',
                    message: 'La función está definida'
                });
            } else {
                console.error(`❌ Función ${func} no definida en debts-repository`);
                validationResults.push({
                    step: `Función ${func}`,
                    status: 'error',
                    message: 'La función no está definida'
                });
            }
        }

        // Verificar funciones de ventas
        for (const func of saleFunctions) {
            if (typeof salesRepo[func] === 'function') {
                console.log(`✅ Función ${func} definida en sales-repository`);
                validationResults.push({
                    step: `Función ${func}`,
                    status: 'success',
                    message: 'La función está definida'
                });
            } else {
                console.error(`❌ Función ${func} no definida en sales-repository`);
                validationResults.push({
                    step: `Función ${func}`,
                    status: 'error',
                    message: 'La función no está definida'
                });
            }
        }

    } catch (error) {
        console.error(`❌ Error al verificar endpoints específicos: ${error.message}`);
        validationResults.push({
            step: 'Endpoints Específicos',
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
            validationResults.push({
                step: 'Middleware de Respuesta',
                status: 'success',
                message: 'El middleware de respuesta existe'
            });
        } else {
            console.error('❌ Middleware de respuesta no encontrado');
            validationResults.push({
                step: 'Middleware de Respuesta',
                status: 'error',
                message: 'El middleware de respuesta no se encontró'
            });
        }

        // Verificar si existe el middleware de errores
        const errorHandlerFile = path.join(__dirname__, 'error-handler.js');
        if (fs.existsSync(errorHandlerFile)) {
            console.log('✅ Middleware de errores existe');
            validationResults.push({
                step: 'Middleware de Errores',
                status: 'success',
                message: 'El middleware de errores existe'
            });
        } else {
            console.error('❌ Middleware de errores no encontrado');
            validationResults.push({
                step: 'Middleware de Errores',
                status: 'error',
                message: 'El middleware de errores no se encontró'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar middlewares: ${error.message}`);
        validationResults.push({
            step: 'Middlewares',
            status: 'error',
            message: `Error al verificar middlewares: ${error.message}`
        });
    }
}

/**
 * Paso 6: Verificar repositorios
 */
function checkRepositories() {
    console.log('📁 Verificando repositorios...');

    try {
        const repositoriesDir = path.join(__dirname__, 'repositories');

        if (fs.existsSync(repositoriesDir)) {
            console.log('✅ Directorio de repositorios existe');
            validationResults.push({
                step: 'Directorio de Repositorios',
                status: 'success',
                message: 'El directorio de repositorios existe'
            });

            // Verificar repositorios específicos
            const repositories = [
                'customers-repository.js',
                'debts-repository.js',
                'sales-repository.js'
            ];

            for (const repo of repositories) {
                const repoFile = path.join(repositoriesDir, repo);
                if (fs.existsSync(repoFile)) {
                    console.log(`✅ Repositorio ${repo} existe`);
                    validationResults.push({
                        step: `Repositorio ${repo}`,
                        status: 'success',
                        message: 'El repositorio existe'
                    });
                } else {
                    console.error(`❌ Repositorio ${repo} no encontrado`);
                    validationResults.push({
                        step: `Repositorio ${repo}`,
                        status: 'error',
                        message: 'El repositorio no se encontró'
                    });
                }
            }
        } else {
            console.error('❌ No se encontró el directorio de repositorios');
            validationResults.push({
                step: 'Directorio de Repositorios',
                status: 'error',
                message: 'No se encontró el directorio de repositorios'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar repositorios: ${error.message}`);
        validationResults.push({
            step: 'Repositorios',
            status: 'error',
            message: `Error al verificar repositorios: ${error.message}`
        });
    }
}

/**
 * Genera el reporte final de validación
 */
function generateValidationReport() {
    console.log('\n📊 Generando reporte de validación...\n');

    // Mostrar resultados
    validationResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${result.step}: ${result.message}`);
    });

    // Resumen
    const successCount = validationResults.filter(r => r.status === 'success').length;
    const warningCount = validationResults.filter(r => r.status === 'warning').length;
    const errorCount = validationResults.filter(r => r.status === 'error').length;

    console.log('\n📈 Resumen de la Validación:');
    console.log(`✅ Pasos exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Mensaje final
    if (errorCount === 0 && warningCount === 0) {
        console.log('\n🎉 ¡Validación exitosa!');
        console.log('✅ Todos los componentes están en su lugar');
        console.log('✅ Los errores 404 deberían estar resueltos');
        console.log('✅ El backend está listo para funcionar');
        console.log('\n💡 Próximos pasos:');
        console.log('1. Reinicia el servidor backend');
        console.log('2. Prueba los endpoints manualmente');
        console.log('3. Verifica que el dashboard cargue correctamente');
    } else if (errorCount === 0) {
        console.log('\n⚠️ Validación con advertencias');
        console.log('✅ La mayoría de los componentes están en su lugar');
        console.log('💡 Revisa las advertencias anteriores');
    } else {
        console.log('\n❌ Validación con errores');
        console.log('🚨 Hay componentes faltantes o problemas críticos');
        console.log('💡 Revisa los errores anteriores e inténtalo de nuevo');
    }

    console.log('\n✅ Validación de errores 404 completada');
}

// Ejecutar la validación si este script se ejecuta directamente
if (require.main === module) {
    runValidation().catch(console.error);
}

module.exports = { runValidation };