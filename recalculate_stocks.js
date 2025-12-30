const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de zona horaria del sistema (Argentina)
const SYSTEM_TIMEZONE = 'America/Buenos_Aires';
const SYSTEM_TIMEZONE_OFFSET = -3; // UTC-3

function getCurrentSystemDate() {
    // Obtener fecha actual en zona horaria del sistema
    const now = new Date();
    const systemTime = new Date(now.getTime() + (SYSTEM_TIMEZONE_OFFSET * 60 * 60 * 1000));
    return systemTime;
}

const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
    }
});

// Función para hacer queries más fácil
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Función para ejecutar queries con funciones personalizadas
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

async function recalculateAllStocks() {
    console.log('🔄 Iniciando recalculo de stocks de todos los productos...');

    try {
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        // Obtener todos los productos con sus lotes activos
        const productsWithLotes = await dbAll(`
            SELECT
                p.id,
                p.nombre,
                p.stock as stock_actual,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
                COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes_activos
            FROM productos p
            LEFT JOIN lotes l ON p.id = l.producto_id
            GROUP BY p.id, p.nombre, p.stock
            ORDER BY p.nombre
        `);

        console.log(`📊 Encontrados ${productsWithLotes.length} productos para recalcular`);

        let updatedCount = 0;
        let inconsistenciesFound = 0;

        for (const product of productsWithLotes) {
            const stockActual = product.stock_actual || 0;
            const stockCalculado = product.stock_calculado || 0;

            if (stockActual !== stockCalculado) {
                console.log(`🔧 Producto "${product.nombre}" (ID: ${product.id}): stock actual=${stockActual}, stock calculado=${stockCalculado}, lotes activos=${product.cantidad_lotes_activos}`);

                // Actualizar stock del producto
                await dbRun(
                    "UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [stockCalculado, product.id]
                );

                updatedCount++;
                inconsistenciesFound++;
            }
        }

        // Actualizar lote_actual_id para todos los productos
        console.log('🔄 Actualizando lote_actual_id para todos los productos...');

        const productsToUpdate = await dbAll(`
            SELECT p.id, p.nombre,
                   (SELECT l.id FROM lotes l
                    WHERE l.producto_id = p.id AND l.estado = 'activo' AND l.cantidad_actual > 0
                    ORDER BY l.fecha_vencimiento DESC LIMIT 1) as lote_mas_vigente
            FROM productos p
        `);

        for (const product of productsToUpdate) {
            if (product.lote_mas_vigente) {
                await dbRun(
                    "UPDATE productos SET lote_actual_id = ? WHERE id = ?",
                    [product.lote_mas_vigente, product.id]
                );
            } else {
                await dbRun(
                    "UPDATE productos SET lote_actual_id = NULL WHERE id = ?",
                    [product.id]
                );
            }
        }

        await dbRun("COMMIT");

        console.log('✅ Recalculo completado exitosamente');
        console.log(`📈 Estadísticas:`);
        console.log(`   - Productos procesados: ${productsWithLotes.length}`);
        console.log(`   - Productos actualizados: ${updatedCount}`);
        console.log(`   - Inconsistencias corregidas: ${inconsistenciesFound}`);

        // Verificar resultado final
        const finalCheck = await dbAll(`
            SELECT COUNT(*) as total_products,
                   SUM(CASE WHEN p.stock != COALESCE(calculated_stock.stock_calculado, 0) THEN 1 ELSE 0 END) as inconsistencies_remaining
            FROM productos p
            LEFT JOIN (
                SELECT producto_id, COALESCE(SUM(CASE WHEN estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours') THEN cantidad_actual ELSE 0 END), 0) as stock_calculado
                FROM lotes
                GROUP BY producto_id
            ) calculated_stock ON p.id = calculated_stock.producto_id
        `);

        console.log(`🔍 Verificación final:`);
        console.log(`   - Total productos: ${finalCheck[0].total_products}`);
        console.log(`   - Inconsistencias restantes: ${finalCheck[0].inconsistencies_remaining}`);

        if (finalCheck[0].inconsistencies_remaining === 0) {
            console.log('🎉 ¡Todas las inconsistencias de stock han sido corregidas!');
        } else {
            console.log('⚠️ Aún quedan algunas inconsistencias. Puede ser necesario revisar manualmente.');
        }

    } catch (error) {
        console.error('❌ Error durante el recalculo:', error);
        await dbRun("ROLLBACK");
        throw error;
    }
}

// Ejecutar el recalculo
recalculateAllStocks()
    .then(() => {
        console.log('✅ Proceso completado exitosamente');
        db.close();
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        db.close();
        process.exit(1);
    });