/**
 * Script para verificar los lotes creados
 */

const { createDatabaseConnection } = require('./shared/database-connection');

async function verifyBatches() {
    try {
        console.log('📊 Verificando lotes creados...');
        
        const db = createDatabaseConnection();
        
        // Contar lotes creados
        const countQuery = 'SELECT COUNT(*) as total FROM lotes WHERE estado = "activo"';
        const totalLotes = await new Promise((resolve, reject) => {
            db.get(countQuery, (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            });
        });
        
        console.log(`✅ Total de lotes activos: ${totalLotes}`);
        
        // Mostrar algunos lotes de ejemplo
        const sampleQuery = `
            SELECT 
                l.id, 
                l.numero_lote, 
                l.fecha_vencimiento, 
                l.cantidad_actual, 
                p.nombre as producto, 
                s.nombre_proveedor 
            FROM lotes l 
            JOIN productos p ON l.producto_id = p.id 
            JOIN proveedores s ON s.id = l.id 
            ORDER BY l.id DESC 
            LIMIT 15
        `;
        
        const sampleLotes = await new Promise((resolve, reject) => {
            db.all(sampleQuery, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n📋 Ejemplo de lotes creados:');
        sampleLotes.forEach(row => {
            console.log(`   ${row.numero_lote} - ${row.producto} (Proveedor: ${row.nombre_proveedor}) - Vence: ${row.fecha_vencimiento} - Stock: ${row.cantidad_actual}`);
        });
        
        // Verificar proveedores asociados
        const suppliersQuery = 'SELECT DISTINCT s.nombre_proveedor, COUNT(*) as lote_count FROM lotes l JOIN proveedores s ON s.id = l.id GROUP BY s.nombre_proveedor';
        
        const suppliersWithLotes = await new Promise((resolve, reject) => {
            db.all(suppliersQuery, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n🏢 Proveedores con lotes asociados:');
        suppliersWithLotes.forEach(row => {
            console.log(`   ${row.nombre_proveedor}: ${row.lote_count} lotes`);
        });
        
        // Verificar productos con lotes
        const productsQuery = 'SELECT COUNT(DISTINCT producto_id) as products_with_lotes FROM lotes WHERE estado = "activo"';
        
        const productsWithLotes = await new Promise((resolve, reject) => {
            db.get(productsQuery, (err, row) => {
                if (err) reject(err);
                else resolve(row.products_with_lotes);
            });
        });
        
        console.log(`\n📦 Productos con lotes asociados: ${productsWithLotes}`);
        
        // Verificar stock actualizado
        const stockQuery = 'SELECT SUM(cantidad_actual) as total_stock FROM lotes WHERE estado = "activo"';
        
        const totalStock = await new Promise((resolve, reject) => {
            db.get(stockQuery, (err, row) => {
                if (err) reject(err);
                else resolve(row.total_stock);
            });
        });
        
        console.log(`📈 Stock total en lotes: ${totalStock} unidades`);
        
        console.log('\n🎉 Verificación completada exitosamente!');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        process.exit(1);
    }
}

// Ejecutar el script
if (require.main === module) {
    verifyBatches();
}

module.exports = { verifyBatches };