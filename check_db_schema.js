const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== ESQUEMA DE LA BASE DE DATOS ===\n');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error obteniendo tablas:', err);
        return;
    }

    console.log('TABLAS ENCONTRADAS:');
    tables.forEach(table => {
        console.log(`- ${table.name}`);
    });
    console.log('\n');

    // Verificar cada tabla
    let processed = 0;
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
            if (err) {
                console.error(`Error obteniendo columnas de ${table.name}:`, err);
                return;
            }

            console.log(`CAMPOS DE LA TABLA ${table.name.toUpperCase()}:`);
            columns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });
            console.log('');

            processed++;
            if (processed === tables.length) {
                // Verificar índices
                db.all("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'", (err, indexes) => {
                    if (err) {
                        console.error('Error obteniendo índices:', err);
                        return;
                    }

                    console.log('ÍNDICES ENCONTRADOS:');
                    indexes.forEach(idx => {
                        console.log(`- ${idx.name} en tabla ${idx.tbl_name}`);
                        if (idx.sql) {
                            console.log(`  SQL: ${idx.sql}`);
                        }
                    });
                    console.log('\n');

                    // Verificar triggers
                    db.all("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'", (err, triggers) => {
                        if (err) {
                            console.error('Error obteniendo triggers:', err);
                            return;
                        }

                        console.log('TRIGGERS ENCONTRADOS:');
                        triggers.forEach(trg => {
                            console.log(`- ${trg.name} en tabla ${trg.tbl_name}`);
                        });
                        console.log('\n');

                        // Verificar versión del esquema
                        db.get("SELECT MAX(version) as version FROM schema_versions", (err, row) => {
                            console.log('VERSIÓN DEL ESQUEMA:', row ? row.version : 'No encontrada');
                            console.log('\n=== FIN DEL REPORTE ===');
                            db.close();
                        });
                    });
                });
            }
        });
    });
});