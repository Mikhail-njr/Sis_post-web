const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        checkAndApplyMigrations();
    }
});

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

async function columnExists(tableName, columnName) {
    return new Promise((resolve, reject) => {
        db.get(`PRAGMA table_info(${tableName})`, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                if (err) {
                    reject(err);
                    return;
                }
                const exists = columns.some(col => col.name === columnName);
                resolve(exists);
            });
        });
    });
}

async function indexExists(indexName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`, [indexName], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(!!row);
        });
    });
}

async function checkAndApplyMigrations() {
    try {
        console.log('🔍 Verificando estado de la base de datos...');
        
        const currentVersionResult = await dbAll("SELECT MAX(version) as version FROM schema_versions");
        const currentVersion = currentVersionResult[0]?.version || 0;
        
        console.log(`📊 Versión actual del esquema: ${currentVersion}`);
        
        // Verificar si la columna numero_cierre_dia existe
        const numeroCierreColumnExists = await columnExists('cierres_caja', 'numero_cierre_dia');
        console.log(`ℹ️ Columna numero_cierre_dia existe: ${numeroCierreColumnExists}`);
        
        // Verificar si la columna fecha_hora_cierre existe
        const fechaHoraColumnExists = await columnExists('cierres_caja', 'fecha_hora_cierre');
        console.log(`ℹ️ Columna fecha_hora_cierre existe: ${fechaHoraColumnExists}`);
        
        if (currentVersion < 13) {
            console.log('🔄 Aplicando migración v13: Agregar columnas para múltiples cierres por día');
            
            if (!fechaHoraColumnExists) {
                await dbRun(`ALTER TABLE cierres_caja ADD COLUMN fecha_hora_cierre DATETIME DEFAULT CURRENT_TIMESTAMP`);
                console.log('✅ Columna fecha_hora_cierre agregada');
            }
            
            if (!numeroCierreColumnExists) {
                await dbRun(`ALTER TABLE cierres_caja ADD COLUMN numero_cierre_dia INTEGER DEFAULT 1`);
                console.log('✅ Columna numero_cierre_dia agregada');
            }
            
            await dbRun(`UPDATE cierres_caja SET fecha_hora_cierre = fecha WHERE fecha_hora_cierre IS NULL`);
            console.log('✅ Fecha_hora_cierre poblada con valores existentes');
            
            const fechaHoraIndexExists = await indexExists('idx_cierres_fecha_hora');
            if (!fechaHoraIndexExists) {
                await dbRun(`CREATE INDEX idx_cierres_fecha_hora ON cierres_caja(fecha_cierre, fecha_hora_cierre DESC)`);
                console.log('✅ Índice idx_cierres_fecha_hora creado');
            }
            
            const numeroCierreIndexExists = await indexExists('idx_cierres_numero_dia');
            if (!numeroCierreIndexExists) {
                await dbRun(`CREATE INDEX idx_cierres_numero_dia ON cierres_caja(fecha_cierre, numero_cierre_dia)`);
                console.log('✅ Índice idx_cierres_numero_dia creado');
            }
            
            const cierresExistentes = await dbAll(`
                SELECT id, fecha_cierre, fecha_hora_cierre
                FROM cierres_caja
                ORDER BY fecha_cierre, fecha_hora_cierre
            `);
            
            const cierresPorFecha = {};
            for (const cierre of cierresExistentes) {
                if (!cierresPorFecha[cierre.fecha_cierre]) {
                    cierresPorFecha[cierre.fecha_cierre] = [];
                }
                cierresPorFecha[cierre.fecha_cierre].push(cierre);
            }
            
            for (const [fecha, cierres] of Object.entries(cierresPorFecha)) {
                for (let i = 0; i < cierres.length; i++) {
                    await dbRun(
                        `UPDATE cierres_caja SET numero_cierre_dia = ? WHERE id = ?`,
                        [i + 1, cierres[i].id]
                    );
                }
            }
            
            console.log('✅ Numeración de cierres por día actualizada');
            
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [13, 'Migración v13: permitir múltiples cierres de caja por día']);
            console.log('✅ Migración v13 completada');
        }
        
        if (currentVersion < 14) {
            console.log('🔄 Aplicando migración v14: Quitar restricción UNIQUE(fecha_cierre)');
            
            await dbRun(`
                CREATE TABLE cierres_caja_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_cierre DATE NOT NULL,
                    fecha_hora_cierre DATETIME DEFAULT CURRENT_TIMESTAMP,
                    dinero_inicial REAL NOT NULL,
                    total_ventas REAL NOT NULL,
                    total_esperado REAL NOT NULL,
                    diferencia REAL NOT NULL,
                    cantidad_ventas INTEGER NOT NULL,
                    tipo_cierre TEXT DEFAULT 'normal',
                    notas TEXT,
                    numero_cierre_dia INTEGER DEFAULT 1
                )
            `);
            
            await dbRun(`
                INSERT INTO cierres_caja_new (
                    id, fecha, fecha_cierre, fecha_hora_cierre, dinero_inicial,
                    total_ventas, total_esperado, diferencia, cantidad_ventas,
                    tipo_cierre, notas, numero_cierre_dia
                )
                SELECT
                    id, fecha, fecha_cierre, fecha_hora_cierre, dinero_inicial,
                    total_ventas, total_esperado, diferencia, cantidad_ventas,
                    tipo_cierre, notas, numero_cierre_dia
                FROM cierres_caja
            `);
            
            const indexesToDrop = [
                'idx_cierres_fecha',
                'idx_cierres_tipo',
                'idx_cierres_fecha_hora',
                'idx_cierres_numero_dia'
            ];
            
            for (const indexName of indexesToDrop) {
                const indexExistsResult = await indexExists(indexName);
                if (indexExistsResult) {
                    await dbRun(`DROP INDEX ${indexName}`);
                    console.log(`✅ Índice ${indexName} eliminado`);
                }
            }
            
            await dbRun(`DROP TABLE cierres_caja`);
            await dbRun(`ALTER TABLE cierres_caja_new RENAME TO cierres_caja`);
            
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres_caja(fecha_cierre)`);
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_tipo ON cierres_caja(tipo_cierre)`);
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_fecha_hora ON cierres_caja(fecha_cierre, fecha_hora_cierre DESC)`);
            await dbRun(`CREATE INDEX IF NOT EXISTS idx_cierres_numero_dia ON cierres_caja(fecha_cierre, numero_cierre_dia)`);
            
            console.log('✅ Tabla cierres_caja recreada sin restricción UNIQUE');
            
            await dbRun(`INSERT INTO schema_versions (version, description) VALUES (?, ?)`,
                [14, 'Migración v14: quitar restricción UNIQUE(fecha_cierre)']);
            console.log('✅ Migración v14 completada');
        }
        
        const finalVersionResult = await dbAll("SELECT MAX(version) as version FROM schema_versions");
        const finalVersion = finalVersionResult[0]?.version || 0;
        
        console.log('🎉 Migraciones completadas. Versión final del esquema:', finalVersion);
        
        const cierresCountResult = await dbAll("SELECT COUNT(*) as count FROM cierres_caja");
        console.log(`📦 Número de cierres de caja en la base de datos: ${cierresCountResult[0].count}`);
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando la conexión:', err);
            } else {
                console.log('✅ Conexión a la base de datos cerrada');
            }
        });
        
    } catch (error) {
        console.error('❌ Error al aplicar migraciones:', error);
        db.close();
        process.exit(1);
    }
}
