const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Eliminando todos los clientes de prueba...\n');

db.serialize(() => {
    // Iniciar transacción
    db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
            console.error('❌ Error iniciando transacción:', err.message);
            return;
        }

        try {
            // 1. Eliminar movimientos de cuenta corriente
            db.run("DELETE FROM movimientos_cuenta_corriente", (err) => {
                if (err) {
                    console.error('❌ Error eliminando movimientos:', err.message);
                    return;
                }
                console.log('✅ Movimientos de cuenta corriente eliminados');
            });

            // 2. Eliminar cuentas corrientes
            db.run("DELETE FROM cuentas_corrientes", (err) => {
                if (err) {
                    console.error('❌ Error eliminando cuentas corrientes:', err.message);
                    return;
                }
                console.log('✅ Cuentas corrientes eliminadas');
            });

            // 3. Eliminar deudas
            db.run("DELETE FROM deudas", (err) => {
                if (err) {
                    console.error('❌ Error eliminando deudas:', err.message);
                    return;
                }
                console.log('✅ Deudas eliminadas');
            });

            // 4. Eliminar TODOS los clientes excepto el cliente original con ID 1
            db.run("DELETE FROM clientes WHERE id != 1", (err) => {
                if (err) {
                    console.error('❌ Error eliminando clientes:', err.message);
                    return;
                }
                console.log('✅ Todos los clientes de prueba eliminados (excepto cliente ID 1)');
            });

            // 5. Eliminar ventas de prueba (excepto las originales)
            db.run("DELETE FROM venta_items WHERE venta_id > 10", (err) => {
                if (err) {
                    console.error('❌ Error eliminando items de ventas de prueba:', err.message);
                    return;
                }
                console.log('✅ Items de ventas de prueba eliminados');
            });

            db.run("DELETE FROM ventas WHERE id > 10", (err) => {
                if (err) {
                    console.error('❌ Error eliminando ventas de prueba:', err.message);
                    return;
                }
                console.log('✅ Ventas de prueba eliminadas');
            });

            // 6. Confirmar transacción
            db.run("COMMIT", (err) => {
                if (err) {
                    console.error('❌ Error confirmando transacción:', err.message);
                    return;
                }
                console.log('\n✅ Limpieza completada exitosamente');

                // Verificar estado actual
                db.all("SELECT COUNT(*) as count FROM clientes", (err, rows) => {
                    if (err) {
                        console.error('❌ Error verificando clientes:', err.message);
                        return;
                    }
                    console.log(`👥 Clientes restantes: ${rows[0].count}`);

                    db.all("SELECT COUNT(*) as count FROM cuentas_corrientes", (err, rows) => {
                        if (err) {
                            console.error('❌ Error verificando cuentas corrientes:', err.message);
                            return;
                        }
                        console.log(`💰 Cuentas corrientes: ${rows[0].count}`);

                        db.all("SELECT COUNT(*) as count FROM deudas", (err, rows) => {
                            if (err) {
                                console.error('❌ Error verificando deudas:', err.message);
                                return;
                            }
                            console.log(`💸 Deudas: ${rows[0].count}`);

                            db.close((err) => {
                                if (err) {
                                    console.error('❌ Error cerrando base de datos:', err.message);
                                } else {
                                    console.log('\n✅ Base de datos limpia y lista');
                                }
                            });
                        });
                    });
                });
            });

        } catch (error) {
            console.error('❌ Error durante la limpieza:', error);
            db.run("ROLLBACK");
        }
    });
});