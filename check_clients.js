const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando clientes existentes...\n');

db.serialize(() => {
    db.all("SELECT id, nombre, telefono, dni FROM clientes ORDER BY id", (err, rows) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }

        if (rows.length === 0) {
            console.log('ℹ️  No hay clientes registrados');
            return;
        }

        console.log(`✅ Se encontraron ${rows.length} cliente(s):\n`);

        rows.forEach((cliente, index) => {
            console.log(`${index + 1}. ID: ${cliente.id} - ${cliente.nombre}`);
            console.log(`   📞 Teléfono: ${cliente.telefono || 'No registrado'}`);
            console.log(`   🆔 DNI: ${cliente.dni || 'No registrado'}`);
            console.log('');
        });

        db.close();
    });
});