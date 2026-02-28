const db = require('./database-sqlite.js').getDB();

// Función para obtener productos aleatorios
async function getRandomProducts(count) {
    try {
        const products = await new Promise((resolve, reject) => {
            db.all("SELECT id, nombre, precio FROM productos ORDER BY RANDOM() LIMIT ?", [count], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        return products;
    } catch (error) {
        console.error('Error obteniendo productos aleatorios:', error);
        return [];
    }
}

// Función para crear proveedores de prueba
async function createTestSuppliers() {
    const suppliers = [
        { nombre_proveedor: 'Distribuidora Alimentaria S.A.', telefono: '011-555-0101', email: 'ventas@distribuidora.com', productos_servicios: 'Productos alimenticios generales' },
        { nombre_proveedor: 'Carnes y Embutidos del Centro', telefono: '011-555-0202', email: 'pedidos@carnescentro.com', productos_servicios: 'Carnes, embutidos y productos cárnicos' },
        { nombre_proveedor: 'Verduras Frescas SRL', telefono: '011-555-0303', email: 'info@verdurasfrescas.com', productos_servicios: 'Verduras y frutas frescas' },
        { nombre_proveedor: 'Lácteos del Valle', telefono: '011-555-0404', email: 'contacto@lacteossalud.com', productos_servicios: 'Lácteos y productos refrigerados' }
    ];

    console.log('Creando proveedores de prueba...');

    for (const supplier of suppliers) {
        try {
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO proveedores (nombre_proveedor, telefono, email, productos_servicios, estatus)
                     VALUES (?, ?, ?, ?, ?)`,
                    [supplier.nombre_proveedor, supplier.telefono, supplier.email, supplier.productos_servicios, 'Activo'],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            console.error('Error creando proveedor:', error);
        }
    }

    console.log('✅ Proveedores de prueba creados');
}

// Función para crear pedidos de prueba
async function createTestOrders() {
    try {
        // Obtener proveedores
        const suppliers = await new Promise((resolve, reject) => {
            db.all("SELECT id, nombre_proveedor FROM proveedores", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (suppliers.length === 0) {
            console.log('No hay proveedores disponibles');
            return;
        }

        console.log(`Creando pedidos para ${suppliers.length} proveedores...`);

        // Crear pedidos para cada proveedor
        for (const supplier of suppliers) {
            // Crear 2-4 pedidos por proveedor
            const numOrders = Math.floor(Math.random() * 3) + 2; // 2-4 pedidos

            for (let i = 0; i < numOrders; i++) {
                // Obtener productos aleatorios (3-4 productos por pedido)
                const numProducts = Math.floor(Math.random() * 2) + 3; // 3-4 productos
                const products = await getRandomProducts(numProducts);

                if (products.length === 0) continue;

                // Crear items del pedido
                const orderItems = products.map(product => ({
                    producto_id: product.id,
                    cantidad: Math.floor(Math.random() * 50) + 10, // 10-60 unidades
                    precio_unitario: product.precio * 0.8, // 20% menos que precio de venta
                    subtotal: 0 // se calculará después
                }));

                // Calcular subtotales
                orderItems.forEach(item => {
                    item.subtotal = item.cantidad * item.precio_unitario;
                });

                // Calcular total del pedido
                const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

                // Generar fechas aleatorias (últimos 30 días)
                const today = new Date();
                const randomDays = Math.floor(Math.random() * 30);
                const orderDate = new Date(today);
                orderDate.setDate(today.getDate() - randomDays);

                const estimatedDeliveryDate = new Date(orderDate);
                estimatedDeliveryDate.setDate(orderDate.getDate() + Math.floor(Math.random() * 7) + 3); // 3-10 días después

                // Formatear fechas
                const orderDateStr = orderDate.toISOString().split('T')[0];
                const estimatedDateStr = estimatedDeliveryDate.toISOString().split('T')[0];

                // Crear número de pedido
                const orderNumber = `PED-${supplier.id}-${Date.now()}-${i}`;

                // Insertar pedido
                const orderResult = await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO pedidos_proveedores
                         (numero_pedido, proveedor_id, fecha_pedido, fecha_entrega_estimada, total, notas, estado)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            orderNumber,
                            supplier.id,
                            orderDateStr,
                            estimatedDateStr,
                            total,
                            `Pedido de prueba generado automáticamente - ${supplier.nombre_proveedor}`,
                            'en_proceso'
                        ],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                });

                // Insertar items del pedido
                for (const item of orderItems) {
                    await new Promise((resolve, reject) => {
                        db.run(
                            `INSERT INTO pedido_items
                             (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                             VALUES (?, ?, ?, ?, ?)`,
                            [orderResult, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal],
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                }

                console.log(`✅ Pedido ${orderNumber} creado para ${supplier.nombre_proveedor} - ${orderItems.length} productos - Total: $${total.toFixed(2)}`);
            }
        }

        console.log('✅ Todos los pedidos de prueba creados exitosamente');

    } catch (error) {
        console.error('Error creando pedidos de prueba:', error);
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando creación de pedidos de prueba...');

    try {
        // Crear proveedores de prueba
        await createTestSuppliers();

        // Crear pedidos de prueba
        await createTestOrders();

        console.log('🎉 Proceso completado exitosamente');

    } catch (error) {
        console.error('❌ Error en el proceso:', error);
    } finally {
        db.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { createTestOrders, createTestSuppliers };