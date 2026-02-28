const db = require('./database-sqlite.js').getDB();

db.get("SELECT COUNT(*) as total_pedidos FROM pedidos_proveedores", (err, row) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log(`Total de pedidos en la base de datos: ${row.total_pedidos}`);

    // Mostrar pedidos con estado "en_proceso"
    db.all(`
        SELECT pp.numero_pedido, p.nombre_proveedor, pp.fecha_pedido, pp.fecha_entrega_estimada,
               pp.total, pp.estado, COUNT(pi.id) as items_count
        FROM pedidos_proveedores pp
        JOIN proveedores p ON pp.proveedor_id = p.id
        LEFT JOIN pedido_items pi ON pp.id = pi.pedido_id
        WHERE pp.estado = 'en_proceso'
        GROUP BY pp.id
        ORDER BY pp.fecha_pedido DESC
        LIMIT 10
    `, (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('\nPedidos en proceso (primeros 10):');
            rows.forEach(row => {
                console.log(`${row.numero_pedido}: ${row.nombre_proveedor} - ${row.items_count} items - Total: $${row.total.toFixed(2)} - Estado: ${row.estado}`);
                console.log(`  Fecha pedido: ${row.fecha_pedido} - Entrega estimada: ${row.fecha_entrega_estimada}`);
            });
        }
        db.close();
    });
});