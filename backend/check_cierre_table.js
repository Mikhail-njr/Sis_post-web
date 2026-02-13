const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        checkCierreTable();
    }
});

async function checkCierreTable() {
    console.log('🔍 Verificando estructura de la tabla cierres_caja:');
    
    // Verificar columnas de la tabla
    db.all("PRAGMA table_info(cierres_caja)", (err, columns) => {
        if (err) {
            console.error('❌ Error obteniendo info de la tabla:', err);
            return;
        }
        
        console.log('📊 Columnas en cierres_caja:');
        columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
        });
        
        // Verificar si existe la columna numero_cierre_dia
        const hasNumeroCierre = columns.some(col => col.name === 'numero_cierre_dia');
        console.log(`\n🔍 ¿Existe la columna numero_cierre_dia? ${hasNumeroCierre ? '✅ Sí' : '❌ No'}`);
        
        // Verificar version del esquema
        db.all("SELECT * FROM schema_versions ORDER BY version DESC", (err, versions) => {
            if (err) {
                console.error('❌ Error obteniendo versiones del esquema:', err);
                return;
            }
            
            console.log('\n📋 Versiones del esquema aplicadas:');
            versions.forEach(version => {
                console.log(`   v${version.version}: ${version.description} (${version.applied_at})`);
            });
            
            // Verificar datos existentes en cierres_caja
            db.all("SELECT COUNT(*) as count, MIN(fecha_cierre) as primera_fecha, MAX(fecha_cierre) as ultima_fecha FROM cierres_caja", (err, result) => {
                if (err) {
                    console.error('❌ Error conteo de cierres:', err);
                    return;
                }
                
                console.log(`\n📈 Cantidad de cierres: ${result[0].count}`);
                if (result[0].count > 0) {
                    console.log(`   - Primera fecha: ${result[0].primera_fecha}`);
                    console.log(`   - Última fecha: ${result[0].ultima_fecha}`);
                }
                
                // Verificar una fila de ejemplo
                db.all("SELECT * FROM cierres_caja ORDER BY fecha_cierre DESC, numero_cierre_dia DESC LIMIT 3", (err, cierres) => {
                    if (err) {
                        console.error('❌ Error obteniendo cierres:', err);
                        return;
                    }
                    
                    if (cierres.length > 0) {
                        console.log('\n🔍 Ejemplo de cierres:');
                        cierres.forEach((cierre, i) => {
                            console.log(`   Cierre ${i+1}:`);
                            Object.entries(cierre).forEach(([key, value]) => {
                                console.log(`      - ${key}: ${value}`);
                            });
                        });
                    }
                    
                    db.close();
                });
            });
        });
    });
}
