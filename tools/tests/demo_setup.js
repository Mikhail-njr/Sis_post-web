// Script para configurar datos de demo del Sistema POS
// Ejecutar con: node demo_setup.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'backend', 'pos_database.sqlite');

// Datos de demo
const demoData = {
    suppliers: [
        {
            nombre_proveedor: 'Tecno Supply S.A.',
            nombre_contacto: 'María González',
            telefono: '+54 11 4567-8901',
            email: 'contacto@tecnosupply.com.ar',
            productos_servicios: 'Monitores, Teclados, Mouse, Routers',
            condiciones_pago: '30 días',
            estatus: 'Activo',
            notas: 'Proveedor confiable con entregas puntuales'
        },
        {
            nombre_proveedor: 'Electro Distribuciones',
            nombre_contacto: 'Carlos Rodríguez',
            telefono: '+54 11 5678-9012',
            email: 'ventas@electrodist.com.ar',
            productos_servicios: 'Webcams, Auriculares, Cables',
            condiciones_pago: '15 días',
            estatus: 'Activo',
            notas: 'Especializados en accesorios tecnológicos'
        }
    ],
    products: [
        {
            nombre: 'Monitor Samsung 24"',
            codigo: 'MON-001',
            precio: 2000.00,
            categoria: 'MON - Monitores',
            stock: 15,
            descripcion: 'Monitor LED 24" Full HD'
        },
        {
            nombre: 'Mouse Inalámbrico',
            codigo: 'MOU-001',
            precio: 20.00,
            categoria: 'PER - Periféricos',
            stock: 50,
            descripcion: 'Mouse óptico inalámbrico USB'
        },
        {
            nombre: 'Router WiFi 6',
            codigo: 'ROU-001',
            precio: 40.00,
            categoria: 'RED - Redes',
            stock: 25,
            descripcion: 'Router WiFi 6 de alta velocidad'
        },
        {
            nombre: 'Teclado Mecánico RGB',
            codigo: 'TEC-001',
            precio: 90.00,
            categoria: 'TEC - Teclados',
            stock: 12,
            descripcion: 'Teclado mecánico con iluminación RGB'
        },
        {
            nombre: 'Webcam HD 1080p',
            codigo: 'CAM-001',
            precio: 70.00,
            categoria: 'CAM - Cámaras',
            stock: 30,
            descripcion: 'Webcam HD con micrófono integrado'
        }
    ],
    orders: [
        {
            numero_pedido: 'PED-1762872112736',
            fecha_pedido: '2025-11-11T11:41:00.000Z',
            fecha_entrega: null,
            estado: 'pendiente',
            total: 10300.00,
            notas: 'Pedido inicial de productos tecnológicos',
            items: [
                { producto_id: 1, cantidad: 50, precio_unitario: 2000.00 },
                { producto_id: 2, cantidad: 100, precio_unitario: 20.00 },
                { producto_id: 3, cantidad: 100, precio_unitario: 40.00 },
                { producto_id: 4, cantidad: 50, precio_unitario: 90.00 },
                { producto_id: 5, cantidad: 90, precio_unitario: 70.00 }
            ]
        }
    ]
};

async function setupDemoData() {
    console.log('🚀 Configurando datos de demo para el Sistema POS...\n');

    // Verificar si la base de datos existe
    if (!fs.existsSync(DB_PATH)) {
        console.log('❌ Base de datos no encontrada. Asegúrate de que el servidor esté ejecutándose al menos una vez.');
        return;
    }

    const db = new sqlite3.Database(DB_PATH);

    try {
        // Limpiar datos existentes
        console.log('🧹 Limpiando datos existentes...');
        try { await runQuery(db, 'DELETE FROM lotes'); } catch(e) { console.log('Tabla lotes no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM pedido_items'); } catch(e) { console.log('Tabla pedido_items no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM pedidos_proveedores'); } catch(e) { console.log('Tabla pedidos_proveedores no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM venta_items'); } catch(e) { console.log('Tabla venta_items no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM ventas'); } catch(e) { console.log('Tabla ventas no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM cierres_caja'); } catch(e) { console.log('Tabla cierres_caja no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM productos'); } catch(e) { console.log('Tabla productos no existe, continuando...'); }
        try { await runQuery(db, 'DELETE FROM proveedores'); } catch(e) { console.log('Tabla proveedores no existe, continuando...'); }

        // Insertar proveedores
        console.log('🏢 Insertando proveedores de demo...');
        for (const supplier of demoData.suppliers) {
            await runQuery(db, `
                INSERT INTO proveedores (
                    nombre_proveedor, nombre_contacto, telefono, email,
                    productos_servicios, condiciones_pago, estatus, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    supplier.nombre_proveedor, supplier.nombre_contacto,
                    supplier.telefono, supplier.email, supplier.productos_servicios,
                    supplier.condiciones_pago, supplier.estatus, supplier.notas
                ]
            );
        }

        // Insertar productos
        console.log('📦 Insertando productos de demo...');
        for (const product of demoData.products) {
            await runQuery(db, `
                INSERT INTO productos (
                    nombre, codigo, precio, categoria, stock, descripcion
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    product.nombre, product.codigo, product.precio,
                    product.categoria, product.stock, product.descripcion
                ]
            );
        }

        // Insertar pedidos
        console.log('📋 Insertando pedidos de demo...');
        for (const order of demoData.orders) {
            const orderResult = await runQuery(db, `
                INSERT INTO pedidos_proveedores (
                    numero_pedido, fecha_pedido, fecha_entrega, estado, total, notas, proveedor_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    order.numero_pedido, order.fecha_pedido, order.fecha_entrega,
                    order.estado, order.total, order.notas, 1 // Usar el primer proveedor
                ]
            );

            const orderId = orderResult.lastID;

            // Insertar items del pedido
            for (const item of order.items) {
                const subtotal = item.cantidad * item.precio_unitario;
                await runQuery(db, `
                    INSERT INTO pedido_items (
                        pedido_id, producto_id, cantidad, precio_unitario, subtotal
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [orderId, item.producto_id, item.cantidad, item.precio_unitario, subtotal]
                );
            }
        }

        console.log('\n✅ ¡Configuración de demo completada exitosamente!');
        console.log('\n📊 Datos incluidos:');
        console.log(`   • ${demoData.suppliers.length} proveedores`);
        console.log(`   • ${demoData.products.length} productos`);
        console.log(`   • ${demoData.orders.length} pedidos pendientes`);
        console.log('\n🎯 Para probar el sistema:');
        console.log('   1. Inicia el servidor: cd backend && npm start');
        console.log('   2. Abre http://localhost:3000 en tu navegador');
        console.log('   3. Ve al Dashboard y confirma la llegada del pedido');
        console.log('   4. Prueba las ventas en la interfaz principal');

    } catch (error) {
        console.error('❌ Error configurando datos de demo:', error);
    } finally {
        db.close();
    }
}

function runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

if (require.main === module) {
    setupDemoData();
}

module.exports = { setupDemoData, demoData };