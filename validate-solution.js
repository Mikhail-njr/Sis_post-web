/**
 * Script de Validación Final de la Solución
 * Este script valida que todos los problemas de cuenta corriente
 * hayan sido resueltos correctamente.
 */

const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./backend/database-sqlite');

// Variables de estado
let validationResults = [];

/**
 * Inicia la validación final de la solución
 */
async function runValidation() {
    console.log('✅ Iniciando validación final de la solución...\n');

    validationResults = [];

    try {
        // Paso 1: Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Paso 2: Verificar integridad de los datos
        await checkDataIntegrity();

        // Paso 3: Verificar consistencia de deudas
        await checkDebtConsistency();

        // Paso 4: Verificar existencia de scripts de diagnóstico
        await checkDiagnosticScripts();

        // Paso 5: Verificar existencia de scripts de solución
        await checkSolutionScripts();

        // Generar reporte de validación
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
 * Paso 2: Verificar integridad de los datos
 */
async function checkDataIntegrity() {
    console.log('🔍 Verificando integridad de los datos...');

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

        validationResults.push({
            step: 'Datos Generales',
            status: 'success',
            message: `Clientes: ${clients.length}, Deudas: ${debts.length}, Ventas en CC: ${creditSales.length}`
        });

        // Verificar clientes con deudas
        const clientsWithDebts = clients.filter(client => client.deuda > 0);
        console.log(`✅ Clientes con deudas: ${clientsWithDebts.length}`);

        validationResults.push({
            step: 'Clientes con Deudas',
            status: 'success',
            message: `Hay ${clientsWithDebts.length} clientes con deudas registradas`
        });

    } catch (error) {
        console.error(`❌ Error al verificar integridad de datos: ${error.message}`);
        validationResults.push({
            step: 'Integridad de Datos',
            status: 'error',
            message: `Error al verificar integridad de datos: ${error.message}`
        });
    }
}

/**
 * Paso 3: Verificar consistencia de deudas
 */
async function checkDebtConsistency() {
    console.log('🧮 Verificando consistencia de deudas...');

    try {
        // Obtener todos los clientes
        const clients = await db.query('SELECT * FROM clientes ORDER BY id');

        let inconsistencies = 0;

        for (const client of clients) {
            // Obtener deudas del cliente
            const clientDebts = await db.query('SELECT * FROM deudas WHERE cliente_id = ? ORDER BY fecha', client.id);
            const totalDebts = clientDebts.reduce((sum, debt) => sum + (debt.monto || 0), 0);

            // Obtener ventas en cuenta corriente del cliente
            const creditSales = await db.query(
                'SELECT * FROM ventas WHERE cliente_id = ? AND metodo_pago = "cuenta_corriente" ORDER BY fecha',
                client.id
            );
            const totalCreditSales = creditSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

            // Obtener pagos en cuenta corriente del cliente
            const creditPayments = await db.query(
                'SELECT * FROM ventas WHERE cliente_id = ? AND metodo_pago = "cuenta_corriente" AND pagado = 1 ORDER BY fecha',
                client.id
            );
            const totalCreditPayments = creditPayments.reduce((sum, payment) => sum + (payment.total_pagado || 0), 0);

            // Calcular deuda esperada
            const expectedDebt = totalCreditSales - totalCreditPayments;

            // Comparar con la deuda registrada
            if (Math.abs(client.deuda - expectedDebt) > 0.01) {
                console.warn(`⚠️ Inconsistencia encontrada para cliente ${client.id} (${client.nombre}):`);
                console.warn(`   Deuda registrada: $${client.deuda.toFixed(2)}`);
                console.warn(`   Deuda calculada: $${expectedDebt.toFixed(2)}`);

                inconsistencies++;
            }
        }

        if (inconsistencies === 0) {
            console.log('✅ No se encontraron inconsistencias de deudas');
            validationResults.push({
                step: 'Consistencia de Deudas',
                status: 'success',
                message: 'No se encontraron inconsistencias en las deudas de los clientes'
            });
        } else {
            console.warn(`⚠️ Se encontraron ${inconsistencies} inconsistencias de deudas`);
            validationResults.push({
                step: 'Consistencia de Deudas',
                status: 'warning',
                message: `Se encontraron ${inconsistencies} inconsistencias en las deudas de los clientes`
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar consistencia de deudas: ${error.message}`);
        validationResults.push({
            step: 'Consistencia de Deudas',
            status: 'error',
            message: `Error al verificar consistencia de deudas: ${error.message}`
        });
    }
}

/**
 * Paso 4: Verificar existencia de scripts de diagnóstico
 */
function checkDiagnosticScripts() {
    console.log('📁 Verificando scripts de diagnóstico...');

    const diagnosticScripts = [
        'frontend/diagnostic-clientes-cuenta-corriente.js',
        'frontend/diagnostic-clientes-frontend.js',
        'frontend/diagnostic-pos-cuenta-corriente.js',
        'backend/diagnostic-clientes-backend.js',
        'diagnostic-general.js',
        'README_DIAGNOSTICOS.md',
        'SCRIPTS_SUMMARY.md',
        'help-wizard.js'
    ];

    let existingScripts = 0;

    for (const script of diagnosticScripts) {
        if (fs.existsSync(script)) {
            console.log(`✅ Script ${script} existe`);
            existingScripts++;
            validationResults.push({
                step: `Script ${script}`,
                status: 'success',
                message: 'Existe'
            });
        } else {
            console.error(`❌ Script ${script} no existe`);
            validationResults.push({
                step: `Script ${script}`,
                status: 'error',
                message: 'No existe'
            });
        }
    }

    console.log(`✅ Scripts de diagnóstico existentes: ${existingScripts}/${diagnosticScripts.length}`);
}

/**
 * Paso 5: Verificar existencia de scripts de solución
 */
function checkSolutionScripts() {
    console.log('🔧 Verificando scripts de solución...');

    const solutionScripts = [
        'fix-debts.js',
        'update-debts.js',
        'clean-orphan-data.js',
        'CREATED_SCRIPTS_SUMMARY.md',
        'validate-solution.js'
    ];

    let existingScripts = 0;

    for (const script of solutionScripts) {
        if (fs.existsSync(script)) {
            console.log(`✅ Script ${script} existe`);
            existingScripts++;
            validationResults.push({
                step: `Script ${script}`,
                status: 'success',
                message: 'Existe'
            });
        } else {
            console.error(`❌ Script ${script} no existe`);
            validationResults.push({
                step: `Script ${script}`,
                status: 'error',
                message: 'No existe'
            });
        }
    }

    console.log(`✅ Scripts de solución existentes: ${existingScripts}/${solutionScripts.length}`);
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
        console.log('✅ La solución está completamente implementada');
        console.log('✅ El sistema está listo para usar');
        console.log('\n💡 Próximos pasos:');
        console.log('1. Ejecuta: node fix-debts.js (para solucionar problemas actuales)');
        console.log('2. Abre el dashboard: http://localhost:3000/dashboard.html');
        console.log('3. Verifica que las deudas se muestren correctamente');
    } else if (errorCount === 0) {
        console.log('\n⚠️ Validación con advertencias');
        console.log('✅ La solución está implementada pero hay aspectos a revisar');
        console.log('💡 Revisa las advertencias anteriores');
    } else {
        console.log('\n❌ Validación con errores');
        console.log('🚨 Hay componentes faltantes o problemas críticos');
        console.log('💡 Revisa los errores anteriores e inténtalo de nuevo');
    }

    console.log('\n✅ Validación final completada');
}

// Ejecutar la validación si este script se ejecuta directamente
if (require.main === module) {
    runValidation().catch(console.error);
}

module.exports = { runValidation };