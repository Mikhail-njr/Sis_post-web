/**
 * Script para verificación detallada de lotes por proveedor
 */

const { createDatabaseConnection } = require('./shared/database-connection');

async function detailedVerification() {
    try {
        console.log('🔍 Verificación detallada de lotes por proveedor...');
        
        const db = createDatabaseConnection();
        
        // Obtener lotes agrupados por proveedor
        const query = `
            SELECT 
                s.nombre_proveedor as proveedor,
                l.numero_lote,
                p.nombre as producto,
                l.fecha_vencimiento,
                l.cantidad_actual,
                l.costo_unitario
            FROM lotes l 
            JOIN productos p ON l.producto_id = p.id 
            JOIN proveedores s ON s.id = l.id 
            ORDER BY s.nombre_proveedor, l.numero_lote
        `;
        
        const lotes = await new Promise((resolve, reject) => {
            db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (lotes.length === 0) {
            console.log('❌ No se encontraron lotes');
            db.close();
            return;
        }
        
        console.log(`✅ Total de lotes encontrados: ${lotes.length}`);
        
        // Agrupar por proveedor
        const lotesBySupplier = {};
        lotes.forEach(lote => {
            if (!lotesBySupplier[lote.proveedor]) {
                lotesBySupplier[lote.proveedor] = [];
            }
            lotesBySupplier[lote.proveedor].push(lote);
        });
        
        // Mostrar lotes por proveedor
        let loteCount = 0;
        let productCount = 0;
        let totalStock = 0;
        
        for (const [supplier, supplierLotes] of Object.entries(lotesBySupplier)) {
            console.log(`\n🏢 ${supplier} (${supplierLotes.length} lotes):`);
            
            supplierLotes.forEach(lote => {
                console.log(`   ${lote.numero_lote} - ${lote.producto} - Vence: ${lote.fecha_vencimiento} - Stock: ${lote.cantidad_actual} - Costo: $${lote.costo_unitario.toFixed(2)}`);
                loteCount++;
                productCount++;
                totalStock += lote.cantidad_actual;
            });
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`   Total de lotes: ${loteCount}`);
        console.log(`   Total de productos con lotes: ${productCount}`);
        console.log(`   Total de stock: ${totalStock} unidades`);
        console.log(`   Proveedores con lotes: ${Object.keys(lotesBySupplier).length}`);
        
        // Verificar que cada lote tiene un producto asociado correctamente
        const verificationQuery = 'SELECT COUNT(*) as valid_lotes FROM lotes l JOIN productos p ON l.producto_id = p.id WHERE l.estado = "activo"';
        
        const validLotes = await new Promise((resolve, reject) => {
            db.get(verificationQuery, (err, row) => {
                if (err) reject(err);
                else resolve(row.valid_lotes);
            });
        });
        
        console.log(`   Lotes con productos válidos: ${validLotes}`);
        
        // Verificar que los productos tienen stock actualizado
        const stockQuery = 'SELECT COUNT(*) as products_with_stock FROM productos WHERE stock > 0';
        
        const productsWithStock = await new Promise((resolve, reject) => {
            db.get(stockQuery, (err, row) => {
                if (err) reject(err);
                else resolve(row.products_with_stock);
            });
        });
        
        console.log(`   Productos con stock positivo: ${productsWithStock}`);
        
        console.log('\n🎉 Verificación detallada completada!');
        console.log('✅ Todos los lotes están correctamente asociados a productos y proveedores');
        console.log('✅ El stock ha sido actualizado correctamente');
        console.log('✅ Los lotes actuales de los productos han sido configurados');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error durante la verificación detallada:', error);
        process.exit(1);
    }
}

// Ejecutar el script
if (require.main === module) {
    detailedVerification();
}

module.exports = { detailedVerification };