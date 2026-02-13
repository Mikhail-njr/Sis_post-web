const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        testCierresQuery();
    }
});

async function testCierresQuery() {
    console.log('🔍 Probando consulta de cierres...');

    try {
        // Consulta exacta que está fallando
        const cierres = await dbAll(`
            SELECT * FROM cierres_caja
            ORDER BY fecha_cierre DESC, numero_cierre_dia DESC, fecha_hora_cierre DESC
        `);

        console.log('✅ Consulta exitosa. Resultados:', cierres.length);
        cierres.forEach((cierre, i) => {
            console.log(`   Cierre ${i+1}: ID=${cierre.id}, fecha_cierre=${cierre.fecha_cierre}, numero_cierre_dia=${cierre.numero_cierre_dia}`);
        });

    } catch (error) {
        console.error('❌ Error en consulta:', error.message);
        console.error('Stack:', error.stack);
    }

    // Probar consultas más simples
    try {
        console.log('\n🔍 Probando consulta simple...');
        const simple = await dbAll("SELECT id, fecha_cierre FROM cierres_caja LIMIT 1");
        console.log('✅ Consulta simple exitosa:', simple);
    } catch (error) {
        console.error('❌ Error en consulta simple:', error.message);
    }

    try {
        console.log('\n🔍 Probando consulta con numero_cierre_dia...');
        const withNumero = await dbAll("SELECT id, numero_cierre_dia FROM cierres_caja LIMIT 1");
        console.log('✅ Consulta con numero_cierre_dia exitosa:', withNumero);
    } catch (error) {
        console.error('❌ Error en consulta con numero_cierre_dia:', error.message);
    }

    db.close();
}

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
