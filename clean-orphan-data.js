/**
 * Script de Limpieza de Datos Huérfanos
 * Este script elimina datos huérfanos que pueden causar problemas
 * en la funcionalidad de cuenta corriente.
 */

const fs = require('fs');
const path = require('path');

// Importar módulos del backend
const db = require('./backend/database-sqlite');

// Variables de estado
let cleanResults = [];

/**
 * Inicia la limpieza de datos huérfanos
 */
async function runClean() {
    console.log('🧹 Iniciando limpieza de datos huérfanos...\n');

    cleanResults = [];

    try {
        // Paso 1: Verificar conexión con la base de datos
        await checkDatabaseConnection();

        // Paso 2: Limpiar deudas huérfanas
        await cleanOrphanDebts();

        // Paso 3: Limpiar ventas en CC huérfanas
        await cleanOrphanCreditSales();

        // Paso 4: Limpiar deudas huérfanas en la tabla de deudas
        await cleanOrphanDebtRecords();

        // Paso 5: Verificar consistencia después de la limpieza
        await verifyConsistencyAfterClean();

        // Generar reporte
        generateCleanReport();

    } catch (error) {
        console.error(`❌ Error durante la limpieza: ${error.message}`);
        cleanResults.push({
            step: 'Limpieza General',
            status: 'error',
            message: `Error durante la limpieza: ${error.message}`
        });
        generateCleanReport();
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

        cleanResults.push({
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
            cleanResults.push({
                step: 'Limpiar Deudas Huérfanas',
                status: 'success',
                message: `Se eliminaron ${orphanDebts.length} deudas huérfanas`
            });
        } else {
            console.log('✅ No hay deudas huérfanas');
            cleanResults.push({
                step: 'Limpiar Deudas Huérfanas',
                status: 'success',
                message: 'No hay deudas huérfanas'
            });
        }
    } catch (error) {
        console.error(`❌ Error al limpiar deudas huérfanas: ${error.message}`);
        cleanResults.push({
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
            cleanResults.push({
                step: 'Limpiar Ventas en CC Huérfanas',
                status: 'success',
                message: `Se eliminaron ${orphanSales.length} ventas en CC huérfanas`
            });
        } else {
            console.log('✅ No hay ventas en CC huérfanas');
            cleanResults.push({
                step: 'Limpiar Ventas en CC Huérfanas',
                status: 'success',
                message: 'No hay ventas en CC huérfanas'
            });
        }
    } catch (error) {
        console.error(`❌ Error al limpiar ventas en CC huérfanas: ${error.message}`);
        cleanResults.push({
            step: 'Limpiar Ventas en CC Huérfanas',
            status: 'error',
            message: `Error al limpiar ventas en CC huérfanas: ${error.message}`
        });
    }
}

/**
 * Paso 4: Limpiar deudas huérfanas en la tabla de deudas
 */
async function cleanOrphanDebtRecords() {
    console.log('🧹 Limpiando registros huérfanos en la tabla de deudas...');

    try {
        // Obtener todas las deudas
        const allDebts = await db.query('SELECT * FROM deudas ORDER BY id');

        if (allDebts.length > 0) {
            // Obtener todos los clientes
            const allClients = await db.query('SELECT id FROM clientes');

            // Crear un conjunto de IDs de clientes para una búsqueda más rápida
            const clientIds = new Set(allClients.map(client => client.id));

            // Encontrar deudas con cliente_id que no existen en la tabla de clientes
            const orphanDebtRecords = allDebts.filter(debt => !clientIds.has(debt.cliente_id));

            if (orphanDebtRecords.length > 0) {
                console.log(`⚠️ Se encontraron ${orphanDebtRecords.length} registros de deudas huérfanos`);

                // Eliminar registros huérfanos
                await db.query('DELETE FROM deudas WHERE cliente_id NOT IN (SELECT id FROM clientes)');

                console.log(`✅ Se eliminaron ${orphanDebtRecords.length} registros de deudas huérfanos`);
                cleanResults.push({
                    step: 'Limpiar Registros Huérfanos en Deudas',
                    status: 'success',
                    message: `Se eliminaron ${orphanDebtRecords.length} registros de deudas huérfanos`
                });
            } else {
                console.log('✅ No hay registros de deudas huérfanos');
                cleanResults.push({
                    step: 'Limpiar Registros Huérfanos en Deudas',
                    status: 'success',
                    message: 'No hay registros de deudas huérfanos'
                });
            }
        } else {
            console.log('✅ No hay deudas para verificar');
            cleanResults.push({
                step: 'Limpiar Registros Huérfanos en Deudas',
                status: 'success',
                message: 'No hay deudas para verificar'
            });
        }
    } catch (error) {
        console.error(`❌ Error al limpiar registros huérfanos en deudas: ${error.message}`);
        cleanResults.push({
            step: 'Limpiar Registros Huérfanos en Deudas',
            status: 'error',
            message: `Error al limpiar registros huérfanos en deudas: ${error.message}`
        });
    }
}

/**
 * Paso 5: Verificar consistencia después de la limpieza
 */
async function verifyConsistencyAfterClean() {
    console.log('🔍 Verificando consistencia después de la limpieza...');

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

        // Verificar deudas sin cliente asociado
        const debtsWithoutClient = debts.filter(debt => !debt.cliente_id || debt.cliente_id === 0);
        if (debtsWithoutClient.length > 0) {
            console.warn(`⚠️ Aún hay ${debtsWithoutClient.length} deudas sin cliente asociado`);
            cleanResults.push({
                step: 'Verificar Consistencia Final',
                status: 'warning',
                message: `Aún hay ${debtsWithoutClient.length} deudas sin cliente asociado`
            });
        } else {
            console.log('✅ No hay deudas sin cliente asociado');
            cleanResults.push({
                step: 'Verificar Consistencia Final',
                status: 'success',
                message: 'No hay deudas sin cliente asociado'
            });
        }

        // Verificar ventas en CC sin cliente asociado
        const salesWithoutClient = creditSales.filter(sale => !sale.cliente_id || sale.cliente_id === 0);
        if (salesWithoutClient.length > 0) {
            console.warn(`⚠️ Aún hay ${salesWithoutClient.length} ventas en CC sin cliente asociado`);
            cleanResults.push({
                step: 'Verificar Consistencia Final',
                status: 'warning',
                message: `Aún hay ${salesWithoutClient.length} ventas en CC sin cliente asociado`
            });
        } else {
            console.log('✅ No hay ventas en CC sin cliente asociado');
            cleanResults.push({
                step: 'Verificar Consistencia Final',
                status: 'success',
                message: 'No hay ventas en CC sin cliente asociado'
            });
        }

        // Verificar deudas con cliente_id que no existe en la tabla de clientes
        const invalidClientIds = debts.filter(debt => debt.cliente_id && debt.cliente_id !== 0);
        const clientIds = new Set(clients.map(client => client.id));
        const debtsWithInvalidClient = invalidClientIds.filter(debt => !clientIds.has(debt.cliente_id));

        if (debtsWithInvalidClient.length > 0) {
            console.warn(`⚠️ Hay ${debtsWithInvalidClient.length} deudas con cliente_id que no existe en la tabla de clientes`);
            cleanResults.push({
                step: 'Verificar Consistencia Final',
                status: 'warning',
                message: `Hay ${debtsWithInvalidClient.length} deudas con cliente_id que no existe en la tabla de clientes`
            });
        } else {
            console.log('✅ No hay deudas con cliente_id inválido');
            cleanResults.push({
                step: 'Verificar Consistencia Final',
                status: 'success',
                message: 'No hay deudas con cliente_id inválido'
            });
        }

    } catch (error) {
        console.error(`❌ Error al verificar consistencia final: ${error.message}`);
        cleanResults.push({
            step: 'Verificar Consistencia Final',
            status: 'error',
            message: `Error al verificar consistencia final: ${error.message}`
        });
    }
}

/**
 * Genera el reporte final de la limpieza
 */
function generateCleanReport() {
    console.log('\n📊 Generando reporte de la limpieza...\n');

    // Mostrar resultados
    cleanResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${result.step}: ${result.message}`);
    });

    // Resumen
    const successCount = cleanResults.filter(r => r.status === 'success').length;
    const warningCount = cleanResults.filter(r => r.status === 'warning').length;
    const errorCount = cleanResults.filter(r => r.status === 'error').length;

    console.log('\n📈 Resumen de la Limpieza:');
    console.log(`✅ Pasos exitosos: ${successCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Recomendaciones
    if (errorCount > 0 || warningCount > 0) {
        console.log('\n💡 Recomendaciones:');
        console.log('• Revisa los errores y advertencias anteriores');
        console.log('• Verifica la integridad de los datos');
        console.log('• Considera ejecutar el script de actualización de deudas');
        console.log('• Si el problema persiste, contacta al soporte técnico');
    } else {
        console.log('\n🎉 ¡Limpieza completada exitosamente!');
        console.log('• Todos los datos huérfanos han sido eliminados');
        console.log('• La base de datos está limpia y consistente');
        console.log('• Recarga el dashboard para ver los cambios');
    }

    console.log('\n✅ Limpieza de datos huérfanos completada');
}

// Ejecutar la limpieza si este script se ejecuta directamente
if (require.main === module) {
    runClean().catch(console.error);
}

module.exports = { runClean };