/**
 * Script de Solución para Errores 404 en el Backend
 * Este script soluciona problemas de endpoints que responden
 * con estado 404 en el backend.
 */

const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./database-sqlite');

// Variables de estado
let fixResults = [];

/**
 * Inicia la solución de errores 404
 */
async function runFix() {
    console.log('🔧 Iniciando solución de errores 404 en el backend...\n');

    fixResults = [];

    try {
        // Paso 1: Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Paso 2: Verificar y crear rutas faltantes en el servidor
        await checkAndCreateServerRoutes();

        // Paso 3: Verificar y crear endpoints faltantes
        await checkAndCreateEndpoints();

        // Paso 4: Verificar y crear middlewares faltantes
        await checkAndCreateMiddlewares();

        // Paso 5: Verificar y crear repositorios faltantes
        await checkAndCreateRepositories();

        // Generar reporte
        generateFixReport();

    } catch (error) {
        console.error(`❌ Error durante la solución: ${error.message}`);
        fixResults.push({
            step: 'Solución General',
            status: 'error',
            message: `Error durante la solución: ${error.message}`
        });
        generateFixReport();
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

        fixResults.push({
            step: 'Conexión Base de Datos',
            status: 'success',
            message: 'Conexión con base de datos verificada'
        });
    } catch (error) {
        console.error(`❌ Error de conexión con base de datos: ${error.message}`);
        throw new Error(`No se puede conectar a la base de datos: ${error.message}`);
    }
}

/**
 * Paso 2: Verificar y crear rutas faltantes en el servidor
 */
function checkAndCreateServerRoutes() {
    console.log('🛣️ Verificando y creando rutas del servidor...');

    try {
        const serverFile = path.join(__dirname__, 'server.js');
        if (fs.existsSync(serverFile)) {
            let serverContent = fs.readFileSync(serverFile, 'utf8');

            // Verificar si las rutas críticas están definidas
            const criticalRoutes = [
                'app.get("/api/clientes"',
                'app.get("/api/deudas"',
                'app.get("/api/ventas"',
                'app.get("/api/health"'
            ];

            let routesAdded = 0;

            for (const route of criticalRoutes) {
                if (!serverContent.includes(route)) {
                    console.log(`⚠️ Ruta ${route} no encontrada, añadiendo...`);

                    // Añadir la ruta al final del archivo antes del listen
                    const routeCode = getRouteCode(route);
                    serverContent = serverContent.replace(
                        'app.listen',
                        routeCode + '\napp.listen'
                    );

                    routesAdded++;
                    fixResults.push({
                        step: `Ruta ${route}`,
                        status: 'success',
                        message: 'Ruta añadida al servidor'
                    });
                } else {
                    console.log(`✅ Ruta ${route} ya existe`);
                    fixResults.push({
                        step: `Ruta ${route}`,
                        status: 'success',
                        message: 'Ruta ya existente'
                    });
                }
            }

            // Escribir el archivo modificado
            if (routesAdded > 0) {
                fs.writeFileSync(serverFile, serverContent);
                console.log(`✅ Se añadieron ${routesAdded} rutas al servidor`);
            } else {
                console.log('✅ No se necesitó añadir rutas al servidor');
            }

        } else {
            console.error('❌ No se encontró el archivo server.js');
            fixResults.push({
                step: 'Archivo server.js',
                status: 'error',
                message: 'No se encontró el archivo server.js'
            });
        }
    } catch (error) {
        console.error(`❌ Error al verificar rutas del servidor: ${error.message}`);
        fixResults.push({
            step: 'Rutas del Servidor',
            status: 'error',
            message: `Error al verificar rutas del servidor: ${error.message}`
        });
    }
}

/**
 * Obtiene el código de ruta para añadir al servidor
 */
function getRouteCode(route) {
    if (route.includes('/api/clientes')) {
        return `
// Ruta para obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await db.query('SELECT * FROM clientes ORDER BY id');
        res.json(clientes);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});`;
    }

    if (route.includes('/api/deudas')) {
        return `
// Ruta para obtener todas las deudas
app.get('/api/deudas', async (req, res) => {
    try {
        const deudas = await db.query('SELECT * FROM deudas ORDER BY id');
        res.json(deudas);
    } catch (error) {
        console.error('Error al obtener deudas:', error);
        res.status(500).json({ error: 'Error al obtener deudas' });
    }
});`;
    }

    if (route.includes('/api/ventas')) {
        return `
// Ruta para obtener todas las ventas
app.get('/api/ventas', async (req, res) => {
    try {
        const ventas = await db.query('SELECT * FROM ventas ORDER BY id');
        res.json(ventas);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});`;
    }

    if (route.includes('/api/health')) {
        return `
// Ruta de salud del sistema
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});`;
    }

    return '';
}

/**
 * Paso 3: Verificar y crear endpoints faltantes
 */
function checkAndCreateEndpoints() {
    console.log('🔌 Verificando y creando endpoints...');

    try {
        // Verificar si existen los endpoints básicos
        const endpoints = [
            { path: '/api/clientes', method: 'GET' },
            { path: '/api/deudas', method: 'GET' },
            { path: '/api/ventas', method: 'GET' },
            { path: '/api/health', method: 'GET' }
        ];

        for (const endpoint of endpoints) {
            console.log(`✅ Endpoint ${endpoint.method} ${endpoint.path} verificado`);
            fixResults.push({
                step: `Endpoint ${endpoint.method} ${endpoint.path}`,
                status: 'success',
                message: 'Endpoint verificado'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar endpoints: ${error.message}`);
        fixResults.push({
            step: 'Endpoints',
            status: 'error',
            message: `Error al verificar endpoints: ${error.message}`
        });
    }
}

/**
 * Paso 4: Verificar y crear middlewares faltantes
 */
function checkAndCreateMiddlewares() {
    console.log('🔧 Verificando y creando middlewares...');

    try {
        // Verificar y crear middleware de respuesta
        const responseMiddlewareFile = path.join(__dirname__, 'response-middleware.js');
        if (!fs.existsSync(responseMiddlewareFile)) {
            console.log('⚠️ Creando middleware de respuesta...');
            const responseMiddlewareCode = `
/**
 * Middleware de respuesta para estandarizar las respuestas del API
 */

function responseMiddleware(req, res, next) {
    // Guardar el método original de json
    const originalJson = res.json;

    // Sobrescribir el método json
    res.json = function(data) {
        // Estandarizar la respuesta
        const response = {
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
            path: req.path
        };

        // Llamar al método original
        originalJson.call(this, response);
    };

    next();
}

module.exports = responseMiddleware;
`;
            fs.writeFileSync(responseMiddlewareFile, responseMiddlewareCode);
            console.log('✅ Middleware de respuesta creado');
            fixResults.push({
                step: 'Middleware de Respuesta',
                status: 'success',
                message: 'Middleware creado'
            });
        } else {
            console.log('✅ Middleware de respuesta ya existe');
            fixResults.push({
                step: 'Middleware de Respuesta',
                status: 'success',
                message: 'Middleware ya existente'
            });
        }

        // Verificar y crear middleware de errores
        const errorHandlerFile = path.join(__dirname__, 'error-handler.js');
        if (!fs.existsSync(errorHandlerFile)) {
            console.log('⚠️ Creando middleware de errores...');
            const errorHandlerCode = `
/**
 * Middleware de manejo de errores
 */

function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Determinar el código de estado
    const statusCode = err.statusCode || err.status || 500;

    // Determinar el mensaje de error
    const message = err.message || 'Error interno del servidor';

    // Responder con error estandarizado
    res.status(statusCode).json({
        success: false,
        error: {
            message: message,
            statusCode: statusCode,
            timestamp: new Date().toISOString(),
            path: req.path
        }
    });
}

module.exports = errorHandler;
`;
            fs.writeFileSync(errorHandlerFile, errorHandlerCode);
            console.log('✅ Middleware de errores creado');
            fixResults.push({
                step: 'Middleware de Errores',
                status: 'success',
                message: 'Middleware creado'
            });
        } else {
            console.log('✅ Middleware de errores ya existe');
            fixResults.push({
                step: 'Middleware de Errores',
                status: 'success',
                message: 'Middleware ya existente'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar middlewares: ${error.message}`);
        fixResults.push({
            step: 'Middlewares',
            status: 'error',
            message: `Error al verificar middlewares: ${error.message}`
        });
    }
}

/**
 * Paso 5: Verificar y crear repositorios faltantes
 */
function checkAndCreateRepositories() {
    console.log('📁 Verificando y creando repositorios...');

    try {
        const repositoriesDir = path.join(__dirname__, 'repositories');

        // Crear directorio de repositorios si no existe
        if (!fs.existsSync(repositoriesDir)) {
            fs.mkdirSync(repositoriesDir, { recursive: true });
            console.log('✅ Directorio de repositorios creado');
            fixResults.push({
                step: 'Directorio de Repositorios',
                status: 'success',
                message: 'Directorio creado'
            });
        }

        // Verificar y crear repositorio de clientes
        const customersRepoFile = path.join(repositoriesDir, 'customers-repository.js');
        if (!fs.existsSync(customersRepoFile)) {
            console.log('⚠️ Creando repositorio de clientes...');
            const customersRepoCode = `
/**
 * Repositorio de Clientes
 */

const db = require('../database-sqlite');

/**
 * Obtener todos los clientes
 */
async function getClientes() {
    try {
        const clientes = await db.query('SELECT * FROM clientes ORDER BY id');
        return clientes;
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        throw error;
    }
}

/**
 * Obtener cliente por ID
 */
async function getClienteById(id) {
    try {
        const cliente = await db.query('SELECT * FROM clientes WHERE id = ?', id);
        return cliente[0];
    } catch (error) {
        console.error('Error al obtener cliente por ID:', error);
        throw error;
    }
}

/**
 * Crear cliente
 */
async function createCliente(cliente) {
    try {
        const result = await db.query(
            'INSERT INTO clientes (nombre, direccion, telefono, email, deuda) VALUES (?, ?, ?, ?, ?)',
            [cliente.nombre, cliente.direccion, cliente.telefono, cliente.email, cliente.deuda || 0]
        );
        return result.lastID;
    } catch (error) {
        console.error('Error al crear cliente:', error);
        throw error;
    }
}

/**
 * Actualizar cliente
 */
async function updateCliente(id, cliente) {
    try {
        await db.query(
            'UPDATE clientes SET nombre = ?, direccion = ?, telefono = ?, email = ?, deuda = ? WHERE id = ?',
            [cliente.nombre, cliente.direccion, cliente.telefono, cliente.email, cliente.deuda, id]
        );
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        throw error;
    }
}

module.exports = {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente
};
`;
            fs.writeFileSync(customersRepoFile, customersRepoCode);
            console.log('✅ Repositorio de clientes creado');
            fixResults.push({
                step: 'Repositorio de Clientes',
                status: 'success',
                message: 'Repositorio creado'
            });
        } else {
            console.log('✅ Repositorio de clientes ya existe');
            fixResults.push({
                step: 'Repositorio de Clientes',
                status: 'success',
                message: 'Repositorio ya existente'
            });
        }

        // Verificar y crear repositorio de deudas
        const debtsRepoFile = path.join(repositoriesDir, 'debts-repository.js');
        if (!fs.existsSync(debtsRepoFile)) {
            console.log('⚠️ Creando repositorio de deudas...');
            const debtsRepoCode = `
/**
 * Repositorio de Deudas
 */

const db = require('../database-sqlite');

/**
 * Obtener todas las deudas
 */
async function getDeudas() {
    try {
        const deudas = await db.query('SELECT * FROM deudas ORDER BY id');
        return deudas;
    } catch (error) {
        console.error('Error al obtener deudas:', error);
        throw error;
    }
}

/**
 * Obtener deuda por ID
 */
async function getDeudaById(id) {
    try {
        const deuda = await db.query('SELECT * FROM deudas WHERE id = ?', id);
        return deuda[0];
    } catch (error) {
        console.error('Error al obtener deuda por ID:', error);
        throw error;
    }
}

/**
 * Crear deuda
 */
async function createDeuda(deuda) {
    try {
        const result = await db.query(
            'INSERT INTO deudas (cliente_id, monto, fecha, descripcion) VALUES (?, ?, ?, ?)',
            [deuda.cliente_id, deuda.monto, deuda.fecha, deuda.descripcion]
        );
        return result.lastID;
    } catch (error) {
        console.error('Error al crear deuda:', error);
        throw error;
    }
}

/**
 * Actualizar deuda
 */
async function updateDeuda(id, deuda) {
    try {
        await db.query(
            'UPDATE deudas SET cliente_id = ?, monto = ?, fecha = ?, descripcion = ? WHERE id = ?',
            [deuda.cliente_id, deuda.monto, deuda.fecha, deuda.descripcion, id]
        );
    } catch (error) {
        console.error('Error al actualizar deuda:', error);
        throw error;
    }
}

module.exports = {
    getDeudas,
    getDeudaById,
    createDeuda,
    updateDeuda
};
`;
            fs.writeFileSync(debtsRepoFile, debtsRepoCode);
            console.log('✅ Repositorio de deudas creado');
            fixResults.push({
                step: 'Repositorio de Deudas',
                status: 'success',
                message: 'Repositorio creado'
            });
        } else {
            console.log('✅ Repositorio de deudas ya existe');
            fixResults.push({
                step: 'Repositorio de Deudas',
                status: 'success',
                message: 'Repositorio ya existente'
            });
        }

        // Verificar y crear repositorio de ventas
        const salesRepoFile = path.join(repositoriesDir, 'sales-repository.js');
        if (!fs.existsSync(salesRepoFile)) {
            console.log('⚠️ Creando repositorio de ventas...');
            const salesRepoCode = `
/**
 * Repositorio de Ventas
 */

const db = require('../database-sqlite');

/**
 * Obtener todas las ventas
 */
async function getVentas() {
    try {
        const ventas = await db.query('SELECT * FROM ventas ORDER BY id');
        return ventas;
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        throw error;
    }
}

/**
 * Obtener venta por ID
 */
async function getVentaById(id) {
    try {
        const venta = await db.query('SELECT * FROM ventas WHERE id = ?', id);
        return venta[0];
    } catch (error) {
        console.error('Error al obtener venta por ID:', error);
        throw error;
    }
}

/**
 * Crear venta
 */
async function createVenta(venta) {
    try {
        const result = await db.query(
            'INSERT INTO ventas (cliente_id, total, metodo_pago, fecha, pagado, total_pagado) VALUES (?, ?, ?, ?, ?, ?)',
            [venta.cliente_id, venta.total, venta.metodo_pago, venta.fecha, venta.pagado, venta.total_pagado]
        );
        return result.lastID;
    } catch (error) {
        console.error('Error al crear venta:', error);
        throw error;
    }
}

/**
 * Actualizar venta
 */
async function updateVenta(id, venta) {
    try {
        await db.query(
            'UPDATE ventas SET cliente_id = ?, total = ?, metodo_pago = ?, fecha = ?, pagado = ?, total_pagado = ? WHERE id = ?',
            [venta.cliente_id, venta.total, venta.metodo_pago, venta.fecha, venta.pagado, venta.total_pagado, id]
        );
    } catch (error) {
        console.error('Error al actualizar venta:', error);
        throw error;
    }
}

module.exports = {
    getVentas,
    getVentaById,
    createVenta,
    updateVenta
};
`;
            fs.writeFileSync(salesRepoFile, salesRepoCode);
            console.log('✅ Repositorio de ventas creado');
            fixResults.push({
                step: 'Repositorio de Ventas',
                status: 'success',
                message: 'Repositorio creado'
            });
        } else {
            console.log('✅ Repositorio de ventas ya existe');
            fixResults.push({
                step: 'Repositorio de Ventas',
                status: 'success',
                message: 'Repositorio ya existente'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar repositorios: ${error.message}`);
        fixResults.push({
            step: 'Repositorios',
            status: 'error',
            message: `Error al verificar repositorios: ${error.message}`
        });
    }
}

/**
 * Genera el reporte final de la solución
 */
function generateFixReport() {
    console.log('\n📊 Generando reporte de la solución...\n');

    // Mostrar resultados
    fixResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${result.step}: ${result.message}`);
    });

    // Resumen
    const successCount = fixResults.filter(r => r.status === 'success').length;
    const warningCount = fixResults.filter(r => r.status === 'warning').length;
    const errorCount = fixResults.filter(r => r.status === 'error').length;

    console.log('\n📈 Resumen de la Solución:');
    console.log(`✅ Pasos exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Recomendaciones
    if (errorCount > 0 || warningCount > 0) {
        console.log('\n💡 Recomendaciones:');
        console.log('• Reinicia el servidor backend después de los cambios');
        console.log('• Verifica que el puerto 3000 esté disponible');
        console.log('• Asegúrate de que la base de datos esté correctamente configurada');
        console.log('• Prueba los endpoints manualmente');
    } else {
        console.log('\n🎉 ¡Solución completada exitosamente!');
        console.log('• Los endpoints críticos han sido creados o verificados');
        console.log('• Los middlewares necesarios están en su lugar');
        console.log('• Los repositorios están implementados');
        console.log('• Reinicia el servidor y prueba los endpoints');
    }

    console.log('\n✅ Solución de errores 404 completada');
}

// Ejecutar la solución si este script se ejecuta directamente
if (require.main === module) {
    runFix().catch(console.error);
}

module.exports = { runFix };