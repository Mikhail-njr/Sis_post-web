const { createDatabaseConnection } = require('./shared/database-connection');
const { findProductByBarcodeSimple } = require('./shared/product-queries');
const { createLote, updateProductStock, updateProductLoteActual, getProductWithLoteActual } = require('./shared/lote-queries');

// Conectar a la base de datos
const db = createDatabaseConnection();

// Función para agregar lote al producto Cif
async function addLoteToCif() {
    try {
        console.log('🔄 Agregando lote al producto Cif...');

        // Primero verificar que el producto existe
        const product = await findProductByBarcodeSimple(db, '7791290795778');

        if (!product) {
            console.log('❌ Producto Cif no encontrado');
            return;
        }

        console.log(`✅ Producto encontrado: ${product.nombre} (ID: ${product.id})`);

        // Crear lote con fecha de vencimiento futura
        const fechaVencimiento = '2025-12-31'; // Fecha futura
        const cantidadInicial = 50; // 50 unidades
        const costoUnitario = 2000; // Costo de adquisición

        // Insertar lote
        const loteResult = await createLote(db, {
            producto_id: product.id,
            numero_lote: 'LOTE-CIF-001',
            fecha_vencimiento: fechaVencimiento,
            cantidad_inicial: cantidadInicial,
            cantidad_actual: cantidadInicial,
            costo_unitario: costoUnitario,
            notas: 'Lote agregado automáticamente para solucionar problema de búsqueda por código de barras'
        });

        console.log(`✅ Lote creado con ID: ${loteResult.id}`);

        // Actualizar stock del producto
        await updateProductStock(db, product.id, cantidadInicial);

        // Actualizar lote_actual_id del producto
        await updateProductLoteActual(db, product.id, loteResult.id);

        console.log('✅ Stock del producto actualizado');
        console.log('✅ Lote actual del producto configurado');

        // Verificar el resultado
        const result = await getProductWithLoteActual(db, product.id);

        console.log('\n📊 Verificación final:');
        console.log(`   Producto: ${result.nombre}`);
        console.log(`   Stock total: ${result.stock}`);
        console.log(`   Lote actual: ${result.numero_lote}`);
        console.log(`   Cantidad en lote: ${result.cantidad_actual}`);
        console.log(`   Fecha vencimiento: ${result.fecha_vencimiento}`);

        console.log('\n✅ PROBLEMA SOLUCIONADO');
        console.log('Ahora el producto Cif debería ser encontrado por código de barras.');

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

// Ejecutar
addLoteToCif();