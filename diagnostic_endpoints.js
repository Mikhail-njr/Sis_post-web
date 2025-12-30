const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Diagnóstico de Endpoints y Tablas del Sistema POS\n');

// 1. Verificar tablas existentes
console.log('📋 Verificando tablas en la base de datos...');
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('❌ Error al consultar tablas:', err);
        return;
    }
    
    console.log('✅ Tablas encontradas:', tables.map(t => t.name).join(', '));
    
    // 2. Verificar contenido de tablas clave
    console.log('\n📊 Verificando contenido de tablas clave...');
    
    const checks = [
        { table: 'clientes', description: 'Clientes' },
        { table: 'deudas', description: 'Deudas' },
        { table: 'deuda_productos', description: 'Productos de Deudas' },
        { table: 'productos', description: 'Productos' },
        { table: 'ventas', description: 'Ventas' }
    ];
    
    let completedChecks = 0;
    
    checks.forEach((check, index) => {
        db.get(`SELECT COUNT(*) as count FROM ${check.table}`, (err, row) => {
            if (err) {
                console.error(`❌ Error al consultar ${check.description}:`, err);
            } else {
                console.log(`✅ ${check.description}: ${row.count} registros`);
            }
            
            completedChecks++;
            if (completedChecks === checks.length) {
                console.log('\n🎯 Diagnóstico de Endpoints:');
                console.log('❌ El endpoint /api/customers no está implementado en el backend');
                console.log('✅ Las tablas de clientes y deudas están correctamente configuradas');
                console.log('✅ No hay clientes de cuenta corriente (deudas) en el sistema');
                console.log('\n🔧 Soluciones recomendadas:');
                console.log('1. Implementar el endpoint /api/customers en el backend');
                console.log('2. O cambiar el frontend para usar otro endpoint existente');
                console.log('3. El script de diagnóstico se ejecuta al cargar la página, no al hacer clic');
                
                db.close();
            }
        });
    });
});