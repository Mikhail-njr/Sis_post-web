/**
 * Asistente de Ayuda Rápida para Problemas de Cuenta Corriente
 * Este script guía al usuario paso a paso para resolver problemas
 * con la funcionalidad de cuenta corriente.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./backend/database-sqlite');

// Configuración de la interfaz de línea de comandos
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Variables de estado
let wizardResults = [];

/**
 * Inicia el asistente de ayuda
 */
async function runWizard() {
    console.log('🧙‍♂️ Bienvenido al Asistente de Ayuda para Cuenta Corriente\n');
    console.log('Este asistente te guiará paso a paso para resolver problemas');
    console.log('con la funcionalidad de cuenta corriente en el dashboard.\n');

    wizardResults = [];

    try {
        // Paso 1: Preguntar sobre el problema
        await askProblemDescription();

        // Paso 2: Diagnosticar el sistema
        await runSystemDiagnostic();

        // Paso 3: Recomendar soluciones
        await recommendSolutions();

        // Paso 4: Aplicar soluciones (si el usuario lo desea)
        await askApplySolutions();

        // Paso 5: Verificar resultados
        await verifyResults();

        // Generar reporte final
        generateWizardReport();

    } catch (error) {
        console.error(`❌ Error durante el asistente: ${error.message}`);
        wizardResults.push({
            step: 'Asistente General',
            status: 'error',
            message: `Error durante el asistente: ${error.message}`
        });
        generateWizardReport();
    }
}

/**
 * Paso 1: Preguntar sobre el problema
 */
function askProblemDescription() {
    return new Promise((resolve) => {
        console.log('📋 Paso 1: Descripción del Problema\n');

        rl.question('¿Qué problema estás experimentando con la cuenta corriente? ', (problem) => {
            console.log(`\n✅ Problema descrito: "${problem}"\n`);

            wizardResults.push({
                step: 'Descripción del Problema',
                status: 'info',
                message: problem
            });

            resolve();
        });
    });
}

/**
 * Paso 2: Diagnosticar el sistema
 */
async function runSystemDiagnostic() {
    console.log('🔍 Paso 2: Diagnóstico del Sistema\n');

    try {
        // Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Verificar tablas necesarias
        await checkTables();

        // Verificar datos huérfanos
        await checkOrphanData();

        // Verificar consistencia de deudas
        await checkDebtConsistency();

        console.log('✅ Diagnóstico del sistema completado\n');

    } catch (error) {
        console.error(`❌ Error durante el diagnóstico: ${error.message}`);
        wizardResults.push({
            step: 'Diagnóstico del Sistema',
            status: 'error',
            message: `Error durante el diagnóstico: ${error.message}`
        });
    }
}

/**
 * Verificar conexión con la base de datos
 */
async function checkDatabaseConnection() {
    console.log('📡 Verificando conexión con la base de datos...');

    try {
        const result = await db.query('SELECT 1 as test');
        console.log('✅ Conexión con base de datos exitosa');

        wizardResults.push({
            step: 'Conexión Base de Datos',
            status: 'success',
            message: 'Conexión con base de datos exitosa'
        });
    } catch (error) {
        console.error(`❌ Error de conexión con base de datos: ${error.message}`);
        wizardResults.push({
            step: 'Conexión Base de Datos',
            status: 'error',
            message: `Error de conexión: ${error.message}`
        });
    }
}

/**
 * Verificar tablas necesarias
 */
async function checkTables() {
    console.log('🗄️ Verificando tablas necesarias...');

    const requiredTables = ['clientes', 'deudas', 'ventas'];

    for (const table of requiredTables) {
        try {
            const result = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (result.length > 0) {
                console.log(`✅ Tabla ${table} existe`);

                wizardResults.push({
                    step: `Tabla ${table}`,
                    status: 'success',
                    message: 'Existe'
                });
            } else {
                console.error(`❌ Tabla ${table} no existe`);
                wizardResults.push({
                    step: `Tabla ${table}`,
                    status: 'error',
                    message: 'No existe'
                });
            }
        } catch (error) {
            console.error(`❌ Error al verificar tabla ${table}: ${error.message}`);
            wizardResults.push({
                step: `Tabla ${table}`,
                status: 'error',
                message: `Error al verificar: ${error.message}`
            });
        }
    }
}

/**
 * Verificar datos huérfanos
 */
async function checkOrphanData() {
    console.log('🧹 Verificando datos huérfanos...');

    try {
        // Verificar deudas huérfanas
        const orphanDebts = await db.query('SELECT * FROM deudas WHERE cliente_id IS NULL OR cliente_id = 0');
        if (orphanDebts.length > 0) {
            console.warn(`⚠️ Se encontraron ${orphanDebts.length} deudas huérfanas`);
            wizardResults.push({
                step: 'Deudas Huérfanas',
                status: 'warning',
                message: `${orphanDebts.length} deudas huérfanas encontradas`
            });
        } else {
            console.log('✅ No hay deudas huérfanas');
            wizardResults.push({
                step: 'Deudas Huérfanas',
                status: 'success',
                message: 'No hay deudas huérfanas'
            });
        }

        // Verificar ventas en CC huérfanas
        const orphanSales = await db.query(
            'SELECT * FROM ventas WHERE metodo_pago = "cuenta_corriente" AND (cliente_id IS NULL OR cliente_id = 0)'
        );
        if (orphanSales.length > 0) {
            console.warn(`⚠️ Se encontraron ${orphanSales.length} ventas en CC huérfanas`);
            wizardResults.push({
                step: 'Ventas en CC Huérfanas',
                status: 'warning',
                message: `${orphanSales.length} ventas en CC huérfanas encontradas`
            });
        } else {
            console.log('✅ No hay ventas en CC huérfanas');
            wizardResults.push({
                step: 'Ventas en CC Huérfanas',
                status: 'success',
                message: 'No hay ventas en CC huérfanas'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar datos huérfanos: ${error.message}`);
        wizardResults.push({
            step: 'Datos Huérfanos',
            status: 'error',
            message: `Error al verificar: ${error.message}`
        });
    }
}

/**
 * Verificar consistencia de deudas
 */
async function checkDebtConsistency() {
    console.log('🔍 Verificando consistencia de deudas...');

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
            wizardResults.push({
                step: 'Consistencia de Deudas',
                status: 'success',
                message: 'No se encontraron inconsistencias'
            });
        } else {
            console.warn(`⚠️ Se encontraron ${inconsistencies} inconsistencias de deudas`);
            wizardResults.push({
                step: 'Consistencia de Deudas',
                status: 'warning',
                message: `${inconsistencies} inconsistencias encontradas`
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar consistencia de deudas: ${error.message}`);
        wizardResults.push({
            step: 'Consistencia de Deudas',
            status: 'error',
            message: `Error al verificar: ${error.message}`
        });
    }
}

/**
 * Paso 3: Recomendar soluciones
 */
async function recommendSolutions() {
    console.log('💡 Paso 3: Recomendaciones de Soluciones\n');

    // Analizar resultados del diagnóstico
    const errorCount = wizardResults.filter(r => r.status === 'error').length;
    const warningCount = wizardResults.filter(r => r.status === 'warning').length;

    if (errorCount > 0) {
        console.log('🚨 Se detectaron errores críticos. Se recomienda:');
        console.log('   1. Ejecutar: node fix-debts.js');
        console.log('   2. Ejecutar: node diagnostic-general.js');
        console.log('   3. Verificar la configuración del backend\n');
    } else if (warningCount > 0) {
        console.log('⚠️ Se detectaron advertencias. Se recomienda:');
        console.log('   1. Ejecutar: node clean-orphan-data.js');
        console.log('   2. Ejecutar: node update-debts.js');
        console.log('   3. Verificar la consistencia de datos\n');
    } else {
        console.log('✅ No se detectaron problemas graves.');
        console.log('   El sistema parece estar funcionando correctamente.\n');
    }

    wizardResults.push({
        step: 'Recomendaciones',
        status: 'info',
        message: 'Se han proporcionado recomendaciones basadas en el diagnóstico'
    });
}

/**
 * Paso 4: Preguntar si desea aplicar soluciones
 */
function askApplySolutions() {
    return new Promise((resolve) => {
        console.log('🔧 Paso 4: Aplicar Soluciones\n');

        rl.question('¿Deseas que el asistente aplique las soluciones automáticamente? (s/n): ', async (response) => {
            const apply = response.toLowerCase() === 's' || response.toLowerCase() === 'si';

            if (apply) {
                console.log('\n🚀 Aplicando soluciones...\n');
                await applyRecommendedSolutions();
            } else {
                console.log('\n✅ Soluciones no aplicadas. Puedes ejecutarlas manualmente.\n');
                wizardResults.push({
                    step: 'Aplicar Soluciones',
                    status: 'info',
                    message: 'Usuario decidió no aplicar soluciones automáticamente'
                });
            }

            resolve();
        });
    });
}

/**
 * Aplicar soluciones recomendadas
 */
async function applyRecommendedSolutions() {
    try {
        // Importar los scripts de solución
        const { runFix } = require('./fix-debts');
        const { runClean } = require('./clean-orphan-data');
        const { runUpdate } = require('./update-debts');

        // Ejecutar limpieza de datos huérfanos
        console.log('🧹 Limpiando datos huérfanos...');
        await runClean();

        // Ejecutar solución de deudas
        console.log('🔧 Aplicando solución de deudas...');
        await runFix();

        // Ejecutar actualización de deudas
        console.log('🔄 Actualizando deudas...');
        await runUpdate();

        console.log('✅ Soluciones aplicadas exitosamente\n');

        wizardResults.push({
            step: 'Aplicar Soluciones',
            status: 'success',
            message: 'Soluciones aplicadas exitosamente'
        });

    } catch (error) {
        console.error(`❌ Error al aplicar soluciones: ${error.message}`);
        wizardResults.push({
            step: 'Aplicar Soluciones',
            status: 'error',
            message: `Error al aplicar soluciones: ${error.message}`
        });
    }
}

/**
 * Paso 5: Verificar resultados
 */
async function verifyResults() {
    console.log('🔍 Paso 5: Verificación de Resultados\n');

    try {
        // Ejecutar diagnóstico nuevamente
        await runSystemDiagnostic();

        console.log('✅ Verificación de resultados completada\n');

        wizardResults.push({
            step: 'Verificación de Resultados',
            status: 'success',
            message: 'Verificación completada'
        });

    } catch (error) {
        console.error(`❌ Error durante la verificación: ${error.message}`);
        wizardResults.push({
            step: 'Verificación de Resultados',
            status: 'error',
            message: `Error durante la verificación: ${error.message}`
        });
    }
}

/**
 * Genera el reporte final del asistente
 */
function generateWizardReport() {
    console.log('📊 Generando reporte del asistente...\n');

    // Mostrar resultados
    wizardResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : result.status === 'error' ? '❌' : 'ℹ️';
        console.log(`${icon} ${result.step}: ${result.message}`);
    });

    // Resumen
    const successCount = wizardResults.filter(r => r.status === 'success').length;
    const warningCount = wizardResults.filter(r => r.status === 'warning').length;
    const errorCount = wizardResults.filter(r => r.status === 'error').length;

    console.log('\n📈 Resumen del Asistente:');
    console.log(`✅ Pasos exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Mensaje final
    if (errorCount === 0 && warningCount === 0) {
        console.log('\n🎉 ¡Problema resuelto exitosamente!');
        console.log('• El dashboard de clientes debería mostrar la información correctamente');
        console.log('• Recarga el dashboard para ver los cambios');
    } else {
        console.log('\n💡 Recomendaciones finales:');
        console.log('• Revisa los errores y advertencias anteriores');
        console.log('• Considera ejecutar los scripts de diagnóstico manualmente');
        console.log('• Si el problema persiste, contacta al soporte técnico');
    }

    console.log('\n✅ Asistente de ayuda completado');

    // Cerrar la interfaz de línea de comandos
    rl.close();
}

// Ejecutar el asistente si este script se ejecuta directamente
if (require.main === module) {
    runWizard().catch(console.error);
}

module.exports = { runWizard };