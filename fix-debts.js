/**
 * Script de Solución Rápida para Problemas de Deudas
 * Este script corrige automáticamente los problemas comunes de deudas
 * detectados por los scripts de diagnóstico.
 */

const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./backend/database-sqlite');

// Variables de estado
let fixResults = [];

/**
 * Inicia la solución de problemas de deudas
 */
async function runFix() {
    console.log('🔧 Iniciando solución de problemas de deudas...\n');

    fixResults = [];

    try {
        // Paso 1: Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Paso 2: Limpiar deudas huérfanas
        await cleanOrphanDebts();

        // Paso 3: Limpiar ventas en CC huérfanas
        await cleanOrphanCreditSales();

        // Paso 4: Recalcular deudas de clientes
        await recalculateClientDebts();

        // Paso 5: Verificar consistencia final
        await verifyFinalConsistency();

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
 * Paso 2: Limpiar deudas huérfanas
 */
async function cleanOrphanDebts() {
    console.log('🧹 Limpiando deudas huérfanas...');

    try {
        // Obtener deudas sin cliente asociado
        const orphanDebts = await db.query('SELECT * FROM deudas WHERE cliente_id IS NULL OR cliente_id = 0');

        if (orphanDebts.length > 0) {
            console.log(`⚠️ Se encontraron ${orphanDebts.length} deudas huérfanas`);

            // Eliminar deudas huérfanas
            await db.query('DELETE FROM deudas WHERE cliente_id IS NULL OR cliente_id = 0');

            console.log(`✅ Se eliminaron ${orphanDebts.length} deudas huérfanas`);
            fixResults.push({
                step: 'Limpiar Deudas Huérfanas',
                status: 'success',
                message: `Se eliminaron ${orphanDebts.length} deudas huérfanas`
            });
        } else {
            console.log('✅ No hay deudas huérfanas');
            fixResults.push({
                step: 'Limpiar Deudas Huérfanas',
                status: 'success',
                message: 'No hay deudas huérfanas'
            });
        }
    } catch (error) {
        console.error(`❌ Error al limpiar deudas huérfanas: ${error.message}`);
        fixResults.push({
            step: 'Limpiar Deudas Huérfanas',
            status: 'error',
            message: `Error al limpiar deudas huérfanas: ${error.message}`
        });
    }
}

/**
 * Paso 3: Limpiar ventas en CC huérfanas
 */
async function cleanOrphanCreditSales() {
    console.log('🧹 Limpiando ventas en cuenta corriente huérfanas...');

    try {
        // Obtener ventas en CC sin cliente asociado
        const orphanSales = await db.query(
            'SELECT * FROM ventas WHERE metodo_pago = "cuenta_corriente" AND (cliente_id IS NULL OR cliente_id = 0)'
        );

        if (orphanSales.length > 0) {
            console.log(`⚠️ Se encontraron ${orphanSales.length} ventas en CC huérfanas`);

            // Eliminar ventas en CC huérfanas
            await db.query(
                'DELETE FROM ventas WHERE metodo_pago = "cuenta_corriente" AND (cliente_id IS NULL OR cliente_id = 0)'
            );

            console.log(`✅ Se eliminaron ${orphanSales.length} ventas en CC huérfanas`);
            fixResults.push({
                step: 'Limpiar Ventas en CC Huérfanas',
                status: 'success',
                message: `Se eliminaron ${orphanSales.length} ventas en CC huérfanas`
            });
        } else {
            console.log('✅ No hay ventas en CC huérfanas');
            fixResults.push({
                step: 'Limpiar Ventas en CC Huérfanas',
                status: 'success',
                message: 'No hay ventas en CC huérfanas'
            });
        }
    } catch (error) {
        console.error(`❌ Error al limpiar ventas en CC huérfanas: ${error.message}`);
        fixResults.push({
            step: 'Limpiar Ventas en CC Huérfanas',
            status: 'error',
            message: `Error al limpiar ventas en CC huérfanas: ${error.message}`
        });
    }
}

/**
 * Paso 4: Recalcular deudas de clientes
 */
async function recalculateClientDebts() {
    console.log('🧮 Recalculando deudas de clientes...');

    try {
        // Obtener todos los clientes
        const clients = await db.query('SELECT * FROM clientes ORDER BY id');

        let updatedClients = 0;
        let totalDebtDifference = 0;

        for (const client of clients) {
            // Calcular deuda basada en ventas en cuenta corriente
            const creditSales = await db.query(
                'SELECT * FROM ventas WHERE cliente_id = ? AND metodo_pago = "cuenta_corriente" ORDER BY fecha',
                client.id
            );
            const totalCreditSales = creditSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

            // Obtener pagos en cuenta corriente
            const creditPayments = await db.query(
                'SELECT * FROM ventas WHERE cliente_id = ? AND metodo_pago = "cuenta_corriente" AND pagado = 1 ORDER BY fecha',
                client.id
            );
            const totalCreditPayments = creditPayments.reduce((sum, payment) => sum + (payment.total_pagado || 0), 0);

            // Calcular deuda esperada
            const expectedDebt = totalCreditSales - totalCreditPayments;

            // Comparar con la deuda registrada
            if (Math.abs(client.deuda - expectedDebt) > 0.01) {
                console.log(`🔧 Actualizando deuda para cliente ${client.id} (${client.nombre}):`);
                console.log(`   Deuda registrada: $${client.deuda.toFixed(2)}`);
                console.log(`   Deuda calculada: $${expectedDebt.toFixed(2)}`);

                // Actualizar deuda del cliente
                await db.query('UPDATE clientes SET deuda = ? WHERE id = ?', [expectedDebt, client.id]);

                const difference = Math.abs(client.deuda - expectedDebt);
                totalDebtDifference += difference;
                updatedClients++;

                console.log(`   ✅ Deuda actualizada: $${expectedDebt.toFixed(2)}`);
            }
        }

        if (updatedClients > 0) {
            console.log(`✅ Se actualizaron las deudas de ${updatedClients} clientes`);
            console.log(`💰 Diferencia total corregida: $${totalDebtDifference.toFixed(2)}`);
            fixResults.push({
                step: 'Recalcular Deudas de Clientes',
                status: 'success',
                message: `Se actualizaron las deudas de ${updatedClients} clientes. Diferencia total corregida: $${totalDebtDifference.toFixed(2)}`
            });
        } else {
            console.log('✅ No se necesitó actualizar deudas de clientes');
            fixResults.push({
                step: 'Recalcular Deudas de Clientes',
                status: 'success',
                message: 'No se necesitó actualizar deudas de clientes'
            });
        }
    } catch (error) {
        console.error(`❌ Error al recalcular deudas de clientes: ${error.message}`);
        fixResults.push({
            step: 'Recalcular Deudas de Clientes',
            status: 'error',
            message: `Error al recalcular deudas de clientes: ${error.message}`
        });
    }
}

/**
 * Paso 5: Verificar consistencia final
 */
async function verifyFinalConsistency() {
    console.log('🔍 Verificando consistencia final...');

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

        // Verificar clientes con deudas
        const clientsWithDebts = clients.filter(client => client.deuda > 0);
        console.log(`✅ Clientes con deudas: ${clientsWithDebts.length}`);

        // Verificar deudas sin cliente asociado
        const debtsWithoutClient = debts.filter(debt => !debt.cliente_id || debt.cliente_id === 0);
        if (debtsWithoutClient.length > 0) {
            console.warn(`⚠️ Aún hay ${debtsWithoutClient.length} deudas sin cliente asociado`);
            fixResults.push({
                step: 'Verificar Consistencia Final',
                status: 'warning',
                message: `Aún hay ${debtsWithoutClient.length} deudas sin cliente asociado`
            });
        } else {
            console.log('✅ No hay deudas sin cliente asociado');
            fixResults.push({
                step: 'Verificar Consistencia Final',
                status: 'success',
                message: 'No hay deudas sin cliente asociado'
            });
        }

        // Verificar ventas en CC sin cliente asociado
        const salesWithoutClient = creditSales.filter(sale => !sale.cliente_id || sale.cliente_id === 0);
        if (salesWithoutClient.length > 0) {
            console.warn(`⚠️ Aún hay ${salesWithoutClient.length} ventas en CC sin cliente asociado`);
            fixResults.push({
                step: 'Verificar Consistencia Final',
                status: 'warning',
                message: `Aún hay ${salesWithoutClient.length} ventas en CC sin cliente asociado`
            });
        } else {
            console.log('✅ No hay ventas en CC sin cliente asociado');
            fixResults.push({
                step: 'Verificar Consistencia Final',
                status: 'success',
                message: 'No hay ventas en CC sin cliente asociado'
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
                console.warn(`⚠️ Aún hay inconsistencia para cliente ${client.id} (${client.nombre}):`);
                console.warn(`   Deuda registrada: $${client.deuda.toFixed(2)}`);
                console.warn(`   Deuda calculada: $${expectedDebt.toFixed(2)}`);

                inconsistencies++;
            }
        }

        if (inconsistencies === 0) {
            console.log('✅ No se encontraron inconsistencias de deudas');
            fixResults.push({
                step: 'Verificar Consistencia Final',
                status: 'success',
                message: 'No se encontraron inconsistencias en las deudas de los clientes'
            });
        } else {
            console.warn(`⚠️ Aún se encontraron ${inconsistencies} inconsistencias de deudas`);
            fixResults.push({
                step: 'Verificar Consistencia Final',
                status: 'warning',
                message: `Aún se encontraron ${inconsistencies} inconsistencias en las deudas de los clientes`
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar consistencia final: ${error.message}`);
        fixResults.push({
            step: 'Verificar Consistencia Final',
            status: 'error',
            message: `Error al verificar consistencia final: ${error.message}`
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
        console.log('• Revisa los errores y advertencias anteriores');
        console.log('• Verifica la integridad de los datos');
        console.log('• Considera ejecutar el script de diagnóstico nuevamente');
        console.log('• Si el problema persiste, contacta al soporte técnico');
    } else {
        console.log('\n🎉 ¡Solución completada exitosamente!');
        console.log('• Todas las deudas han sido corregidas');
        console.log('• El dashboard de clientes debería mostrar la información correctamente');
        console.log('• Recarga el dashboard para ver los cambios');
    }

    console.log('\n✅ Solución de problemas de deudas completada');
}

// Ejecutar la solución si este script se ejecuta directamente
if (require.main === module) {
    runFix().catch(console.error);
}

module.exports = { runFix };