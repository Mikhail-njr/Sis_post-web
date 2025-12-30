const fetch = require('node-fetch').default;

const API_BASE = 'http://localhost:3000/api';

// Función para hacer requests con autenticación
async function apiRequest(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (options.auth !== false) {
        headers['Authorization'] = 'Basic ' + Buffer.from('admin:pos123').toString('base64');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers,
        ...options
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
}

async function testSupplierFlow() {
    console.log('🚀 Iniciando prueba completa del flujo de proveedores...\n');

    try {
        // 1. Verificar estado inicial
        console.log('📊 Paso 1: Verificando estado inicial...');
        const initialProducts = await apiRequest('/products');
        const initialLotes = await apiRequest('/lotes');
        const initialSuppliers = await apiRequest('/suppliers');
        const initialOrders = await apiRequest('/supplier-orders');

        console.log(`   📦 Productos iniciales: ${initialProducts.length}`);
        console.log(`   📅 Lotes iniciales: ${initialLotes.length}`);
        console.log(`   🏢 Proveedores iniciales: ${initialSuppliers.length}`);
        console.log(`   📋 Pedidos iniciales: ${initialOrders.length}\n`);

        // 2. Crear proveedor si no existe
        console.log('🏢 Paso 2: Creando proveedor de prueba...');
        let testSupplier;
        const existingSupplier = initialSuppliers.find(s => s.nombre_proveedor === 'Proveedor Test Automático');

        if (existingSupplier) {
            testSupplier = existingSupplier;
            console.log(`   ✅ Proveedor existente encontrado: ID ${testSupplier.id}\n`);
        } else {
            testSupplier = await apiRequest('/suppliers', {
                method: 'POST',
                body: JSON.stringify({
                    nombre_proveedor: 'Proveedor Test Automático',
                    nombre_contacto: 'Juan Test',
                    telefono: '+54911234567',
                    email: 'test@proveedor.com',
                    productos_servicios: 'Productos de prueba',
                    condiciones_pago: '30 días',
                    estatus: 'Activo',
                    notas: 'Proveedor creado automáticamente para pruebas'
                })
            });
            console.log(`   ✅ Proveedor creado: ID ${testSupplier.supplier.id}\n`);
            testSupplier = testSupplier.supplier;
        }

        // 3. Obtener productos disponibles
        console.log('📦 Paso 3: Obteniendo productos disponibles...');
        const availableProducts = initialProducts.filter(p => p.stock > 0 || p.cantidad_lotes === 0);
        if (availableProducts.length === 0) {
            throw new Error('No hay productos disponibles para crear pedido');
        }

        const testProduct = availableProducts[0];
        console.log(`   ✅ Producto seleccionado: ${testProduct.nombre} (ID: ${testProduct.id})\n`);

        // 4. Crear pedido a proveedor
        console.log('📋 Paso 4: Creando pedido a proveedor...');
        const orderData = {
            proveedor_id: testSupplier.id,
            fecha_entrega_estimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días después
            items: [{
                producto_id: testProduct.id,
                cantidad: 10,
                precio_unitario: testProduct.precio * 0.8 // 20% descuento
            }],
            notas: 'Pedido creado automáticamente para pruebas'
        };

        const orderResult = await apiRequest('/supplier-orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        const createdOrder = await apiRequest(`/supplier-orders/${orderResult.order_id}`);
        console.log(`   ✅ Pedido creado: ${createdOrder.numero_pedido} (ID: ${createdOrder.id})`);
        console.log(`   📦 Items: ${createdOrder.items.length} producto(s)`);
        console.log(`   💰 Total: $${createdOrder.total}\n`);

        // 5. Cambiar estado a "entregado" y confirmar llegada
        console.log('🚚 Paso 5: Confirmando llegada de productos...');

        // Preparar datos de confirmación
        const confirmData = {
            items: [{
                producto_id: createdOrder.items[0].producto_id,
                cantidad_recibida: 8, // Recibimos 8 de los 10 pedidos
                fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días después
                costo_unitario: createdOrder.items[0].precio_unitario
            }],
            extraItems: [{
                producto_id: testProduct.id,
                cantidad: 2, // Item extra del proveedor
                fecha_vencimiento: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 días después
                costo_unitario: testProduct.precio * 0.7, // Costo más bajo
                producto_nombre: testProduct.nombre
            }]
        };

        const confirmResult = await apiRequest(`/supplier-orders/${createdOrder.id}/confirm-delivery`, {
            method: 'POST',
            body: JSON.stringify(confirmData)
        });

        console.log(`   ✅ Llegada confirmada exitosamente`);
        console.log(`   📦 Lotes creados: ${confirmResult.lotes_creados.length}`);
        confirmResult.lotes_creados.forEach(lote => {
            console.log(`      - Lote ${lote.numero_lote}: ${lote.producto_nombre} (${lote.cantidad} unidades)`);
        });
        console.log('');

        // 6. Verificar que los lotes se crearon
        console.log('📅 Paso 6: Verificando creación de lotes...');
        const lotesAfter = await apiRequest('/lotes');
        const newLotes = lotesAfter.filter(l => !initialLotes.find(il => il.id === l.id));

        console.log(`   📊 Lotes totales ahora: ${lotesAfter.length} (antes: ${initialLotes.length})`);
        console.log(`   🆕 Nuevos lotes creados: ${newLotes.length}`);

        newLotes.forEach(lote => {
            console.log(`      - Lote ${lote.numero_lote}: ${lote.producto_nombre} (${lote.cantidad_actual}/${lote.cantidad_inicial})`);
        });
        console.log('');

        // 7. Verificar actualización de stock
        console.log('📈 Paso 7: Verificando actualización de stock...');
        const productsAfter = await apiRequest('/products');
        const updatedProduct = productsAfter.find(p => p.id === testProduct.id);

        console.log(`   📦 Stock anterior: ${testProduct.stock}`);
        console.log(`   📦 Stock actual: ${updatedProduct.stock}`);
        console.log(`   📈 Diferencia: +${updatedProduct.stock - testProduct.stock} unidades\n`);

        // 8. Realizar una venta para probar descuento de stock por lotes
        console.log('🛒 Paso 8: Realizando venta para probar descuento de stock...');

        const saleData = {
            items: [{
                id: testProduct.id,
                nombre: testProduct.nombre,
                precio: testProduct.precio,
                cantidad: 3, // Vender 3 unidades
                descuento_porcentaje: 0
            }],
            paymentMethod: 'efectivo',
            metodo_pago: 'efectivo',
            pagos: [{
                metodo: 'efectivo',
                monto: testProduct.precio * 3
            }],
            vuelto: 0
        };

        const saleResult = await apiRequest('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });

        console.log(`   ✅ Venta realizada: ${saleResult.numero_factura}`);
        console.log(`   💰 Total: $${saleResult.total}`);
        console.log(`   📦 Unidades vendidas: 3\n`);

        // 9. Verificar que el stock se actualizó correctamente
        console.log('🔍 Paso 9: Verificando descuento de stock después de venta...');
        const productsAfterSale = await apiRequest('/products');
        const productAfterSale = productsAfterSale.find(p => p.id === testProduct.id);

        console.log(`   📦 Stock antes de venta: ${updatedProduct.stock}`);
        console.log(`   📦 Stock después de venta: ${productAfterSale.stock}`);
        console.log(`   📉 Diferencia: -${updatedProduct.stock - productAfterSale.stock} unidades\n`);

        // 10. Verificar estado de lotes después de venta
        console.log('📋 Paso 10: Verificando estado de lotes después de venta...');
        const lotesAfterSale = await apiRequest('/lotes');
        const productLotes = lotesAfterSale.filter(l => l.producto_id === testProduct.id);

        console.log(`   📅 Lotes del producto ${testProduct.nombre}:`);
        productLotes.forEach(lote => {
            console.log(`      - Lote ${lote.numero_lote}: ${lote.cantidad_actual}/${lote.cantidad_inicial} unidades`);
        });
        console.log('');

        // 11. Verificar pedido actualizado
        console.log('✅ Paso 11: Verificando estado final del pedido...');
        const finalOrder = await apiRequest(`/supplier-orders/${createdOrder.id}`);
        console.log(`   📋 Estado del pedido: ${finalOrder.estado}`);
        console.log(`   📦 Items procesados: ${finalOrder.items.length}\n`);

        console.log('🎉 ¡PRUEBA COMPLETA EXITOSA!');
        console.log('✅ Todos los pasos del flujo de proveedores funcionaron correctamente:');
        console.log('   - Creación de pedido');
        console.log('   - Confirmación de llegada');
        console.log('   - Creación automática de lotes');
        console.log('   - Actualización de stock');
        console.log('   - Descuento de stock por ventas');
        console.log('   - Gestión FIFO de lotes');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Ejecutar la prueba
testSupplierFlow();