const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/pos.db');

// Crear una deuda de prueba para el cliente existente
const testDebt = {
    cliente_id: 1,  // ID del cliente existente
    producto_id: 1,  // ID del producto existente (Aceite Girasol Natura 1.5L)
    cantidad: 2,     // 2 unidades
    precio_unitario: 1000,  // Precio de la deuda
    fecha: new Date().toISOString(),
    descripcion: 'Deuda de prueba para diagnóstico'
};

console.log('🔍 Creando deuda de prueba...');

db.run(
    `INSERT INTO deudas (cliente_id, producto_id, cantidad, precio_unitario, fecha, descripcion) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [testDebt.cliente_id, testDebt.producto_id, testDebt.cantidad, testDebt.precio_unitario, testDebt.fecha, testDebt.descripcion],
    function(err) {
        if (err) {
            console.error('❌ Error creando deuda:', err.message);
            return;
        }
        console.log(`✅ Deuda creada exitosamente con ID: ${this.lastID}`);
        console.log('📝 Detalles de la deuda:');
        console.log(`   Cliente ID: ${testDebt.cliente_id}`);
        console.log(`   Producto ID: ${testDebt.producto_id}`);
        console.log(`   Cantidad: ${testDebt.cantidad}`);
        console.log(`   Precio unitario: $${testDebt.precio_unitario}`);
        console.log(`   Fecha: ${testDebt.fecha}`);
        
        // Verificar que la deuda se creó correctamente
        db.get(
            `SELECT * FROM deudas WHERE id = ?`,
            [this.lastID],
            (err, row) => {
                if (err) {
                    console.error('❌ Error consultando deuda:', err.message);
                    return;
                }
                console.log('🔍 Deuda creada en la base de datos:');
                console.log(row);
                db.close();
            }
        );
    }
);