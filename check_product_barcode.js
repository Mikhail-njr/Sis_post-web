const { createDatabaseConnection } = require('./shared/database-connection');
const { findProductByBarcodeWithPromotions, findProductsByName } = require('./shared/product-queries');
const { getLotesByProductId } = require('./shared/lote-queries');

// Conectar a la base de datos
const db = createDatabaseConnection();

// Función para buscar productos por código de barras
async function checkBarcode(barcode) {
    console.log(`\n🔍 Buscando producto con código de barras: ${barcode}`);

    // Buscar producto por código de barras
    const product = await findProductByBarcodeWithPromotions(db, barcode);

    if (!product) {
        console.log('❌ Producto NO encontrado con este código de barras');
        return null;
    }

    console.log('✅ Producto encontrado:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Código: ${product.codigo}`);
    console.log(`   Nombre: ${product.nombre}`);
    console.log(`   Precio: $${product.precio}`);
    console.log(`   Stock: ${product.stock}`);
    console.log(`   Categoría: ${product.categoria}`);
    console.log(`   Código de barras: ${product.codigo_barras}`);

    // Buscar lotes del producto
    const lotes = await getLotesByProductId(db, product.id);

    console.log(`\n📦 Lotes encontrados: ${lotes.length}`);

    if (lotes.length === 0) {
        console.log('❌ No hay lotes activos para este producto');
        return { product, lotes: [] };
    }

    lotes.forEach((lote, index) => {
        console.log(`\n   Lote ${index + 1}:`);
        console.log(`   ID: ${lote.id}`);
        console.log(`   Número: ${lote.numero_lote}`);
        console.log(`   Cantidad actual: ${lote.cantidad_actual}`);
        console.log(`   Fecha vencimiento: ${lote.fecha_vencimiento}`);
        console.log(`   Estado: ${lote.estado_vencimiento}`);
    });

    // Verificar si hay lotes con stock disponible
    const lotesConStock = lotes.filter(l => l.cantidad_actual > 0);
    console.log(`\n📊 Lotes con stock disponible: ${lotesConStock.length}`);

    if (lotesConStock.length === 0) {
        console.log('❌ Ningún lote tiene stock disponible');
    } else {
        console.log('✅ Hay lotes con stock disponible - el producto debería ser encontrado');
    }

    return { product, lotes };
}

// Función para buscar productos por nombre
async function searchByName(name) {
    console.log(`\n🔍 Buscando productos con nombre similar a: "${name}"`);

    const products = await findProductsByName(db, name);

    console.log(`📋 Productos encontrados: ${products.length}`);
    products.forEach((product, index) => {
        console.log(`\n   ${index + 1}. ${product.nombre}`);
        console.log(`      Código: ${product.codigo}`);
        console.log(`      Código de barras: ${product.codigo_barras || 'No asignado'}`);
        console.log(`      Stock: ${product.stock}`);
    });

    return products;
}

// Función principal
async function main() {
    try {
        const targetBarcode = '7791290795778';
        const targetName = 'Desinfectante';

        console.log('='.repeat(60));
        console.log('🔍 VERIFICACIÓN DE PRODUCTO EN BASE DE DATOS');
        console.log('='.repeat(60));

        // Buscar por código de barras específico
        const result = await checkBarcode(targetBarcode);

        if (!result) {
            console.log('\n🔍 Buscando productos similares por nombre...');
            await searchByName(targetName);

            console.log('\n💡 POSIBLES CAUSAS DEL ERROR 404:');
            console.log('1. El producto no fue guardado en la base de datos');
            console.log('2. El código de barras está mal asignado');
            console.log('3. El producto existe pero no tiene lotes con stock');
            console.log('4. Error en el proceso de guardado');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error cerrando DB:', err.message);
            } else {
                console.log('\n✅ Conexión cerrada');
            }
        });
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { checkBarcode, searchByName };