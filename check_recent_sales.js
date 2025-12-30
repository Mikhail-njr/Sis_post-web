const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando ventas recientes...\n');

// Función para formatear moneda
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

db.serialize(() => {
    // Obtener las últimas 5 ventas
    db.all(`
        SELECT
            v.id,
            v.numero_factura,
            v.total,
            v.metodo_pago,
            v.vuelto,
            v.created_at,
            COUNT(vi.id) as items_count
        FROM ventas v
        LEFT JOIN venta_items vi ON v.id = vi.venta_id
        GROUP BY v.id
        ORDER BY v.created_at DESC
        LIMIT 5
    `, (err, sales) => {
        if (err) {
            console.error('❌ Error obteniendo ventas:', err.message);
            return;
        }

        if (sales.length === 0) {
            console.log('ℹ️  No se encontraron ventas en la base de datos');
            return;
        }

        console.log(`✅ Se encontraron ${sales.length} venta(s) reciente(s):\n`);

        sales.forEach((sale, index) => {
            console.log(`${index + 1}. Factura: ${sale.numero_factura}`);
            console.log(`   💰 Total: ${formatCurrency(sale.total)}`);
            console.log(`   💳 Método de pago: ${sale.metodo_pago || 'No especificado'}`);
            console.log(`   🔄 Vuelto: ${formatCurrency(sale.vuelto || 0)}`);
            console.log(`   📦 Items: ${sale.items_count}`);
            console.log(`   📅 Fecha: ${new Date(sale.created_at).toLocaleString('es-AR')}`);
            console.log('');
        });

        // Verificar si hay alguna venta con el total de 5500
        const sale5500 = sales.find(s => parseFloat(s.total) === 5500);
        if (sale5500) {
            console.log('✅ Se encontró una venta con total $5.500,00');
            console.log(`   Factura: ${sale5500.numero_factura}`);
            console.log(`   Método de pago: ${sale5500.metodo_pago}`);
        } else {
            console.log('❌ No se encontró ninguna venta con total $5.500,00 en las últimas 5 ventas');
        }

        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando base de datos:', err.message);
            } else {
                console.log('\n✅ Verificación completada');
            }
        });
    });
});