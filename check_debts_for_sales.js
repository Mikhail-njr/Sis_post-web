const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando si hay deudas asociadas a ventas recientes...\n');

// Función para formatear moneda
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

db.serialize(() => {
    // Obtener las últimas 5 ventas con información de deudas
    db.all(`
        SELECT
            v.id,
            v.numero_factura,
            v.total,
            v.metodo_pago,
            v.created_at,
            CASE WHEN d.id IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_deuda,
            d.monto_original,
            d.monto_pendiente,
            d.estado as estado_deuda,
            c.nombre as cliente_nombre
        FROM ventas v
        LEFT JOIN deudas d ON v.id = d.venta_id
        LEFT JOIN clientes c ON d.cliente_id = c.id
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
            console.log(`   📅 Fecha: ${new Date(sale.created_at).toLocaleString('es-AR')}`);
            console.log(`   💸 Tiene deuda asociada: ${sale.tiene_deuda}`);
            if (sale.tiene_deuda === 'Sí') {
                console.log(`   👤 Cliente: ${sale.cliente_nombre || 'Desconocido'}`);
                console.log(`   💰 Monto original: ${formatCurrency(sale.monto_original)}`);
                console.log(`   🔄 Monto pendiente: ${formatCurrency(sale.monto_pendiente)}`);
                console.log(`   📊 Estado deuda: ${sale.estado_deuda}`);
            }
            console.log('');
        });

        // Verificar ventas de $5500 específicamente
        const sales5500 = sales.filter(s => parseFloat(s.total) === 5500);
        console.log(`📊 Análisis de ventas de $5.500,00:`);
        console.log(`   Total de ventas de $5.500,00: ${sales5500.length}`);
        const withDebt = sales5500.filter(s => s.tiene_deuda === 'Sí').length;
        const withoutDebt = sales5500.filter(s => s.tiene_deuda === 'No').length;
        console.log(`   Con deuda: ${withDebt}`);
        console.log(`   Sin deuda: ${withoutDebt}`);

        if (withoutDebt > 0) {
            console.log('ℹ️  Las ventas sin deuda son ventas al contado (efectivo) o no se creó deuda.');
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