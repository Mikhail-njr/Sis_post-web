const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        fixNegativeStock();
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

// Función para ejecutar queries
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

async function fixNegativeStock() {
    try {
        console.log('🔍 Buscando lotes con stock negativo...');

        // Encontrar lotes con cantidad_actual negativa
        const negativeLotes = await dbAll(`
            SELECT l.*, p.nombre as producto_nombre, p.codigo as producto_codigo
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE l.cantidad_actual < 0
        `);

        if (negativeLotes.length === 0) {
            console.log('✅ No se encontraron lotes con stock negativo.');
            db.close();
            return;
        }

        console.log(`⚠️ Encontrados ${negativeLotes.length} lotes con stock negativo:`);

        for (const lote of negativeLotes) {
            console.log(`  - Lote ${lote.numero_lote} (Producto: ${lote.producto_nombre}): ${lote.cantidad_actual} unidades`);
        }

        console.log('\n🔧 Corrigiendo stock negativo...');

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            for (const lote of negativeLotes) {
                // Establecer cantidad_actual a 0 para lotes negativos
                await dbRun(
                    "UPDATE lotes SET cantidad_actual = 0 WHERE id = ?",
                    [lote.id]
                );

                console.log(`  ✅ Lote ${lote.numero_lote} corregido: ${lote.cantidad_actual} → 0`);
            }

            await dbRun("COMMIT");
            console.log('\n✅ Todos los lotes con stock negativo han sido corregidos.');

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

        // Verificar que el stock de productos sea consistente
        console.log('\n🔍 Verificando consistencia del stock de productos...');

        const inconsistentProducts = await dbAll(`
            SELECT
                p.id,
                p.nombre,
                p.stock as stock_actual,
                COALESCE(SUM(CASE WHEN l.estado = 'activo' THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado
            FROM productos p
            LEFT JOIN lotes l ON p.id = l.producto_id
            GROUP BY p.id, p.nombre, p.stock
            HAVING p.stock != COALESCE(SUM(CASE WHEN l.estado = 'activo' THEN l.cantidad_actual ELSE 0 END), 0)
        `);

        if (inconsistentProducts.length > 0) {
            console.log(`⚠️ Encontrados ${inconsistentProducts.length} productos con stock inconsistente:`);

            for (const product of inconsistentProducts) {
                console.log(`  - ${product.nombre}: actual=${product.stock_actual}, calculado=${product.stock_calculado}`);
            }

            console.log('\n🔧 Corrigiendo stock de productos...');

            await dbRun("BEGIN TRANSACTION");

            try {
                for (const product of inconsistentProducts) {
                    await dbRun(
                        "UPDATE productos SET stock = ? WHERE id = ?",
                        [product.stock_calculado, product.id]
                    );

                    console.log(`  ✅ ${product.nombre}: ${product.stock_actual} → ${product.stock_calculado}`);
                }

                await dbRun("COMMIT");
                console.log('\n✅ Stock de productos corregido.');

            } catch (error) {
                await dbRun("ROLLBACK");
                throw error;
            }
        } else {
            console.log('✅ El stock de productos es consistente.');
        }

    } catch (error) {
        console.error('❌ Error corrigiendo stock negativo:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error cerrando la base de datos:', err.message);
            } else {
                console.log('✅ Conexión a la base de datos cerrada');
            }
        });
    }
}