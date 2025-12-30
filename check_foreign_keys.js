const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== VERIFICACIÓN DE CLAVES FORÁNEAS ===\n');

// Verificar foreign keys
db.all("PRAGMA foreign_key_list(productos)", (err, fks) => {
    console.log('FOREIGN KEYS en productos:', fks.length);
    fks.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));
});

db.all("PRAGMA foreign_key_list(lotes)", (err, fks) => {
    console.log('FOREIGN KEYS en lotes:', fks.length);
    fks.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));
});

db.all("PRAGMA foreign_key_list(venta_items)", (err, fks) => {
    console.log('FOREIGN KEYS en venta_items:', fks.length);
    fks.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));
});

db.all("PRAGMA foreign_key_list(promocion_items)", (err, fks) => {
    console.log('FOREIGN KEYS en promocion_items:', fks.length);
    fks.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));
});

db.all("PRAGMA foreign_key_list(pedidos_proveedores)", (err, fks) => {
    console.log('FOREIGN KEYS en pedidos_proveedores:', fks.length);
    fks.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));
});

db.all("PRAGMA foreign_key_list(pedido_items)", (err, fks) => {
    console.log('FOREIGN KEYS en pedido_items:', fks.length);
    fks.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));
});

// Verificar integridad referencial básica
console.log('\n=== VERIFICACIÓN DE INTEGRIDAD ===\n');

// Verificar lotes sin productos
db.get("SELECT COUNT(*) as count FROM lotes l LEFT JOIN productos p ON l.producto_id = p.id WHERE p.id IS NULL", (err, row) => {
    console.log(`Lotes sin producto válido: ${row.count}`);
});

// Verificar venta_items sin productos
db.get("SELECT COUNT(*) as count FROM venta_items vi LEFT JOIN productos p ON vi.producto_id = p.id WHERE p.id IS NULL", (err, row) => {
    console.log(`Venta_items sin producto válido: ${row.count}`);
});

// Verificar venta_items sin ventas
db.get("SELECT COUNT(*) as count FROM venta_items vi LEFT JOIN ventas v ON vi.venta_id = v.id WHERE v.id IS NULL", (err, row) => {
    console.log(`Venta_items sin venta válida: ${row.count}`);
});

// Verificar promocion_items sin productos
db.get("SELECT COUNT(*) as count FROM promocion_items pi LEFT JOIN productos p ON pi.producto_id = p.id WHERE p.id IS NULL", (err, row) => {
    console.log(`Promocion_items sin producto válido: ${row.count}`);
});

// Verificar promocion_items sin promociones
db.get("SELECT COUNT(*) as count FROM promocion_items pi LEFT JOIN promociones pr ON pi.promocion_id = pr.id WHERE pr.id IS NULL", (err, row) => {
    console.log(`Promocion_items sin promoción válida: ${row.count}`);
});

// Verificar pedidos_proveedores sin proveedores
db.get("SELECT COUNT(*) as count FROM pedidos_proveedores pp LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id WHERE prov.id IS NULL", (err, row) => {
    console.log(`Pedidos_proveedores sin proveedor válido: ${row.count}`);
});

// Verificar pedido_items sin pedidos
db.get("SELECT COUNT(*) as count FROM pedido_items pi LEFT JOIN pedidos_proveedores pp ON pi.pedido_id = pp.id WHERE pp.id IS NULL", (err, row) => {
    console.log(`Pedido_items sin pedido válido: ${row.count}`);
});

// Verificar pedido_items sin productos
db.get("SELECT COUNT(*) as count FROM pedido_items pi LEFT JOIN productos p ON pi.producto_id = p.id WHERE p.id IS NULL", (err, row) => {
    console.log(`Pedido_items sin producto válido: ${row.count}`);
});

// Verificar productos con lote_actual_id inválido
db.get("SELECT COUNT(*) as count FROM productos p LEFT JOIN lotes l ON p.lote_actual_id = l.id WHERE p.lote_actual_id IS NOT NULL AND l.id IS NULL", (err, row) => {
    console.log(`Productos con lote_actual_id inválido: ${row.count}`);
});

// Verificar venta_items con lote_id inválido
db.get("SELECT COUNT(*) as count FROM venta_items vi LEFT JOIN lotes l ON vi.lote_id = l.id WHERE vi.lote_id IS NOT NULL AND l.id IS NULL", (err, row) => {
    console.log(`Venta_items con lote_id inválido: ${row.count}`);
});

setTimeout(() => {
    console.log('\n=== FIN DE VERIFICACIÓN ===');
    db.close();
}, 1000);