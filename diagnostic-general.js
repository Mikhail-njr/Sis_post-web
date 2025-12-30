/**
 * Script de diagnóstico general del sistema POS - Cuenta Corriente
 * Este script se puede ejecutar desde la línea de comandos para diagnosticar
 * problemas con la funcionalidad de cuenta corriente en todo el sistema.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Importar módulos del backend
const db = require('./backend/database-sqlite');

// Variables de estado
let diagnosticResults = [];

/**
 * Inicia el diagnóstico general del sistema
 */
async function runDiagnostic() {
    console.log('🔍 Iniciando diagnóstico general del sistema POS - Cuenta Corriente...\n');

    diagnosticResults = [];

    try {
        // Diagnóstico 1: Verificar archivos del frontend
        await checkFrontendFiles();

        // Diagnóstico 2: Verificar archivos del backend
        await checkBackendFiles();

        // Diagnóstico 3: Verificar conexión con el backend
        await checkBackendConnection();

        // Diagnóstico 4: Verificar base de datos
        await checkDatabase();

        // Diagnóstico 5: Verificar consistencia de datos
        await checkDataConsistency();

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
 * Diagnóstico 1: Verificar archivos del frontend
 */
function checkFrontendFiles() {
    console.log('📁 Verificando archivos del frontend...');

    const frontendFiles = [
        'frontend/index.html',
        'frontend/dashboard.html',
        'frontend/diagnostic-clientes-cuenta-corriente.js',
        'frontend/diagnostic-clientes-frontend.js',
        'frontend/diagnostic-pos-cuenta-corriente.js'
    ];

    for (const file of frontendFiles) {
        if (fs.existsSync(file)) {
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
 * Diagnóstico 2: Verificar archivos del backend
 */
function checkBackendFiles() {
    console.log('📁 Verificando archivos del backend...');

    const backendFiles = [
        'backend/server.js',
        'backend/database-sqlite.js',
        'backend/repositories/customers-repository.js',
        'backend/repositories/debts-repository.js',
        'backend/repositories/sales-repository.js',
        'backend/diagnostic-clientes-backend.js'
    ];

    for (const file of backendFiles) {
        if (fs.existsSync(file)) {
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
 * Diagnóstico 3: Verificar conexión con el backend
 */
async function checkBackendConnection() {
    console.log('📡 Verificando conexión con el backend...');

    try {
        // Intentar conectar al backend
        const response = await makeRequest('http://localhost:3000/api/health', 'GET');
        if (response && response.status === 200) {
            console.log('✅ Conexión con backend exitosa');
            diagnosticResults.push({
                test: 'Conexión Backend',
                status: 'success',
                message: 'El backend está respondiendo correctamente'
            });
        } else {
            throw new Error(`Backend respondió con estado ${response ? response.status : 'unknown'}`);
        }
    } catch (error) {
        console.error(`❌ Error de conexión con backend: ${error.message}`);
        diagnosticResults.push({
            test: 'Conexión Backend',
            status: 'error',
            message: `No se puede conectar al backend: ${error.message}`
        });
    }
}

/**
 * Diagnóstico 4: Verificar base de datos
 */
async function checkDatabase() {
    console.log('🗄️ Verificando base de datos...');

    try {
        // Verificar conexión con la base de datos
        const result = await db.query('SELECT 1 as test');
        console.log('✅ Conexión con base de datos exitosa');

        diagnosticResults.push({
            test: 'Conexión Base de Datos',
            status: 'success',
            message: 'La conexión con la base de datos es exitosa'
        });

        // Verificar tablas necesarias
        const requiredTables = ['clientes', 'deudas', 'ventas'];

        for (const table of requiredTables) {
            try {
                const result = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
                if (result.length > 0) {
                    console.log(`✅ Tabla ${table} existe`);

                    // Verificar columnas importantes
                    const columns = await db.query(`PRAGMA table_info(${table})`);
                    console.log(`   Columnas de ${table}: ${columns.map(c => c.name).join(', ')}`);

                    diagnosticResults.push({
                        test: `Tabla ${table}`,
                        status: 'success',
                        message: `La tabla ${table} existe con ${columns.length} columnas`
                    });
                } else {
                    console.error(`❌ Tabla ${table} no existe`);
                    diagnosticResults.push({
                        test: `Tabla ${table}`,
                        status: 'error',
                        message: `La tabla ${table} no existe en la base de datos`
                    });
                }
            } catch (error) {
                console.error(`❌ Error al verificar tabla ${table}: ${error.message}`);
                diagnosticResults.push({
                    test: `Tabla ${table}`,
                    status: 'error',
                    message: `Error al verificar la tabla ${table}: ${error.message}`
                });
            }
        }

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
 * Diagnóstico 5: Verificar consistencia de datos
 */
async function checkDataConsistency() {
    console.log('🔍 Verificando consistencia de datos...');

    try {
        // Obtener todos los clientes
        const clients = await db.query('SELECT * FROM clientes ORDER BY id');

        // Obtener todas las deudas
        const debts = await db.query('SELECT * FROM deudas ORDER BY id');

        // Obtener todas las ventas en cuenta corriente
        const creditSales = await db.query('SELECT * FROM ventas WHERE metodo_pago = "cuenta_corriente" ORDER BY id');

        console.log(`✅ Clientes: ${clients.length}`);
        console.log(`✅ Deudas: ${debts.length}`);
        console.log(`✅ Ventas en CC: ${creditSales.length}`);

        diagnosticResults.push({
            test: 'Datos Generales',
            status: 'success',
            message: `Clientes: ${clients.length}, Deudas: ${debts.length}, Ventas en CC: ${creditSales.length}`
        });

        // Verificar clientes con deudas
        const clientsWithDebts = clients.filter(client => client.deuda > 0);
        console.log(`✅ Clientes con deudas: ${clientsWithDebts.length}`);

        diagnosticResults.push({
            test: 'Clientes con Deudas',
            status: 'success',
            message: `Hay ${clientsWithDebts.length} clientes con deudas registradas`
        });

        // Verificar deudas sin cliente asociado
        const debtsWithoutClient = debts.filter(debt => !debt.cliente_id || debt.cliente_id === 0);
        if (debtsWithoutClient.length > 0) {
            console.warn(`⚠️ Deudas sin cliente asociado: ${debtsWithoutClient.length}`);
            diagnosticResults.push({
                test: 'Deudas Huérfanas',
                status: 'warning',
                message: `Hay ${debtsWithoutClient.length} deudas sin cliente asociado`
            });
        } else {
            console.log('✅ No hay deudas sin cliente asociado');
            diagnosticResults.push({
                test: 'Deudas Huérfanas',
                status: 'success',
                message: 'No hay deudas sin cliente asociado'
            });
        }

        // Verificar ventas en CC sin cliente asociado
        const salesWithoutClient = creditSales.filter(sale => !sale.cliente_id || sale.cliente_id === 0);
        if (salesWithoutClient.length > 0) {
            console.warn(`⚠️ Ventas en CC sin cliente: ${salesWithoutClient.length}`);
            diagnosticResults.push({
                test: 'Ventas en CC Huérfanas',
                status: 'warning',
                message: `Hay ${salesWithoutClient.length} ventas en cuenta corriente sin cliente asociado`
            });
        } else {
            console.log('✅ No hay ventas en CC sin cliente asociado');
            diagnosticResults.push({
                test: 'Ventas en CC Huérfanas',
                status: 'success',
                message: 'No hay ventas en cuenta corriente sin cliente asociado'
            });
        }

        // Verificar consistencia entre deudas y clientes
        let inconsistencies = 0;

        for (const client of clients) {
            // Obtener deudas del cliente
            const clientDebts = debts.filter(debt => debt.cliente_id === client.id);
            const totalDebts = clientDebts.reduce((sum, debt) => sum + (debt.monto || 0), 0);

            // Obtener ventas en cuenta corriente del cliente
            const clientCreditSales = creditSales.filter(sale => sale.cliente_id === client.id);
            const totalCreditSales = clientCreditSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

            // Obtener pagos en cuenta corriente del cliente
            const clientCreditPayments = creditSales.filter(sale => sale.cliente_id === client.id && sale.pagado === 1);
            const totalCreditPayments = clientCreditPayments.reduce((sum, payment) => sum + (payment.total_pagado || 0), 0);

            // Calcular deuda esperada
            const expectedDebt = totalCreditSales - totalCreditPayments;

            // Comparar con la deuda registrada
            if (Math.abs(client.deuda - expectedDebt) > 0.01) {
                console.warn(`⚠️ Inconsistencia encontrada para cliente ${client.id} (${client.nombre}):`);
                console.warn(`   Deuda registrada: $${client.deuda.toFixed(2)}`);
                console.warn(`   Deuda calculada: $${expectedDebt.toFixed(2)}`);
                console.warn(`   Ventas en CC: $${totalCreditSales.toFixed(2)}`);
                console.warn(`   Pagos en CC: $${totalCreditPayments.toFixed(2)}`);
                console.warn(`   Deudas individuales: $${totalDebts.toFixed(2)}`);

                inconsistencies++;
            }
        }

        if (inconsistencies === 0) {
            console.log('✅ No se encontraron inconsistencias de deudas');
            diagnosticResults.push({
                test: 'Consistencia de Deudas',
                status: 'success',
                message: 'No se encontraron inconsistencias en las deudas de los clientes'
            });
        } else {
            console.warn(`⚠️ Se encontraron ${inconsistencies} inconsistencias de deudas`);
            diagnosticResults.push({
                test: 'Consistencia de Deudas',
                status: 'warning',
                message: `Se encontraron ${inconsistencies} inconsistencias en las deudas de los clientes`
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar consistencia de datos: ${error.message}`);
        diagnosticResults.push({
            test: 'Consistencia de Datos',
            status: 'error',
            message: `Error al verificar consistencia de datos: ${error.message}`
        });
    }
}

/**
 * Realiza una solicitud HTTP/HTTPS
 */
function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const client = urlObj.protocol === 'https:' ? https : http;

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
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

    console.log('\n📈 Resumen:');
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Recomendaciones generales
    if (errorCount > 0 || warningCount > 0) {
        console.log('\n💡 Recomendaciones Generales:');
        console.log('• Verifica que todos los archivos del frontend y backend existan');
        console.log('• Asegúrate de que el backend esté en funcionamiento');
        console.log('• Revisa la conexión con la base de datos');
        console.log('• Corrige las inconsistencias en las deudas de los clientes');
        console.log('• Verifica que las tablas necesarias estén creadas');
        console.log('• Asegúrate de que las relaciones entre tablas sean correctas');
    }

    console.log('\n✅ Diagnóstico general completado');
}

// Ejecutar el diagnóstico si este script se ejecuta directamente
if (require.main === module) {
    runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };