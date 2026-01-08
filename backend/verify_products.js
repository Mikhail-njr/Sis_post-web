const Database = require('./database-sqlite');
const db = Database.getDB();

// Contar productos
const result = db.prepare("SELECT COUNT(*) as count FROM productos").get();
console.log('Total productos en DB:', result.count);

// Mostrar algunos productos
const products = db.prepare("SELECT codigo, nombre, stock FROM productos LIMIT 5").all();
console.log('\nPrimeros 5 productos:');
products.forEach(p => console.log(`  ${p.codigo}: ${p.nombre} (stock: ${p.stock})`));
