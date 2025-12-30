const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
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

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

async function auditoriaContinuaIntegridad() {
    try {
        console.log('\n🔍 AUDITORÍA CONTINUA DE INTEGRIDAD REFERENCIAL\n');
        console.log('=' .repeat(70));

        // 1. Verificar estado actual del sistema
        console.log('1. 📊 ESTADO ACTUAL DEL SISTEMA');
        console.log('-' .repeat(40));

        const estadisticasActuales = await dbAll(`
            SELECT
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COUNT(*) FROM cuentas_corrientes) as total_cuentas,
                (SELECT COUNT(*) FROM deudas) as total_deudas,
                (SELECT COUNT(*) FROM movimientos_cuenta_corriente) as total_movimientos,
                (SELECT COUNT(*) FROM deuda_productos) as total_productos_deuda
        `);

        const stats = estadisticasActuales[0];
        console.log(`   Clientes: ${stats.total_clientes}`);
        console.log(`   Cuentas corrientes: ${stats.total_cuentas}`);
        console.log(`   Deudas: ${stats.total_deudas}`);
        console.log(`   Movimientos: ${stats.total_movimientos}`);
        console.log(`   Productos de deuda: ${stats.total_productos_deuda}`);

        // 2. Verificar integridad referencial usando la vista creada
        console.log('\n2. 🔍 VERIFICACIÓN DE INTEGRIDAD REFERENCIAL');
        console.log('-' .repeat(40));

        const integridad = await dbAll("SELECT * FROM vista_integridad_clientes");
        let hayHuerfanos = false;

        integridad.forEach(tabla => {
            const porcentajeHuerfanos = tabla.total_registros > 0 ? (tabla.registros_huerfanos / tabla.total_registros * 100) : 0;
            const estado = tabla.registros_huerfanos === 0 ? '✅ CORRECTO' : '❌ HUÉRFANOS DETECTADOS';

            console.log(`   ${tabla.tabla}:`);
            console.log(`     - Registros totales: ${tabla.total_registros}`);
            console.log(`     - Registros huérfanos: ${tabla.registros_huerfanos}`);
            console.log(`     - Porcentaje huérfano: ${porcentajeHuerfanos.toFixed(2)}%`);
            console.log(`     - Estado: ${estado}`);

            if (tabla.registros_huerfanos > 0) {
                hayHuerfanos = true;
            }
        });

        // 3. Verificar claves foráneas
        console.log('\n3. 🔒 ESTADO DE CLAVES FORÁNEAS');
        console.log('-' .repeat(40));
        const fkStatus = await dbAll("PRAGMA foreign_keys");
        console.log(`   Estado de foreign_keys: ${fkStatus[0].foreign_keys ? 'HABILITADO' : 'DESHABILITADO'}`);

        if (!fkStatus[0].foreign_keys) {
            console.log('   ⚠️  ADVERTENCIA: Las claves foráneas están deshabilitadas');
        } else {
            console.log('   ✅ Claves foráneas correctamente habilitadas');
        }

        // 4. Verificar triggers activos
        console.log('\n4. 🪝 ESTADO DE TRIGGERS');
        console.log('-' .repeat(40));
        const triggers = await dbAll("SELECT name, type, tbl_name FROM sqlite_master WHERE type='trigger'");

        const triggersPrevencion = triggers.filter(t =>
            t.name.includes('tr_validar') ||
            t.name.includes('tr_eliminar_cliente_cascada')
        );

        console.log(`   Triggers de prevención: ${triggersPrevencion.length}`);
        triggersPrevencion.forEach(trigger => {
            console.log(`     - ${trigger.name} (tabla: ${trigger.tbl_name})`);
        });

        // 5. Auditoría de operaciones recientes
        console.log('\n5. 📋 AUDITORÍA DE OPERACIONES RECIENTES');
        console.log('-' .repeat(40));

        // Verificar auditoría de integridad
        const auditoriaIntegridad = await dbAll(`
            SELECT * FROM auditoria_integridad
            ORDER BY fecha DESC
            LIMIT 5
        `);

        if (auditoriaIntegridad.length > 0) {
            console.log('   Últimas auditorías de integridad:');
            auditoriaIntegridad.forEach(aud => {
                console.log(`     - ${aud.fecha}: ${aud.tipo_verificacion} (${aud.registros_afectados} registros) - ${aud.estado}`);
                if (aud.descripcion) {
                    console.log(`       Descripción: ${aud.descripcion}`);
                }
            });
        } else {
            console.log('   ℹ️ No hay auditorías previas registradas');
        }

        // Verificar limpiezas automáticas
        const limpiezas = await dbAll(`
            SELECT * FROM limpiezas_automaticas
            ORDER BY fecha DESC
            LIMIT 5
        `);

        if (limpiezas.length > 0) {
            console.log('\n   Últimas limpiezas automáticas:');
            limpiezas.forEach(lim => {
                console.log(`     - ${lim.fecha}: ${lim.tipo_limpieza} (${lim.registros_eliminados} registros)`);
                if (lim.descripcion) {
                    console.log(`       Descripción: ${lim.descripcion}`);
                }
            });
        } else {
            console.log('\n   ℹ️ No hay limpiezas automáticas registradas');
        }

        // 6. Generar reporte de salud del sistema
        console.log('\n6. 📈 REPORTE DE SALUD DEL SISTEMA');
        console.log('-' .repeat(40));

        const saludSistema = {
            integridad_referencial: hayHuerfanos ? 'CRÍTICO' : 'ÓPTIMO',
            claves_foraneas: fkStatus[0].foreign_keys ? 'HABILITADO' : 'DESHABILITADO',
            triggers_prevencion: triggersPrevencion.length >= 6 ? 'COMPLETO' : 'INCOMPLETO',
            ultima_auditoria: auditoriaIntegridad.length > 0 ? auditoriaIntegridad[0].fecha : 'NUNCA',
            total_clientes: stats.total_clientes,
            total_cuentas: stats.total_cuentas
        };

        console.log(`   Integridad referencial: ${saludSistema.integridad_referencial}`);
        console.log(`   Claves foráneas: ${saludSistema.claves_foraneas}`);
        console.log(`   Triggers de prevención: ${saludSistema.triggers_prevencion}`);
        console.log(`   Última auditoría: ${saludSistema.ultima_auditoria}`);
        console.log(`   Clientes activos: ${saludSistema.total_clientes}`);
        console.log(`   Cuentas corrientes: ${saludSistema.total_cuentas}`);

        // 7. Recomendaciones basadas en el estado
        console.log('\n7. 💡 RECOMENDACIONES');
        console.log('-' .repeat(40));

        if (!hayHuerfanos && fkStatus[0].foreign_keys && triggersPrevencion.length >= 6) {
            console.log('   ✅ El sistema está en óptimas condiciones');
            console.log('   ✅ No se detectaron datos huérfanos');
            console.log('   ✅ Las claves foráneas están habilitadas');
            console.log('   ✅ Los triggers de prevención están activos');
            console.log('   📅 Programar auditorías semanales para mantener el control');
        } else {
            console.log('   ⚠️ Se detectaron áreas de mejora:');
            if (hayHuerfanos) {
                console.log('     - Existen datos huérfanos que requieren atención');
            }
            if (!fkStatus[0].foreign_keys) {
                console.log('     - Las claves foráneas están deshabilitadas');
            }
            if (triggersPrevencion.length < 6) {
                console.log('     - Faltan triggers de prevención');
            }
        }

        // 8. Registrar esta auditoría
        console.log('\n8. 📝 REGISTRANDO AUDITORÍA');
        console.log('-' .repeat(40));

        const estadoGeneral = hayHuerfanos ? 'CRÍTICO' : 'CORRECTO';
        await dbRun(`
            INSERT INTO auditoria_integridad (tipo_verificacion, registros_afectados, descripcion, estado)
            VALUES (?, ?, ?, ?)
        `, [
            'AUDITORÍA CONTINUA',
            hayHuerfanos ? 1 : 0,
            `Auditoría programática - Clientes: ${stats.total_clientes}, Cuentas: ${stats.total_cuentas}, Deudas: ${stats.total_deudas}`,
            estadoGeneral
        ]);

        console.log('   ✅ Auditoría registrada en la base de datos');

        // 9. Resumen ejecutivo
        console.log('\n📋 RESUMEN EJECUTIVO');
        console.log('=' .repeat(70));
        console.log(`   Estado general: ${saludSistema.integridad_referencial}`);
        console.log(`   Acciones requeridas: ${hayHuerfanos ? 'Limpieza inmediata' : 'Mantenimiento preventivo'}`);
        console.log(`   Frecuencia de auditoría recomendada: Semanal`);
        console.log(`   Última verificación: ${new Date().toISOString()}`);

        if (!hayHuerfanos) {
            console.log('\n🎉 ¡EL SISTEMA ESTÁ LIBRE DE DATOS HUÉRFANOS!');
            console.log('   La implementación de medidas de prevención ha sido exitosa.');
        } else {
            console.log('\n⚠️  SE RECOMIENDA ACCIÓN INMEDIATA');
            console.log('   Consultar el diagnóstico detallado para resolver los problemas detectados.');
        }

    } catch (error) {
        console.error('❌ Error durante la auditoría:', error);
    } finally {
        db.close();
        console.log('\n=== FIN DE LA AUDITORÍA ===\n');
    }
}

// Ejecutar auditoría
auditoriaContinuaIntegridad().catch(console.error);