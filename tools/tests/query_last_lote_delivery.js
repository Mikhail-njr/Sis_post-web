const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        getLastLoteDeliveryDate();
    }
});

// Función para hacer queries más fácil
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function getLastLoteDeliveryDate() {
    try {
        console.log('🔍 Buscando fecha de entrega del último lote...\n');

        // Obtener el último lote creado
        const lastLote = await dbAll(`
            SELECT
                l.*,
                p.nombre as producto_nombre,
                p.codigo as producto_codigo
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE l.estado = 'activo'
            ORDER BY l.fecha_ingreso DESC, l.created_at DESC
            LIMIT 1
        `);

        if (lastLote.length === 0) {
            console.log('❌ No se encontraron lotes en la base de datos');
            db.close();
            return;
        }

        const lote = lastLote[0];
        console.log('📦 Último lote encontrado:');
        console.log(`   Número: ${lote.numero_lote}`);
        console.log(`   Producto: ${lote.producto_nombre} (${lote.producto_codigo})`);
        console.log(`   Fecha de ingreso: ${lote.fecha_ingreso}`);
        console.log(`   Cantidad inicial: ${lote.cantidad_inicial}`);
        console.log(`   Notas: ${lote.notas || 'Sin notas'}\n`);

        // Extraer número de pedido de las notas
        let numeroPedido = null;
        if (lote.notas && lote.notas.includes('Pedido')) {
            const pedidoMatch = lote.notas.match(/Pedido ([A-Z]+-\d+)/);
            if (pedidoMatch) {
                numeroPedido = pedidoMatch[1];
                console.log(`📋 Número de pedido extraído: ${numeroPedido}`);
            }
        }

        if (!numeroPedido) {
            console.log('⚠️ No se pudo extraer el número de pedido de las notas del lote');
            console.log('🔍 Buscando pedido más reciente como alternativa...');

            // Buscar el pedido más reciente como alternativa
            const recentOrder = await dbAll(`
                SELECT pp.*, p.nombre_proveedor
                FROM pedidos_proveedores pp
                JOIN proveedores p ON pp.proveedor_id = p.id
                WHERE pp.estado = 'entregado'
                ORDER BY pp.fecha_entrega DESC
                LIMIT 1
            `);

            if (recentOrder.length > 0) {
                const order = recentOrder[0];
                console.log('\n📅 Fecha de entrega del pedido más reciente (alternativa):');
                console.log(`   Pedido: ${order.numero_pedido}`);
                console.log(`   Proveedor: ${order.nombre_proveedor}`);
                console.log(`   Fecha de entrega: ${order.fecha_entrega || 'No especificada'}`);
                console.log(`   Estado: ${order.estado}`);
            } else {
                console.log('❌ No se encontraron pedidos entregados');
            }
        } else {
            // Buscar el pedido específico
            const orderData = await dbAll(`
                SELECT pp.*, p.nombre_proveedor
                FROM pedidos_proveedores pp
                JOIN proveedores p ON pp.proveedor_id = p.id
                WHERE pp.numero_pedido = ?
            `, [numeroPedido]);

            if (orderData.length > 0) {
                const order = orderData[0];
                console.log('\n📅 Información del pedido correspondiente:');
                console.log(`   Número de pedido: ${order.numero_pedido}`);
                console.log(`   Proveedor: ${order.nombre_proveedor}`);
                console.log(`   Fecha de pedido: ${order.fecha_pedido}`);
                console.log(`   Fecha de entrega: ${order.fecha_entrega || 'No especificada'}`);
                console.log(`   Estado: ${order.estado}`);
                console.log(`   Total: $${order.total}`);

                if (order.fecha_entrega) {
                    console.log('\n✅ Fecha de entrega del último lote: ' + order.fecha_entrega);
                } else {
                    console.log('\n⚠️ El pedido no tiene fecha de entrega especificada');
                }
            } else {
                console.log(`❌ No se encontró el pedido ${numeroPedido} en la base de datos`);
            }
        }

        // Mostrar resumen de lotes recientes
        console.log('\n📊 Resumen de lotes más recientes:');
        const recentLotes = await dbAll(`
            SELECT
                l.numero_lote,
                p.nombre as producto,
                l.fecha_ingreso,
                l.cantidad_inicial,
                l.notas
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE l.estado = 'activo'
            ORDER BY l.fecha_ingreso DESC
            LIMIT 5
        `);

        recentLotes.forEach((lote, index) => {
            console.log(`${index + 1}. ${lote.numero_lote} - ${lote.producto} - ${lote.fecha_ingreso} - Cant: ${lote.cantidad_inicial}`);
        });

    } catch (error) {
        console.error('❌ Error obteniendo fecha de entrega del último lote:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error cerrando la base de datos:', err.message);
            } else {
                console.log('\n✅ Conexión a la base de datos cerrada');
            }
        });
    }
}